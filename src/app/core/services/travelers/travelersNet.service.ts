import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface Traveler {
  id: number;
  name: string;
  email: string;
  code?: string;
}

export interface TravelerFilter {
  id?: number | number[]; // Acepta un solo ID o array de IDs
  email?: string;
  name?: string;
  code?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TravelersNetService {
  private apiUrl = environment.travelersApiUrl + '/api/travelers';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los viajeros según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de viajeros.
   */
  getAll(filters?: TravelerFilter): Observable<Traveler[]> {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'id') {
            // Manejar el caso de id(s)
            if (Array.isArray(value)) {
              // Si es un array, agregar cada ID como parámetro 'id' separado
              const uniqueIds = [...new Set(value)]; // Remover duplicados
              
              uniqueIds.forEach(id => {
                params = params.append('id', id.toString());
              });
            } else {
              // Si es un solo ID
              params = params.set('id', value.toString());
            }
          } else {
            // Para otros filtros
            const paramKey = key.charAt(0).toUpperCase() + key.slice(1);
            params = params.set(paramKey, value.toString());
          }
        }
      });
    }

    return this.http.get<Traveler[]>(`${this.apiUrl}/travelers`, { params }).pipe(
      catchError(error => {
        console.error('❌ Error fetching travelers:', error);
        
        // Si hay múltiples IDs y falla, intentar método fallback
        if (filters?.id && Array.isArray(filters.id)) {
          return this.getFallbackTravelers(filters.id);
        }
        
        return of([]);
      })
    );
  }

  /**
   * Fallback: obtener travelers usando múltiples llamadas individuales
   */
  private getFallbackTravelers(ids: number[]): Observable<Traveler[]> {    
    if (ids.length === 0) {
      return of([]);
    }

    // Limitar a un máximo de 10 llamadas para evitar sobrecarga
    const limitedIds = ids.slice(0, 10);
    
    const requests = limitedIds.map(id => 
      this.getTravelerById(id).pipe(
        catchError(error => {
          console.error(`❌ Error getting traveler ${id}:`, error);
          return of({ id, name: 'Usuario desconocido', email: '' } as Traveler);
        })
      )
    );
    
    // Si solo hay un ID, no usar forkJoin
    if (requests.length === 1) {
      return requests[0].pipe(map(traveler => [traveler]));
    }
    
    // Para múltiples IDs, usar forkJoin
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

}