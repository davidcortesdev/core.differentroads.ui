import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TravelerFilter {
  id?: number;
  code?: string;
  name?: string;
  tkId?: string;
  email?: string;
}

export interface Traveler {
  id: number;
  code: string;
  name: string;
  tkId?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TravelersNetService {
  private readonly API_URL = `${environment.travelersApiUrl}/Travelers`;

  constructor(private http: HttpClient) {}

  /**
   * Get travelers by filter criteria
   * @param filter Filter criteria for travelers
   * @returns Observable of Traveler array
   */
  getTravelers(filter?: TravelerFilter): Observable<Traveler[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<Traveler[]>(this.API_URL, {
      params,
      headers: {
        Accept: 'text/plain',
      },
    });
  }

  /**
   * Get a specific traveler by ID
   * @param id Traveler ID
   * @returns Observable of Traveler
   */
  getTravelerById(id: number): Observable<Traveler> {
    return this.http
      .get<Traveler>(`${this.API_URL}/${id}`, {
        headers: {
          Accept: 'text/plain',
        },
      })
      .pipe(
        map((traveler) => {
          // Process any string fields that might contain \n characters
          const processedTraveler = { ...traveler };

          return processedTraveler;
        }),
        catchError((error) => {
          console.error(`Error fetching traveler with ID ${id}:`, error);
          // Return a default traveler object on error
          return of({
            id: id,
            code: 'unknown',
            name: `Traveler ${id}`,
            tkId: '',
            email: '',
          });
        })
      );
  }
}
