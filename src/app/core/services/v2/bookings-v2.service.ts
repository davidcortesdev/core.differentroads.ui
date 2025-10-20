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
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 2 || 
          reservation.reservationStatusId === 5 || 
          reservation.reservationStatusId === 6 || 
          reservation.reservationStatusId === 7
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
    // Obtener TODOS los campos de email (ReservationFieldId = 11) y filtrar manualmente
    const fieldsUrl = `${environment.reservationsApiUrl}/ReservationTravelerField`;
    const fieldsParams = new HttpParams()
      .set('ReservationFieldId', '11') // 11 = email
      .set('useExactMatchForStrings', 'false');

    return this.http.get<any[]>(fieldsUrl, { params: fieldsParams }).pipe(
      switchMap((fields: any[]) => {
        // FILTRAR MANUALMENTE para asegurar coincidencia exacta con el email buscado
        const exactMatchFields = fields.filter((f: any) => {
          const fieldEmail = f.value?.toLowerCase().trim();
          const searchEmail = email.toLowerCase().trim();
          return fieldEmail === searchEmail;
        });
        
        if (exactMatchFields.length === 0) {
          return of([]);
        }

        // Obtener los IDs de travelers únicos que tienen el email específico
        const travelerIds = [...new Set(exactMatchFields.map((f: any) => f.reservationTravelerId))];

        // Obtener los travelers para obtener sus reservationIds
        const travelersUrl = `${environment.reservationsApiUrl}/ReservationTraveler`;
        const travelersParams = new HttpParams()
          .set('Ids', travelerIds.join(','))
          .set('useExactMatchForStrings', 'false');

        return this.http.get<any[]>(travelersUrl, { params: travelersParams }).pipe(
          switchMap((travelers: any[]) => {
            // FILTRAR MANUALMENTE solo los travelers que están en nuestra lista de IDs
            const filteredTravelers = travelers.filter(traveler => 
              travelerIds.includes(traveler.id)
            );
            
            // Obtener IDs únicos de reservas SOLO de los travelers que tienen el email
            const reservationIds = [...new Set(filteredTravelers.map((t: any) => t.reservationId))];
            
            if (reservationIds.length === 0) {
              return of([]);
            }

            // Obtener todas las reservas de estos IDs
            return this.getReservationsByIds(reservationIds);
          })
        );
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
          reservation.reservationStatusId === 2 || 
          reservation.reservationStatusId === 5 || 
          reservation.reservationStatusId === 6 || 
          reservation.reservationStatusId === 7
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