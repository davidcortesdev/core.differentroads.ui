import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AirlineFilter {
  id?: number;
  name?: string;
  codeIATA?: string;
  prefixIATA?: string;
}

export interface Airline {
  id: number;
  name: string | null;
  prefixIATA: string | null;
  codeIATA: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AirlinesService {
  private readonly API_URL = `${environment.hotelsApiUrl}/Airline`;

  constructor(private http: HttpClient) {}

  /**
   * Get airlines with optional filters
   * @param filter Optional filter criteria
   * @returns Observable of Airline array
   */
  getAirlines(filter?: AirlineFilter): Observable<Airline[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filter) {
      params = this.addFilterParams(params, filter);
    }

    return this.http.get<Airline[]>(`${this.API_URL}`, { params });
  }

  /**
   * Helper method to add filter parameters to HttpParams
   * @param params Initial HttpParams object
   * @param filter Filter criteria
   * @returns HttpParams with filter parameters added
   */
  private addFilterParams(params: HttpParams, filter: AirlineFilter): HttpParams {
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            params = params.append(key, item.toString());
          });
        } else {
          params = params.set(key, value.toString());
        }
      }
    });
    return params;
  }
}