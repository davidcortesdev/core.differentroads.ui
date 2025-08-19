import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Interfaces generadas a partir del swagger de localhost:5007 para el endpoint /api/FlightSearch
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

// Nuevas interfaces para el endpoint de detalles
export interface IFlightSegmentResponse {
  id: number;
  tkId?: string | null;
  flightId: number;
  tkServiceId?: string | null;
  tkJourneyId?: string | null;
  segmentRank: number;
  departureCity?: string | null;
  departureTime?: string | null;
  departureIata?: string | null;
  arrivalCity?: string | null;
  arrivalTime?: string | null;
  arrivalIata?: string | null;
  flightNumber?: string | null;
  goSegment: boolean;
  returnSegment: boolean;
  duringSegment: boolean;
  type?: string | null;
  numNights: number;
  differential: number;
  tkProviderId: number;
  departureDate?: string | null;
  arrivalDate?: string | null;
}

export interface IFlightDetailDTO {
  numScales: number;
  duration: number;
  airlines?: string[] | null;
  segments?: IFlightSegmentResponse[] | null;
}

export type FlightSearchResponse = IFlightPackDTO[];

@Injectable({
  providedIn: 'root',
})
export class FlightSearchService {
  private readonly API_URL = `${environment.amadeusApiUrl}/FlightSearch`;
  private readonly DETAILS_API_URL = `${environment.amadeusApiUrl}/FlightSearch`;

  constructor(private http: HttpClient) {}

  /**
   * Realiza una búsqueda de vuelos usando el endpoint /api/FlightSearch
   * @param request Objeto con los parámetros de búsqueda
   * @param autoSearch Booleano para controlar si se deben hacer llamadas automáticas
   *                    - true (default): Comportamiento estándar
   *                    - false: Evita llamadas automáticas que puedan causar bucles
   * @returns Observable con la respuesta de la API (array de IFlightPackDTO)
   */
  searchFlights(request: FlightSearchRequest, autoSearch: boolean = true): Observable<FlightSearchResponse> {
    return this.http.post<FlightSearchResponse>(
      this.API_URL,
      request,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Obtiene los detalles de un vuelo específico por su ID de paquete y ID de vuelo
   * @param packId ID del paquete de vuelos (consolidatorSearchId)
   * @param flightId ID del vuelo específico (amadeusFlightId)
   * @returns Observable con los detalles del vuelo
   */
  getFlightDetails(packId: number, flightId: number): Observable<IFlightDetailDTO> {
    return this.http.get<IFlightDetailDTO>(
      `${this.DETAILS_API_URL}/${packId}/details/${flightId}`
    );
  }
} 