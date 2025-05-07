import { Injectable } from '@angular/core';
import { Observable, of, from, Subject } from 'rxjs';
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
export class CityCoordinatesService {
  // Cache para almacenar coordenadas ya buscadas
  private coordinatesCache: Map<string, { lat: number, lng: number }> = new Map();
  
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
   * Busca las coordenadas de una ciudad, primero en la API de localizaciones
   * y si no se encuentra, utiliza el método alternativo actual
   */
  /**
   * Busca las coordenadas de una ciudad, primero en la API de localizaciones
   * y si no se encuentra, utiliza el método alternativo actual
   */
  getCityCoordinates(cityName: string): Observable<{ lat: number, lng: number } | null> {
    const normalizedCityName = cityName.trim();
  
    if (!normalizedCityName) {
      console.warn('Nombre de ciudad vacío después de normalizar');
      return of(null);
    }
  
    if (this.coordinatesCache.has(normalizedCityName)) {
      return of(this.coordinatesCache.get(normalizedCityName)!);
    }
  
    // Create a CityFilter object instead of passing the string directly
    const filter: CityFilter = { name: normalizedCityName };
    
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
  convertCitiesToCityObjects(cityNames: string[]): Observable<City[]> {
    if (!cityNames || cityNames.length === 0) {
      return of([]);
    }

    // Crear un array de observables para cada ciudad
    const cityObservables = cityNames.map(cityName => 
      this.getCityCoordinates(cityName).pipe(
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

    // Combinar todos los observables y filtrar los nulos
    return from(Promise.all(cityObservables.map(obs => 
      obs.toPromise()
    ))).pipe(
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
    const normalizedCity = city ? city.trim() : '';
    
    // Omitir nombres de ciudad vacíos o inválidos
    if (!normalizedCity || typeof normalizedCity !== 'string') {
      console.warn('Omitiendo nombre de ciudad inválido:', city);
      return;
    }
    
    // Verificar si ya tenemos las coordenadas en caché (usando el nombre normalizado)
    if (this.coordinatesCache.has(normalizedCity.toLowerCase())) {
      console.log(`Usando coordenadas en caché para "${normalizedCity}"`);
      const cachedCoordinates = this.coordinatesCache.get(normalizedCity.toLowerCase())!;
      callback(normalizedCity, cachedCoordinates.lat, cachedCoordinates.lng, index);
      return;
    }
  
    // Verificar si hemos excedido el número máximo de intentos fallidos
    const attempts = this.failedAttempts.get(normalizedCity.toLowerCase()) || 0;
    if (attempts >= this.MAX_ATTEMPTS) {
      console.warn(
        `Omitiendo geocodificación para "${normalizedCity}" después de ${this.MAX_ATTEMPTS} intentos fallidos`
      );
      return;
    }
  
    // Verificar si esta ciudad ya está en la cola pendiente
    if (this.pendingCities.some(pending => pending.city.toLowerCase() === normalizedCity.toLowerCase())) {
      console.log(`La ciudad "${normalizedCity}" ya está en la cola pendiente`);
      return;
    }
  
    // Agregar a la cola pendiente y procesar
    console.log(`Agregando "${normalizedCity}" a la cola de geocodificación`);
    this.pendingCities.push({ city: normalizedCity, index, callback });
  
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
  
      const normalizedCity = nextCity.city.trim().toLowerCase();
  
      // Verificar caché nuevamente antes de hacer la solicitud (en caso de que se haya agregado mientras estaba en cola)
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
      // No aplicamos limitación de tiempo para este servicio
      this.getCityCoordinates(nextCity.city)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (coordinates) => {
            if (coordinates) {
              // Si encontramos coordenadas en el servicio de CityCoordinates, las usamos
              console.log(`Coordenadas encontradas para "${nextCity.city}" en el servicio CityCoordinates`);
              
              // Guardar en caché
              this.coordinatesCache.set(normalizedCity, {
                lat: coordinates.lat,
                lng: coordinates.lng,
              });
  
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
            } else {
              // Si no encontramos coordenadas en CityCoordinates, intentamos con GeoService
              console.log(`No se encontraron coordenadas para "${nextCity.city}" en CityCoordinates, intentando con GeoService`);
              
              // AQUÍ APLICAMOS LA LIMITACIÓN DE TIEMPO SOLO PARA GEOSERVICE
              this.callGeoServiceWithRateLimit(nextCity, normalizedCity, processNext);
            }
          },
          error: (error) => {
            console.error(`Error al obtener coordenadas para "${nextCity.city}" desde CityCoordinates:`, error);
            
            // En caso de error, intentamos con GeoService
            // AQUÍ APLICAMOS LA LIMITACIÓN DE TIEMPO SOLO PARA GEOSERVICE
            this.callGeoServiceWithRateLimit(nextCity, normalizedCity, processNext);
          },
        });
    };
  
    processNext();
  }

  /**
   * Método auxiliar para llamar al GeoService con limitación de velocidad
   * Extrae la lógica común para evitar duplicación de código
   */
  private callGeoServiceWithRateLimit(
    nextCity: PendingCity, 
    normalizedCity: string, 
    processNext: () => void
  ): void {
    // Aplicamos la limitación de tiempo para GeoService
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
  
    // Si han pasado menos de 1.25 segundos desde la última solicitud, esperamos
    if (timeSinceLastRequest < 1250 && this.lastRequestTime !== 0) {
      setTimeout(() => {
        // Volvemos a añadir la ciudad a la cola y procesamos
        this.pendingCities.unshift(nextCity);
        processNext();
      }, 1250 - timeSinceLastRequest);
      return;
    }
  
    // Actualizamos el tiempo de la última solicitud
    this.lastRequestTime = now;
    
    // Asegurarnos de que el nombre de la ciudad esté normalizado antes de la llamada
    const cityNameTrimmed = nextCity.city.trim();
    
    this.geoService
      .getCoordinates(cityNameTrimmed)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (geoCoordinates) => {
          if (geoCoordinates && geoCoordinates.lat && geoCoordinates.lon) {
            // Coordenadas válidas recibidas, guardar en caché
            this.coordinatesCache.set(normalizedCity, {
              lat: Number(geoCoordinates.lat),
              lng: Number(geoCoordinates.lon),
            });
  
            // Llamar al callback con las coordenadas
            nextCity.callback(
              nextCity.city,
              Number(geoCoordinates.lat),
              Number(geoCoordinates.lon),
              nextCity.index
            );
  
            // Resetear contador de intentos fallidos
            this.failedAttempts.delete(normalizedCity);
          } else {
            // Coordenadas inválidas o vacías, incrementar intentos fallidos
            const attempts = (this.failedAttempts.get(nextCity.city) || 0) + 1;
            this.failedAttempts.set(nextCity.city, attempts);
            console.warn(
              `No se pudieron obtener coordenadas válidas para "${nextCity.city}" (intento ${attempts}/${this.MAX_ATTEMPTS})`
            );
          }
  
          // Procesar la siguiente ciudad después de un retraso de 1.5 segundos
          // Mantenemos este retraso para evitar sobrecargar el servicio GeoService
          setTimeout(processNext, 1500);
        },
        error: (error) => {
          // Incrementar intentos fallidos en caso de error
          const attempts = (this.failedAttempts.get(nextCity.city) || 0) + 1;
          this.failedAttempts.set(nextCity.city, attempts);
  
          console.error(
            `Error al obtener coordenadas para "${nextCity.city}" (intento ${attempts}/${this.MAX_ATTEMPTS}):`,
            error
          );
  
          // Continuar procesando incluso si hay un error, con un retraso de 1.5 segundos
          setTimeout(processNext, 1500);
        },
      });
  }

  /**
   * Método para limpiar recursos al destruir el servicio
   */
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

getCityByName(cityName: string): Observable<CityResponse[]> {
  const filter: CityFilter = { name: cityName.trim() };

  return this.locationsApiService.searchCityByFilter(filter).pipe(
    catchError(error => {
      console.error(`Error al obtener ciudad por nombre ${cityName}:`, error);
      return of([]);
    })
  );
}
}