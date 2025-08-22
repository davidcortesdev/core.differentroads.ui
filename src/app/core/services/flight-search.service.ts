import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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

// Nueva interfaz para la respuesta del endpoint de búsqueda
export interface IFlightSearchResultDTO {
  flightPacks?: IFlightPackDTO[] | null;
  warningsJson?: string | null;
  metaJson?: string | null;
  hasWarnings?: boolean;
  isEmptyResult?: boolean;
}

// Interfaces para los warnings y meta información
export interface IFlightSearchWarning {
  status: number;
  code: number;
  title: string;
  detail: string;
  source: any;
}

export interface IFlightSearchMeta {
  count: number;
  oneWayCombinations?: any;
}

// Nueva interfaz para los requisitos de reserva
export interface IBookingRequirements {
  invoiceAddressRequired?: boolean | null;
  mailingAddressRequired?: boolean | null;
  emailAddressRequired?: boolean | null;
  phoneCountryCodeRequired?: boolean | null;
  mobilePhoneNumberRequired?: boolean | null;
  phoneNumberRequired?: boolean | null;
  postalCodeRequired?: boolean | null;
  travelerRequirements?: IPassengerConditions[] | null;
}

// Nueva interfaz para las condiciones de pasajeros
export interface IPassengerConditions {
  travelerId?: string | null;
  genderRequired?: boolean | null;
  documentRequired?: boolean | null;
  documentIssuanceCityRequired?: boolean | null;
  dateOfBirthRequired?: boolean | null;
  redressRequiredIfAny?: boolean | null;
  airFranceDiscountRequired?: boolean | null;
  spanishResidentDiscountRequired?: boolean | null;
  residenceRequired?: boolean | null;
}

export type FlightSearchResponse = IFlightSearchResultDTO;

// Interfaces para respuestas de operaciones PUT
// ✅ ACTUALIZADO: Según nueva especificación del Swagger
// Todos los endpoints ahora retornan boolean (true = éxito, false = fallo)

export type FlightSelectionResponse = boolean;
export type FlightUnselectionResponse = boolean;
export type FlightUnselectAllResponse = boolean;

@Injectable({
  providedIn: 'root',
})
export class FlightSearchService {
  private readonly API_URL = `${environment.amadeusApiUrl}/FlightSearch`;
  private readonly DETAILS_API_URL = `${environment.amadeusApiUrl}/FlightSearch`;

  constructor(private http: HttpClient) {}

  // ✅ ACTUALIZADO: Todos los métodos de selección/deselección ahora retornan boolean
  // ✅ selectFlight: retorna boolean (true = éxito, false = fallo)
  // ✅ unselectFlight: retorna boolean (true = éxito, false = fallo)
  // ✅ unselectAllFlights: retorna boolean (true = éxito, false = fallo)

  /**
   * Realiza una búsqueda de vuelos usando el endpoint /api/FlightSearch
   * @param request Objeto con los parámetros de búsqueda
   * @param autoSearch Booleano para controlar si se deben hacer llamadas automáticas
   *                    - true (default): Comportamiento estándar
   *                    - false: Evita llamadas automáticas que puedan causar bucles
   *                    Nota: Este parámetro se mantiene por compatibilidad pero ya no se usa en la nueva implementación
   * @returns Observable con la respuesta de la API (IFlightSearchResultDTO)
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
   * @returns Observable con la respuesta de la operación (boolean)
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
   * @returns Observable con la respuesta de la operación (boolean)
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
   * @returns Observable con la respuesta de la operación (boolean)
   */
  unselectAllFlights(reservationId: number): Observable<FlightUnselectAllResponse> {
    return this.http.put<FlightUnselectAllResponse>(
      `${this.API_URL}/reservation/${reservationId}/unselect-all`,
      {}
    );
  }

  /**
   * Obtiene los requisitos de reserva para una reserva específica
   * @param reservationId ID de la reserva
   * @returns Observable con los requisitos de reserva
   */
  getBookingRequirements(reservationId: number): Observable<IBookingRequirements> {
    return this.http.get<IBookingRequirements>(
      `${this.API_URL}/reservation/${reservationId}/booking-requirements`
    );
  }

  /**
   * Verifica si existe un ConsolidatorSearch seleccionado para una reserva específica
   * @param reservationId ID de la reserva
   * @returns Observable con el estado de selección (boolean)
   */
  getSelectionStatus(reservationId: number): Observable<boolean> {
    return this.http.get<boolean>(
      `${this.API_URL}/reservation/${reservationId}/consolidator/selection-status`
    );
  }

  // ✅ MÉTODOS DE UTILIDAD para manejar respuestas booleanas

  /**
   * Desmarca todos los vuelos y retorna un Observable<boolean> con manejo de errores
   * @param reservationId ID de la reserva
   * @returns Observable<boolean> que siempre retorna true en caso de éxito
   */
  unselectAllFlightsSafe(reservationId: number): Observable<boolean> {
    return this.unselectAllFlights(reservationId).pipe(
      map((result: FlightUnselectAllResponse) => {
        console.log('✅ unselectAllFlights exitoso:', result);
        return result; // Retornar el resultado real del API
      }),
      catchError((error: unknown) => {
        console.error('❌ Error en unselectAllFlights:', error);
        return of(false); // Retornar false en caso de error
      })
    );
  }

  /**
   * Marca un vuelo como seleccionado con manejo de errores
   * @param reservationId ID de la reserva
   * @param consolidatorSearchId ID del ConsolidatorSearch a marcar
   * @returns Observable<boolean> que retorna true en caso de éxito
   */
  selectFlightSafe(reservationId: number, consolidatorSearchId: number): Observable<boolean> {
    return this.selectFlight(reservationId, consolidatorSearchId).pipe(
      map((result: FlightSelectionResponse) => {
        console.log('✅ selectFlight exitoso para consolidatorSearchId:', consolidatorSearchId, 'resultado:', result);
        return result; // Retornar el resultado real del API
      }),
      catchError((error: unknown) => {
        console.error('❌ Error en selectFlight:', error);
        return of(false); // Retornar false en caso de error
      })
    );
  }

  /**
   * Desmarca un vuelo específico con manejo de errores
   * @param reservationId ID de la reserva
   * @param consolidatorSearchId ID del ConsolidatorSearch a desmarcar
   * @returns Observable<boolean> que retorna true en caso de éxito
   */
  unselectFlightSafe(reservationId: number, consolidatorSearchId: number): Observable<boolean> {
    return this.unselectFlight(reservationId, consolidatorSearchId).pipe(
      map((result: FlightUnselectionResponse) => {
        console.log('✅ unselectFlight exitoso para consolidatorSearchId:', consolidatorSearchId, 'resultado:', result);
        return result; // Retornar el resultado real del API
      }),
      catchError((error: unknown) => {
        console.error('❌ Error en unselectFlight:', error);
        return of(false); // Retornar false en caso de error
      })
    );
  }
} 