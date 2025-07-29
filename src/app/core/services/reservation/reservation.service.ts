import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ReservationCreate {
  id: number;
  tkId: string;
  reservationStatusId: number;
  retailerId: number;
  tourId: number;
  departureId: number;
  userId: number;
  totalPassengers: number;
  totalAmount: number;
  budgetAt: string;
  cartAt: string;
  abandonedAt: string;
  reservedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationUpdate {
  id: number;
  tkId: string;
  reservationStatusId: number;
  retailerId: number;
  tourId: number;
  departureId: number;
  userId: number;
  totalPassengers: number;
  totalAmount: number;
  budgetAt: string;
  cartAt: string;
  abandonedAt: string;
  reservedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IReservationResponse {
  id: number;
  tkId: string;
  reservationStatusId: number;
  retailerId: number;
  tourId: number;
  departureId: number;
  userId: number;
  totalPassengers: number;
  totalAmount: number;
  budgetAt: string;
  cartAt: string;
  abandonedAt: string;
  reservedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReservationFilters {
  id?: number;
  tkId?: string;
  reservationStatusId?: number;
  retailerId?: number;
  tourId?: number;
  departureId?: number;
  userId?: number;
  totalPassengers?: number;
  totalAmount?: number;
  budgetAt?: string;
  cartAt?: string;
  abandonedAt?: string;
  reservedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly API_URL = `${environment.reservationsApiUrl}/Reservation`;

  constructor(private http: HttpClient) {}

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
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<IReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva reservación.
   * @param data Datos para crear la reservación.
   * @returns La reservación creada.
   */
  create(data: ReservationCreate): Observable<IReservationResponse> {
    return this.http.post<IReservationResponse>(`${this.API_URL}`, data, {
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
   * Actualiza una reservación existente.
   * @param id ID de la reservación a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: ReservationUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
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
}
