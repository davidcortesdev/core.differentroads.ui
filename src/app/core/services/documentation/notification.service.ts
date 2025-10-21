import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para la respuesta de notificaciones
 */
export interface INotification {
  id: number;
  notificationTypeId: number;
  notificationStatusId: number;
  reservationId: number;
  subject: string | null;
  content: string | null;
  recipientEmail: string | null;
  isReadyToSend: boolean;
  readyToSendAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  message: string | null;
  eventName: string | null;
  recipient: string | null;
  emailId: string | null;
  error: string | null;
}

/**
 * Interfaz para crear una notificación
 */
export interface NotificationCreate {
  notificationTypeId: number;
  notificationStatusId: number;
  reservationId: number;
  subject?: string | null;
  content?: string | null;
  recipientEmail?: string | null;
  isReadyToSend?: boolean;
}

/**
 * Interfaz para actualizar una notificación
 */
export interface NotificationUpdate {
  id: number;
  notificationTypeId: number;
  notificationStatusId: number;
  reservationId: number;
  subject?: string | null;
  content?: string | null;
  recipientEmail?: string | null;
  isReadyToSend?: boolean;
}

/**
 * Interfaz para la respuesta de tipos de notificación
 */
export interface INotificationTypeResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * Interfaz para la respuesta de estados de notificación
 */
export interface INotificationStatusResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly API_URL = `${environment.documentationApiUrl}/Notification`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene notificaciones por ID de reserva
   * @param reservationId - ID de la reserva
   * @returns Observable de array de INotification
   */
  getNotificationsByReservationId(
    reservationId: number
  ): Observable<INotification[]> {
    const url = `${this.API_URL}/by-reservation/${reservationId}`;
    console.log('🔍 DEBUG: NotificationService - Making request to:', url);
    return this.http.get<INotification[]>(url);
  }

  /**
   * Obtiene notificaciones por ID de tipo de notificación
   * @param notificationTypeId - ID del tipo de notificación
   * @returns Observable de array de INotification
   */
  getNotificationsByTypeId(
    notificationTypeId: number
  ): Observable<INotification[]> {
    const url = `${this.API_URL}/by-type/${notificationTypeId}`;
    return this.http.get<INotification[]>(url);
  }

  /**
   * Obtiene notificaciones por ID de estado de notificación
   * @param notificationStatusId - ID del estado de notificación
   * @returns Observable de array de INotification
   */
  getNotificationsByStatusId(
    notificationStatusId: number
  ): Observable<INotification[]> {
    const url = `${this.API_URL}/by-status/${notificationStatusId}`;
    return this.http.get<INotification[]>(url);
  }

  /**
   * Obtiene todas las notificaciones con filtros opcionales
   * @param filters - Filtros opcionales para la búsqueda
   * @returns Observable de array de INotification
   */
  getNotifications(filters?: {
    ids?: number[];
    notificationTypeIds?: number[];
    notificationStatusIds?: number[];
    reservationIds?: number[];
    recipientEmails?: string[];
    isReadyToSend?: boolean;
  }): Observable<INotification[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.ids && filters.ids.length > 0) {
        filters.ids.forEach((id) => {
          params = params.append('Id', id.toString());
        });
      }
      if (
        filters.notificationTypeIds &&
        filters.notificationTypeIds.length > 0
      ) {
        filters.notificationTypeIds.forEach((id) => {
          params = params.append('NotificationTypeId', id.toString());
        });
      }
      if (
        filters.notificationStatusIds &&
        filters.notificationStatusIds.length > 0
      ) {
        filters.notificationStatusIds.forEach((id) => {
          params = params.append('NotificationStatusId', id.toString());
        });
      }
      if (filters.reservationIds && filters.reservationIds.length > 0) {
        filters.reservationIds.forEach((id) => {
          params = params.append('ReservationId', id.toString());
        });
      }
      if (filters.recipientEmails && filters.recipientEmails.length > 0) {
        filters.recipientEmails.forEach((email) => {
          params = params.append('RecipientEmail', email);
        });
      }
      if (filters.isReadyToSend !== undefined) {
        params = params.set('IsReadyToSend', filters.isReadyToSend.toString());
      }
    }

    return this.http.get<INotification[]>(this.API_URL, { params });
  }

  /**
   * Obtiene una notificación específica por ID
   * @param notificationId - ID de la notificación
   * @returns Observable de INotification
   */
  getNotificationById(notificationId: number): Observable<INotification> {
    const url = `${this.API_URL}/${notificationId}`;
    return this.http.get<INotification>(url);
  }

  /**
   * Crea una nueva notificación
   * @param notification - Datos para crear la notificación
   * @returns Observable de INotification
   */
  createNotification(
    notification: NotificationCreate
  ): Observable<INotification> {
    return this.http.post<INotification>(this.API_URL, notification);
  }

  /**
   * Actualiza una notificación existente
   * @param notification - Datos para actualizar la notificación
   * @returns Observable de INotification
   */
  updateNotification(
    notification: NotificationUpdate
  ): Observable<INotification> {
    const url = `${this.API_URL}/${notification.id}`;
    return this.http.put<INotification>(url, notification);
  }

  /**
   * Elimina una notificación
   * @param notificationId - ID de la notificación
   * @returns Observable vacío
   */
  deleteNotification(notificationId: number): Observable<void> {
    const url = `${this.API_URL}/${notificationId}`;
    return this.http.delete<void>(url);
  }

  /**
   * Obtiene tipos de notificación disponibles
   * @returns Observable de array de INotificationTypeResponse
   */
  getNotificationTypes(): Observable<INotificationTypeResponse[]> {
    const url = `${environment.documentationApiUrl}/NotificationType`;
    return this.http.get<INotificationTypeResponse[]>(url);
  }

  /**
   * Obtiene estados de notificación disponibles
   * @returns Observable de array de INotificationStatusResponse
   */
  getNotificationStatuses(): Observable<INotificationStatusResponse[]> {
    const url = `${environment.documentationApiUrl}/NotificationStatus`;
    return this.http.get<INotificationStatusResponse[]>(url);
  }
}
