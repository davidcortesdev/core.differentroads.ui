import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para el cuerpo de la petición de envío de email.
 */
export interface EmailSenderRequest {
  event: string;
  email: string;
}

/**
 * Respuesta del servicio de envío de emails.
 */
export interface EmailSenderResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmailSenderService {
  private readonly API_URL = `${environment.documentationApiUrl}/EmailSender`;

  constructor(private http: HttpClient) {}

  /**
   * Envía un email de presupuesto sin documentos adjuntos.
   * @param reservationId ID de la reserva/presupuesto.
   * @param request Datos del email a enviar.
   * @returns Respuesta del servicio.
   */
  sendReservationWithoutDocuments(
    reservationId: number,
    request: EmailSenderRequest
  ): Observable<EmailSenderResponse> {
    const url = `${this.API_URL}/Reservation/${reservationId}/WithoutDocuments`;

    return this.http.post<EmailSenderResponse>(url, request, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }
}
