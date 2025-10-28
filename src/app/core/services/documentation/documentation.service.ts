import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para la respuesta de documentos de reserva
 */
export interface IDocumentReservationResponse {
  id: number;
  documentId: number;
  reservationId: number;
  createdAt: string;
}

/**
 * Interfaz para la respuesta de documentos
 */
export interface IDocumentResponse {
  id: number;
  documentTypeId: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

/**
 * Interfaz para la respuesta de tipos de documento
 */
export interface IDocumentTypeResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

/**
 * Interfaz para crear una relación documento-reserva
 */
export interface DocumentReservationCreate {
  documentId: number;
  reservationId: number;
}

/**
 * Interfaz para actualizar una relación documento-reserva
 */
export interface DocumentReservationUpdate {
  documentId: number;
  reservationId: number;
}

/**
 * Interfaz para la respuesta de documentos
 */
export interface IDocumentResponse {
  id: number;
  documentTypeId: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentationService {
  private readonly API_URL = `${environment.documentationApiUrl}/Document`;
  private readonly DOCUMENT_RESERVATION_URL = `${environment.documentationApiUrl}/DocumentReservation`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene documentos existentes basados en criterios de filtro
   * @param filters - Filtros opcionales para la búsqueda
   * @returns Observable de array de IDocumentReservationResponse
   */
  getDocuments(filters?: {
    ids?: number[];
    documentTypeIds?: number[];
    fileNames?: string[];
    mimeTypes?: string[];
    reservationId?: number;
  }): Observable<IDocumentReservationResponse[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.ids && filters.ids.length > 0) {
        filters.ids.forEach((id) => {
          params = params.append('Id', id.toString());
        });
      }
      if (filters.documentTypeIds && filters.documentTypeIds.length > 0) {
        filters.documentTypeIds.forEach((id) => {
          params = params.append('DocumentTypeId', id.toString());
        });
      }
      if (filters.fileNames && filters.fileNames.length > 0) {
        filters.fileNames.forEach((fileName) => {
          params = params.append('FileName', fileName);
        });
      }
      if (filters.mimeTypes && filters.mimeTypes.length > 0) {
        filters.mimeTypes.forEach((mimeType) => {
          params = params.append('MimeType', mimeType);
        });
      }
      if (filters.reservationId) {
        params = params.set('reservationId', filters.reservationId.toString());
      }
    }

    return this.http.get<IDocumentReservationResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene documentos por ID de reserva
   * @param reservationId - ID de la reserva
   * @returns Observable de array de IDocumentReservationResponse
   */
  getDocumentsByReservationId(
    reservationId: number
  ): Observable<IDocumentReservationResponse[]> {

    const params = new HttpParams().set(
      'ReservationId',
      reservationId.toString()
    );
    return this.http.get<IDocumentReservationResponse[]>(
      this.DOCUMENT_RESERVATION_URL,
      { params }
    );
  }

  /**
   * Obtiene un documento específico por ID
   * @param documentId - ID del documento
   * @returns Observable de IDocumentResponse
   */
  getDocumentById(documentId: number): Observable<IDocumentResponse> {
    const url = `${this.API_URL}/${documentId}`;
    return this.http.get<IDocumentResponse>(url);
  }

  /**
   * Obtiene tipos de documento disponibles
   * @returns Observable de array de IDocumentTypeResponse
   */
  getDocumentTypes(): Observable<IDocumentTypeResponse[]> {
    const url = `${environment.documentationApiUrl}/DocumentType`;
    return this.http.get<IDocumentTypeResponse[]>(url);
  }

  /**
   * Obtiene documentos completos por ID de reserva (incluye detalles del documento)
   * @param reservationId - ID de la reserva
   * @returns Observable de array con documentos completos
   */
  getCompleteDocumentsByReservationId(
    reservationId: number
  ): Observable<any[]> {
    return this.getDocumentsByReservationId(reservationId).pipe(
      switchMap((documentReservations: IDocumentReservationResponse[]) => {
        if (documentReservations.length === 0) {
          return of([]);
        }

        // Obtener detalles de cada documento
        const documentPromises = documentReservations.map((docRes) =>
          this.getDocumentById(docRes.documentId).pipe(
            map((document) => ({
              ...docRes,
              document: document,
            })),
            catchError((error) => {
              console.warn(
                `Error getting document ${docRes.documentId}:`,
                error
              );
              return of({
                ...docRes,
                document: null,
              });
            })
          )
        );

        return forkJoin(documentPromises);
      })
    );
  }

  /**
   * Crea una nueva relación documento-reserva
   * @param documentReservation - Datos para crear la relación
   * @returns Observable de IDocumentReservationResponse
   */
  createDocumentReservation(
    documentReservation: DocumentReservationCreate
  ): Observable<IDocumentReservationResponse> {
    const url = `${this.API_URL}/Reservation`;
    return this.http.post<IDocumentReservationResponse>(
      url,
      documentReservation
    );
  }

  /**
   * Actualiza una relación documento-reserva existente
   * @param documentReservation - Datos para actualizar la relación
   * @returns Observable de IDocumentReservationResponse
   */
  updateDocumentReservation(
    documentReservation: DocumentReservationUpdate
  ): Observable<IDocumentReservationResponse> {
    const url = `${this.API_URL}/Reservation`;
    return this.http.put<IDocumentReservationResponse>(
      url,
      documentReservation
    );
  }

  /**
   * Elimina una relación documento-reserva
   * @param documentId - ID del documento
   * @param reservationId - ID de la reserva
   * @returns Observable vacío
   */
  deleteDocumentReservation(
    documentId: number,
    reservationId: number
  ): Observable<void> {
    const url = `${this.API_URL}/Reservation/${documentId}/${reservationId}`;
    return this.http.delete<void>(url);
  }
}
