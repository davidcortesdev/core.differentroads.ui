import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface NotificationRequest {
  reservationId: number;
  code: string;
  email: string;
}

export interface NotificationProcessResponse {
  jobId: string;
  message: string;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  jobId?: string;
  notificationId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly baseUrl = 'https://documentation-dev.differentroads.es/api';
  
  constructor(private http: HttpClient) {}

  /**
   * Envía una notificación usando el proceso completo
   * @param notificationData Datos de la notificación
   * @returns Observable con la respuesta
   */
  sendNotification(notificationData: NotificationRequest): Observable<NotificationResponse> {
    const url = `${this.baseUrl}/NotificationProcess/full-process/enqueue`;
    
    const headers = new HttpHeaders({
      'accept': '*/*',
      'Content-Type': 'application/json'
    });

    return this.http.post<NotificationProcessResponse>(url, notificationData, { headers }).pipe(
      map(response => {
        // El endpoint devuelve { jobId: string, message: string }
        // Transformar a la interfaz NotificationResponse
        return {
          success: true, // Si llegamos aquí, la petición fue exitosa
          message: response.message,
          jobId: response.jobId,
          notificationId: response.jobId // Usar jobId como notificationId
        };
      })
    );
  }

  /**
   * Envía notificación de presupuesto
   * @param reservationId ID de la reserva
   * @param email Email del destinatario
   * @returns Observable con la respuesta
   */
  sendBudgetNotification(reservationId: number, email: string): Observable<NotificationResponse> {
    return this.sendNotification({
      reservationId,
      code: 'BUDGET',
      email
    });
  }

  /**
   * Envía notificación de nueva reserva transfer
   * @param reservationId ID de la reserva
   * @param email Email del destinatario
   * @returns Observable con la respuesta
   */
  sendNewReservationTransferNotification(reservationId: number, email: string): Observable<NotificationResponse> {
    return this.sendNotification({
      reservationId,
      code: 'NEW_RES_TRANSFER',
      email
    });
  }

  /**
   * Envía notificación de nueva solicitud de reserva
   * @param reservationId ID de la reserva
   * @param email Email del destinatario
   * @returns Observable con la respuesta
   */
  sendNewReservationRequestNotification(reservationId: number, email: string): Observable<NotificationResponse> {
    return this.sendNotification({
      reservationId,
      code: 'NEW_RESERVATION_RQ',
      email
    });
  }

  /**
   * Envía notificación de nueva reserva confirmada
   * @param reservationId ID de la reserva
   * @param email Email del destinatario
   * @returns Observable con la respuesta
   */
  sendNewReservationConfirmedNotification(reservationId: number, email: string): Observable<NotificationResponse> {
    return this.sendNotification({
      reservationId,
      code: 'NEW_RES_CONFIRMED',
      email
    });
  }

  /**
   * Envía notificación para completar datos
   * @param reservationId ID de la reserva
   * @param email Email del destinatario
   * @returns Observable con la respuesta
   */
  sendCompleteDataNotification(reservationId: number, email: string): Observable<NotificationResponse> {
    return this.sendNotification({
      reservationId,
      code: 'COMPLETE_DATA',
      email
    });
  }

  /**
   * Envía notificación de advertencia de cancelación
   * @param reservationId ID de la reserva
   * @param email Email del destinatario
   * @returns Observable con la respuesta
   */
  sendCancelWarningNotification(reservationId: number, email: string): Observable<NotificationResponse> {
    return this.sendNotification({
      reservationId,
      code: 'CANCEL_WARNING',
      email
    });
  }

  /**
   * Envía notificación de cancelación sin pago
   * @param reservationId ID de la reserva
   * @param email Email del destinatario
   * @returns Observable con la respuesta
   */
  sendCancelNoPaymentNotification(reservationId: number, email: string): Observable<NotificationResponse> {
    return this.sendNotification({
      reservationId,
      code: 'CANCEL_NO_PAYMENT',
      email
    });
  }
}
