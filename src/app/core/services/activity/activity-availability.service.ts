import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para la respuesta de disponibilidad de actividad.
 */
export interface IActivityAvailabilityResponse {
  id: number;
  departureId: number;
  activityId: number;
  bookableAvailability: number;
  guaranteedAvailability: number;
  onRequestAvailability: number;
  availabilityMargin: number;
  adjustedAvailability: number;
  lastAvailabilityUpdate: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ActivityAvailabilityFilters {
  id?: number;
  departureId?: number;
  activityId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityAvailabilityService {
  private readonly API_URL = `${environment.toursApiUrl}/ActivityAvailability`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las disponibilidades de actividad disponibles.
   * @param filters Filtros para aplicar en la búsqueda (Id, DepartureId, ActivityId).
   * @returns Lista de disponibilidades de actividad.
   */
  getAll(
    filters?: ActivityAvailabilityFilters
  ): Observable<IActivityAvailabilityResponse[]> {
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

    return this.http.get<IActivityAvailabilityResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene la disponibilidad de una actividad específica por su ID y departureId.
   * @param activityId ID de la actividad.
   * @param departureId ID del departure.
   * @returns Disponibilidad de la actividad.
   */
  getByActivityAndDeparture(
    activityId: number,
    departureId: number
  ): Observable<IActivityAvailabilityResponse[]> {
    const filters: ActivityAvailabilityFilters = {
      activityId,
      departureId,
    };
    return this.getAll(filters);
  }

  /**
   * Obtiene todas las disponibilidades de una actividad específica.
   * @param activityId ID de la actividad.
   * @returns Lista de disponibilidades de la actividad.
   */
  getByActivity(
    activityId: number
  ): Observable<IActivityAvailabilityResponse[]> {
    const filters: ActivityAvailabilityFilters = {
      activityId,
    };
    return this.getAll(filters);
  }
}

