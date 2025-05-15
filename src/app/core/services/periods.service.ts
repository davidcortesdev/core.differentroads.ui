import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, catchError, switchMap, tap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Activity } from '../models/tours/activity.model';
import { Insurance } from '../models/tours/insurance.model';
import { Period } from '../models/tours/period.model';
import { ReservationMode } from '../models/tours/reservation-mode.model';
import { Flight } from '../models/tours/flight.model';
import { PriceData } from '../models/commons/price-data.model';

type SelectedFields = Partial<Array<keyof Period | 'all'>>;

@Injectable({
  providedIn: 'root',
})
export class PeriodsService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/periods`;
  private readonly DATA_API_URL = `${environment.dataApiUrl}/periods`;

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
      map((period: Period) => period.activities || [])
    );
  }

  /**
   * Fetches the insurances of a period by its external ID.
   * @param id - The external ID of the period.
   * @returns Observable of Insurance array.
   */
  getInsurances(id: string): Observable<Insurance[]> {
    return this.getPeriodDetail(id, ['insurances']).pipe(
      map((period: Period) => period.insurances || [])
    );
  }

  /**
   * Fetches the reservation modes of a period by its external ID.
   * @param id - The external ID of the period.
   * @returns Observable of ReservationMode array.
   */
  getReservationModes(id: string): Observable<ReservationMode[]> {
    return this.getPeriodDetail(id, ['reservationmodes']).pipe(
      map((period: Period) => period.reservationModes || [])
    );
  }

  /**
   * Fetches the flights of a period by its external ID.
   * @param id - The external ID of the period.
   * @returns Observable of Flight array.
   */
  getFlights(id: string): Observable<Flight[]> {
    return this.getPeriodDetail(id, ['flights']).pipe(
      map((period: Period) => period.flights || [])
    );
  }

  /**
   * Fetches the prices of a period by its external ID.
   * @param id - The external ID of the period.
   * @returns Observable of PriceData array. List of prices for activities, tour,
   * period and flights. the key is the external ID of each component.
   */
  getPeriodPrices(id: string): Observable<{
    [key: string]: { priceData: PriceData[]; availability?: number };
  }> {
    return this.http
      .get<{
        [key: string]: { priceData: PriceData[]; availability?: number };
      }>(`${this.DATA_API_URL}/${id}/prices`)
      .pipe(map((response) => response || []));
  }

  getActivitiesByPeriodId(periodId: string): Observable<Activity[]> {
    const directUrl = `${environment.apiUrl}/data/cms/collections/es/activities/filter-by/periodId/${periodId}?selectedFields=all`;
    return this.http.get<any>(directUrl).pipe(
      tap((response) => {}),
      map((response) => {
        let activities: Activity[] = [];
        if (Array.isArray(response)) {
          activities = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          activities = response.data;
        } else if (
          response &&
          response.items &&
          Array.isArray(response.items)
        ) {
          activities = response.items;
        }
        return activities;
      }),
      catchError((error) => {
        return of([]);
      })
    );
  }
}
