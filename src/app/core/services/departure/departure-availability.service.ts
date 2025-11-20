import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para la respuesta de disponibilidad de departure.
 */
export interface IDepartureAvailabilityResponse {
  id: number;
  departureId: number;
  maxPax: number | null;
  minPax: number | null;
  currentPax: number;
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
export interface DepartureAvailabilityFilters {
  id?: number;
  departureId?: number;
  minBookableAvailability?: number;
  minGuaranteedAvailability?: number;
  useExactMatchForStrings?: boolean;
}

/**
 * Interfaz para la respuesta de selección por defecto.
 */
export interface IDefaultDepartureSelectionResponse {
  departureId: number;
  departureName: string;
  departureCode: string;
  departureDate: string;
  activityPackId: number;
  activityPackName: string;
  availability: number;
}

/**
 * Interfaz para la respuesta de disponibilidad por tour y activity pack.
 */
export interface IDepartureAvailabilityByTourResponse {
  departureId: number;
  departureName: string;
  departureCode: string;
  departureDate: string;
  arrivalDate: string;
  mostRestrictiveAvailability: number;
  departureAvailability: number;
  activityPackAvailability: number;
  restrictiveSource: string;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureAvailabilityService {
  private readonly API_URL = `${environment.toursApiUrl}/DepartureAvailability`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las disponibilidades de departure disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de disponibilidades de departure.
   */
  getAll(
    filters?: DepartureAvailabilityFilters
  ): Observable<IDepartureAvailabilityResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Capitalizar la primera letra del parámetro
          const paramName =
            key.charAt(0).toUpperCase() + key.slice(1);
          params = params.set(paramName, value.toString());
        }
      });
    }

    return this.http.get<IDepartureAvailabilityResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene la disponibilidad de un departure específico por su ID.
   * @param departureId ID del departure.
   * @returns Disponibilidad del departure.
   */
  getByDeparture(
    departureId: number
  ): Observable<IDepartureAvailabilityResponse[]> {
    const filters: DepartureAvailabilityFilters = {
      departureId,
    };
    return this.getAll(filters);
  }

  /**
   * Obtiene la salida por defecto y el ActivityPack por defecto para un tour.
   * Selecciona la salida más cercana disponible, reservable y con disponibilidad > 0.
   * @param tourId ID del tour.
   * @returns Respuesta con la salida y ciudad por defecto, o null si no hay selección por defecto (204).
   */
  getDefaultSelectionByTour(
    tourId: number
  ): Observable<IDefaultDepartureSelectionResponse | null> {
    return this.http.get<IDefaultDepartureSelectionResponse>(
      `${this.API_URL}/default-selection/tour/${tourId}`,
      { observe: 'response' }
    ).pipe(
      map(response => {
        if (response.status === 204 || !response.body) {
          return null;
        }
        return response.body;
      }),
      catchError((error) => {
        if (error.status === 204 || error.status === 404) {
          return of(null);
        }
        return of(null);
      })
    );
  }

  /**
   * Obtiene todas las disponibilidades de todos los períodos (salidas) para un Tour y un ActivityPackId.
   * Para cada período, calcula la disponibilidad más restrictiva entre DepartureAvailability y ActivityPackAvailability.
   * @param tourId ID del tour.
   * @param activityPackId ID del ActivityPack (ciudad de salida).
   * @returns Lista de disponibilidades por salida.
   */
  getByTourAndActivityPack(
    tourId: number,
    activityPackId: number
  ): Observable<IDepartureAvailabilityByTourResponse[]> {
    return this.http.get<IDepartureAvailabilityByTourResponse[]>(
      `${this.API_URL}/by-tour/${tourId}/activitypack/${activityPackId}`
    );
  }
}

