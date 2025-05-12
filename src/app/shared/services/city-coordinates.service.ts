import { Injectable, OnDestroy } from '@angular/core';
import { Observable, of, forkJoin, Subject } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { LocationsApiService, LocationMunicipality, CityResponse, CityFilter } from './locations-api.service';
import { City } from '../components/tour-map/tour-map.component';
import { GeoService } from '../../core/services/geo.service';

// Interfaces para el sistema de cola de coordenadas
interface PendingCity {
  city: string;
  index?: number;
  callback: (city: string, lat: number, lng: number, index?: number) => void;
}

interface CachedCoordinates {
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class CityCoordinatesService implements OnDestroy {
  // Cache para almacenar coordenadas ya buscadas
  private coordinatesCache: Map<string, CachedCoordinates> = new Map();
  
  // Propiedades para el sistema de cola de coordenadas
  private pendingCities: PendingCity[] = [];
  private processingQueue = false;
  private lastRequestTime = 0;
  private failedAttempts = new Map<string, number>();
  private readonly MAX_ATTEMPTS = 3;
  private destroy$ = new Subject<void>();

  constructor(
    private locationsApiService: LocationsApiService,
    private geoService: GeoService
  ) { }

  /**
   * Normaliza un nombre de ciudad para uso consistente en caché
   */
  private normalizeCity(cityName: string): string {
    return cityName?.trim().toLowerCase() || '';
  }

  /**
   * Busca las coordenadas de una ciudad, primero en la API de localizaciones
   * y si no se encuentra, utiliza el método alternativo actual
   * @param cityName Nombre de la ciudad
   * @param country Nombre del país (opcional)
   */
  getCityCoordinates(cityName: string, country?: string): Observable<CachedCoordinates | null> {
    const normalizedCityName = this.normalizeCity(cityName);
  
    if (!normalizedCityName) {
      console.warn('Nombre de ciudad vacío después de normalizar');
      return of(null);
    }
  
    if (this.coordinatesCache.has(normalizedCityName)) {
      return of(this.coordinatesCache.get(normalizedCityName)!);
    }
  
    // Create a CityFilter object with optional country parameter
    const filter: CityFilter = { name: normalizedCityName };
    
    // Si se proporciona un país, buscar su ID y añadirlo al filtro
    if (country) {
      return this.searchWithCountry(normalizedCityName, country, filter);
    }
    
    // Si no se proporciona país, continuar con la búsqueda normal
    return this.searchCityByFilter(normalizedCityName, filter);
  }

  /**
   * Método auxiliar para buscar ciudad con filtro de país
   */
  private searchWithCountry(
    normalizedCityName: string, 
    country: string, 
    filter: CityFilter
  ): Observable<CachedCoordinates | null> {
    return this.locationsApiService.searchCountryByFilter({ name: country.trim() }).pipe(
      switchMap(countries => {
        if (countries && countries.length > 0) {
          filter.countryId = countries[0].id;
        }
        
        return this.searchCityByFilter(normalizedCityName, filter);
      }),
      catchError(error => {
        console.error(`Error al buscar país ${country}:`, error);
        // Si falla la búsqueda del país, intentar buscar la ciudad sin filtro de país
        return this.searchCityByFilter(normalizedCityName, filter);
      })
    );
  }

  /**
   * Método auxiliar para buscar ciudad por filtro
   */
  private searchCityByFilter(
    normalizedCityName: string, 
    filter: CityFilter
  ): Observable<CachedCoordinates | null> {
    return this.locationsApiService.searchCityByFilter(filter).pipe(
      map(cities => {
        if (cities && cities.length > 0 && cities[0].lat && cities[0].lng) {
          const coordinates = { lat: cities[0].lat, lng: cities[0].lng };
          this.coordinatesCache.set(normalizedCityName, coordinates);
          return coordinates;
        }
        return null;
      }),
      catchError(error => {
        console.error(`Error al obtener coordenadas para ${normalizedCityName}:`, error);
        return of(null);
      })
    );
  }
  
  /**
   * Convierte un array de nombres de ciudades a objetos City con coordenadas
   */
  convertCitiesToCityObjects(cityNames: string[], country?: string): Observable<City[]> {
    if (!cityNames || cityNames.length === 0) {
      return of([]);
    }

    // Crear un array de observables para cada ciudad
    const cityObservables = cityNames.map(cityName => 
      this.getCityCoordinates(cityName, country).pipe(
        map(coordinates => {
          if (coordinates) {
            return {
              nombre: cityName,
              lat: coordinates.lat,
              lng: coordinates.lng
            } as City;
          }
          return null;
        })
      )
    );

    // Usar forkJoin en lugar de Promise.all con toPromise (que está deprecado)
    return forkJoin(cityObservables).pipe(
      map(cities => cities.filter(city => city !== null) as City[])
    );
  }

  /**
   * Método para obtener coordenadas con caché y sistema de cola
   * @param city Nombre de la ciudad
   * @param callback Función de callback para procesar las coordenadas
   * @param index Índice opcional para mantener el orden
   */
  getCoordinatesWithQueue(
    city: string, 
    callback: (city: string, lat: number, lng: number, index?: number) => void,
    index?: number
  ): void {
    // Normalizar el nombre de la ciudad
    const normalizedCity = this.normalizeCity(city);
    
    // Omitir nombres de ciudad vacíos o inválidos
    if (!normalizedCity || typeof city !== 'string') {
      console.warn('Omitiendo nombre de ciudad inválido:', city);
      return;
    }
    
    // Verificar si ya tenemos las coordenadas en caché
    if (this.coordinatesCache.has(normalizedCity)) {
      console.log(`Usando coordenadas en caché para "${city}"`);
      const cachedCoordinates = this.coordinatesCache.get(normalizedCity)!;
      callback(city, cachedCoordinates.lat, cachedCoordinates.lng, index);
      return;
    }
  
    // Verificar si hemos excedido el número máximo de intentos fallidos
    const attempts = this.failedAttempts.get(normalizedCity) || 0;
    if (attempts >= this.MAX_ATTEMPTS) {
      console.warn(
        `Omitiendo geocodificación para "${city}" después de ${this.MAX_ATTEMPTS} intentos fallidos`
      );
      return;
    }
  
    // Verificar si esta ciudad ya está en la cola pendiente
    if (this.pendingCities.some(pending => this.normalizeCity(pending.city) === normalizedCity)) {
      console.log(`La ciudad "${city}" ya está en la cola pendiente`);
      return;
    }
  
    // Agregar a la cola pendiente y procesar
    console.log(`Agregando "${city}" a la cola de geocodificación`);
    this.pendingCities.push({ city, index, callback });
  
    // Comenzar a procesar la cola si aún no se está procesando
    if (!this.processingQueue) {
      this.processCoordinateQueue();
    }
  }

  /**
   * Método para procesar la cola de coordenadas
   * Implementa limitación de velocidad para las solicitudes a GeoService
   */
  private processCoordinateQueue(): void {
    this.processingQueue = true;
  
    const processNext = () => {
      if (this.pendingCities.length === 0) {
        this.processingQueue = false;
        return;
      }
  
      // Procesar la siguiente ciudad en la cola
      const nextCity = this.pendingCities.shift();
      if (!nextCity) {
        this.processingQueue = false;
        return;
      }
  
      const normalizedCity = this.normalizeCity(nextCity.city);
  
      // Verificar caché nuevamente antes de hacer la solicitud
      if (this.coordinatesCache.has(normalizedCity)) {
        console.log(`Usando coordenadas en caché para "${nextCity.city}" (agregadas mientras estaba en cola)`);
        const cachedCoordinates = this.coordinatesCache.get(normalizedCity)!;
        nextCity.callback(
          nextCity.city,
          cachedCoordinates.lat,
          cachedCoordinates.lng,
          nextCity.index
        );
        
        // Procesar la siguiente ciudad inmediatamente
        processNext();
        return;
      }
  
      // Primero intentamos obtener las coordenadas usando el servicio CityCoordinates
      this.getCityCoordinates(nextCity.city)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (coordinates) => {
            if (coordinates) {
              this.handleSuccessfulCoordinates(nextCity, normalizedCity, coordinates, processNext);
            } else {
              // Si no encontramos coordenadas, intentamos con GeoService
              console.log(`No se encontraron coordenadas para "${nextCity.city}" en CityCoordinates, intentando con GeoService`);
              this.callGeoServiceWithRateLimit(nextCity, normalizedCity, processNext);
            }
          },
          error: (error) => {
            console.error(`Error al obtener coordenadas para "${nextCity.city}" desde CityCoordinates:`, error);
            this.callGeoServiceWithRateLimit(nextCity, normalizedCity, processNext);
          },
        });
    };
  
