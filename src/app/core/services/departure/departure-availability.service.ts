import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}

