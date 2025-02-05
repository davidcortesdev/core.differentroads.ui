import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Period,
  Activity,
  Insurance,
  ReservationMode,
  Flight,
} from '../models/tours/period.model';

@Injectable({
  providedIn: 'root',
})
export class PeriodsService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/periods`;

  constructor(private http: HttpClient) {}

  /**
   * Fetches the details of a period by its external ID.
   * @param id - The external ID of the period. Short ID given by TK.
   * @param selectedFields - Optional array of fields to select.
   * If not provided, the data of activities, insurances, reservation modes,
   * and flights will not be fetched.
   * @returns Observable of Period.
   */

  getPeriodDetail(id: string, selectedFields?: string[]): Observable<Period> {
    let params = new HttpParams();
    if (selectedFields && selectedFields.length > 0) {
      params = params.set('selectedFields', selectedFields.join(','));
    }
    return this.http.get<Period>(`${this.API_URL}/${id}/full`, { params });
  }

  /**
   * Fetches the activities of a period by its external ID.
   * @param id - The external ID of the period.
   * @returns Observable of Activity array.
   */
  getActivities(id: string): Observable<Activity[]> {
    return this.getPeriodDetail(id, ['activities']).pipe(
      map((period: Period) => period.activities)
    );
  }

  /**
   * Fetches the insurances of a period by its external ID.
   * @param id - The external ID of the period.
   * @returns Observable of Insurance array.
   */
  getInsurances(id: string): Observable<Insurance[]> {
    return this.getPeriodDetail(id, ['insurances']).pipe(
      map((period: Period) => period.insurances)
    );
  }

  /**
   * Fetches the reservation modes of a period by its external ID.
   * @param id - The external ID of the period.
   * @returns Observable of ReservationMode array.
   */
  getReservationModes(id: string): Observable<ReservationMode[]> {
    return this.getPeriodDetail(id, ['reservationModes']).pipe(
      map((period: Period) => period.reservationModes)
    );
  }

  /**
   * Fetches the flights of a period by its external ID.
   * @param id - The external ID of the period.
   * @returns Observable of Flight array.
   */
  getFlights(id: string): Observable<Flight[]> {
    return this.getPeriodDetail(id, ['flights']).pipe(
      map((period: Period) => period.flights)
    );
  }
}
