import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface IReservationTKLogResponse {
  id: number;
  reservationId: number;
  sentAt: string;
  sentContent: string;
  responseAt: string;
  responseContent: string;
  httpStatusCode: number;
  httpStatusMessage: string;
  notes: string;
  tkActionId: number;
  endpointUrl: string;
  httpMethod: string;
  tkErrorCode: string;
  tkErrorMessage: string;
}

export interface ReservationTKLogCreate {
  reservationId: number;
  sentAt: string;
  sentContent: string;
  responseAt?: string;
  responseContent?: string;
  httpStatusCode?: number;
  httpStatusMessage?: string;
  notes?: string;
  tkActionId: number;
  endpointUrl: string;
  httpMethod: string;
  tkErrorCode?: string;
  tkErrorMessage?: string;
}

export interface ReservationTKLogUpdate {
  id: number;
  reservationId: number;
  sentAt: string;
  sentContent: string;
  responseAt: string;
  responseContent: string;
  httpStatusCode: number;
  httpStatusMessage: string;
  notes: string;
  tkActionId: number;
  endpointUrl: string;
  httpMethod: string;
  tkErrorCode: string;
  tkErrorMessage: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReservationTKLogFilters {
  id?: number;
  reservationId?: number;
  sentAt?: string;
  responseAt?: string;
  httpStatusCode?: number;
  httpStatusMessage?: string;
  tkActionId?: number;
  endpointUrl?: string;
  httpMethod?: string;
  tkErrorCode?: string;
  tkErrorMessage?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationTKLogService {
  private readonly API_URL = `${environment.reservationsApiUrl}/ReservationTKLog`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los logs de TK según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de logs de TK.
   */
  getAll(
    filters?: ReservationTKLogFilters
  ): Observable<IReservationTKLogResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<IReservationTKLogResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo log de TK.
   * @param data Datos para crear el log.
   * @returns El log creado.
   */
  create(data: ReservationTKLogCreate): Observable<IReservationTKLogResponse> {
    return this.http.post<IReservationTKLogResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un log de TK específico por su ID.
   * @param id ID del log.
   * @returns El log encontrado.
   */
  getById(id: number): Observable<IReservationTKLogResponse> {
    return this.http.get<IReservationTKLogResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un log de TK existente.
   * @param id ID del log a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: ReservationTKLogUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un log de TK existente.
   * @param id ID del log a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene logs de TK por ID de reservación.
   * @param reservationId ID de la reservación.
   * @returns Lista de logs de la reservación.
   */
  getByReservation(
    reservationId: number
  ): Observable<IReservationTKLogResponse[]> {
    const params = new HttpParams()
      .set('ReservationId', reservationId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTKLogResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene logs de TK por ID de acción TK.
   * @param tkActionId ID de la acción TK.
   * @returns Lista de logs de la acción TK.
   */
  getByTKAction(tkActionId: number): Observable<IReservationTKLogResponse[]> {
    const params = new HttpParams()
      .set('TkActionId', tkActionId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTKLogResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene logs de TK por método HTTP.
   * @param httpMethod Método HTTP (GET, POST, PUT, DELETE, etc.).
   * @returns Lista de logs con el método especificado.
   */
  getByHttpMethod(httpMethod: string): Observable<IReservationTKLogResponse[]> {
    const params = new HttpParams()
      .set('HttpMethod', httpMethod)
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTKLogResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene logs de TK por código de estado HTTP.
   * @param statusCode Código de estado HTTP.
   * @returns Lista de logs con el código de estado especificado.
   */
  getByHttpStatusCode(
    statusCode: number
  ): Observable<IReservationTKLogResponse[]> {
    const params = new HttpParams()
      .set('HttpStatusCode', statusCode.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTKLogResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene logs de TK con errores (que tengan código de error TK).
   * @returns Lista de logs con errores.
   */
  getWithErrors(): Observable<IReservationTKLogResponse[]> {
    const params = new HttpParams()
      .set('TkErrorCodeIsNotNull', 'true')
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTKLogResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene logs de TK por rango de fechas de envío.
   * @param startDate Fecha de inicio (formato ISO string).
   * @param endDate Fecha de fin (formato ISO string).
   * @returns Lista de logs en el rango de fechas.
   */
  getBySentDateRange(
    startDate: string,
    endDate: string
  ): Observable<IReservationTKLogResponse[]> {
    const params = new HttpParams()
      .set('SentAtFrom', startDate)
      .set('SentAtTo', endDate)
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTKLogResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene logs de TK por endpoint URL.
   * @param endpointUrl URL del endpoint.
   * @returns Lista de logs del endpoint especificado.
   */
  getByEndpointUrl(
    endpointUrl: string
  ): Observable<IReservationTKLogResponse[]> {
    const params = new HttpParams()
      .set('EndpointUrl', endpointUrl)
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTKLogResponse[]>(this.API_URL, { params });
  }
}
