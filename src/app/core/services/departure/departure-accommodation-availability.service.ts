import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para la respuesta de disponibilidad de habitación de departure.
 */
export interface IDepartureAccommodationAvailabilityResponse {
  id: number;
  tkId: string | null;
  departureAccommodationId: number;
  sexType: string | null;
  availablePlaces: number;
  lastAvailabilityUpdate: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DepartureAccommodationAvailabilityFilters {
  id?: number;
  tkId?: string;
  departureAccommodationId?: number;
  sexType?: string;
  minAvailablePlaces?: number;
  useExactMatchForStrings?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureAccommodationAvailabilityService {
  private readonly API_URL = `${environment.toursApiUrl}/DepartureAccommodationAvailability`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las disponibilidades de habitaciones de departure disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de disponibilidades de habitaciones de departure.
   */
  getAll(
    filters?: DepartureAccommodationAvailabilityFilters
  ): Observable<IDepartureAccommodationAvailabilityResponse[]> {
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

    return this.http.get<IDepartureAccommodationAvailabilityResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene la disponibilidad de una habitación específica por su ID de departure accommodation.
   * @param departureAccommodationId ID del departure accommodation.
   * @returns Disponibilidad de la habitación.
   */
  getByDepartureAccommodation(
    departureAccommodationId: number
  ): Observable<IDepartureAccommodationAvailabilityResponse[]> {
    const filters: DepartureAccommodationAvailabilityFilters = {
      departureAccommodationId,
    };
    return this.getAll(filters);
  }

  /**
   * Obtiene todas las disponibilidades de habitaciones para un departure específico.
   * @param departureId ID del departure (se obtiene a través de los departure accommodations).
   * @returns Lista de disponibilidades de habitaciones del departure.
   */
  getByDeparture(
    departureId: number
  ): Observable<IDepartureAccommodationAvailabilityResponse[]> {
    // Nota: Este método requiere primero obtener los departure accommodations
    // y luego buscar la disponibilidad de cada uno
    // Por ahora, retornamos un observable vacío ya que el endpoint no tiene filtro directo por departureId
    // Se puede implementar obteniendo primero los accommodations y luego sus disponibilidades
    return this.http.get<IDepartureAccommodationAvailabilityResponse[]>(this.API_URL);
  }
}

