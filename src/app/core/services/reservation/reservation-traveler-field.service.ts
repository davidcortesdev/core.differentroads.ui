import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ReservationTravelerFieldCreate {
  id: number;
  reservationTravelerId: number;
  reservationFieldId: number;
  value: string;
}

export interface ReservationTravelerFieldUpdate {
  id: number;
  reservationTravelerId: number;
  reservationFieldId: number;
  value: string;
}

export interface IReservationTravelerFieldResponse {
  id: number;
  reservationTravelerId: number;
  reservationFieldId: number;
  value: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReservationTravelerFieldFilters {
  id?: number;
  reservationTravelerId?: number;
  reservationFieldId?: number;
  value?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationTravelerFieldService {
  private readonly API_URL = `${environment.reservationsApiUrl}/ReservationTravelerField`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los campos de viajero según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de campos de viajero.
   */
  getAll(
    filters?: ReservationTravelerFieldFilters
  ): Observable<IReservationTravelerFieldResponse[]> {
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

    return this.http.get<IReservationTravelerFieldResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Crea un nuevo campo de viajero.
   * @param data Datos para crear el campo de viajero.
   * @returns El campo de viajero creado.
   */
  create(
    data: ReservationTravelerFieldCreate
  ): Observable<IReservationTravelerFieldResponse> {
    return this.http.post<IReservationTravelerFieldResponse>(
      `${this.API_URL}`,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Obtiene un campo de viajero específico por su ID.
   * @param id ID del campo de viajero.
   * @returns El campo de viajero encontrado.
   */
  getById(id: number): Observable<IReservationTravelerFieldResponse> {
    return this.http.get<IReservationTravelerFieldResponse>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * Actualiza un campo de viajero existente.
   * @param id ID del campo de viajero a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(
    id: number,
    data: ReservationTravelerFieldUpdate
  ): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un campo de viajero existente.
   * @param id ID del campo de viajero a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene campos de viajero por ID de viajero de reservación.
   * @param reservationTravelerId ID del viajero de reservación.
   * @returns Lista de campos del viajero.
   */
  getByReservationTraveler(
    reservationTravelerId: number
  ): Observable<IReservationTravelerFieldResponse[]> {
    const params = new HttpParams()
      .set('ReservationTravelerId', reservationTravelerId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTravelerFieldResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene campos de viajero por ID de campo de reservación.
   * @param reservationFieldId ID del campo de reservación.
   * @returns Lista de campos con el ID especificado.
   */
  getByReservationField(
    reservationFieldId: number
  ): Observable<IReservationTravelerFieldResponse[]> {
    const params = new HttpParams()
      .set('ReservationFieldId', reservationFieldId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTravelerFieldResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene campos de viajero por valor específico.
   * @param value Valor a buscar.
   * @returns Lista de campos con el valor especificado.
   */
  getByValue(value: string): Observable<IReservationTravelerFieldResponse[]> {
    const params = new HttpParams()
      .set('Value', value)
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTravelerFieldResponse[]>(this.API_URL, {
      params,
    });
  }
}
