import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TourFilter {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  tkId?:string;
  slug?:string;
}

export interface Tour {
  id: number;
  code: string;
  name: string;
  description?: string;
  tkId?: string;
  slug?:string;
}

@Injectable({
  providedIn: 'root',
})
export class TourNetService {
  private readonly API_URL = `${environment.toursApiUrl}/Tour`;

  constructor(private http: HttpClient) {}

  /**
   * Get tour by filter criteria
   * @param filter Filter criteria for tours
   * @returns Observable of Tour array
   */
  getTours(filter?: TourFilter): Observable<Tour[]> {
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

    return this.http.get<Tour[]>(this.API_URL, { 
      params,
      headers: {
        'Accept': 'text/plain'
      }
    });
  }

  /**
   * Get a specific tour by ID
   * @param id Tour ID
   * @returns Observable of Tour
   */
  getTourById(id: number): Observable<Tour> {
    let params = new HttpParams().set('Id', id.toString());

    return this.http.get<any>(this.API_URL, {
      params,
      headers: {
        'Accept': 'text/plain'
      }
    }).pipe(
      map(response => {
        if (Array.isArray(response) && response.length > 0) {
          return response[0];
        }
        return response;
      }),
      map(tour => {
        return {
          ...tour,
          name: tour.name
        };
      }),
      catchError(error => {
        return of({
          id: id,
          code: 'unknown',
          name: `Tour ${id}`,
          description: ''
        });
      })
    );
  }

  /**
   * Get tour ID by TK ID
   * @param tkId TK identifier
   * @returns Observable of tour ID number
   */
  getTourIdByTKId(tkId: string): Observable<number> {
    const filter: TourFilter = {
      tkId: tkId,
    };
    
    return this.getTours(filter).pipe(
      map(tours => {
        if (tours.length > 0) {
          const id = tours[0].id;
          
          return id;
        }
        return 0; 
      }),
      catchError(error => {
        console.error('Error fetching tours:', error);
        return of(0); 
      })
    );
  }

  /**
   * Obtiene el tourId a partir del tourId
   * @param tourId Identificador del tour
   * @returns Observable con el ID del tour
   */
  getTourIdByPeriodId(tourId: string): Observable<number> {
    
    return this.http.get<any>(`${environment.toursApiUrl}/Tour?TKid=${tourId}`)
      .pipe(
        map(response => {
          const period = Array.isArray(response) ? response[0] : response;
          if (period && period.id !== undefined) {
            return period.id;
          }
          throw new Error(`No se pudo obtener el tourId para el tourId: ${tourId}`);
        }),
        catchError(error => {
          return of(0); 
        })
      );
  }
}