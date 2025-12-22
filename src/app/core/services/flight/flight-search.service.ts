import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

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

// Nueva interfaz para información de cambio de precio
export interface IPriceChangeInfo {
  hasChanged: boolean;
  previousPrice: number;
  currentPrice: number;
  priceDifference: number;
  percentageChange: number;
  currency?: string | null;
  isPriceIncrease: boolean;
  timestamp: string;
  tolerance: number;
  message?: string | null;
}

// ✅ NUEVAS INTERFACES para el endpoint de book
export interface IAmadeusFlightCreateOrderResponse {
  meta?: ICollectionMeta | null;
  warnings?: IIssue[] | null;
  data?: IFlightOrder | null;
  dictionaries?: IDictionaries | null;
}

export interface ICollectionMeta {
  count?: number | null;
  links?: any | null;
}

export interface IIssue {
  status?: number | null;
  code?: number | null;
  title?: string | null;
  detail?: string | null;
  source?: any | null;
}

export interface IFlightOrder {
  type?: string | null;
  id?: string | null;
  queuingOfficeId?: string | null;
  ownerOfficeId?: string | null;
  flightOffers?: IFlightOffer[] | null;
  travelers?: IOrderTraveler[] | null;
  remarks?: IRemarks | null;
  formOfPayments?: IFormOfPayment[] | null;
  ticketingAgreement?: ITicketingAgreement | null;
  automatedProcess?: IAutomatedProcess[] | null;
  contacts?: IContact[] | null;
  tickets?: IAirTravelDocument[] | null;
  formOfIdentifications?: IFormOfIdentification[] | null;
}

export interface IFlightOffer {
  type?: string | null;
  id?: string | null;
  source?: 'GDS' | 'LTC' | 'PYTON' | 'EAC' | 'NDC' | null;
  sourceReference?: string | null;
  instantTicketingRequired?: boolean;
  disablePricing?: boolean;
  nonHomogeneous?: boolean;
  oneWay?: boolean;
  isUpsellOffer?: boolean;
  upsellFlightOfferIds?: string[] | null;
  paymentCardRequired?: boolean;
  lastTicketingDate?: string | null;
  lastTicketingDateTime?: string | null;
  numberOfBookableSeats?: number | null;
  itineraries?: IItinerary[] | null;
  price?: IPrice | null;
  pricingOptions?: IPricingOptions | null;
  validatingAirlineCodes?: string[] | null;
  travelerPricings?: ITravelerPricing[] | null;
  fareRules?: IFareRules | null;
}

export interface IItinerary {
  duration?: string | null;
  segments?: ISegment[] | null;
}

export interface ISegment {
  id?: string | null;
  numberOfStops: number;
  blacklistedInEU: boolean;
  co2Emissions?: ICo2Emission[] | null;
  departure?: IFlightEndPoint | null;
  arrival?: IFlightEndPoint | null;
  carrierCode?: string | null;
  number?: string | null;
  aircraft?: IAircraft | null;
  operating?: IOperating | null;
  duration?: string | null;
  stops?: IFlightStop[] | null;
  bookingStatus?: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'PENDING' | 'DENIED' | null;
  segmentType?: 'ACTIVE' | 'PASSIVE' | 'GHOST' | 'STAFF' | null;
  isFlown?: boolean | null;
}

export interface IFlightEndPoint {
  iataCode?: string | null;
  terminal?: string | null;
  at?: string | null;
}

export interface IAircraft {
  code?: string | null;
}

export interface IOperating {
  carrierCode?: string | null;
}

export interface IFlightStop {
  iataCode?: string | null;
  duration?: string | null;
  arrivalAt?: string | null;
  departureAt?: string | null;
}

export interface ICo2Emission {
  weight?: number | null;
  weightUnit?: string | null;
  cabin?: string | null;
}

export interface IPrice {
  margin?: string | null;
  grandTotal?: string | null;
  billingCurrency?: string | null;
  additionalServices?: IAdditionalService[] | null;
  currency?: string | null;
  total?: string | null;
  base?: string | null;
  fees?: IFee[] | null;
  taxes?: ITax[] | null;
  refundableTaxes?: string | null;
  margins?: IMargin[] | null;
  discounts?: IPriceDiscount[] | null;
}

export interface IAdditionalService {
  amount?: string | null;
  type?: string | null;
}

export interface IFee {
  amount?: string | null;
  type?: string | null;
}

export interface ITax {
  amount?: string | null;
  code?: string | null;
}

export interface IMargin {
  amount?: string | null;
  type?: string | null;
}

export interface IPriceDiscount {
  amount?: string | null;
  type?: string | null;
}

