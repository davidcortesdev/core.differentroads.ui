import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TripTypeCreate {
  code: string;
  name: string;
  description?: string;
  tkId?: string;
  isActive?: boolean;
  color?: string;
}

export interface TripTypeUpdate {
  code: string;
  name: string;
  description?: string;
  tkId?: string;
  isActive?: boolean;
  color?: string;
}

export interface ITripTypeResponse {
  code: string;
  name: string;
  description: string;
  tkId: string;
  isActive: boolean;
  color: string;
  id: number;
  abbreviation: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TripTypeFilters {
  id?: number;
  tkId?: string;
  code?: string;
  name?: string;
  isActive?: boolean;
  color?: string;
  useExactMatchForStrings?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TripTypeService {
  private readonly API_URL = `${environment.masterdataApiUrl}/TripType`;

  // Cache para tipos de viaje individuales
  private tripTypeCache = new Map<number, ITripTypeResponse>();
  // Cache para observables en curso para evitar múltiples llamadas simultáneas
  private tripTypeObservableCache = new Map<number, Observable<ITripTypeResponse>>();

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de viaje según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de tipos de viaje.
   */
  getAll(filters?: TripTypeFilters): Observable<ITripTypeResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<ITripTypeResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo tipo de viaje.
   * @param data Datos para crear el tipo de viaje.
   * @returns El tipo de viaje creado.
   */
  create(data: TripTypeCreate): Observable<ITripTypeResponse> {
    return this.http.post<ITripTypeResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    })
      .pipe(
        tap(createdTripType => {
          // Agregar el nuevo tipo de viaje al cache
          if (createdTripType && createdTripType.id) {
            this.tripTypeCache.set(createdTripType.id, createdTripType);
          }
        }),
        catchError(error => {
          return of({} as ITripTypeResponse);
        })
      );
  }

  /**
   * Obtiene un tipo de viaje específico por su ID.
   * @param id ID del tipo de viaje.
   * @returns El tipo de viaje encontrado.
   */
  getById(id: number): Observable<ITripTypeResponse> {
    // Verificar si el tipo de viaje ya está en cache
    if (this.tripTypeCache.has(id)) {
      return of(this.tripTypeCache.get(id)!);
    }

    // Verificar si ya hay una llamada en curso para este ID
    if (this.tripTypeObservableCache.has(id)) {
      return this.tripTypeObservableCache.get(id)!;
    }

    // Crear nueva llamada HTTP y configurar cache
    const tripTypeObservable = this.http.get<ITripTypeResponse>(`${this.API_URL}/${id}`)
      .pipe(
        tap(tripType => {
          // Guardar en cache solo si la respuesta es válida
          if (tripType && tripType.id) {
            this.tripTypeCache.set(id, tripType);
          }
          // Limpiar el observable cache una vez completado
          this.tripTypeObservableCache.delete(id);
        }),
        catchError(error => {
          // Limpiar el observable cache en caso de error
          this.tripTypeObservableCache.delete(id);
          return of({} as ITripTypeResponse);
        }),
        shareReplay(1)
      );

    // Guardar el observable en cache para evitar múltiples llamadas simultáneas
    this.tripTypeObservableCache.set(id, tripTypeObservable);
    
    return tripTypeObservable;
  }

  /**
   * Actualiza un tipo de viaje existente.
   * @param id ID del tipo de viaje a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: TripTypeUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    })
      .pipe(
        tap(success => {
          // Invalidar cache cuando se actualiza exitosamente
          if (success) {
            this.invalidateTripTypeCache(id);
          }
        }),
        catchError(error => {
          return of(false);
        })
      );
  }

  /**
   * Elimina un tipo de viaje existente.
   * @param id ID del tipo de viaje a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`)
      .pipe(
        tap(success => {
          // Invalidar cache cuando se elimina exitosamente
          if (success) {
            this.invalidateTripTypeCache(id);
          }
        }),
        catchError(error => {
          return of(false);
        })
      );
  }

  /**
   * Obtiene tipos de viaje por código.
   * @param code Código del tipo de viaje.
   * @returns Lista de tipos de viaje que coinciden con el código.
   */
  getByCode(code: string): Observable<ITripTypeResponse[]> {
    const params = new HttpParams()
      .set('Code', code)
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<ITripTypeResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene solo los tipos de viaje activos.
   * @returns Lista de tipos de viaje activos.
   */
  getActiveTripTypes(): Observable<ITripTypeResponse[]> {
    const params = new HttpParams()
      .set('IsActive', 'true')
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<ITripTypeResponse[]>(this.API_URL, { params });
  }

  // Métodos de gestión de cache para tipos de viaje
  
  /**
   * Limpia completamente el cache de tipos de viaje
   */
  clearTripTypeCache(): void {
    this.tripTypeCache.clear();
    this.tripTypeObservableCache.clear();
  }

  /**
   * Invalida un tipo de viaje específico del cache
   * Útil cuando se actualiza o elimina un tipo de viaje
   */
  invalidateTripTypeCache(id: number): void {
    this.tripTypeCache.delete(id);
    this.tripTypeObservableCache.delete(id);
  }

  /**
   * Obtiene información del estado actual del cache
   * Útil para debugging o monitoreo
   */
  getTripTypeCacheInfo(): { cachedTripTypes: number, pendingRequests: number } {
    return {
      cachedTripTypes: this.tripTypeCache.size,
      pendingRequests: this.tripTypeObservableCache.size
    };
  }
}