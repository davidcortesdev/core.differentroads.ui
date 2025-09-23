import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface SendBudgetNotificationEmailServicePropsV2 {
  id: string;
  email: string;
  products?: {
    name: string;
    units: number;
    singlePrice: number;
  }[];
}

export interface CancelBookingNotificationPropsV2 {
  id: string;
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

@Injectable({
  providedIn: 'root',
})
export class NotificationsServiceV2 {
  private readonly API_URL = `${environment.notificationsApiUrl}/trigger`;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Envía notificación de presupuesto por email
   * @param props - Datos del presupuesto y email
   * @returns Observable de respuesta
   */
  sendBudgetNotificationEmail(
    props: SendBudgetNotificationEmailServicePropsV2
  ): Observable<any> {
    const { id, email, products } = props;
    const body = {
      trigger: 'BUDGET',
      data: {
        id,
        emailOverride: email,
        products: products,
      },
    };
    return this.http.post<any>(this.API_URL, body, this.httpOptions);
  }

  /**
   * Envía notificación de reserva por email
   * @param props - Datos de la reserva y email
   * @param bookState - Estado de la reserva
   * @returns Observable de respuesta
   */
  sendBookingNotificationEmail(
    props: SendBudgetNotificationEmailServicePropsV2,
    bookState: string
  ): Observable<any> {
    const { id, email, products } = props;
    console.log(id);

    const body = {
      trigger: 'NEW_BOOKING',
      data: {
        id,
        emailOverride: email,
        filters: {
          bookState,
        },
      },
    };
    return this.http.post<any>(this.API_URL, body, this.httpOptions);
  }

  /**
   * Envía notificación de cancelación de reserva
   * @param props - Datos de la reserva a cancelar
   * @returns Observable de respuesta
   */
  cancelBookingNotification(
    props: CancelBookingNotificationPropsV2
  ): Observable<any> {
    if (!props || !props.id) {
      throw new Error('The "id" property is missing in the props object.');
    }

    const { id } = props;
    const body = {
      trigger: 'BOOKING_CANCEL',
      data: {
        id,
        filters: {
          cancelState: 'user',
        },
      },
    };
    return this.http.post<any>(this.API_URL, body, this.httpOptions);
  }

  /**
   * Obtiene documento de presupuesto
   * @param id - ID del presupuesto
   * @returns Observable con URL del documento
   */
  getBudgetDocument(id: string): Observable<{
    fileUrl: string;
  }> {
    const url = `${environment.notificationsApiUrl}/documents/budget/${id}`;
    return this.http.get<{
      fileUrl: string;
    }>(url);
  }

  /**
   * Obtiene documento de reserva (voucher)
   * @param id - ID de la reserva
   * @param force - Forzar regeneración del documento
   * @returns Observable con URL del documento
   */
  getBookingDocument(
    id: string,
    force = false
  ): Observable<{
    fileUrl: string;
  }> {
    const url = `${environment.notificationsApiUrl}/documents/bookingBone/${id}?force=${force}`;
    return this.http.get<{
      fileUrl: string;
    }>(url);
  }

  /**
   * Envía un documento por email (método genérico para V2)
   * @param request - Datos del envío de documento
   * @returns Observable de respuesta
   */
  sendDocument(request: SendDocumentRequestV2): Observable<{ success: boolean; message: string; notificationId: string }> {
    // Mapear el tipo de documento al trigger correspondiente
    let trigger = 'SEND_DOCUMENT';
    let documentType = request.documentType;

    switch (request.documentType) {
      case 'voucher':
        trigger = 'NEW_BOOKING';
        documentType = 'voucher';
        break;
      case 'invoice':
        trigger = 'INVOICE';
        break;
      case 'itinerary':
        trigger = 'ITINERARY';
        break;
      case 'confirmation':
        trigger = 'CONFIRMATION';
        break;
      case 'receipt':
        trigger = 'RECEIPT';
        break;
    }

    const body = {
      trigger,
      data: {
        id: request.documentId,
        emailOverride: request.recipientEmail,
        documentType,
        subject: request.subject,
        message: request.message,
        attachments: request.attachments,
        filters: {
          userId: request.userId
        }
      },
    };

    return this.http.post<any>(this.API_URL, body, this.httpOptions).pipe(
      // Mapear la respuesta a un formato consistente
      map((response: any) => ({
        success: true,
        message: response.message || `Documento ${request.documentType} enviado correctamente`,
        notificationId: response.notificationId || response.id || `notif-${Date.now()}`
      }))
    );
  }

  /**
   * Descarga documento de presupuesto (alias para compatibilidad)
   * @param id - ID del presupuesto
   * @returns Observable con URL del documento
   */
  downloadBudgetDocument(id: string): Observable<{ fileUrl: string }> {
    return this.getBudgetDocument(id);
  }

  /**
   * Descarga documento de reserva (alias para compatibilidad)
   * @param id - ID de la reserva
   * @param force - Forzar regeneración del documento
   * @returns Observable con URL del documento
   */
  downloadBookingDocument(id: string, force = false): Observable<{ fileUrl: string }> {
    return this.getBookingDocument(id, force);
  }
}