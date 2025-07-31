import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ReservationTravelerActivityPackCreate {
  id: number;
  reservationTravelerId: number;
  activityPackId: number;
}

export interface ReservationTravelerActivityPackUpdate {
  id: number;
  reservationTravelerId: number;
  activityPackId: number;
}

export interface IReservationTravelerActivityPackResponse {
  id: number;
  reservationTravelerId: number;
  activityPackId: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReservationTravelerActivityPackFilters {
  id?: number;
  reservationTravelerId?: number;
  activityPackId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationTravelerActivityPackService {
  private readonly API_URL = `${environment.reservationsApiUrl}/ReservationTravelerActivityPack`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los paquetes de actividades de viajeros de reservaciones según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de paquetes de actividades de viajeros de reservaciones.
   */
  getAll(
    filters?: ReservationTravelerActivityPackFilters
  ): Observable<IReservationTravelerActivityPackResponse[]> {
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

    return this.http.get<IReservationTravelerActivityPackResponse[]>(
      this.API_URL,
      {
        params,
      }
    );
  }

  /**
   * Crea un nuevo paquete de actividades de viajero de reservación.
   * @param data Datos para crear el paquete de actividades de viajero de reservación.
   * @returns El paquete de actividades de viajero de reservación creado.
   */
  create(
    data: ReservationTravelerActivityPackCreate
  ): Observable<IReservationTravelerActivityPackResponse> {
    return this.http.post<IReservationTravelerActivityPackResponse>(
      `${this.API_URL}`,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Obtiene un paquete de actividades de viajero de reservación específico por su ID.
   * @param id ID del paquete de actividades de viajero de reservación.
   * @returns El paquete de actividades de viajero de reservación encontrado.
   */
  getById(id: number): Observable<IReservationTravelerActivityPackResponse> {
    return this.http.get<IReservationTravelerActivityPackResponse>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * Actualiza un paquete de actividades de viajero de reservación existente.
   * @param id ID del paquete de actividades de viajero de reservación a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(
    id: number,
    data: ReservationTravelerActivityPackUpdate
  ): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un paquete de actividades de viajero de reservación existente.
   * @param id ID del paquete de actividades de viajero de reservación a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene paquetes de actividades por ID de viajero de reservación.
   * @param reservationTravelerId ID del viajero de reservación.
   * @returns Lista de paquetes de actividades del viajero de reservación.
   */
  getByReservationTraveler(
    reservationTravelerId: number
  ): Observable<IReservationTravelerActivityPackResponse[]> {
    const params = new HttpParams()
      .set('ReservationTravelerId', reservationTravelerId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTravelerActivityPackResponse[]>(
      this.API_URL,
      {
        params,
      }
    );
  }

  /**
   * Obtiene paquetes de actividades por ID de paquete de actividades.
   * @param activityPackId ID del paquete de actividades.
   * @returns Lista de viajeros de reservación asociados al paquete de actividades.
   */
  getByActivityPack(
    activityPackId: number
  ): Observable<IReservationTravelerActivityPackResponse[]> {
    const params = new HttpParams()
      .set('ActivityPackId', activityPackId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationTravelerActivityPackResponse[]>(
      this.API_URL,
      {
        params,
      }
    );
  }
}
