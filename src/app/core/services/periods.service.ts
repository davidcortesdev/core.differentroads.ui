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
import { TourNetService } from './tourNet.service';

type SelectedFields = Partial<Array<keyof Period | 'all'>>;

@Injectable({
  providedIn: 'root',
})
export class PeriodsService {
  private readonly DATA_API_URL = `${environment.dataApiUrl}/periods`;

  constructor(
    private http: HttpClient,
    private tourNetService: TourNetService
  ) {}

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


/**
 * Obtiene toda la información de la departure asociada a un periodo usando el tkid.
 * @param tkid - El ID de TK del periodo
 * @returns Observable con toda la información de la departure (sin transformar)
 */
getRawDepartureByTkId(externalId: string): Observable<any> {
  // Llama a la misma URL pero devuelve el JSON tal cual lo recibe, sin map ni transformación
  return this.http.get<any>(`${environment.toursApiUrl}/salidas?TKId=${externalId}`);
}


}