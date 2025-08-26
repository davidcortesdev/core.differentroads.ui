import { Injectable } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LocationAirportNetService } from './locations/locationAirportNet.service';
import { LocationNetService } from './locations/locationNet.service';

export interface AirportCityInfo {
  cityName: string;
  airportName?: string;
  isLoaded: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AirportCityCacheService {
  private airportCityCache = new Map<string, AirportCityInfo>();
  private loadingPromises = new Map<string, Promise<void>>();
  private destroy$ = new Subject<void>();

  constructor(
    private locationAirportNetService: LocationAirportNetService,
    private locationNetService: LocationNetService
  ) {}

  /**
   * Obtiene el nombre de la ciudad desde el cache
   * @param airportIATA Código IATA del aeropuerto
   * @returns Nombre de la ciudad o string vacío si no está en cache
   */
  getCityNameFromCache(airportIATA: string | null | undefined): string {
    if (!airportIATA) return '';

    const cacheKey = `airport_${airportIATA}`;
    const cachedInfo = this.airportCityCache.get(cacheKey);
    
    if (cachedInfo && cachedInfo.isLoaded) {
      return cachedInfo.cityName;
    }

    return '';
  }

  /**
   * Obtiene el nombre de la ciudad, cargándola automáticamente si no está en cache
   * @param airportIATA Código IATA del aeropuerto
   * @returns Promise que se resuelve con el nombre de la ciudad
   */
  getCityName(airportIATA: string | null | undefined): Promise<string> {
    if (!airportIATA) {
      return Promise.resolve('');
    }

    const cacheKey = `airport_${airportIATA}`;
    const cachedInfo = this.airportCityCache.get(cacheKey);
    
    if (cachedInfo && cachedInfo.isLoaded) {
      return Promise.resolve(cachedInfo.cityName);
    }

    // Si no está en cache, cargarla automáticamente
    // En este punto sabemos que airportIATA es string
    return this.loadCityNameForAirportAsync(airportIATA).then(() => {
      const finalInfo = this.airportCityCache.get(cacheKey);
      return finalInfo ? finalInfo.cityName : airportIATA;
    });
  }

  /**
   * Obtiene el nombre de la ciudad de forma síncrona (solo del cache)
   * @param airportIATA Código IATA del aeropuerto
   * @returns Nombre de la ciudad o string vacío si no está en cache
   */
  getCityNameSync(airportIATA: string | null | undefined): string {
    return this.getCityNameFromCache(airportIATA);
  }

  /**
   * Verifica si una ciudad está en cache
   * @param airportIATA Código IATA del aeropuerto
   * @returns true si la ciudad está en cache y cargada
   */
  isCityCached(airportIATA: string | null | undefined): boolean {
    if (!airportIATA) return false;

    const cacheKey = `airport_${airportIATA}`;
    const cachedInfo = this.airportCityCache.get(cacheKey);
    
    return cachedInfo ? cachedInfo.isLoaded : false;
  }

  /**
   * Carga de forma asíncrona el nombre de la ciudad para un aeropuerto
   * @param airportIATA Código IATA del aeropuerto
   * @returns Promise que se resuelve cuando se completa la carga
   */
  loadCityNameForAirportAsync(airportIATA: string): Promise<void> {
    if (!airportIATA) {
      return Promise.resolve();
    }

    const cacheKey = `airport_${airportIATA}`;
    
    // Si ya está cargando, retornar la promesa existente
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    // Si ya está en cache y cargada, retornar inmediatamente
    if (this.isCityCached(airportIATA)) {
      return Promise.resolve();
    }

    // Marcar como cargando
    this.airportCityCache.set(cacheKey, {
      cityName: '',
      isLoaded: false
    });

    // Crear nueva promesa de carga
    const loadPromise = this.performCityLoad(airportIATA, cacheKey);
    this.loadingPromises.set(cacheKey, loadPromise);

    // Limpiar la promesa cuando se complete
    loadPromise.finally(() => {
      this.loadingPromises.delete(cacheKey);
    });

    return loadPromise;
  }

  /**
   * Precarga los nombres de ciudades para todos los aeropuertos en paralelo
   * @param airportCodes Array de códigos IATA de aeropuertos
   * @returns Promise que se resuelve cuando todas las ciudades están cargadas
   */
  preloadAllAirportCities(airportCodes: string[]): Promise<void> {
    if (!airportCodes || airportCodes.length === 0) {
      return Promise.resolve();
    }

    // Filtrar solo los aeropuertos que no están en cache
    const uncachedAirports = airportCodes.filter(code => !this.isCityCached(code));

    if (uncachedAirports.length === 0) {
      //console.log('✅ Todas las ciudades ya están en cache');
      return Promise.resolve();
    }

    // Crear promesas para cada aeropuerto
    const airportPromises = uncachedAirports.map(airportCode => 
      this.loadCityNameForAirportAsync(airportCode)
    );

    // Esperar a que todas las promesas se completen
    return Promise.all(airportPromises).then(() => {
      //console.log('✅ Todas las ciudades de aeropuertos han sido cargadas');
    }).catch((error) => {
      console.warn('⚠️ Algunas ciudades no se pudieron cargar:', error);
    });
  }

  /**
   * Verifica si hay ciudades pendientes de cargar
   * @param airportCodes Array de códigos IATA de aeropuertos
   * @returns true si hay ciudades pendientes, false si todas están cargadas
   */
  hasPendingCities(airportCodes: string[]): boolean {
    if (!airportCodes || airportCodes.length === 0) {
      return false;
    }

    return airportCodes.some(code => !this.isCityCached(code));
  }

  /**
   * Obtiene un Observable que emite cuando una ciudad específica se carga
   * @param airportIATA Código IATA del aeropuerto
   * @returns Observable que emite el nombre de la ciudad cuando se carga
   */
  getCityNameObservable(airportIATA: string): Observable<string> {
    if (!airportIATA) {
      return of('');
    }

    const cacheKey = `airport_${airportIATA}`;
    const cachedInfo = this.airportCityCache.get(cacheKey);

    if (cachedInfo && cachedInfo.isLoaded) {
      return of(cachedInfo.cityName);
    }

    // Si no está en cache, cargarla y retornar el observable
    return new Observable(observer => {
      this.loadCityNameForAirportAsync(airportIATA).then(() => {
        const finalInfo = this.airportCityCache.get(cacheKey);
        if (finalInfo && finalInfo.isLoaded) {
          observer.next(finalInfo.cityName);
          observer.complete();
        } else {
          observer.next('');
          observer.complete();
        }
      }).catch(() => {
        observer.next('');
        observer.complete();
      });
    });
  }

  /**
   * Limpia el cache de ciudades
   */
  clearCache(): void {
    console.log('🧹 Limpiando cache de ciudades de aeropuertos');
    this.airportCityCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats(): { total: number; loaded: number; pending: number } {
    const total = this.airportCityCache.size;
    const loaded = Array.from(this.airportCityCache.values()).filter(info => info.isLoaded).length;
    const pending = total - loaded;

    return { total, loaded, pending };
  }

  /**
   * Obtiene múltiples nombres de ciudades, cargando automáticamente las que no estén en cache
   * @param airportCodes Array de códigos IATA de aeropuertos
   * @returns Promise que se resuelve con un array de nombres de ciudades
   */
  getMultipleCityNames(airportCodes: (string | null | undefined)[]): Promise<string[]> {
    if (!airportCodes || airportCodes.length === 0) {
      return Promise.resolve([]);
    }

    // Crear promesas para cada código válido
    const cityPromises: Promise<string>[] = [];
    
    for (const code of airportCodes) {
      if (code) {
        // Type assertion: sabemos que code no es null/undefined aquí
        cityPromises.push(this.getCityName(code as string));
      }
    }
    
    if (cityPromises.length === 0) {
      return Promise.resolve([]);
    }

    return Promise.all(cityPromises);
  }

  /**
   * Obtiene múltiples nombres de ciudades de forma síncrona (solo del cache)
   * @param airportCodes Array de códigos IATA de aeropuertos
   * @returns Array de nombres de ciudades (vacío para las que no estén en cache)
   */
  getMultipleCityNamesSync(airportCodes: (string | null | undefined)[]): string[] {
    if (!airportCodes || airportCodes.length === 0) {
      return [];
    }

    const result: string[] = [];
    
    for (const code of airportCodes) {
      if (code) {
        // Type assertion: sabemos que code no es null/undefined aquí
        result.push(this.getCityNameSync(code as string));
      }
    }
    
    return result;
  }

  /**
   * Método privado para realizar la carga real de la ciudad
   */
  private performCityLoad(airportIATA: string, cacheKey: string): Promise<void> {
    return new Promise((resolve) => {
      this.locationAirportNetService.getAirports({ iata: airportIATA })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (airports) => {
            if (airports && airports.length > 0) {
              const airport = airports[0];
              if (airport.locationId) {
                // Obtener el nombre de la ciudad
                this.locationNetService.getLocationById(airport.locationId)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: (city) => {
                      if (city && city.name) {
                        const cityName = city.name;
                        this.airportCityCache.set(cacheKey, {
                          cityName: cityName,
                          airportName: airport.name,
                          isLoaded: true
                        });
                        //console.log(`✅ Ciudad encontrada para aeropuerto ${airportIATA}: ${cityName}`);
                      } else {
                        this.setFallbackCityName(airportIATA, cacheKey, airport.name || airportIATA);
                      }
                      resolve();
                    },
                    error: (error) => {
                      console.warn(`⚠️ Error al obtener ciudad para aeropuerto ${airportIATA}:`, error);
                      this.setFallbackCityName(airportIATA, cacheKey, airport.name || airportIATA);
                      resolve();
                    }
                  });
              } else {
                // Si no hay locationId, usar el nombre del aeropuerto o el código IATA
                const airportName = airport.name || airportIATA;
                this.setFallbackCityName(airportIATA, cacheKey, airportName);
                console.log(`ℹ️ Aeropuerto ${airportIATA} sin ciudad asociada, usando: ${airportName}`);
                resolve();
              }
            } else {
              // Si no se encuentra el aeropuerto, usar el código IATA como fallback
              this.setFallbackCityName(airportIATA, cacheKey, airportIATA);
              console.warn(`⚠️ Aeropuerto ${airportIATA} no encontrado, usando código IATA como fallback`);
              resolve();
            }
          },
          error: (error) => {
            console.warn(`⚠️ Error al obtener aeropuerto ${airportIATA}:`, error);
            // En caso de error, usar el código IATA como fallback
            this.setFallbackCityName(airportIATA, cacheKey, airportIATA);
            resolve();
          }
        });
    });
  }

  /**
   * Método privado para establecer un nombre de ciudad de fallback
   */
  private setFallbackCityName(airportIATA: string, cacheKey: string, fallbackName: string): void {
    this.airportCityCache.set(cacheKey, {
      cityName: fallbackName,
      airportName: fallbackName,
      isLoaded: true
    });
  }

  /**
   * Limpia los recursos al destruir el servicio
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearCache();
  }
}
