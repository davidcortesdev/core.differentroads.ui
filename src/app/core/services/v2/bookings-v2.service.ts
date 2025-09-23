import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ReservationResponse } from '../../models/v2/profile-v2.model';


@Injectable({
  providedIn: 'root',
})
export class BookingsServiceV2 {
  private readonly API_URL = `${environment.reservationsApiUrl}/Reservation`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene reservas por ID de usuario
   * @param userId - ID del usuario
   * @returns Observable de array de ReservationResponse
   */
  getReservationsByUser(userId: number): Observable<ReservationResponse[]> {
    const params = new HttpParams()
      .set('UserId', userId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene reservas activas (Booked y RQ)
   * @param userId - ID del usuario
   * @returns Observable de array de ReservationResponse
   */
  getActiveBookings(userId: number): Observable<ReservationResponse[]> {
    const params = new HttpParams()
      .set('UserId', userId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params }).pipe(
      // Filtrar solo reservas activas (status 1 y 2)
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 1 || reservation.reservationStatusId === 2
        )
      )
    );
  }

  /**
   * Obtiene historial de viajes (Completed y Cancelled)
   * @param userId - ID del usuario
   * @returns Observable de array de ReservationResponse
   */
  getTravelHistory(userId: number): Observable<ReservationResponse[]> {
    const params = new HttpParams()
      .set('UserId', userId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params }).pipe(
      // Filtrar solo historial (status 3 y 4)
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 3 || reservation.reservationStatusId === 4
        )
      )
    );
  }

  /**
   * Obtiene presupuestos recientes (Budget)
   * @param userId - ID del usuario
   * @returns Observable de array de ReservationResponse
   */
  getRecentBudgets(userId: number): Observable<ReservationResponse[]> {
    const params = new HttpParams()
      .set('UserId', userId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params }).pipe(
      // Filtrar solo presupuestos (status 0)
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 0
        )
      )
    );
  }

  /**
   * Obtiene detalles de una reserva específica
   * @param reservationId - ID de la reserva
   * @returns Observable de ReservationResponse
   */
  getReservationDetails(reservationId: number): Observable<ReservationResponse> {
    const params = new HttpParams()
      .set('Id', reservationId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params }).pipe(
      map((reservations: ReservationResponse[]) => {
        if (reservations && reservations.length > 0) {
          return reservations[0];
        }
        throw new Error('Reserva no encontrada');
      })
    );
  }

  /**
   * Descarga documento de reserva (voucher)
   * @param bookingId - ID de la reserva
   * @param force - Forzar regeneración del documento
   * @returns Observable con URL del documento
   */
  downloadBookingDocument(bookingId: string, force = false): Observable<{ fileUrl: string }> {
    const url = `${environment.notificationsApiUrl}/documents/bookingBone/${bookingId}?force=${force}`;
    return this.http.get<{ fileUrl: string }>(url);
  }
}