import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Interfaces generadas a partir del swagger de amadeus-dev.differentroads.es para el endpoint /api/FlightSearch
 */

export interface FlightSearchRequest {
  departureId: number;
  reservationId: number;
  tipoViaje: 'Ida' | 'Vuelta' | 'IdaVuelta';
  iataOrigen?: string | null;
  iataDestino?: string | null;
}

export interface IAgeGroupPriceDTO {
  price?: number | null;
  ageGroupId?: number | null;
  ageGroupName?: string | null;
}

export interface IFlightStopover {
  id: number;
  airportIATACode?: string | null;
  cityName?: string | null;
  previousFlightOriginIATACode?: string | null;
  previousFlightOriginCity?: string | null;
  previousFlightDepartureDate?: string | null;
  previousFlightDepartureTime?: string | null;
  previousFlightArrivalDate?: string | null;
  previousFlightArrivalTime?: string | null;
  previousFlightCode?: string | null;
  previousFlightArrivalTerminal?: string | null;
  nextFlightDestinationIATACode?: string | null;
  nextFlightDestinationCity?: string | null;
  nextFlightDepartureDate?: string | null;
  nextFlightDepartureTime?: string | null;
  nextFlightArrivalDate?: string | null;
  nextFlightArrivalTime?: string | null;
  nextFlightCode?: string | null;
  nextFlightDepartureTerminal?: string | null;
  stopoverDurationMinutes?: number | null;
  arrivalDate?: string | null;
  arrivalTime?: string | null;
  departureDate?: string | null;
  departureTime?: string | null;
  arrivalTerminal?: string | null;
  departureTerminal?: string | null;
}

export interface IFlightResponse {
  id: number;
  tkId?: string | null;
  name?: string | null;
  activityId: number;
  departureId: number;
  tkActivityPeriodId?: string | null;
  tkServiceCombinationId?: string | null;
  date?: string | null;
  tkServiceId?: string | null;
  tkJourneyId?: string | null;
  flightTypeId: number;
  departureIATACode?: string | null;
  arrivalIATACode?: string | null;
  departureDate?: string | null;
  departureTime?: string | null;
  arrivalDate?: string | null;
  arrivalTime?: string | null;
  departureCity?: string | null;
  arrivalCity?: string | null;
  stopovers?: IFlightStopover[] | null;
}

export interface IFlightPackDTO {
  id: number;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  tkId?: string | null;
  itineraryId: number;
  isOptional: boolean;
  imageUrl?: string | null;
  imageAlt?: string | null;
  isVisibleOnWeb: boolean;
  ageGroupPrices?: IAgeGroupPriceDTO[] | null;
  flights?: IFlightResponse[] | null;
}

export type FlightSearchResponse = IFlightPackDTO[];

@Injectable({
  providedIn: 'root',
})
export class FlightSearchService {
  private readonly API_URL = `${environment.amadeusApiUrl}/FlightSearch`;

  constructor(private http: HttpClient) {}

  /**
   * Realiza una búsqueda de vuelos usando el endpoint /api/FlightSearch
   * @param request Objeto con los parámetros de búsqueda
   * @returns Observable con la respuesta de la API (array de IFlightPackDTO)
   */
  searchFlights(request: FlightSearchRequest): Observable<FlightSearchResponse> {
    return this.http.post<FlightSearchResponse>(
      this.API_URL,
      request,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }
} 