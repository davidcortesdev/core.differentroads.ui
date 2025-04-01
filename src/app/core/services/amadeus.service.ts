import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  FlightOffersParams,
  ITempFlightOffer,
  FlightOfferPrice,
  Traveler,
  FlightOrderResponse,
} from '../models/amadeus/flight.types';

@Injectable({
  providedIn: 'root',
})
export class AmadeusService {
  private apiUrl = environment.dataApiUrl;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Search for flight offers based on the provided parameters
   */
  getFlightOffers(params: FlightOffersParams): Observable<ITempFlightOffer[]> {
    return this.http.post<ITempFlightOffer[]>(
      `${this.apiUrl}/flights/get-offers`,
      params,
      this.httpOptions
    );
  }

  /**
   * Get pricing information for a specific flight offer by ID
   */
  getFlightPriceById(
    id: string
  ): Observable<{ flightOffers: FlightOfferPrice[] }> {
    return this.http.get<{ flightOffers: FlightOfferPrice[] }>(
      `${this.apiUrl}/flights/get-prices/${id}`,
      this.httpOptions
    );
  }

  /**
   * Create a flight booking order with travelers information
   */
  createFlightOrder(
    id: string,
    travelers: Traveler[]
  ): Observable<FlightOrderResponse> {
    return this.http.post<FlightOrderResponse>(
      `${this.apiUrl}/flights/book/${id}`,
      { travelers },
      this.httpOptions
    );
  }
}
