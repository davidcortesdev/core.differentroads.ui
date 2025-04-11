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
}

export interface Tour {
  id: number;
  code: string;
  name: string;
  description?: string;
  tkId?: string;
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

    // Add filter parameters if provided
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key.charAt(0).toUpperCase() + key.slice(1), value.toString());
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
}