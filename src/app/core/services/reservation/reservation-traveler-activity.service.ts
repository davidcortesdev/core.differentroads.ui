import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ReservationTravelerActivityCreate {
  id: number;
  reservationTravelerId: number;
  activityId: number;
}

export interface ReservationTravelerActivityUpdate {
  id: number;
  reservationTravelerId: number;
  activityId: number;
}

export interface IReservationTravelerActivityResponse {
  id: number;
  reservationTravelerId: number;
  activityId: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReservationTravelerActivityFilters {
  id?: number;
  reservationTravelerId?: number;
  activityId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationTravelerActivityService {
  private readonly API_URL = `${environment.reservationsApiUrl}/ReservationTravelerActivity`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las actividades de viajeros de reservaciones según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de actividades de viajeros de reservaciones.
   */
  getAll(
    filters?: ReservationTravelerActivityFilters
  ): Observable<IReservationTravelerActivityResponse[]> {
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

    return this.http.get<IReservationTravelerActivityResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Crea una nueva actividad de viajero de reservación.
   * @param data Datos para crear la actividad de viajero de reservación.
   * @returns La actividad de viajero de reservación creada.
   */
  create(
    data: ReservationTravelerActivityCreate
  ): Observable<IReservationTravelerActivityResponse> {
    return this.http.post<IReservationTravelerActivityResponse>(
      `${this.API_URL}`,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Obtiene una actividad de viajero de reservación específica por su ID.
   * @param id ID de la actividad de viajero de reservación.
   * @returns La actividad de viajero de reservación encontrada.
   */
  getById(id: number): Observable<IReservationTravelerActivityResponse> {
    return this.http.get<IReservationTravelerActivityResponse>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * Actualiza una actividad de viajero de reservación existente.
   * @param id ID de la actividad de viajero de reservación a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(
    id: number,
    data: ReservationTravelerActivityUpdate
  ): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una actividad de viajero de reservación existente.
   * @param id ID de la actividad de viajero de reservación a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene actividades por ID de viajero de reservación.
   * @param reservationTravelerId ID del viajero de reservación.
   * @returns Lista de actividades del viajero de reservación.
   */
  getByReservationTraveler(
    reservationTravelerId: number
  ): Observable<IReservationTravelerActivityResponse[]> {
    const params = new HttpParams()
      .set('ReservationTravelerId', reservationTravelerId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTravelerActivityResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene actividades por ID de actividad.
   * @param activityId ID de la actividad.
   * @returns Lista de viajeros de reservación asociados a la actividad.
   */
  getByActivity(
    activityId: number
  ): Observable<IReservationTravelerActivityResponse[]> {
    const params = new HttpParams()
      .set('ActivityId', activityId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTravelerActivityResponse[]>(this.API_URL, {
      params,
    });
  }
}
