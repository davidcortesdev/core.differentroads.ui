import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Nuevas interfaces basadas en el Swagger actualizado
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

// Interfaces para respuestas de operaciones PUT
export interface FlightSelectionResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
}

export interface FlightUnselectionResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
}

export interface FlightUnselectAllResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
  unselectedCount?: number;
}

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
   * @param consolidatorSearchId ID del paquete de vuelos (consolidatorSearchId)
   * @param amadeusFlightId ID del vuelo específico (amadeusFlightId)
   * @returns Observable con los detalles del vuelo
   */
  getFlightDetails(consolidatorSearchId: number, amadeusFlightId: string): Observable<IFlightDetailDTO> {
    return this.http.get<IFlightDetailDTO>(
      `${this.DETAILS_API_URL}/${consolidatorSearchId}/details/${amadeusFlightId}`
    );
  }

  /**
   * Marca un ConsolidatorSearch como seleccionado, desmarcando los demás de la misma reserva
   * @param reservationId ID de la reserva
   * @param consolidatorSearchId ID del ConsolidatorSearch a marcar como seleccionado
   * @returns Observable con la respuesta de la operación
   */
  selectFlight(reservationId: number, consolidatorSearchId: number): Observable<FlightSelectionResponse> {
    return this.http.put<FlightSelectionResponse>(
      `${this.API_URL}/reservation/${reservationId}/consolidator/${consolidatorSearchId}/select`,
      {}
    );
  }

  /**
   * Desmarca un ConsolidatorSearch como no seleccionado
   * @param reservationId ID de la reserva
   * @param consolidatorSearchId ID del ConsolidatorSearch a desmarcar
   * @returns Observable con la respuesta de la operación
   */
  unselectFlight(reservationId: number, consolidatorSearchId: number): Observable<FlightUnselectionResponse> {
    return this.http.put<FlightUnselectionResponse>(
      `${this.API_URL}/reservation/${reservationId}/consolidator/${consolidatorSearchId}/unselect`,
      {}
    );
  }

  /**
   * Desmarca todos los ConsolidatorSearch de una reserva como no seleccionados
   * @param reservationId ID de la reserva
   * @returns Observable con la respuesta de la operación
   */
  unselectAllFlights(reservationId: number): Observable<FlightUnselectAllResponse> {
    return this.http.put<FlightUnselectAllResponse>(
      `${this.API_URL}/reservation/${reservationId}/unselect-all`,
      {}
    );
  }
} 