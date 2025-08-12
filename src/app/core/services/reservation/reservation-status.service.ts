import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ReservationStatusCreate {
  code: string;
  name: string;
}

export interface ReservationStatusUpdate {
  id: number;
  code: string;
  name: string;
}

export interface IReservationStatusResponse {
  id: number;
  code: string;
  name: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReservationStatusFilters {
  id?: number;
  code?: string;
  name?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationStatusService {
  private readonly API_URL = `${environment.reservationsApiUrl}/ReservationStatus`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los estados de reservación según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de estados de reservación.
   */
  getAll(filters?: ReservationStatusFilters): Observable<IReservationStatusResponse[]> {
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

    return this.http.get<IReservationStatusResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo estado de reservación.
   * @param data Datos para crear el estado de reservación.
   * @returns El estado de reservación creado.
   */
  create(data: ReservationStatusCreate): Observable<IReservationStatusResponse> {
    return this.http.post<IReservationStatusResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un estado de reservación específico por su ID.
   * @param id ID del estado de reservación.
   * @returns El estado de reservación encontrado.
   */
  getById(id: number): Observable<IReservationStatusResponse> {
    return this.http.get<IReservationStatusResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un estado de reservación existente.
   * @param id ID del estado de reservación a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: ReservationStatusUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un estado de reservación existente.
   * @param id ID del estado de reservación a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene estados de reservación por código.
   * @param code Código del estado de reservación.
   * @returns Lista de estados de reservación con el código especificado.
   */
  getByCode(code: string): Observable<IReservationStatusResponse[]> {
    const params = new HttpParams()
      .set('Code', code)
      .set('useExactMatchForStrings', 'true');

    return this.http.get<IReservationStatusResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene estados de reservación por nombre.
   * @param name Nombre del estado de reservación.
   * @returns Lista de estados de reservación con el nombre especificado.
   */
  getByName(name: string): Observable<IReservationStatusResponse[]> {
    const params = new HttpParams()
      .set('Name', name)
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationStatusResponse[]>(this.API_URL, { params });
  }
}