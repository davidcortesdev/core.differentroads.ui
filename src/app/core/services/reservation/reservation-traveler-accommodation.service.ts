import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface ReservationTravelerAccommodationCreate {
  id: number;
  reservationTravelerId: number;
  departureAccommodationId: number;
}

export interface ReservationTravelerAccommodationUpdate {
  id: number;
  reservationTravelerId: number;
  departureAccommodationId: number;
}

export interface IReservationTravelerAccommodationResponse {
  id: number;
  reservationTravelerId: number;
  departureAccommodationId: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReservationTravelerAccommodationFilters {
  id?: number;
  reservationTravelerId?: number;
  departureAccommodationId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationTravelerAccommodationService {
  private readonly API_URL = `${environment.reservationsApiUrl}/ReservationTravelerAccommodation`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las acomodaciones de viajeros de reservaciones según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de acomodaciones de viajeros de reservaciones.
   */
  getAll(filters?: ReservationTravelerAccommodationFilters): Observable<IReservationTravelerAccommodationResponse[]> {
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

    return this.http.get<IReservationTravelerAccommodationResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva acomodación de viajero de reservación.
   * @param data Datos para crear la acomodación de viajero de reservación.
   * @returns La acomodación de viajero de reservación creada.
   */
  create(data: ReservationTravelerAccommodationCreate): Observable<IReservationTravelerAccommodationResponse> {
    return this.http.post<IReservationTravelerAccommodationResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una acomodación de viajero de reservación específica por su ID.
   * @param id ID de la acomodación de viajero de reservación.
   * @returns La acomodación de viajero de reservación encontrada.
   */
  getById(id: number): Observable<IReservationTravelerAccommodationResponse> {
    return this.http.get<IReservationTravelerAccommodationResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una acomodación de viajero de reservación existente.
   * @param id ID de la acomodación de viajero de reservación a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: ReservationTravelerAccommodationUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una acomodación de viajero de reservación existente.
   * @param id ID de la acomodación de viajero de reservación a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene acomodaciones de viajeros por ID de viajero de reservación.
   * @param reservationTravelerId ID del viajero de reservación.
   * @returns Lista de acomodaciones del viajero de reservación.
   */
  getByReservationTraveler(reservationTravelerId: number): Observable<IReservationTravelerAccommodationResponse[]> {
    const params = new HttpParams()
      .set('ReservationTravelerId', reservationTravelerId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IReservationTravelerAccommodationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene acomodaciones por ID de acomodación de salida.
   * @param departureAccommodationId ID de la acomodación de salida.
   * @returns Lista de acomodaciones de viajeros con esa acomodación de salida.
   */
  getByDepartureAccommodation(departureAccommodationId: number): Observable<IReservationTravelerAccommodationResponse[]> {
    const params = new HttpParams()
      .set('DepartureAccommodationId', departureAccommodationId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IReservationTravelerAccommodationResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene el conteo total de acomodaciones para un viajero de reservación.
   * @param reservationTravelerId ID del viajero de reservación.
   * @returns Número total de acomodaciones para el viajero de reservación.
   */
  getAccommodationCount(reservationTravelerId: number): Observable<number> {
    return this.getByReservationTraveler(reservationTravelerId).pipe(
      map(accommodations => accommodations.length)
    );
  }

  /**
   * Verifica si un viajero de reservación tiene acomodaciones asignadas.
   * @param reservationTravelerId ID del viajero de reservación.
   * @returns True si tiene acomodaciones, false si no.
   */
  hasAccommodations(reservationTravelerId: number): Observable<boolean> {
    return this.getByReservationTraveler(reservationTravelerId).pipe(
      map(accommodations => accommodations.length > 0)
    );
  }

  /**
   * Verifica si una acomodación de salida está siendo utilizada.
   * @param departureAccommodationId ID de la acomodación de salida.
   * @returns True si está siendo utilizada, false si no.
   */
  isAccommodationInUse(departureAccommodationId: number): Observable<boolean> {
    return this.getByDepartureAccommodation(departureAccommodationId).pipe(
      map(accommodations => accommodations.length > 0)
    );
  }

  /**
   * Elimina todas las acomodaciones de un viajero de reservación.
   * @param reservationTravelerId ID del viajero de reservación.
   * @returns Resultado de la operación.
   */
  deleteByReservationTraveler(reservationTravelerId: number): Observable<boolean> {
    return this.getByReservationTraveler(reservationTravelerId).pipe(
      switchMap(accommodations => {
        if (accommodations.length === 0) {
          return of(true);
        }

        // Crear array de observables para eliminar todas las acomodaciones
        const deleteObservables = accommodations.map(accommodation => 
          this.delete(accommodation.id)
        );
        
        // Ejecutar todas las eliminaciones usando forkJoin
        return forkJoin(deleteObservables);
      }),
      map(() => true) // Simplificar el resultado
    );
  }

  /**
   * Asigna múltiples acomodaciones a un viajero de reservación.
   * @param reservationTravelerId ID del viajero de reservación.
   * @param departureAccommodationIds Array de IDs de acomodaciones de salida.
   * @returns Resultado de la operación.
   */
  assignMultipleAccommodations(
    reservationTravelerId: number, 
    departureAccommodationIds: number[]
  ): Observable<IReservationTravelerAccommodationResponse[]> {
    if (departureAccommodationIds.length === 0) {
      return of([]);
    }

    const createObservables = departureAccommodationIds.map(accommodationId => {
      const data: ReservationTravelerAccommodationCreate = {
        id: 0, // Se asigna en el backend
        reservationTravelerId,
        departureAccommodationId: accommodationId
      };
      return this.create(data);
    });

    return forkJoin(createObservables);
  }

  /**
   * Reemplaza todas las acomodaciones de un viajero de reservación.
   * @param reservationTravelerId ID del viajero de reservación.
   * @param departureAccommodationIds Array de IDs de acomodaciones de salida.
   * @returns Resultado de la operación.
   */
  replaceAccommodations(
    reservationTravelerId: number, 
    departureAccommodationIds: number[]
  ): Observable<IReservationTravelerAccommodationResponse[]> {
    return this.deleteByReservationTraveler(reservationTravelerId).pipe(
      switchMap(() => this.assignMultipleAccommodations(reservationTravelerId, departureAccommodationIds))
    );
  }
}