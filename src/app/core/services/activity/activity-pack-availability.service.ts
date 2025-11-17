import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para la respuesta de disponibilidad de activity pack.
 */
export interface IActivityPackAvailabilityResponse {
  id: number;
  departureId: number;
  activityPackId: number;
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
export interface ActivityPackAvailabilityFilters {
  id?: number;
  departureId?: number;
  activityPackId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityPackAvailabilityService {
  private readonly API_URL = `${environment.toursApiUrl}/ActivityPackAvailability`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las disponibilidades de activity pack disponibles.
   * @param filters Filtros para aplicar en la búsqueda (activityPackId, departureId).
   * @returns Lista de disponibilidades de activity pack.
   */
  getAll(
    filters?: ActivityPackAvailabilityFilters
  ): Observable<IActivityPackAvailabilityResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Usar el nombre del parámetro tal cual (camelCase) sin capitalizar
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http
      .get<IActivityPackAvailabilityResponse | IActivityPackAvailabilityResponse[]>(
        this.API_URL,
        { params }
      )
      .pipe(
        // Convertir objeto único a array si es necesario
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          } else if (response && typeof response === 'object') {
            // Si es un objeto único, convertirlo a array
            return [response];
          } else {
            // Si no hay respuesta, devolver array vacío
            return [];
          }
        }),
        // Manejar errores 500 cuando los parámetros son inválidos
        catchError((error) => {
          // Si es un error 500 o cualquier otro error, devolver array vacío
          return of([]);
        })
      );
  }

  /**
   * Obtiene la disponibilidad de un activity pack específico por su ID y departureId.
   * @param activityPackId ID del activity pack.
   * @param departureId ID del departure.
   * @returns Disponibilidad del activity pack (array, puede estar vacío si no hay disponibilidad o hay error).
   */
  getByActivityPackAndDeparture(
    activityPackId: number,
    departureId: number
  ): Observable<IActivityPackAvailabilityResponse[]> {
    const filters: ActivityPackAvailabilityFilters = {
      activityPackId,
      departureId,
    };
    return this.getAll(filters);
  }

  /**
   * Obtiene todas las disponibilidades de un activity pack específico.
   * @param activityPackId ID del activity pack.
   * @returns Lista de disponibilidades del activity pack.
   */
  getByActivityPack(
    activityPackId: number
  ): Observable<IActivityPackAvailabilityResponse[]> {
    const filters: ActivityPackAvailabilityFilters = {
      activityPackId,
    };
    return this.getAll(filters);
  }
}

