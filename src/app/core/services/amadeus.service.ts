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
import { PriceData } from '../models/commons/price-data.model';

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
      travelers,
      this.httpOptions
    );
  }
  // Nuevo helper para aplicar el 12% de recargo y limitar a 2 decimales
  calculatePriceWithMarkup(price: number | string): number {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    return parseFloat((numericPrice * 1.12).toFixed(2));
  }

  // Nuevo método para transformar FlightOfferPrice[] a PriceData[]
  transformFlightPriceData(flightOffers: FlightOfferPrice[]): PriceData[] {
    const priceData: PriceData[] = [];
    flightOffers.forEach((offer) => {
      // Iterar sobre cada travelerPricing para extraer los datos de precio
      offer.travelerPricings.forEach((tp: any) => {
        const total = tp.price?.total || 0;
        const calculatedPrice = this.calculatePriceWithMarkup(total);
        let ageGroup = 'Adultos';
        if (tp.travelerType === 'CHILD') {
          ageGroup = 'Niños';
        } else if (tp.travelerType === 'INFANT') {
          ageGroup = 'Bebes';
        }
        priceData.push({
          id: tp.id || offer.id,
          value: calculatedPrice,
          value_with_campaign: calculatedPrice,
          campaign: null,
          age_group_name: ageGroup,
          category_name: 'amadeus',
          period_product: 'flight',
        });
      });
    });
    return priceData;
  }
}
