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
    // Obtener TODOS los campos de email (ReservationFieldId = 11)
    const fieldsUrl = `${environment.reservationsApiUrl}/ReservationTravelerField`;
    const fieldsParams = new HttpParams()
      .set('ReservationFieldId', '11') // 11 = email
      .set('useExactMatchForStrings', 'false');

    return this.http.get<any[]>(fieldsUrl, { params: fieldsParams }).pipe(
      switchMap((allFields: any[]) => {
        console.log('🔍 Total de campos de email encontrados:', allFields?.length || 0);
        
        if (!allFields || allFields.length === 0) {
          return of([]);
        }

        // FILTRAR MANUALMENTE para asegurar coincidencia exacta con el email buscado
        const exactMatchFields = allFields.filter((f: any) => {
          const fieldEmail = f.value?.toLowerCase().trim();
          const searchEmail = email.toLowerCase().trim();
          return fieldEmail === searchEmail;
        });
        
        console.log('✅ Campos que coinciden con el email del usuario:', exactMatchFields.length);
        
        if (exactMatchFields.length === 0) {
          console.log('❌ No se encontraron campos que coincidan con el email:', email);
          return of([]);
        }

        // Obtener los IDs de travelers únicos que tienen el email específico
        const travelerIds = [...new Set(exactMatchFields.map((f: any) => f.reservationTravelerId))];
        console.log('👥 TravelerIds únicos encontrados:', travelerIds);

        // Obtener TODOS los travelers y filtrar manualmente
        const travelersUrl = `${environment.reservationsApiUrl}/ReservationTraveler`;
        
        return this.http.get<any[]>(travelersUrl).pipe(
          switchMap((allTravelers: any[]) => {
            console.log('👥 Total de travelers obtenidos de la API:', allTravelers?.length || 0);
            
            if (!allTravelers || allTravelers.length === 0) {
              return of([]);
            }
            
            // FILTRAR MANUALMENTE solo los travelers que están en nuestra lista de IDs
            const filteredTravelers = allTravelers.filter(traveler => 
              travelerIds.includes(traveler.id)
            );
            
            console.log('✅ Travelers filtrados que coinciden:', filteredTravelers.length);
            
            // Obtener IDs únicos de reservas SOLO de los travelers que tienen el email
            const reservationIds = [...new Set(filteredTravelers.map((t: any) => t.reservationId))].filter(id => id != null);
            
            console.log('📋 ReservationIds únicos a buscar:', reservationIds);
            
            if (reservationIds.length === 0) {
              console.log('❌ No se encontraron reservationIds válidos');
              return of([]);
            }

            // Obtener TODAS las reservas y filtrar manualmente por IDs
            return this.http.get<ReservationResponse[]>(this.API_URL).pipe(
              map((allReservations: ReservationResponse[]) => {
                console.log('📋 Total de reservas obtenidas de la API:', allReservations?.length || 0);
                
                if (!allReservations || allReservations.length === 0) {
                  return [];
                }
                
                // FILTRAR MANUALMENTE solo las reservas que están en nuestra lista de IDs
                const filteredReservations = allReservations.filter(reservation => 
                  reservationIds.includes(reservation.id)
                );
                
                console.log('✅ Reservas filtradas final:', filteredReservations.length);
                console.log('📋 IDs de reservas filtradas:', filteredReservations.map(r => r.id));
                
                return filteredReservations;
              })
            );
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
   * Obtiene presupuestos recientes donde un email aparece como viajero
   * @param email - Email del viajero
   * @returns Observable de array de ReservationResponse
   */
  getRecentBudgetsByTravelerEmail(email: string): Observable<ReservationResponse[]> {
    return this.getReservationsByTravelerEmail(email).pipe(
      map((reservations: ReservationResponse[]) => 
        reservations.filter(reservation => 
          reservation.reservationStatusId === 3
        )
      )
    );
  }
}