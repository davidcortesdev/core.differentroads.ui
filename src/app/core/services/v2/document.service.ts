import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export type DocumentType = 'BUDGET' | 'RESERVATION_VOUCHER';

export interface DocumentResponse {
  success: boolean;
  documentPath?: string;
  fileName?: string;
  message?: string;
}

export interface DocumentInfo {
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

export interface DocumentDownloadResult {
  blob: Blob;
  fileName: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentServicev2 {
  private readonly baseUrl = environment.documentationApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene toda la información del documento
   * @param reservationId ID de la reserva
   * @param documentType Tipo de documento (BUDGET, RESERVATION_VOUCHER)
   * @returns Observable con toda la información del documento
   */
  getDocumentInfo(
    reservationId: number,
    documentType: DocumentType
  ): Observable<DocumentInfo> {
    const url = `${this.baseUrl}/DocumentProcess/GetDocument/Reservation/${reservationId}/DocumentType/${documentType}`;

    const headers = new HttpHeaders({
      accept: 'application/json',
    });

    return this.http.get<DocumentInfo>(url, { headers });
  }

  /**
   * Obtiene la ruta del último documento generado o lo genera si no existe
   * @param reservationId ID de la reserva
   * @param documentType Tipo de documento (BUDGET, RESERVATION_VOUCHER)
   * @returns Observable con la ruta del documento
   */
  getDocumentPath(
    reservationId: number,
    documentType: DocumentType
  ): Observable<string> {
    return this.getDocumentInfo(reservationId, documentType).pipe(
      map((documentInfo) => {
        if (documentInfo && documentInfo.filePath) {
          return documentInfo.filePath;
        }
        throw new Error('No se pudo obtener la ruta del documento');
      })
    );
  }

  /**
   * Obtiene el documento como blob para descarga
   * @param fileName Nombre del archivo
   * @param folder Carpeta donde está almacenado el documento
   * @returns Observable con el blob del documento
   */
  getDocument(
    fileName: string,
    folder: string = 'documents/budget/'
  ): Observable<Blob> {
    const url = `${this.baseUrl}/File/Get`;

    const headers = new HttpHeaders({
      accept: 'application/octet-stream',
    });

    // Crear la ruta completa del archivo
    const filepath = `${folder}${fileName}`;
    const params = new URLSearchParams();
    params.set('filepath', filepath);

    return this.http.get(`${url}?${params.toString()}`, {
      headers,
      responseType: 'blob',
    });
  }

  /**
   * Obtiene o genera un presupuesto y lo descarga
   * @param reservationId ID de la reserva
   * @returns Observable con el blob del presupuesto
   */
  getBudgetDocument(reservationId: number): Observable<Blob> {
    return new Observable((observer) => {
      // Primero obtener la ruta del documento
      this.getDocumentPath(reservationId, 'BUDGET').subscribe({
        next: (documentPath) => {
          // La ruta ya viene completa desde el endpoint, usar directamente
          const url = `${this.baseUrl}/File/Get`;

          const headers = new HttpHeaders({
            accept: 'application/octet-stream',
          });

          const params = new URLSearchParams();
          params.set('filepath', documentPath);

          this.http
            .get(`${url}?${params.toString()}`, {
              headers,
              responseType: 'blob',
            })
            .subscribe({
              next: (blob) => observer.next(blob),
              error: (error) => observer.error(error),
            });
        },
        error: (error) => observer.error(error),
      });
    });
  }

  /**
   * Obtiene o genera un voucher de reserva y lo descarga
   * @param reservationId ID de la reserva
   * @returns Observable con el blob del voucher
   */
  getReservationVoucherDocument(reservationId: number): Observable<Blob> {
    return new Observable((observer) => {
      // Primero obtener la ruta del documento
      this.getDocumentPath(reservationId, 'RESERVATION_VOUCHER').subscribe({
        next: (documentPath) => {
          // La ruta ya viene completa desde el endpoint, usar directamente
          const url = `${this.baseUrl}/File/Get`;

          const headers = new HttpHeaders({
            accept: 'application/octet-stream',
          });

          const params = new URLSearchParams();
          params.set('filepath', documentPath);

          this.http
            .get(`${url}?${params.toString()}`, {
              headers,
              responseType: 'blob',
            })
            .subscribe({
              next: (blob) => observer.next(blob),
              error: (error) => observer.error(error),
            });
        },
        error: (error) => observer.error(error),
      });
    });
  }

  /**
   * Descarga un documento desde un blob
   * @param blob Blob del documento
   * @param fileName Nombre del archivo para la descarga
   */
  downloadDocument(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Genera un nombre de archivo único para el documento
   * @param documentType Tipo de documento
   * @param reservationId ID de la reserva
   * @returns Nombre del archivo
   */
  generateFileName(documentType: DocumentType, reservationId: number): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    return `${documentType}_${reservationId}_${timestamp}.pdf`;
  }

  /**
   * Obtiene información de un documento por código (método genérico)
   * @param reservationId ID de la reserva
   * @param documentCode Código del documento (puede ser cualquier string)
   * @returns Observable con la información del documento
   */
  getDocumentInfoByCode(
    reservationId: number,
    documentCode: string
  ): Observable<DocumentInfo> {
    const url = `${this.baseUrl}/DocumentProcess/GetDocument/Reservation/${reservationId}/DocumentType/${documentCode}`;

    const headers = new HttpHeaders({
      accept: 'application/json',
    });

    return this.http.get<DocumentInfo>(url, { headers });
  }

  /**
   * Descarga un documento por código (método unificado)
   * Llama directamente al endpoint que devuelve el documento
   * @param reservationId ID de la reserva
   * @param documentCode Código del documento
   * @returns Observable con el blob y el nombre del archivo
   */
  downloadDocumentByCode(
    reservationId: number,
    documentCode: string
  ): Observable<DocumentDownloadResult> {
    const url = `${this.baseUrl}/DocumentProcess/GetDocument/Reservation/${reservationId}/DocumentType/${documentCode}/document`;

    const headers = new HttpHeaders({
      accept: 'application/octet-stream',
    });

    return this.http.get(url, { headers, responseType: 'blob' }).pipe(
      map((blob) => ({
        blob: blob,
        fileName: `${documentCode}_${reservationId}.pdf`,
      }))
    );
  }

  /**
   * Obtiene información de un documento de itinerario
   * @param itineraryId ID del itinerario
   * @returns Observable con la información del documento
   */
  getItineraryDocumentInfo(itineraryId: number): Observable<DocumentInfo> {
    const documentTypeCode = 'ITINERARY';
    const url = `${this.baseUrl}/DocumentProcess/GetDocument/Itinerary/${itineraryId}/DocumentType/${documentTypeCode}`;

    const headers = new HttpHeaders({
      accept: 'application/json',
    });

    return this.http.get<DocumentInfo>(url, { headers });
  }

  /**
   * Descarga un itinerario por ID
   * Primero obtiene la ruta del documento y luego lo descarga
   * @param itineraryId ID del itinerario
   * @returns Observable con el blob y el nombre del archivo
   */
  downloadItinerary(itineraryId: number): Observable<DocumentDownloadResult> {
    return new Observable((observer) => {
      // Primero obtener la información del documento (incluye la ruta)
      this.getItineraryDocumentInfo(itineraryId).subscribe({
        next: (documentInfo) => {
          if (!documentInfo || !documentInfo.filePath) {
            observer.error(new Error('No se pudo obtener la ruta del documento'));
            return;
          }

          // Descargar el archivo usando la ruta obtenida
          const url = `${this.baseUrl}/File/Get`;
          const headers = new HttpHeaders({
            accept: 'application/octet-stream',
          });

          const params = new URLSearchParams();
          params.set('filepath', documentInfo.filePath);

          this.http
            .get(`${url}?${params.toString()}`, {
              headers,
              responseType: 'blob',
            })
            .subscribe({
              next: (blob) => {
                observer.next({
                  blob: blob,
                  fileName: documentInfo.fileName || `itinerary_${itineraryId}.pdf`,
                });
                observer.complete();
              },
              error: (error) => observer.error(error),
            });
        },
        error: (error) => observer.error(error),
      });
    });
  }
}
