import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable, switchMap, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  IReservationStatusResponse,
  ReservationStatusService,
} from './reservation-status.service';

export interface ReservationCreate {
  tkId?: string | null;
  reservationStatusId: number;
  retailerId: number;
  tourId: number;
  departureId: number;
  userId?: number | null;
  totalPassengers: number;
  totalAmount: number;
}

export interface ReservationUpdate {
  tkId?: string | null;
  reservationStatusId: number;
  retailerId: number;
  tourId: number;
  departureId: number;
  userId?: number | null;
  totalPassengers: number;
  totalAmount: number;
}

export interface IReservationResponse {
  id: number;
  tkId?: string | null;
  reservationStatusId: number;
  retailerId: number;
  tourId: number;
  departureId: number;
  userId?: number | null;
  totalPassengers: number;
  totalAmount: number;
  budgetAt?: string | null;
  cartAt?: string | null;
  abandonedAt?: string | null;
  reservedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IReservationSummaryItem {
  itemId: number;
  description?: string | null;
  amount: number;
  quantity: number;
  total: number;
  itemType?: string | null;
  included: boolean;
  ageGroupId?: number | null;
}

// Alias para mantener compatibilidad con código existente
export type ReservationSummaryItem = IReservationSummaryItem;

export interface IReservationSummaryResponse {
  id: number;
  tkId?: string | null;
  totalPassengers: number;
  totalAmount: number;
  items?: IReservationSummaryItem[] | null;
  createdAt: string;
}

export interface IReservationTravelerData {
  ageGroupId: number;
  isLeadTraveler: boolean;
  tkId?: string | null;
}

export interface ReservationCompleteCreate {
  reservation: ReservationCreate;
  travelers?: IReservationTravelerData[] | null;
  activityIds?: number[] | null;
  activityPackIds?: number[] | null;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReservationFilters {
  Id?: number;
  TkId?: string;
  ReservationStatusId?: number;
  RetailerId?: number;
  TourId?: number;
  DepartureId?: number;
  UserId?: number | null;
  TotalPassengers?: number;
  TotalAmount?: number;
  BudgetAt?: string;
  CartAt?: string;
  AbandonedAt?: string;
  ReservedAt?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  useExactMatchForStrings?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly API_URL = `${environment.reservationsApiUrl}/Reservation`;

  constructor(
    private http: HttpClient,
    private reservationStatusService: ReservationStatusService
  ) {}

  /**
   * Obtiene todas las reservaciones según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de reservaciones.
   */
  getAll(filters?: ReservationFilters): Observable<IReservationResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<IReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva reservación.
   * @param data Datos para crear la reservación.
   * @param skipValidation Si se debe omitir la validación de reglas de estado (útil para importaciones de TK).
   * @returns La reservación creada.
   */
  create(data: ReservationCreate, skipValidation: boolean = false): Observable<IReservationResponse> {
    const params = new HttpParams().set('skipValidation', skipValidation.toString());
    
    return this.http.post<IReservationResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      params
    });
  }

