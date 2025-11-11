import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReservationsSyncsService {
  constructor(private http: HttpClient) {}

  /**
   * Encola una sincronización en el backend de Reservations a partir del ID interno de reserva.
   * POST {reservationsApiUrl}/ReservationsSyncs/{reservationId}/enqueue
   */
  enqueueByReservationId(reservationId: number): Observable<boolean> {
    return this.http.post<boolean>(
      `${environment.reservationsApiUrl}/ReservationsSyncs/${reservationId}/enqueue`,
      {}
    );
  }

  /**
   * Encola una sincronización completa desde TourKnife utilizando el tkId de la reserva.
   * POST {tourknifeApiUrl}/ReservationsSyncs/{reservationTkId}/enqueue
   */
  enqueueByTkId(reservationTkId: string): Observable<boolean> {
    return this.http.post<boolean>(
      `${environment.tourknifeApiUrl}/ReservationsSyncs/${reservationTkId}/enqueue`,
      {}
    );
  }
}


