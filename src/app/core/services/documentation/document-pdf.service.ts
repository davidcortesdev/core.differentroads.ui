import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DocumentPDFService {
  private readonly API_URL = `${environment.documentationApiUrl}/DocumentPDF`;

  constructor(private http: HttpClient) {}

  /**
   * Genera y descarga un documento PDF para una reserva.
   * @param reservationId ID de la reserva/presupuesto.
   * @param code Código del tipo de documento (ej: 'BUDGET').
   * @returns Blob del PDF generado.
   */
  downloadReservationPDFAsBlob(
    reservationId: number,
    code: string
  ): Observable<Blob> {
    const url = `${this.API_URL}/Reservation/${reservationId}/${code}`;

    return this.http.post(
      url,
      {},
      {
        responseType: 'blob',
        headers: new HttpHeaders({
          Accept: 'application/pdf',
        }),
      }
    );
  }
}
