import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap, catchError, retry, delay } from 'rxjs/operators';
import { of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ReservationTravelerCreate {
  reservationId: number;
  travelerNumber: number;
  isLeadTraveler: boolean;
  tkId: string | null;
  ageGroupId: number | null;
}

export interface ReservationTravelerUpdate {
  id: number;
  reservationId: number;
  travelerNumber: number;
  isLeadTraveler: boolean;
  tkId: string | null;
  ageGroupId: number;
}

export interface IReservationTravelerResponse {
  id: number;
  reservationId: number;
  travelerNumber: number;
  isLeadTraveler: boolean;
  tkId: string | null;
  ageGroupId: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReservationTravelerFilters {
  id?: number;
  reservationId?: number;
  travelerNumber?: number;
  isLeadTraveler?: boolean;
  tkId?: string | null;
  ageGroupId?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationTravelerService {
  private readonly API_URL = `${environment.reservationsApiUrl}/ReservationTraveler`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los viajeros de reservaciones según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de viajeros de reservaciones.
   */
  getAll(
    filters?: ReservationTravelerFilters,
    signal?: AbortSignal
  ): Observable<IReservationTravelerResponse[]> {
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

    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = { params };
    if (signal) {
      options.signal = signal;
    }

    return this.http.get<IReservationTravelerResponse[]>(this.API_URL, options);
  }

  /**
   * Crea un nuevo viajero de reservación con número de viajero auto-incrementable.
   * @param data Datos para crear el viajero de reservación.
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns El viajero de reservación creado.
   */
  create(
    data: ReservationTravelerCreate,
    signal?: AbortSignal
  ): Observable<IReservationTravelerResponse> {
    const options: {
      headers?: HttpHeaders | { [header: string]: string | string[] };
      signal?: AbortSignal;
    } = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    };
    if (signal) {
      options.signal = signal;
    }
    return this.http.post<IReservationTravelerResponse>(
      `${this.API_URL}`,
      data,
      options
    );
  }

  /**
   * Crea un nuevo viajero de reservación con número de viajero auto-generado.
   * @param reservationId ID de la reservación.
   * @param isLeadTraveler Si es el viajero principal.
   * @param tkId ID del token.
   * @param ageGroupId ID del grupo de edad.
   * @returns El viajero de reservación creado con número auto-incrementado.
   */
  createWithAutoTravelerNumber(
    reservationId: number,
    isLeadTraveler: boolean = false,
    tkId: string = '',
    ageGroupId: number = 0,
    signal?: AbortSignal
  ): Observable<IReservationTravelerResponse> {
    return this.getNextTravelerNumber(reservationId, signal).pipe(
      switchMap((nextNumber) => {
        const data: ReservationTravelerCreate = {
          reservationId,
          travelerNumber: nextNumber,
          isLeadTraveler,
          tkId,
          ageGroupId,
        };
        return this.create(data, signal);
      })
    );
  }

  /**
   * Obtiene un viajero de reservación específico por su ID.
   * @param id ID del viajero de reservación.
   * @returns El viajero de reservación encontrado.
   */
  getById(id: number, signal?: AbortSignal): Observable<IReservationTravelerResponse> {
    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = {};
    if (signal) {
      options.signal = signal;
    }
    return this.http.get<IReservationTravelerResponse>(`${this.API_URL}/${id}`, options);
  }

  /**
   * Actualiza un viajero de reservación existente.
   * @param id ID del viajero de reservación a actualizar.
   * @param data Datos actualizados.
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Resultado de la operación.
   */
  update(id: number, data: ReservationTravelerUpdate, signal?: AbortSignal): Observable<boolean> {
    const options: {
      headers?: HttpHeaders | { [header: string]: string | string[] };
      signal?: AbortSignal;
    } = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    };
    if (signal) {
      options.signal = signal;
    }
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, options);
  }

  /**
   * Elimina un viajero de reservación existente.
   * @param id ID del viajero de reservación a eliminar.
   * @returns Observable que emite true si la eliminación fue exitosa, false si no se encontró el recurso.
   */
  delete(id: number): Observable<boolean> {
      return this.http.delete<boolean>(`${this.API_URL}/${id}`).pipe(
        catchError((error) => {
          return of(false);
        })
      );
  }

  /**
   * Obtiene viajeros de reservación por ID de reservación.
   * @param reservationId ID de la reservación.
   * @returns Lista de viajeros de la reservación.
   */
  getByReservation(
    reservationId: number,
    signal?: AbortSignal
  ): Observable<IReservationTravelerResponse[]> {
    const params = new HttpParams()
      .set('ReservationId', reservationId.toString())
      .set('useExactMatchForStrings', 'false');

    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = { params };
    if (signal) {
      options.signal = signal;
    }

    return this.http.get<IReservationTravelerResponse[]>(this.API_URL, options);
  }

  /**
   * Obtiene el viajero principal de una reservación.
   * @param reservationId ID de la reservación.
   * @returns El viajero principal de la reservación.
   */
  getLeadTraveler(
    reservationId: number,
    signal?: AbortSignal
  ): Observable<IReservationTravelerResponse | null> {
    const params = new HttpParams()
      .set('ReservationId', reservationId.toString())
      .set('IsLeadTraveler', 'true')
      .set('useExactMatchForStrings', 'false');

    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = { params };
    if (signal) {
      options.signal = signal;
    }

    return this.http
      .get<IReservationTravelerResponse[]>(this.API_URL, options)
      .pipe(map((travelers) => (travelers.length > 0 ? travelers[0] : null)));
  }

  /**
   * Obtiene el siguiente número de viajero disponible para una reservación.
   * @param reservationId ID de la reservación.
   * @returns El siguiente número de viajero disponible.
   */
  getNextTravelerNumber(reservationId: number, signal?: AbortSignal): Observable<number> {
    return this.getByReservation(reservationId, signal).pipe(
      map((travelers) => {
        if (travelers.length === 0) {
          return 1; // Primer viajero
        }

        // Obtener el número más alto y agregar 1
        const maxTravelerNumber = Math.max(
          ...travelers.map((t) => t.travelerNumber)
        );
        return maxTravelerNumber + 1;
      })
    );
  }

  /**
   * Obtiene el conteo total de viajeros en una reservación.
   * @param reservationId ID de la reservación.
   * @returns Número total de viajeros en la reservación.
   */
  getTravelerCount(reservationId: number, signal?: AbortSignal): Observable<number> {
    return this.getByReservation(reservationId, signal).pipe(
      map((travelers) => travelers.length)
    );
  }

  /**
   * Verifica si existe un viajero principal en la reservación.
   * @param reservationId ID de la reservación.
   * @returns True si existe un viajero principal, false si no.
   */
  hasLeadTraveler(reservationId: number, signal?: AbortSignal): Observable<boolean> {
    return this.getLeadTraveler(reservationId, signal).pipe(
      map((leadTraveler) => leadTraveler !== null)
    );
  }

  /**
   * Establece un viajero como principal y desestablece los demás.
   * @param reservationId ID de la reservación.
   * @param travelerId ID del viajero a establecer como principal.
   * @returns Resultado de la operación.
   */
  setLeadTraveler(
    reservationId: number,
    travelerId: number,
    signal?: AbortSignal
  ): Observable<boolean> {
    return this.getByReservation(reservationId, signal).pipe(
      switchMap((travelers) => {
        if (travelers.length === 0) {
          return of(true);
        }

        // Crear array de observables para actualizar todos los viajeros
        const updateObservables = travelers.map((traveler) => {
          const updatedTraveler: ReservationTravelerUpdate = {
            ...traveler,
            isLeadTraveler: traveler.id === travelerId,
          };
          return this.update(traveler.id, updatedTraveler, signal);
        });

        // Ejecutar todas las actualizaciones
        return forkJoin(updateObservables);
      }),
      map(() => true) // Simplificar el resultado
    );
  }

  /**
   * Reordena los números de viajero para una reservación (1, 2, 3, ...).
   * @param reservationId ID de la reservación.
   * @returns Resultado de la operación.
   */
  reorderTravelerNumbers(reservationId: number, signal?: AbortSignal): Observable<boolean> {
    return this.getByReservation(reservationId, signal).pipe(
      switchMap((travelers) => {
        if (travelers.length === 0) {
          return of(true);
        }

        // Ordenar por número de viajero actual
        const sortedTravelers = travelers.sort(
          (a, b) => a.travelerNumber - b.travelerNumber
        );

        // Crear array de observables para actualizar números secuenciales
        const updateObservables = sortedTravelers.map((traveler, index) => {
          const updatedTraveler: ReservationTravelerUpdate = {
            ...traveler,
            travelerNumber: index + 1,
          };
          return this.update(traveler.id, updatedTraveler, signal);
        });

        return forkJoin(updateObservables);
      }),
      map(() => true) // Simplificar el resultado
    );
  }

  /**
   * Obtiene viajeros ordenados por número de viajero.
   * @param reservationId ID de la reservación.
   * @returns Lista de viajeros ordenada por número de viajero.
   */
  getByReservationOrdered(
    reservationId: number,
    signal?: AbortSignal
  ): Observable<IReservationTravelerResponse[]> {
    return this.getByReservation(reservationId, signal).pipe(
      map((travelers) =>
        travelers.sort((a, b) => a.travelerNumber - b.travelerNumber)
      )
    );
  }

  /**
   * Obtiene el primer viajero de una reservación con un ageGroupId específico.
   * @param reservationId ID de la reservación.
   * @param ageGroupId ID del grupo de edad.
   * @returns El primer viajero con el ageGroupId especificado, o null si no se encuentra.
   */
  getFirstTravelerByAgeGroup(
    reservationId: number,
    ageGroupId: number,
    signal?: AbortSignal
  ): Observable<IReservationTravelerResponse | null> {
    const params = new HttpParams()
      .set('ReservationId', reservationId.toString())
      .set('AgeGroupId', ageGroupId.toString())
      .set('useExactMatchForStrings', 'false');

    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = { params };
    if (signal) {
      options.signal = signal;
    }

    return this.http
      .get<IReservationTravelerResponse[]>(this.API_URL, options)
      .pipe(
        map((travelers) => {
          // Ordenar por travelerNumber y tomar el primero
          const sortedTravelers = travelers.sort(
            (a, b) => a.travelerNumber - b.travelerNumber
          );
          return sortedTravelers.length > 0 ? sortedTravelers[0] : null;
        })
      );
  }
}
