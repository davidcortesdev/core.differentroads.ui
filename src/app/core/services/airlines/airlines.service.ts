import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface AirlineFilter {
  id?: number;
  name?: string;
  codeIATA?: string;
  prefixIATA?: string;
}

export interface Airline {
  id: number;
  name: string | null;
  prefixIATA: string | null;
  codeIATA: string | null;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class AirlinesService {
  private readonly API_URL = `${environment.hotelsApiUrl}/Airline`;
  private airlineCache: { [prefix: string]: string } = {};
  
  // Caché para las consultas de aerolíneas
  private airlinesCache: { [key: string]: CacheItem<Airline[]> } = {};
  // Tiempo de expiración de la caché en milisegundos (30 minutos por defecto)
  private cacheDuration = 30 * 60 * 1000;
  // Observable compartido para peticiones simultáneas
  private ongoingRequests: { [key: string]: Observable<Airline[]> } = {};

  constructor(private http: HttpClient) {}

  /**
   * Obtiene aerolíneas con filtros opcionales
   * @param filter Criterios de filtro opcionales
   * @returns Observable de array de Airline
   */
  getAirlines(filter?: AirlineFilter): Observable<Airline[]> {
    let params = new HttpParams();

    // Añadir parámetros de filtro si se proporcionan
    if (filter) {
      params = this.addFilterParams(params, filter);
    }

    // Crear una clave única para esta consulta
    const cacheKey = this.createCacheKey(params);
    
    // Comprobar si hay una petición en curso para esta misma consulta
    if (this.ongoingRequests[cacheKey]) {
      return this.ongoingRequests[cacheKey];
    }

    // Comprobar si tenemos datos en caché y si son válidos
    const cachedData = this.airlinesCache[cacheKey];
    if (cachedData && this.isCacheValid(cachedData.timestamp)) {
      return of(cachedData.data);
    }

    // Si no hay caché válida, realizar la petición HTTP
    this.ongoingRequests[cacheKey] = this.http.get<Airline[]>(`${this.API_URL}`, { params }).pipe(
      tap(airlines => {
        // Guardar en caché
        this.airlinesCache[cacheKey] = {
          data: airlines,
          timestamp: Date.now()
        };
        
        // Actualizar también la caché de nombres por código IATA
        this.updateAirlineNameCache(airlines);
      }),
      catchError(error => {
        // Si hay un error, intentar devolver datos en caché aunque estén caducados
        if (cachedData) {
          return of(cachedData.data);
        }
        return of([]);
      }),
      // Compartir la respuesta entre múltiples suscriptores
      shareReplay(1),
      // Limpiar la referencia a la petición en curso cuando se complete
      tap(() => {
        setTimeout(() => {
          delete this.ongoingRequests[cacheKey];
        }, 0);
      })
    );

    return this.ongoingRequests[cacheKey];
  }

  /**
   * Obtiene el nombre de una aerolínea a partir del prefijo IATA (primeras 2 letras del número de vuelo)
   * @param flightNumber Número de vuelo
   * @returns Observable con el nombre de la aerolínea
   */
  getAirlineNameByFlightNumber(flightNumber: string): Observable<string> {
    if (!flightNumber || flightNumber.length < 2) {
      return of('');
    }
  
    const codeIATA = flightNumber.substring(0, 2);
  
    // Si ya tenemos el nombre en caché, devolverlo directamente
    if (this.airlineCache[codeIATA]) {
      return of(this.airlineCache[codeIATA]);
    }
    
    // Intentar obtener todas las aerolíneas de la caché primero
    const allAirlinesCacheKey = this.createCacheKey(new HttpParams());
    const cachedAllAirlines = this.airlinesCache[allAirlinesCacheKey];
    
    if (cachedAllAirlines && this.isCacheValid(cachedAllAirlines.timestamp)) {
      const airline = cachedAllAirlines.data.find(a => a.codeIATA === codeIATA);
      if (airline) {
        const airlineName = airline.name || codeIATA;
        this.airlineCache[codeIATA] = airlineName;
        return of(airlineName);
      }
    }
    
    // Si no está en caché, hacer la petición específica
    return this.getAirlines({ codeIATA }).pipe(
      map(airlines => {
        if (airlines && airlines.length > 0) {
          const airlineName = airlines[0].name || codeIATA;
          this.airlineCache[codeIATA] = airlineName;
          return airlineName;
        }
        return codeIATA;
      }),
      catchError(() => {
        return of(codeIATA);
      })
    );
  }

  /**
   * Limpia toda la caché de aerolíneas
   */
  clearCache(): void {
    this.airlinesCache = {};
    this.airlineCache = {};
  }

  /**
   * Establece la duración de la caché en milisegundos
   * @param durationMs Duración en milisegundos
   */
  setCacheDuration(durationMs: number): void {
    this.cacheDuration = durationMs;
  }

  /**
   * Método auxiliar para añadir parámetros de filtro a HttpParams
   * @param params Objeto HttpParams inicial
   * @param filter Criterios de filtro
   * @returns HttpParams con parámetros de filtro añadidos
   */
  private addFilterParams(params: HttpParams, filter: AirlineFilter): HttpParams {
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            params = params.append(key, item.toString());
          });
        } else {
          params = params.set(key, value.toString());
        }
      }
    });
    return params;
  }

  /**
   * Crea una clave única para la caché basada en los parámetros de la consulta
   * @param params Parámetros HTTP de la consulta
   * @returns Clave única para la caché
   */
  private createCacheKey(params: HttpParams): string {
    // Convertir los parámetros a un string ordenado para usar como clave
    const paramsString = params.keys()
      .sort()
      .map(key => {
        const values = params.getAll(key);
        return `${key}=${values ? values.sort().join(',') : ''}`;
      })
      .join('&');
    
    return paramsString || 'all';
  }

  /**
   * Comprueba si una entrada de caché sigue siendo válida
   * @param timestamp Marca de tiempo de la entrada de caché
   * @returns true si la caché es válida, false si ha expirado
   */
  private isCacheValid(timestamp: number): boolean {
    return (Date.now() - timestamp) < this.cacheDuration;
  }

  /**
   * Actualiza la caché de nombres de aerolíneas por código IATA
   * @param airlines Lista de aerolíneas
   */
  private updateAirlineNameCache(airlines: Airline[]): void {
    airlines.forEach(airline => {
      if (airline.codeIATA && airline.name) {
        this.airlineCache[airline.codeIATA] = airline.name;
      }
    });
  }
}