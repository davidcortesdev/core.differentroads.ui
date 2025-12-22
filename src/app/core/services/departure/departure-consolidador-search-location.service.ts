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
  private readonly baseUrl = `${environment.toursApiUrl}/DepartureConsolidadorSearchLocation`;
  private readonly combinedUrl = `${this.baseUrl}/combined`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las ubicaciones combinadas de departure y tour para un departureId dado.
   * @param departureId ID de la departure a consultar
   */
  getCombinedLocations(departureId: number): Observable<ConsolidadorSearchLocationWithSourceResponse[]> {
    return this.http.get<ConsolidadorSearchLocationWithSourceResponse[]>(`${this.combinedUrl}/${departureId}`);
  }

  /**
   * Obtiene las ubicaciones de búsqueda del consolidador para un departureId dado (solo del departure, sin combinar con tour).
   * @param departureId ID de la departure a consultar
   */
  getDepartureLocations(departureId: number): Observable<ConsolidadorSearchLocationWithSourceResponse[]> {
    return this.http.get<ConsolidadorSearchLocationWithSourceResponse[]>(`${this.baseUrl}?DepartureId=${departureId}`);
  }
} 