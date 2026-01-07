import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface InvoiceProcessResponse {
  jobId: string;
  message: string;
}

export interface InvoiceDocumentGenerateResponse {
  success: boolean;
  message: string;
  documentId?: string;
}

export interface InvoiceDocumentDownloadResult {
  blob: Blob;
  fileName: string;
}

export interface InvoiceByReservationResponse {
  invoiceId: number;
  reservationId: number;
}

export interface InvoiceDocumentInfo {
  id: number;
  documentTypeId: number;
  fileName: string;
  filePath: string;
  url: string | null;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceProcessService {
  private readonly baseUrl = environment.documentationApiUrl;
  
  constructor(private http: HttpClient) {}

  /**
   * Obtiene el invoiceId asociado a una reserva
   * @param reservationId ID de la reserva
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Observable con el invoiceId
   */
  getInvoiceByReservation(reservationId: number, signal?: AbortSignal): Observable<number> {
    const url = `${this.baseUrl}/InvoiceProcess/reservation/${reservationId}`;
    
    const headers = new HttpHeaders({
      'accept': 'application/json'
    });

    const options: {
      headers?: HttpHeaders | { [header: string]: string | string[] };
      signal?: AbortSignal;
    } = { headers };
    if (signal) {
      options.signal = signal;
    }

    return this.http.get<InvoiceByReservationResponse>(url, options).pipe(
      map(response => response.invoiceId)
    );
  }

  /**
   * Genera el documento de factura
   * @param invoiceId ID de la factura
   * @returns Observable con la respuesta
   */
  generateDocument(invoiceId: number): Observable<InvoiceDocumentGenerateResponse> {
    const url = `${this.baseUrl}/InvoiceProcess/${invoiceId}/document/generate`;
    
    const headers = new HttpHeaders({
      'accept': '*/*',
      'Content-Type': 'application/json'
    });

    return this.http.post<InvoiceDocumentGenerateResponse>(url, {}, { headers }).pipe(
      map(response => {
        return {
          success: true,
          message: response.message || 'Documento generado exitosamente',
          documentId: response.documentId
        };
      })
    );
  }

  /**
   * Encola el proceso completo de facturación
   * @param invoiceId ID de la factura (o reservationId si el endpoint lo acepta)
   * @param email Email del destinatario (opcional)
   * @returns Observable con la respuesta
   */
  enqueueFullProcess(invoiceId: number, email?: string): Observable<InvoiceProcessResponse> {
    const url = `${this.baseUrl}/InvoiceProcess/full-process/enqueue`;
    
    const headers = new HttpHeaders({
      'accept': '*/*',
      'Content-Type': 'application/json'
    });

    // El body puede ser { invoiceId: number, email?: string } o { reservationId: number, email?: string }
    // Según el swagger, verificar qué estructura espera
    const body: { invoiceId?: number; reservationId?: number; email?: string } = { 
      invoiceId: invoiceId 
    };
    if (email) {
      body.email = email;
    }

    return this.http.post<InvoiceProcessResponse>(url, body, { headers });
  }

  /**
   * Encola el proceso completo de facturación usando reservationId directamente
   * @param reservationId ID de la reserva
   * @param email Email del destinatario (opcional)
   * @returns Observable con la respuesta
   */
  enqueueFullProcessByReservation(reservationId: number, email?: string): Observable<InvoiceProcessResponse> {
    const url = `${this.baseUrl}/InvoiceProcess/full-process/enqueue`;
    
    const headers = new HttpHeaders({
      'accept': '*/*',
      'Content-Type': 'application/json'
    });

    // Intentar con reservationId directamente
    const body: { reservationId: number; email?: string } = { 
      reservationId: reservationId 
    };
    if (email) {
      body.email = email;
    }

    return this.http.post<InvoiceProcessResponse>(url, body, { headers });
  }

  /**
   * Descarga el documento de factura por invoiceId
   * @param invoiceId ID de la factura
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Observable con el blob y nombre del archivo
   */
  downloadDocument(invoiceId: number, signal?: AbortSignal): Observable<InvoiceDocumentDownloadResult> {
    const url = `${this.baseUrl}/InvoiceProcess/${invoiceId}/document/download`;
    
    const headers = new HttpHeaders({
      'accept': 'application/octet-stream'
    });

    const options: {
      headers?: HttpHeaders | { [header: string]: string | string[] };
      observe?: 'body';
      params?: HttpParams | { [param: string]: any };
      reportProgress?: boolean;
      responseType: 'blob';
      withCredentials?: boolean;
      signal?: AbortSignal;
    } = {
      headers,
      responseType: 'blob',
    };
    if (signal) {
      options.signal = signal;
    }

    return (this.http.get(url, options) as unknown as Observable<Blob>).pipe(
      map((blob) => ({
        blob: blob,
        fileName: `Factura_${invoiceId}.pdf`,
      }))
    );
  }

  /**
   * Descarga el documento de factura por reservationId
   * Primero obtiene la información del documento y luego lo descarga usando filePath
   * @param reservationId ID de la reserva
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Observable con el blob y nombre del archivo
   */
  downloadDocumentByReservation(reservationId: number, signal?: AbortSignal): Observable<InvoiceDocumentDownloadResult> {
    const url = `${this.baseUrl}/InvoiceProcess/reservation/${reservationId}/document`;
    
    const options: {
      headers?: HttpHeaders | { [header: string]: string | string[] };
      signal?: AbortSignal;
    } = {
      headers: new HttpHeaders({
        'accept': 'application/json'
      })
    };
    if (signal) {
      options.signal = signal;
    }

    // Primero obtener la información del documento
    return this.http.get<InvoiceDocumentInfo>(url, options).pipe(
      switchMap((documentInfo) => {
        if (!documentInfo || !documentInfo.filePath) {
          throw new Error('No se pudo obtener la ruta del documento');
        }

        // Descargar el archivo usando la ruta obtenida
        const downloadUrl = `${this.baseUrl}/File/Get`;
        const params = new URLSearchParams();
        params.set('filepath', documentInfo.filePath);

        const downloadOptions: {
          headers?: HttpHeaders | { [header: string]: string | string[] };
          observe?: 'body';
          params?: HttpParams | { [param: string]: any };
          reportProgress?: boolean;
          responseType: 'blob';
          withCredentials?: boolean;
          signal?: AbortSignal;
        } = {
          headers: new HttpHeaders({
            'accept': 'application/octet-stream'
          }),
          responseType: 'blob'
        };
        if (signal) {
          downloadOptions.signal = signal;
        }

        return (this.http.get(`${downloadUrl}?${params.toString()}`, downloadOptions) as unknown as Observable<Blob>).pipe(
          map((blob) => ({
            blob: blob,
            fileName: documentInfo.fileName || `Factura_${reservationId}.pdf`,
          }))
        );
      })
    );
  }
}

