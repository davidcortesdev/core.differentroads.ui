import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface NotificationV2 {
  id: string;
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  category: 'booking' | 'payment' | 'reminder' | 'promotion' | 'system';
  title: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  metadata?: Record<string, any>;
}

export interface SendNotificationRequestV2 {
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  category: 'booking' | 'payment' | 'reminder' | 'promotion' | 'system';
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  scheduledAt?: string;
}

export interface SendDocumentRequestV2 {
  userId: string;
  documentType: 'voucher' | 'invoice' | 'itinerary' | 'confirmation' | 'receipt';
  documentId: string;
  recipientEmail: string;
  subject?: string;
  message?: string;
  attachments?: string[];
}

export interface NotificationListResponseV2 {
  data: NotificationV2[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsServiceV2 {
  private readonly API_URL = `${environment.notificationsApiUrl}/v2`; // TODO: Actualizar URL cuando esté disponible

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Envía una notificación
   * @param request - Datos de la notificación
   * @returns Observable de NotificationV2
   */
  sendNotification(request: SendNotificationRequestV2): Observable<NotificationV2> {
    // TODO: API - Implementación real (comentada hasta que esté disponible)
    // return this.http.post<any>(`${this.API_URL}/send`, request, this.httpOptions).pipe(
    //   map((response: any) => this.mapApiResponseToNotification(response))
    // );

    // MOCK DATA - Usar datos de ejemplo para desarrollo
    return of(this.generateMockSendNotification(request));
  }

  /**
   * Envía un documento por email
   * @param request - Datos del envío de documento
   * @returns Observable de respuesta
   */
  sendDocument(request: SendDocumentRequestV2): Observable<{ success: boolean; message: string; notificationId: string }> {
    // TODO: API - Implementación real (comentada hasta que esté disponible)
    // return this.http.post<any>(`${this.API_URL}/send-document`, request, this.httpOptions).pipe(
    //   map((response: any) => ({
    //     success: response.success || true,
    //     message: response.message || 'Documento enviado correctamente',
    //     notificationId: response.notification_id || response.id || `notif-${Date.now()}`
    //   }))
    // );

    // MOCK DATA - Usar datos de ejemplo para desarrollo
    return of(this.generateMockSendDocument(request));
  }

  /**
   * Obtiene las notificaciones de un usuario
   * @param userId - ID del usuario
   * @param filters - Filtros de búsqueda
   * @param page - Página actual
   * @param limit - Límite de resultados por página
   * @returns Observable de NotificationListResponseV2
   */
  getUserNotifications(
    userId: string,
    filters?: {
      type?: string;
      category?: string;
      status?: string;
      priority?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    page: number = 1,
    limit: number = 20
  ): Observable<NotificationListResponseV2> {
    // TODO: Implementar cuando la API V2 esté disponible
    // let params = new HttpParams()
    //   .set('userId', userId)
    //   .set('page', page.toString())
    //   .set('limit', limit.toString());
    
    // if (filters) {
    //   if (filters.type) params = params.set('type', filters.type);
    //   if (filters.category) params = params.set('category', filters.category);
    //   if (filters.status) params = params.set('status', filters.status);
    //   if (filters.priority) params = params.set('priority', filters.priority);
    //   if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    //   if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
    // }

    // return this.http.get<NotificationListResponseV2>(`${this.API_URL}/user/${userId}`, {
    //   params,
    //   ...this.httpOptions,
    // });

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of(this.generateMockUserNotifications(userId, filters, page, limit));
  }

  /**
   * Marca una notificación como leída
   * @param notificationId - ID de la notificación
   * @returns Observable de NotificationV2
   */
  markAsRead(notificationId: string): Observable<NotificationV2> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.put<NotificationV2>(`${this.API_URL}/${notificationId}/read`, {}, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of(this.generateMockMarkAsRead(notificationId));
  }

  /**
   * Marca todas las notificaciones de un usuario como leídas
   * @param userId - ID del usuario
   * @returns Observable de respuesta
   */
  markAllAsRead(userId: string): Observable<{ success: boolean; message: string; count: number }> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.put<{ success: boolean; message: string; count: number }>(`${this.API_URL}/user/${userId}/read-all`, {}, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of(this.generateMockMarkAllAsRead(userId));
  }

  /**
   * Elimina una notificación
   * @param notificationId - ID de la notificación
   * @returns Observable de respuesta
   */
  deleteNotification(notificationId: string): Observable<{ success: boolean; message: string }> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${notificationId}`, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of({ success: true, message: 'Notificación eliminada correctamente' });
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   * @param userId - ID del usuario
   * @returns Observable de conteo
   */
  getUnreadCount(userId: string): Observable<{ count: number }> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.get<{ count: number }>(`${this.API_URL}/user/${userId}/unread-count`, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of({ count: 3 });
  }

  /**
   * Programa una notificación para envío futuro
   * @param request - Datos de la notificación programada
   * @returns Observable de NotificationV2
   */
  scheduleNotification(request: SendNotificationRequestV2): Observable<NotificationV2> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.post<NotificationV2>(`${this.API_URL}/schedule`, request, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of(this.generateMockScheduleNotification(request));
  }

  // ===== MÉTODOS PRIVADOS PARA MOCK DATA =====
  // TODO: Eliminar todos estos métodos cuando se implemente la API real

  private generateMockSendNotification(request: SendNotificationRequestV2): NotificationV2 {
    const notification: NotificationV2 = {
      id: `notification-${Date.now()}`,
      userId: request.userId,
      type: request.type,
      category: request.category,
      title: request.title,
      message: request.message,
      status: 'sent',
      priority: request.priority || 'medium',
      createdAt: new Date(),
      sentAt: new Date(),
      metadata: request.metadata
    };
    return notification;
  }

  private generateMockSendDocument(request: SendDocumentRequestV2): { success: boolean; message: string; notificationId: string } {
    const notificationId = `notification-${Date.now()}`;
    return {
      success: true,
      message: `Documento ${request.documentType} enviado correctamente a ${request.recipientEmail}`,
      notificationId
    };
  }

  private generateMockUserNotifications(
    userId: string,
    filters?: any,
    page: number = 1,
    limit: number = 20
  ): NotificationListResponseV2 {
    const allNotifications = this.getAllMockNotifications();
    let filteredNotifications = allNotifications.filter(notification => notification.userId === userId);

    // Aplicar filtros si existen
    if (filters) {
      if (filters.type) {
        filteredNotifications = filteredNotifications.filter(notification => notification.type === filters.type);
      }
      if (filters.category) {
        filteredNotifications = filteredNotifications.filter(notification => notification.category === filters.category);
      }
      if (filters.status) {
        filteredNotifications = filteredNotifications.filter(notification => notification.status === filters.status);
      }
      if (filters.priority) {
        filteredNotifications = filteredNotifications.filter(notification => notification.priority === filters.priority);
      }
      if (filters.dateFrom) {
        filteredNotifications = filteredNotifications.filter(notification => notification.createdAt >= filters.dateFrom);
      }
      if (filters.dateTo) {
        filteredNotifications = filteredNotifications.filter(notification => notification.createdAt <= filters.dateTo);
      }
    }

    // Aplicar paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    return {
      data: paginatedNotifications,
      total: filteredNotifications.length,
      page,
      limit,
      totalPages: Math.ceil(filteredNotifications.length / limit)
    };
  }

  private generateMockMarkAsRead(notificationId: string): NotificationV2 {
    const allNotifications = this.getAllMockNotifications();
    const notification = allNotifications.find(n => n.id === notificationId) || allNotifications[0];
    return {
      ...notification,
      status: 'read',
      readAt: new Date()
    };
  }

  private generateMockMarkAllAsRead(userId: string): { success: boolean; message: string; count: number } {
    const allNotifications = this.getAllMockNotifications();
    const userNotifications = allNotifications.filter(n => n.userId === userId && n.status !== 'read');
    return {
      success: true,
      message: `${userNotifications.length} notificaciones marcadas como leídas`,
      count: userNotifications.length
    };
  }

  private generateMockScheduleNotification(request: SendNotificationRequestV2): NotificationV2 {
    const notification: NotificationV2 = {
      id: `notification-${Date.now()}`,
      userId: request.userId,
      type: request.type,
      category: request.category,
      title: request.title,
      message: request.message,
      status: 'pending',
      priority: request.priority || 'medium',
      createdAt: new Date(),
      metadata: {
        ...request.metadata,
        scheduledAt: request.scheduledAt
      }
    };
    return notification;
  }

  private getAllMockNotifications(): NotificationV2[] {
    return [
      {
        id: 'notification-1',
        userId: 'mockUserId-123',
        type: 'email',
        category: 'booking',
        title: 'Confirmación de reserva',
        message: 'Tu reserva para el Tour por Italia ha sido confirmada. Revisa los detalles en tu perfil.',
        status: 'read',
        priority: 'high',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        sentAt: new Date('2024-01-15T10:30:00Z'),
        deliveredAt: new Date('2024-01-15T10:31:00Z'),
        readAt: new Date('2024-01-15T11:00:00Z'),
        metadata: {
          bookingId: 'booking-1',
          documentType: 'confirmation'
        }
      },
      {
        id: 'notification-2',
        userId: 'mockUserId-123',
        type: 'email',
        category: 'payment',
        title: 'Pago procesado',
        message: 'Tu pago de 1,250.00 EUR ha sido procesado correctamente.',
        status: 'read',
        priority: 'high',
        createdAt: new Date('2024-01-15T10:35:00Z'),
        sentAt: new Date('2024-01-15T10:35:00Z'),
        deliveredAt: new Date('2024-01-15T10:36:00Z'),
        readAt: new Date('2024-01-15T11:05:00Z'),
        metadata: {
          bookingId: 'booking-1',
          amount: 1250,
          currency: 'EUR'
        }
      },
      {
        id: 'notification-3',
        userId: 'mockUserId-123',
        type: 'email',
        category: 'reminder',
        title: 'Recordatorio de viaje',
        message: 'Tu viaje a Italia comienza en 7 días. ¡Prepárate para una experiencia increíble!',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date('2024-01-20T09:00:00Z'),
        sentAt: new Date('2024-01-20T09:00:00Z'),
        deliveredAt: new Date('2024-01-20T09:01:00Z'),
        metadata: {
          bookingId: 'booking-1',
          daysUntilTravel: 7
        }
      },
      {
        id: 'notification-4',
        userId: 'mockUserId-123',
        type: 'in-app',
        category: 'promotion',
        title: '¡Oferta especial!',
        message: 'Descuento del 20% en tu próximo viaje. Válido hasta el 31 de marzo.',
        status: 'sent',
        priority: 'low',
        createdAt: new Date('2024-01-22T14:00:00Z'),
        metadata: {
          promotionId: 'promo-spring-2024',
          discount: 20,
          validUntil: '2024-03-31'
        }
      },
      {
        id: 'notification-5',
        userId: 'mockUserId-123',
        type: 'email',
        category: 'system',
        title: 'Actualización de términos',
        message: 'Hemos actualizado nuestros términos y condiciones. Por favor, revísalos.',
        status: 'read',
        priority: 'medium',
        createdAt: new Date('2024-01-25T16:00:00Z'),
        sentAt: new Date('2024-01-25T16:00:00Z'),
        deliveredAt: new Date('2024-01-25T16:01:00Z'),
        metadata: {
          documentType: 'terms',
          version: '2.1'
        }
      }
    ];
  }

  /**
   * Mapea la respuesta de la API V2 a NotificationV2
   * @param apiResponse - Respuesta de la API V2
   * @returns NotificationV2
   */
  private mapApiResponseToNotification(apiResponse: any): NotificationV2 {
    return {
      id: apiResponse.id || `notif-${Date.now()}`,
      userId: apiResponse.user_id || apiResponse.userId,
      type: apiResponse.type || 'email',
      category: apiResponse.category || 'system',
      title: apiResponse.title || 'Notificación',
      message: apiResponse.message || apiResponse.content || '',
      status: apiResponse.is_read || apiResponse.read ? 'read' : 'pending',
      priority: apiResponse.priority || 'medium',
      createdAt: apiResponse.created_at ? new Date(apiResponse.created_at) : new Date(),
      readAt: apiResponse.read_at ? new Date(apiResponse.read_at) : undefined,
      metadata: apiResponse.metadata || {}
    };
  }
}