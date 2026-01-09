import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DepartureConsolidadorTourAirportResponse {
  id: number;
  departureId: number;
  locationAirportId: number;
  isIncluded: boolean;
  isArrivalAirport: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureConsolidadorTourAirportService {
  private readonly baseUrl = `${environment.toursApiUrl}/DepartureConsolidadorTourAirport`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los aeropuertos del tour configurados para un departureId dado.
   * @param departureId ID de la departure a consultar
   */
  getTourAirports(departureId: number): Observable<DepartureConsolidadorTourAirportResponse[]> {
    const params = new HttpParams().set('DepartureId', departureId.toString());
    return this.http.get<DepartureConsolidadorTourAirportResponse[]>(this.baseUrl, { params });
  }

  /**
   * Obtiene los aeropuertos del tour configurados por tourId (para combinarlos con los del departure).
   * @param tourId ID del tour a consultar
   */
  getTourAirportsByTourId(tourId: number): Observable<DepartureConsolidadorTourAirportResponse[]> {
    const tourAirportUrl = `${environment.toursApiUrl}/TourConsolidadorTourAirport`;
    const params = new HttpParams().set('TourId', tourId.toString());
    return this.http.get<DepartureConsolidadorTourAirportResponse[]>(tourAirportUrl, { params });
  }
}