    processNext();
  }

  /**
   * Método auxiliar para manejar coordenadas encontradas exitosamente
   */
  private handleSuccessfulCoordinates(
    nextCity: PendingCity,
    normalizedCity: string,
    coordinates: CachedCoordinates,
    processNext: () => void
  ): void {
    console.log(`Coordenadas encontradas para "${nextCity.city}" en el servicio CityCoordinates`);
    
    // Guardar en caché
    this.coordinatesCache.set(normalizedCity, coordinates);

    // Llamar al callback con las coordenadas
    nextCity.callback(
      nextCity.city,
      coordinates.lat,
      coordinates.lng,
      nextCity.index
    );

    // Resetear contador de intentos fallidos
    this.failedAttempts.delete(normalizedCity);
    
    // Procesar la siguiente ciudad inmediatamente sin espera
    processNext();
  }

  /**
   * Método auxiliar para llamar al GeoService con limitación de velocidad
   */
  private callGeoServiceWithRateLimit(
    nextCity: PendingCity, 
    normalizedCity: string, 
    processNext: () => void
  ): void {
    // Aplicamos la limitación de tiempo para GeoService
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const MIN_REQUEST_INTERVAL = 1250; // ms
  
    // Si han pasado menos del intervalo mínimo desde la última solicitud, esperamos
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL && this.lastRequestTime !== 0) {
      setTimeout(() => {
        // Volvemos a añadir la ciudad a la cola y procesamos
        this.pendingCities.unshift(nextCity);
        processNext();
      }, MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      return;
    }
  
    // Actualizamos el tiempo de la última solicitud
    this.lastRequestTime = now;
    
    this.geoService
      .getCoordinates(nextCity.city.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (geoCoordinates) => {
          if (geoCoordinates && geoCoordinates.lat && geoCoordinates.lon) {
            // Coordenadas válidas recibidas, guardar en caché
            const coordinates = {
              lat: Number(geoCoordinates.lat),
              lng: Number(geoCoordinates.lon),
            };
            
            this.coordinatesCache.set(normalizedCity, coordinates);
  
            // Llamar al callback con las coordenadas
            nextCity.callback(
              nextCity.city,
              coordinates.lat,
              coordinates.lng,
              nextCity.index
            );
  
            // Resetear contador de intentos fallidos
            this.failedAttempts.delete(normalizedCity);
          } else {
            this.handleFailedGeocodingAttempt(nextCity, normalizedCity);
          }
  
          // Procesar la siguiente ciudad después de un retraso
          setTimeout(processNext, 1500);
        },
        error: (error) => {
          this.handleFailedGeocodingAttempt(nextCity, normalizedCity);
          console.error(
            `Error al obtener coordenadas para "${nextCity.city}" (intento ${this.failedAttempts.get(normalizedCity)}/${this.MAX_ATTEMPTS}):`,
            error
          );
  
          // Continuar procesando incluso si hay un error
          setTimeout(processNext, 1500);
        },
      });
  }

  /**
   * Método auxiliar para manejar intentos fallidos de geocodificación
   */
  private handleFailedGeocodingAttempt(nextCity: PendingCity, normalizedCity: string): void {
    const attempts = (this.failedAttempts.get(normalizedCity) || 0) + 1;
    this.failedAttempts.set(normalizedCity, attempts);
    console.warn(
      `No se pudieron obtener coordenadas válidas para "${nextCity.city}" (intento ${attempts}/${this.MAX_ATTEMPTS})`
    );
  }

  /**
   * Obtiene una ciudad por nombre
   */
  getCityByName(cityName: string): Observable<CityResponse[]> {
    const filter: CityFilter = { name: cityName.trim() };

    return this.locationsApiService.searchCityByFilter(filter).pipe(
      catchError(error => {
        console.error(`Error al obtener ciudad por nombre ${cityName}:`, error);
        return of([]);
      })
    );
  }

  /**
   * Método para limpiar recursos al destruir el servicio
   */
  ngOnDestroy(): void {
    this.destroy();
  }

  /**
   * Método para limpiar recursos manualmente
   */
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}