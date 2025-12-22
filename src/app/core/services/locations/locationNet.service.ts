import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Location {
  id: number;
  code: string;
  name: string;
  description?: string;
  tkId?: string;
  latitude: number;
  longitude: number;
  locationTypeId: number;
  iataCode: string;
}

export interface LocationType {
  id: number;
  name: string;
  isActive: boolean;
  tkId?: string;
}

// CORREGIDO: Quité locationTypeId y agregué isActive
export interface LocationRelationship {
  id: number;
  relationshipTypeId: number;
  parentLocationId: number;
  childLocationId: number;
  isActive: boolean; // Esta propiedad faltaba
}

export interface LocationRelationshipType {
  id: number;
  code: string;
  description: string;
  name: string;
  isActive: boolean;
  parentLocationTypeId: number;
  childLocationTypeId: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationNetService {
  private apiUrl = environment.locationsApiUrl;
  
  // Cache para ubicaciones individuales
  private locationCache = new Map<number, Location>();
  // Cache para observables en curso para evitar múltiples llamadas simultáneas
  private locationObservableCache = new Map<number, Observable<Location>>();
  // Cache para llamadas batch de locations por IDs (usando string de IDs ordenados como clave)
  private locationsBatchCache = new Map<string, Observable<Location[]>>();

  constructor(private http: HttpClient) { }

  // Métodos para Location
  getLocations(filters?: any): Observable<Location[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.append(key, filters[key]);
        }
      });
    }
    return this.http.get<Location[]>(`${this.apiUrl}/location`, { params })
      .pipe(
        catchError(error => {
          return of([]);
        })
      );
  }

  // NUEVO: Método para obtener múltiples ubicaciones por IDs
  getLocationsByIds(ids: number[]): Observable<Location[]> {
    if (!ids || ids.length === 0) {
      return of([]);
    }

    // Crear una clave de cache basada en los IDs ordenados
    const sortedIds = [...ids].sort((a, b) => a - b);
    const cacheKey = sortedIds.join(',');

    // Verificar si ya existe una llamada en curso para estos IDs
    if (this.locationsBatchCache.has(cacheKey)) {
      return this.locationsBatchCache.get(cacheKey)!;
    }

    let params = new HttpParams();
    ids.forEach(id => {
      params = params.append('Id', id.toString());
    });

    const locationsObservable = this.http.get<Location[]>(`${this.apiUrl}/location`, { params })
      .pipe(
        tap((locations) => {
          // Guardar ubicaciones individuales en el cache
          locations.forEach(location => {
            if (location && location.id) {
              this.locationCache.set(location.id, location);
            }
          });
        }),
        catchError(error => {
          // Limpiar el observable cache en caso de error para permitir reintentos
          this.locationsBatchCache.delete(cacheKey);
          return of([]);
        }),
        shareReplay(1) // Compartir el resultado entre múltiples suscriptores y mantener en cache
      );

    // Guardar el observable en cache para evitar múltiples llamadas simultáneas
    this.locationsBatchCache.set(cacheKey, locationsObservable);
    
    return locationsObservable;
  }

  getLocationById(id: number): Observable<Location> {
    // Verificar si la ubicación ya está en cache
    if (this.locationCache.has(id)) {
      return of(this.locationCache.get(id)!);
    }

    // Verificar si ya hay una llamada en curso para este ID
    if (this.locationObservableCache.has(id)) {
      return this.locationObservableCache.get(id)!;
    }

    // Crear nueva llamada HTTP y configurar cache
    const locationObservable = this.http.get<Location>(`${this.apiUrl}/location/${id}`)
      .pipe(
        tap(location => {
          // Guardar en cache solo si la respuesta es válida
          if (location && location.id) {
            this.locationCache.set(id, location);
          }
          // Limpiar el observable cache una vez completado
          this.locationObservableCache.delete(id);
        }),
        catchError(error => {
          // Limpiar el observable cache en caso de error
          this.locationObservableCache.delete(id);
          return of({} as Location);
        }),
        shareReplay(1)
      );

    // Guardar el observable en cache para evitar múltiples llamadas simultáneas
    this.locationObservableCache.set(id, locationObservable);
    
    return locationObservable;
  }

  // Métodos para LocationType
  getLocationTypes(): Observable<LocationType[]> {
    return this.http.get<LocationType[]>(`${this.apiUrl}/locationtype`)
      .pipe(
        catchError(error => {
          return of([]);
        })
      );
  }

  getLocationTypeById(id: number): Observable<LocationType> {
    return this.http.get<LocationType>(`${this.apiUrl}/locationtype/${id}`)
      .pipe(
        catchError(error => {
          return of({} as LocationType);
        })
      );
  }

  // Métodos para LocationRelationship
  getLocationRelationships(filters?: any): Observable<LocationRelationship[]> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.append(key, filters[key]);
        }
      });
    }
    return this.http.get<LocationRelationship[]>(`${this.apiUrl}/locationrelationship`, { params })
      .pipe(
        catchError(error => {
          return of([]);
        })
      );
  }

  getLocationRelationshipById(id: number): Observable<LocationRelationship> {
    return this.http.get<LocationRelationship>(`${this.apiUrl}/locationrelationship/${id}`)
      .pipe(
        catchError(error => {
          return of({} as LocationRelationship);
        })
      );
  }

  // Métodos para LocationRelationshipType
  getLocationRelationshipTypes(): Observable<LocationRelationshipType[]> {
    return this.http.get<LocationRelationshipType[]>(`${this.apiUrl}/locationrelationshiptype`)
      .pipe(
        catchError(error => {
          return of([]);
        })
      );
  }

  getLocationRelationshipTypeById(id: number): Observable<LocationRelationshipType> {
    return this.http.get<LocationRelationshipType>(`${this.apiUrl}/locationrelationshiptype/${id}`)
      .pipe(
        catchError(error => {
          return of({} as LocationRelationshipType);
        })
      );
  }

  // Métodos adicionales para obtener relaciones por ubicación padre o hija
  getLocationRelationshipsByParentId(parentId: number): Observable<LocationRelationship[]> {
    return this.http.get<LocationRelationship[]>(`${this.apiUrl}/locationrelationship`, {
      params: new HttpParams().set('parentLocationId', parentId.toString())
    }).pipe(
      catchError(error => {
        return of([]);
      })
    );
  }

  getLocationRelationshipsByChildId(childId: number): Observable<LocationRelationship[]> {
    return this.http.get<LocationRelationship[]>(`${this.apiUrl}/locationrelationship`, {
      params: new HttpParams().set('childLocationId', childId.toString())
    }).pipe(
      catchError(error => {
        return of([]);
      })
    );
  }

  // Método para actualizar una ubicación existente
  updateLocation(location: Location): Observable<Location> {
    return this.http.put<Location>(`${this.apiUrl}/location/${location.id}`, location)
      .pipe(
        tap(updatedLocation => {
          // Invalidar cache y actualizar con la nueva información
          this.invalidateLocationCache(location.id);
          if (updatedLocation && updatedLocation.id) {
            this.locationCache.set(updatedLocation.id, updatedLocation);
          }
        }),
        catchError(error => {
          return of({} as Location);
        })
      );
  }

  // Método para verificar si existe una ubicación con el mismo id o tkId
  checkDuplicateFields(id: number, tkId: string): Observable<boolean> {
    // Excluimos la ubicación actual de la verificación (para ediciones)
    const params = new HttpParams()
      .set('excludeId', id.toString())
      .set('tkId', tkId);

    return this.http.get<any>(`${this.apiUrl}/location/check-duplicates`, { params })
      .pipe(
        map(response => response.isDuplicate),
        catchError(error => {
          return of(false); // En caso de error, permitimos continuar
        })
      );
  }

  // Método para crear una nueva ubicación
  createLocation(location: Location): Observable<Location> {
    return this.http.post<Location>(`${this.apiUrl}/location`, location)
      .pipe(
        tap(createdLocation => {
          // Agregar la nueva ubicación al cache
          if (createdLocation && createdLocation.id) {
            this.locationCache.set(createdLocation.id, createdLocation);
          }
        }),
        catchError(error => {
          return of({} as Location);
        })
      );
  }

  // Método para eliminar una ubicación
  deleteLocation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/location/${id}`)
      .pipe(
        tap(() => {
          // Invalidar cache cuando se elimina exitosamente
          this.invalidateLocationCache(id);
        }),
        catchError(error => {
          return of({ success: false, error });
        })
      );
  }

  // CRUD para LocationRelationship
  createLocationRelationship(relationship: LocationRelationship): Observable<LocationRelationship> {
    return this.http.post<LocationRelationship>(`${this.apiUrl}/locationrelationship`, relationship)
      .pipe(
        catchError(error => {
          throw error;
        })
      );
  }

  updateLocationRelationship(relationship: LocationRelationship): Observable<LocationRelationship> {
    return this.http.put<LocationRelationship>(`${this.apiUrl}/locationrelationship/${relationship.id}`, relationship)
      .pipe(
        catchError(error => {
          throw error;
        })
      );
  }

  deleteLocationRelationship(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/locationrelationship/${id}`)
      .pipe(
        catchError(error => {
          throw error;
        })
      );
  }

  // Método para validar si se puede crear una relación
  validateLocationRelationship(parentLocationId: number, childLocationId: number, relationshipTypeId: number): Observable<boolean> {
    const params = new HttpParams()
      .set('parentLocationId', parentLocationId.toString())
      .set('childLocationId', childLocationId.toString())
      .set('relationshipTypeId', relationshipTypeId.toString());

    return this.http.get<any>(`${this.apiUrl}/locationrelationship/validate`, { params })
      .pipe(
        map(response => response.isValid),
        catchError(error => {
          return of(false);
        })
      );
  }

  // Métodos de gestión de cache para ubicaciones
  
  /**
   * Limpia completamente el cache de ubicaciones
   */
  clearLocationCache(): void {
    this.locationCache.clear();
    this.locationObservableCache.clear();
  }

  /**
   * Invalida una ubicación específica del cache
   * Útil cuando se actualiza o elimina una ubicación
   */
  invalidateLocationCache(id: number): void {
    this.locationCache.delete(id);
    this.locationObservableCache.delete(id);
  }

  /**
   * Obtiene información del estado actual del cache
   * Útil para debugging o monitoreo
   */
  getLocationCacheInfo(): { cachedLocations: number, pendingRequests: number } {
    return {
      cachedLocations: this.locationCache.size,
      pendingRequests: this.locationObservableCache.size
    };
  }
}