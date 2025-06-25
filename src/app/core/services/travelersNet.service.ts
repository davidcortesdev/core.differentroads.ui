import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Traveler {
  id: number;
  name: string;
  email: string;
  code?: string;
}

export interface TravelerFilter {
  id?: number;
  ids?: number[]; // Para consultar múltiples IDs
  email?: string;
  name?: string;
  code?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TravelersNetService {
  private apiUrl = environment.travelersApiUrl || environment.apiUrl + '/api/travelers';
  private tourApiUrl = environment.apiUrl + '/api/tours';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los viajeros según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de viajeros.
   */
  getAll(filters?: TravelerFilter): Observable<Traveler[]> {
    // Si se solicitan múltiples IDs específicos, usar forkJoin
    if (filters?.ids && filters.ids.length > 0) {
      return this.getTravelersByIds(filters.ids);
    }

    let params = new HttpParams();

    // Add filter parameters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'ids') {
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<Traveler[]>(`${this.apiUrl}/travelers`, { params });
  }

  /**
   * Obtiene múltiples viajeros por sus IDs usando forkJoin
   * @param ids Array de IDs de viajeros
   * @returns Observable con la lista de viajeros
   */
  private getTravelersByIds(ids: number[]): Observable<Traveler[]> {
    
    // Remover duplicados
    const uniqueIds = [...new Set(ids)];
    
    if (uniqueIds.length === 0) {
      return of([]);
    }
    
    if (uniqueIds.length === 1) {
      // Si solo es un ID, usar getTravelerById y convertir a array
      return this.getTravelerById(uniqueIds[0]).pipe(
        catchError(error => {
          console.error(`❌ Error getting traveler ${uniqueIds[0]}:`, error);
          return of({ id: uniqueIds[0], name: 'Usuario desconocido', email: '' } as Traveler);
        }),
        // Convertir el resultado individual a array
        map(traveler => [traveler])
      );
    }
    
    // Para múltiples IDs, usar forkJoin
    const requests = uniqueIds.map(id => 
      this.getTravelerById(id).pipe(
        catchError(error => {
          console.error(`❌ Error getting traveler ${id}:`, error);
          // Retornar un traveler por defecto en caso de error
          return of({ id, name: 'Usuario desconocido', email: '' } as Traveler);
        })
      )
    );
    
    return forkJoin(requests);
  }

  /**
   * Obtiene un viajero por su ID
   * @param id ID del viajero
   * @returns Observable con los datos del viajero
   */
  getTravelerById(id: number): Observable<Traveler> {
    return this.http.get<Traveler>(`${this.apiUrl}/travelers/${id}`);
  }

  /**
   * Obtiene viajeros según un filtro
   * @param filter Filtro para buscar viajeros
   * @returns Observable con la lista de viajeros que coinciden con el filtro
   */
  getTravelers(filter: TravelerFilter): Observable<Traveler[]> {
    let params = new HttpParams();
    
    if (filter.email) {
      params = params.set('Email', filter.email); 
    }
    if (filter.name) {
      params = params.set('Name', filter.name); 
    }
    if (filter.code) {
      params = params.set('code', filter.code);
    }
    
    return this.http.get<Traveler[]>(`${this.apiUrl}/travelers`, { params });
  }

  /**
   * Crea un nuevo viajero
   * @param traveler Datos del viajero a crear
   * @returns Observable con los datos del viajero creado
   */
  createTraveler(traveler: Partial<Traveler>): Observable<Traveler> {
    return this.http.post<Traveler>(`${this.apiUrl}/travelers`, traveler);
  }

  /**
   * Obtiene el ID del tour a partir del ID del período
   * @param periodId ID del período
   * @returns Observable con el ID del tour
   */
  getTourIdByPeriodId(periodId: string): Observable<number> {
    return this.http.get<number>(`${this.tourApiUrl}/byPeriod/${periodId}`);
  }
}