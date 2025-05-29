import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Location, LocationType, LocationRelationship, LocationRelationshipType } from '../../models/location/location.model';

@Injectable({
  providedIn: 'root'
})
export class LocationNetService {
  private apiUrl = environment.locationsApiUrl;

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
          console.error('Error obteniendo ubicaciones:', error);
          return of([]);
        })
      );
  }

  getLocationById(id: number): Observable<Location> {
    return this.http.get<Location>(`${this.apiUrl}/location/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Error obteniendo ubicación con ID ${id}:`, error);
          return of({} as Location);
        })
      );
  }

  // Métodos para LocationType
  getLocationTypes(): Observable<LocationType[]> {
    return this.http.get<LocationType[]>(`${this.apiUrl}/locationtype`)
      .pipe(
        catchError(error => {
          console.error('Error obteniendo tipos de ubicación:', error);
          return of([]);
        })
      );
  }

  getLocationTypeById(id: number): Observable<LocationType> {
    return this.http.get<LocationType>(`${this.apiUrl}/locationtype/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Error obteniendo tipo de ubicación con ID ${id}:`, error);
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
          console.error('Error obteniendo relaciones de ubicación:', error);
          return of([]);
        })
      );
  }

  getLocationRelationshipById(id: number): Observable<LocationRelationship> {
    return this.http.get<LocationRelationship>(`${this.apiUrl}/locationrelationship/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Error obteniendo relación de ubicación con ID ${id}:`, error);
          return of({} as LocationRelationship);
        })
      );
  }

  // Métodos para LocationRelationshipType
  getLocationRelationshipTypes(): Observable<LocationRelationshipType[]> {
    return this.http.get<LocationRelationshipType[]>(`${this.apiUrl}/locationrelationshiptype`)
      .pipe(
        catchError(error => {
          console.error('Error obteniendo tipos de relación de ubicación:', error);
          return of([]);
        })
      );
  }

  getLocationRelationshipTypeById(id: number): Observable<LocationRelationshipType> {
    return this.http.get<LocationRelationshipType>(`${this.apiUrl}/locationrelationshiptype/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Error obteniendo tipo de relación de ubicación con ID ${id}:`, error);
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
        console.error(`Error obteniendo relaciones para ubicación padre ${parentId}:`, error);
        return of([]);
      })
    );
  }

  getLocationRelationshipsByChildId(childId: number): Observable<LocationRelationship[]> {
    return this.http.get<LocationRelationship[]>(`${this.apiUrl}/locationrelationship`, {
      params: new HttpParams().set('childLocationId', childId.toString())
    }).pipe(
      catchError(error => {
        console.error(`Error obteniendo relaciones para ubicación hija ${childId}:`, error);
        return of([]);
      })
    );
  }

  // Método para actualizar una ubicación existente
  updateLocation(location: Location): Observable<Location> {
    return this.http.put<Location>(`${this.apiUrl}/location/${location.id}`, location)
      .pipe(
        catchError(error => {
          console.error(`Error actualizando ubicación con ID ${location.id}:`, error);
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
          console.error('Error verificando duplicados:', error);
          return of(false); // En caso de error, permitimos continuar
        })
      );
  }

  // Método para crear una nueva ubicación
  createLocation(location: Location): Observable<Location> {
    return this.http.post<Location>(`${this.apiUrl}/location`, location)
      .pipe(
        catchError(error => {
          console.error('Error creando ubicación:', error);
          return of({} as Location);
        })
      );
  }

  // Método para eliminar una ubicación
  deleteLocation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/location/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Error eliminando ubicación con ID ${id}:`, error);
          return of({ success: false, error });
        })
      );
  }
  // Agregar estos métodos al final de la clase LocationNetService

  // CRUD para LocationRelationship
  createLocationRelationship(relationship: LocationRelationship): Observable<LocationRelationship> {
    return this.http.post<LocationRelationship>(`${this.apiUrl}/locationrelationship`, relationship)
      .pipe(
        catchError(error => {
          console.error('Error creando relación de ubicación:', error);
          throw error;
        })
      );
  }

  updateLocationRelationship(relationship: LocationRelationship): Observable<LocationRelationship> {
    return this.http.put<LocationRelationship>(`${this.apiUrl}/locationrelationship/${relationship.id}`, relationship)
      .pipe(
        catchError(error => {
          console.error(`Error actualizando relación de ubicación con ID ${relationship.id}:`, error);
          throw error;
        })
      );
  }

  deleteLocationRelationship(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/locationrelationship/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Error eliminando relación de ubicación con ID ${id}:`, error);
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
          console.error('Error validando relación de ubicación:', error);
          return of(false);
        })
      );
  }
}


