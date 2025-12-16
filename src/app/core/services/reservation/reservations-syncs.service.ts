import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface EnqueueSyncResponse {
  jobId: string;
}

export interface SyncJobStatusResponse {
  jobId: string;
  state: string;
  createdAt: string;
  properties: {
    CurrentCulture?: string;
    CurrentUICulture?: string;
    RetryCount?: string;
    [key: string]: any;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ReservationsSyncsService {
  constructor(private http: HttpClient) {}

  /**
   * Encola una sincronización en el backend de Reservations a partir del ID interno de reserva.
   * POST {reservationsApiUrl}/ReservationsSyncs/{reservationId}/enqueue
   */
  enqueueByReservationId(reservationId: number): Observable<EnqueueSyncResponse> {
    return this.http.post<EnqueueSyncResponse>(
      `${environment.reservationsApiUrl}/ReservationsSyncs/${reservationId}/enqueue`,
      {}
    );
  }

  /**
   * Encola una sincronización completa desde TourKnife utilizando el tkId de la reserva.
   * POST {tourknifeApiUrl}/ReservationsSyncs/sync/full/from-tk/{reservationTkId}/enqueue
   */
  enqueueByTkId(reservationTkId: string): Observable<boolean> {
    return this.http.post<boolean>(
      `${environment.tourknifeApiUrl}/ReservationsSyncs/sync/full/from-tk/${reservationTkId}/enqueue`,
      {}
    );
  }

  /**
   * Verifica el estado de un job de sincronización por JobId.
   * GET {tourknifeApiUrl}/sync/tours/status/{jobId}
   */
  getSyncJobStatus(jobId: string): Observable<SyncJobStatusResponse> {
    return this.http.get<SyncJobStatusResponse>(
      `${environment.tourknifeApiUrl}/sync/tours/status/${jobId}`
    );
  }
}

