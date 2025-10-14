import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces para la respuesta de la API
export interface TourFilterV2 {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  tkId?: string;
  slug?: string;
  filterByVisible?: boolean;
}

export interface TourV2 {
  id: number;
  code: string;
  name: string;
  description?: string;
  tkId?: string;
  slug?: string;
  isConsolidadorVuelosActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ToursServiceV2 {
  private readonly API_URL = `${environment.toursApiUrl}/Tour`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene tours por criterios de filtro
   * @param filter - Criterios de filtro para tours
   * @returns Observable de array de TourV2
   */
  getTours(filter?: TourFilterV2): Observable<TourV2[]> {
    let params = new HttpParams();
    
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'TKid' || key === 'tkId') {
            params = params.set('TKid', value.toString());
          } else if (key === 'tour_id') {
            params = params.set('tour_id', value.toString());
          } else {
            params = params.set(key.charAt(0).toUpperCase() + key.slice(1), value.toString());
          }
        }
      });
    }

    return this.http.get<TourV2[]>(this.API_URL, {
      params,
      headers: {
        'Accept': 'text/plain'
      }
    });
  }

  /**
   * Obtiene un tour específico por ID
   * @param id - ID del tour
   * @param filterByVisible - Filtrar por tours visibles
   * @returns Observable de TourV2
   */
  getTourById(id: number | string, filterByVisible: boolean = false): Observable<TourV2> {
    let params = new HttpParams()
      .set('Id', id.toString())
      .set('FilterByVisible', filterByVisible.toString());

    return this.http.get<any>(this.API_URL, {
      params,
      headers: {
        'Accept': 'application/json'
      }
    }).pipe(
      map(response => {
        // Si la respuesta es un array, tomar el primer elemento
        if (Array.isArray(response) && response.length > 0) {
          return response[0];
        }
        return response;
      }),
      map(tour => ({
        ...tour,
        name: tour.name || `Tour ${id}`
      })),
      catchError(error => {
        console.error(`Error obteniendo tour con ID ${id}:`, error);
        return of({
          id: typeof id === 'string' ? parseInt(id) : id,
          code: 'unknown',
          name: `Tour ${id}`,
          description: ''
        });
      })
    );
  }

  /**
   * Obtiene múltiples tours por IDs
   * @param ids - Array de IDs de tours
   * @returns Observable de array de TourV2
   */
  getToursByIds(ids: number[]): Observable<TourV2[]> {
    if (!ids || ids.length === 0) {
      return of([]);
    }

    const requests = ids.map(id => 
      this.getTourById(id, false).pipe(
        catchError(err => {
          console.warn('No se pudo obtener el tour', id, err);
          return of(undefined);
        })
      )
    );
    return forkJoin(requests).pipe(
      map(results => {
        // Preservar el orden de ids recibido
        const valid = results.filter((t): t is TourV2 => !!t);
        const byId = new Map(valid.map(t => [t.id, t] as [number, TourV2]));
        return ids.map(id => byId.get(id)).filter((t): t is TourV2 => !!t);
      }),
      catchError(error => {
        console.error('Error obteniendo múltiples tours:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene ID de tour por TK ID
   * @param tkId - Identificador TK
   * @returns Observable de ID del tour
   */
  getTourIdByTKId(tkId: string): Observable<number> {
    const filter: TourFilterV2 = {
      tkId: tkId,
    };

    return this.getTours(filter).pipe(
      map(tours => {
        if (tours.length > 0) {
          return tours[0].id;
        }
        return 0;
      }),
      catchError(error => {
        console.error('Error obteniendo tour por TK ID:', error);
        return of(0);
      })
    );
  }

}
