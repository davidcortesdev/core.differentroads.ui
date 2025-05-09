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
  // Add other tour properties as needed based on the API response
}

@Injectable({
  providedIn: 'root',
})
export class TourNetService {
  private readonly API_URL = `${environment.tourApiUrl}/Tour`;

  constructor(private http: HttpClient) {}

  /**
   * Get tour by filter criteria
   * @param filter Filter criteria for tours
   * @returns Observable of Tour array
   */
  getTours(filter?: TourFilter): Observable<Tour[]> {
    let params = new HttpParams();

    // Añadir parámetros de filtro si se proporcionan
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Si el filtro es tour_id, usar exactamente ese nombre
          if (key === 'tour_id') {
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
        // Check if response is an array and take the first item
        if (Array.isArray(response) && response.length > 0) {
          return response[0];
        }
        // If it's a single object, return it directly
        return response;
      }),
      map(tour => {
        // Ensure we have a default name if it's missing
        return {
          ...tour,
          name: tour.name
        };
      }),
      catchError(error => {
        console.error(`Error fetching tour with ID ${id}:`, error);
        // Return a default tour object on error
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
          console.log('Tour ID:', id);
          return id;
        }
        return 0; // Return 0 if no tour is found
      }),
      catchError(error => {
        console.error('Error fetching tours:', error);
        return of(0); // Return 0 on error
      })
    );
  }

  /**
   * Obtiene el tourId a partir del tourId
   * @param tourId Identificador del tour
   * @returns Observable con el ID del tour
   */
  getTourIdByPeriodId(tourId: string): Observable<number> {
    console.log('Llamando a la API con tourId:', tourId);
    console.log('URL completa:', `${environment.dataApiUrl}/periods/${tourId}`);
    
    return this.http.get<any>(`${environment.tourApiUrl}/Tour?TKid=${tourId}`)
      .pipe(
        map(response => {
          console.log('Respuesta completa de periods API:', response);
          console.log('Tipo de respuesta:', typeof response);
          console.log('Propiedades de la respuesta:', Object.keys(response));
          
          // Si la respuesta es un array, tomar el primer elemento
          const period = Array.isArray(response) ? response[0] : response;
          
          // Verificar si la respuesta tiene el campo tour_id
          if (period && period.tour_id !== undefined) {
            console.log('ID del tour extraído (tour_id):', period.tour_id);
            return period.tour_id;
          }
          
          // Verificar si la respuesta tiene el campo tourId como alternativa
          if (period && period.tourId !== undefined) {
            console.log('ID del tour extraído (tourId):', period.tourId);
            return period.tourId;
          }
          
          // Buscar en propiedades anidadas
          if (period && period.tour && period.tour.id) {
            console.log('ID del tour extraído (tour.id):', period.tour.id);
            return period.tour.id;
          }
          
          throw new Error(`No se pudo obtener el tourId para el tourId: ${tourId}`);
        }),
        catchError(error => {
          console.error(`Error al obtener el tourId para el tourId ${tourId}:`, error);
          return of(0); // Devolver 0 en caso de error
        })
      );
  }
}