  /**
   * Crea una reservación completa con viajeros, actividades y packs de actividades.
   * @param data Datos para crear la reservación completa.
   * @returns La reservación creada.
   */
  createComplete(data: ReservationCompleteCreate): Observable<IReservationResponse> {
    return this.http.post<IReservationResponse>(`${this.API_URL}/complete`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una reservación específica por su ID.
   * @param id ID de la reservación.
   * @returns La reservación encontrada.
   */
  getById(id: number): Observable<IReservationResponse> {
    return this.http.get<IReservationResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene un resumen completo de una reservación incluyendo todos los ítems y costos.
   * @param id ID de la reservación.
   * @returns El resumen de la reservación.
   */
  getSummary(id: number): Observable<IReservationSummaryResponse> {
    const headers = new HttpHeaders({
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      Expires: '0',
    });
    const params = new HttpParams().set('_ts', Date.now().toString());

    return this.http.get<IReservationSummaryResponse>(
      `${this.API_URL}/${id}/summary`,
      { headers, params }
    );
  }

  /**
   * Actualiza una reservación existente.
   * @param id ID de la reservación a actualizar.
   * @param data Datos actualizados.
   * @param skipValidation Si se debe omitir la validación de reglas de estado (útil para importaciones de TK).
   * @returns Resultado de la operación.
   */
  update(id: number, data: ReservationUpdate, skipValidation: boolean = false): Observable<boolean> {
    const params = new HttpParams().set('skipValidation', skipValidation.toString());
    
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      params
    });
  }

  /**
   * Elimina una reservación existente.
   * @param id ID de la reservación a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene reservaciones por ID de usuario.
   * @param userId ID del usuario.
   * @returns Lista de reservaciones del usuario.
   */
  getByUser(userId: number): Observable<IReservationResponse[]> {
    const params = new HttpParams()
      .set('UserId', userId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene reservaciones por ID de tour.
   * @param tourId ID del tour.
   * @returns Lista de reservaciones del tour.
   */
  getByTour(tourId: number): Observable<IReservationResponse[]> {
    const params = new HttpParams()
      .set('TourId', tourId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene reservaciones por ID de departure.
   * @param departureId ID del departure.
   * @returns Lista de reservaciones del departure.
   */
  getByDeparture(departureId: number): Observable<IReservationResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene reservaciones por ID de retailer.
   * @param retailerId ID del retailer.
   * @returns Lista de reservaciones del retailer.
   */
  getByRetailer(retailerId: number): Observable<IReservationResponse[]> {
    const params = new HttpParams()
      .set('RetailerId', retailerId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene reservaciones por estado de reservación.
   * @param reservationStatusId ID del estado de reservación.
   * @returns Lista de reservaciones con el estado especificado.
   */
  getByReservationStatus(
    reservationStatusId: number
  ): Observable<IReservationResponse[]> {
    const params = new HttpParams()
      .set('ReservationStatusId', reservationStatusId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene reservaciones por rango de fechas de creación.
   * @param startDate Fecha de inicio (formato ISO string).
   * @param endDate Fecha de fin (formato ISO string).
   * @returns Lista de reservaciones en el rango de fechas.
   */
  getByDateRange(
    startDate: string,
    endDate: string
  ): Observable<IReservationResponse[]> {
    const params = new HttpParams()
      .set('CreatedAtFrom', startDate)
      .set('CreatedAtTo', endDate)
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene reservaciones abandonadas.
   * @returns Lista de reservaciones abandonadas.
   */
  getAbandoned(): Observable<IReservationResponse[]> {
    const params = new HttpParams()
      .set('AbandonedAtIsNotNull', 'true')
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene reservaciones en carrito (no completadas).
   * @returns Lista de reservaciones en carrito.
   */
  getInCart(): Observable<IReservationResponse[]> {
    const params = new HttpParams()
      .set('CartAtIsNotNull', 'true')
      .set('ReservedAtIsNull', 'true')
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene reservaciones completadas.
   * @returns Lista de reservaciones completadas.
   */
  getCompleted(): Observable<IReservationResponse[]> {
    const params = new HttpParams()
      .set('ReservedAtIsNotNull', 'true')
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationResponse[]>(this.API_URL, { params });
  }

  updateStatus(reservationId: number, statusId: number): Observable<boolean> {
    return this.getById(reservationId).pipe(
      switchMap((current) => {
        const fullPayload: ReservationUpdate = {
          tkId: current.tkId,
          reservationStatusId: statusId,
          retailerId: current.retailerId,
          tourId: current.tourId,
          departureId: current.departureId,
          userId: current.userId,
          totalPassengers: current.totalPassengers,
          totalAmount: current.totalAmount,
        };

        return this.http.put<boolean>(`${this.API_URL}/${reservationId}`, fullPayload, {
          headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        });
      })
    );
  }

  /**
   * Encola una tarea de sincronización de reservación con TourKnife en Hangfire para procesamiento en segundo plano.
   * @param reservationId ID interno de la reservación.
   * @returns Resultado de la operación.
   */
  enqueueSync(reservationId: number): Observable<boolean> {
    return this.http.post<boolean>(`${environment.reservationsApiUrl}/ReservationsSyncs/${reservationId}/enqueue`, {});
  }

  /**
   * Cancela una reservación.
   * @param reservationId ID de la reservación a cancelar.
   * @param canceledBy Indica quién cancela: 1 si viene de UI directo, 2 si viene desde ATC.
   * @param comment Comentario sobre la cancelación.
   * @param cancelationFee Tarifa de cancelación.
   * @returns Resultado de la operación.
   */
  cancelReservation(
    reservationId: number,
    canceledBy: number,
    comment: string,
    cancelationFee?: number
  ): Observable<boolean> {
    // Intentar con query parameters en lugar de body
    const params = new HttpParams()
      .set('comment', comment)
      .set('cancelationFee', (cancelationFee || 0).toString());
    
    const url = `${environment.reservationsApiUrl}/ReservationsSyncs/cancel-reservation/${reservationId}/${canceledBy}`;
    
    console.log('🔥 Cancel Reservation Request (Query Params):', {
      url,
      reservationId,
      canceledBy,
      comment,
      cancelationFee,
      fullUrl: `${url}?comment=${encodeURIComponent(comment)}&cancelationFee=${cancelationFee || 0}`
    });
    
    return this.http.put<boolean>(
      url,
      null, // Sin body
      {
        params: params,
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }
}
