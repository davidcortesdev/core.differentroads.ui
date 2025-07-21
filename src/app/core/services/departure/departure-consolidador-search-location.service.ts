import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ConsolidadorSearchLocationWithSourceResponse {
  id: number;
  departureId?: number;
  tourId?: number;
  locationId?: number | null;
  locationAirportId?: number | null;
  source: 'Departure' | 'Tour';
}

@Injectable({
  providedIn: 'root',
})
export class DepartureConsolidadorSearchLocationService {
  private readonly baseUrl = `${environment.toursApiUrl}/DepartureConsolidadorSearchLocation/combined`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las ubicaciones combinadas de departure y tour para un departureId dado.
   * @param departureId ID de la departure a consultar
   */
  getCombinedLocations(departureId: number): Observable<ConsolidadorSearchLocationWithSourceResponse[]> {
    return this.http.get<ConsolidadorSearchLocationWithSourceResponse[]>(`${this.baseUrl}/${departureId}`);
  }
} 