export interface IPricingOptions {
  fareType?: string[] | null;
  includedCheckedBagsOnly?: boolean;
}

export interface ITravelerPricing {
  travelerId?: string | null;
  fareOption?: string | null;
  travelerType?: string | null;
  price?: IPrice | null;
  fareDetails?: IFareDetails[] | null;
}

export interface IFareDetails {
  segmentId?: string | null;
  cabin?: string | null;
  fareBasis?: string | null;
  brandedFare?: string | null;
  classOfService?: string | null;
  includedCheckedBags?: ICheckedBags | null;
}

export interface ICheckedBags {
  weight?: number | null;
  weightUnit?: string | null;
}

export interface IFareRules {
  refundable?: boolean;
  changeable?: boolean;
  cancellationPenalty?: string | null;
  changePenalty?: string | null;
}

export interface IOrderTraveler {
  id?: string | null;
  dateOfBirth?: string | null;
  name?: IName | null;
  gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED' | 'UNDISCLOSED' | null;
  contact?: IContact | null;
  documents?: IIdentityDocument[] | null;
  emergencyContact?: IEmergencyContact | null;
  loyaltyPrograms?: ILoyaltyProgram[] | null;
  discountEligibility?: IDiscount[] | null;
  travelerType?: string | null;
  fareOptions?: ('STANDARD' | 'INCLUSIVE_TOUR' | 'SPANISH_MELILLA_RESIDENT' | 'SPANISH_CEUTA_RESIDENT' | 'SPANISH_CANARY_RESIDENT' | 'SPANISH_BALEARIC_RESIDENT' | 'AIR_FRANCE_METROPOLITAN_DISCOUNT_PASS' | 'AIR_FRANCE_DOM_DISCOUNT_PASS' | 'AIR_FRANCE_COMBINED_DISCOUNT_PASS' | 'AIR_FRANCE_FAMILY' | 'ADULT_WITH_COMPANION' | 'COMPANION')[] | null;
}

export interface IName {
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
}

export interface IContact {
  emailAddress?: string | null;
  phones?: IPhone[] | null;
}

export interface IPhone {
  deviceType?: string | null;
  countryCallingCode?: string | null;
  number?: string | null;
}

export interface IIdentityDocument {
  number?: string | null;
  expiryDate?: string | null;
  issuanceCountry?: string | null;
  documentType?: string | null;
  nationality?: string | null;
  holder?: boolean;
}

export interface IEmergencyContact {
  name?: IName | null;
  contact?: IContact | null;
}

export interface ILoyaltyProgram {
  companyCode?: string | null;
  membershipNumber?: string | null;
}

export interface IDiscount {
  type?: string | null;
  amount?: string | null;
}

export interface IRemarks {
  // Añadir propiedades según sea necesario
}

export interface IFormOfPayment {
  // Añadir propiedades según sea necesario
}

export interface ITicketingAgreement {
  // Añadir propiedades según sea necesario
}

export interface IAutomatedProcess {
  // Añadir propiedades según sea necesario
}

export interface IAirTravelDocument {
  // Añadir propiedades según sea necesario
}

export interface IDictionaries {
  // Añadir propiedades según sea necesario
}

export interface IFormOfIdentification {
  // Añadir propiedades según sea necesario
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

  /**
   * Valida si el precio de una oferta de vuelo ha cambiado entre el registro en base de datos y la respuesta actual de Amadeus
   * @param reservationId ID de la reserva para la cual validar el cambio de precio
   * @returns Observable con la información del cambio de precio o null si no hay cambios
   */
  validatePriceChange(reservationId: number): Observable<IPriceChangeInfo | null> {
    return this.http.get<IPriceChangeInfo | null>(
      `${this.API_URL}/reservation/${reservationId}/validate-price-change`
    );
  }

  /**
   * ✅ NUEVO: Reserva un vuelo recuperando el último FlightOffer no obsoleto para una reserva
   * @param reservationId ID de la reserva
   * @returns Observable con la respuesta de la operación de reserva
   */
  bookFlight(reservationId: number): Observable<IAmadeusFlightCreateOrderResponse> {
    return this.http.post<IAmadeusFlightCreateOrderResponse>(
      `${this.API_URL}/reservation/${reservationId}/book`,
      {}
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

        return result; // Retornar el resultado real del API
      }),
      catchError((error: unknown) => {
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

        return result; // Retornar el resultado real del API
      }),
      catchError((error: unknown) => {
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

        return result; // Retornar el resultado real del API
      }),
      catchError((error: unknown) => {
        return of(false); // Retornar false en caso de error
      })
    );
  }
} 