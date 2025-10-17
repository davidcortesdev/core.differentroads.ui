import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, switchMap, of } from 'rxjs';
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
      // Filtrar solo reservas activas (status 5 = BOOKED, 6 = CONFIRMED)
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 5 || reservation.reservationStatusId === 6
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
      // Filtrar solo historial (status 7 = PAID, 8 = CANCELLED)
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 7 || reservation.reservationStatusId === 8
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
      // Filtrar solo presupuestos (status 3 = BUDGET)
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 3
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
   * Obtiene reservas donde un email aparece como viajero
   * @param email - Email del viajero
   * @returns Observable de array de ReservationResponse
   */
  getReservationsByTravelerEmail(email: string): Observable<ReservationResponse[]> {
    // Primero obtener todos los ReservationTraveler que tienen este email
    const travelersUrl = `${environment.reservationsApiUrl}/ReservationTraveler`;
    const travelersParams = new HttpParams()
      .set('useExactMatchForStrings', 'false');

    return this.http.get<any[]>(travelersUrl, { params: travelersParams }).pipe(
      switchMap((travelers: any[]) => {
        // Filtrar viajeros que tienen el email en sus campos
        const travelersWithEmail = travelers.filter(traveler => {
          // Verificar si el viajero tiene campos con email
          return this.hasEmailInFields(traveler, email);
        });

        // Obtener IDs únicos de reservas
        const reservationIds = [...new Set(travelersWithEmail.map(t => t.reservationId))];
        
        if (reservationIds.length === 0) {
          return of([]);
        }

        // Obtener todas las reservas de estos IDs
        return this.getReservationsByIds(reservationIds);
      })
    );
  }

  /**
   * Obtiene reservas activas donde un email aparece como viajero
   * @param email - Email del viajero
   * @returns Observable de array de ReservationResponse
   */
  getActiveBookingsByTravelerEmail(email: string): Observable<ReservationResponse[]> {
    return this.getReservationsByTravelerEmail(email).pipe(
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 5 || reservation.reservationStatusId === 6
        )
      )
    );
  }

  /**
   * Obtiene historial de viajes donde un email aparece como viajero
   * @param email - Email del viajero
   * @returns Observable de array de ReservationResponse
   */
  getTravelHistoryByTravelerEmail(email: string): Observable<ReservationResponse[]> {
    return this.getReservationsByTravelerEmail(email).pipe(
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 7 || reservation.reservationStatusId === 8
        )
      )
    );
  }

  /**
   * Verifica si un viajero tiene el email especificado en sus campos
   * @param traveler - Objeto del viajero
   * @param email - Email a buscar
   * @returns true si el viajero tiene el email
   */
  private hasEmailInFields(traveler: any, email: string): boolean {
    // Si el viajero tiene campos, verificar si alguno contiene el email
    if (traveler.fields && Array.isArray(traveler.fields)) {
      return traveler.fields.some((field: any) => 
        field.reservationFieldId === 11 && field.value === email
      );
    }
    return false;
  }

  /**
   * Obtiene reservas por sus IDs
   * @param reservationIds - Array de IDs de reservas
   * @returns Observable de array de ReservationResponse
   */
  private getReservationsByIds(reservationIds: number[]): Observable<ReservationResponse[]> {
    const params = new HttpParams()
      .set('Ids', reservationIds.join(','))
      .set('useExactMatchForStrings', 'false');

    return this.http.get<ReservationResponse[]>(this.API_URL, { params });
  }
}