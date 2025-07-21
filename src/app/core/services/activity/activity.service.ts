import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ActivityFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  tkId?: string;
  activityTypeId?: number;
  serviceTypeId?: number;
  activitySubtypeId?: number;
  itineraryId?: number;
  isActive?: boolean;
  isOptional?: boolean;
  isRecommended?: boolean;
  imageUrl?: string;
  imageAlt?: string;
  activityCompetitionGroupId?: number;
  isTKOrigin?: boolean;
  isVisibleOnWeb?: boolean;
}

/**
 * Modelo para crear una actividad.
 */
export interface ActivityCreate {
  code: string | null;
  name: string | null;
  description: string | null;
  tkId: string | null;
  activityTypeId: number;
  serviceTypeId: number;
  activitySubtypeId: number;
  itineraryId: number;
  isActive: boolean;
  isOptional: boolean;
  isRecommended: boolean;
  imageUrl?: string | null;
  imageAlt?: string | null;
  activityCompetitionGroupId?: number | null;
  isTKOrigin?: boolean;
  isVisibleOnWeb?: boolean;
}

/**
 * Modelo para actualizar una actividad existente.
 */
export interface ActivityUpdate {
  code: string | null;
  name: string | null;
  description: string | null;
  tkId: string | null;
  activityTypeId: number;
  serviceTypeId: number;
  activitySubtypeId: number;
  itineraryId: number;
  isActive: boolean;
  isOptional: boolean;
  isRecommended: boolean;
  imageUrl?: string | null;
  imageAlt?: string | null;
  activityCompetitionGroupId?: number | null;
  isTKOrigin?: boolean;
  isVisibleOnWeb?: boolean;
}

/**
 * Respuesta del backend para una actividad.
 */
export interface IActivityResponse {
  id: number;
  code: string | null;
  name: string | null;
  description: string | null;
  tkId: string | null;
  activityTypeId: number;
  serviceTypeId: number;
  activitySubtypeId: number;
  itineraryId: number;
  isActive: boolean;
  isOptional: boolean;
  isRecommended: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
  activityCompetitionGroupId: number | null;
  isTKOrigin: boolean;
  isVisibleOnWeb: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private readonly API_URL = `${environment.toursApiUrl}/Activity`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las actividades disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de actividades.
   */
  getAll(filter?: ActivityFilters): Observable<IActivityResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<IActivityResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene una actividad específica por su ID.
   * @param id ID de la actividad.
   * @returns Actividad correspondiente.
   */
  getById(id: number): Observable<IActivityResponse> {
    return this.http.get<IActivityResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene todas las actividades de un itinerario específico.
   * @param itineraryId ID del itinerario.
   * @returns Lista de actividades del itinerario.
   */
  getByItineraryId(itineraryId: number): Observable<IActivityResponse[]> {
    return this.getAll({ itineraryId });
  }

  /**
   * Crea una nueva actividad.
   * @param data Datos de la actividad a crear.
   * @returns Actividad creada.
   */
  create(data: ActivityCreate): Observable<IActivityResponse> {
    return this.http.post<IActivityResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza una actividad existente.
   * @param id ID de la actividad a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: ActivityUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una actividad por su ID.
   * @param id ID de la actividad a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Activa o desactiva una actividad.
   * @param id ID de la actividad.
   * @param isActive Estado activo/inactivo.
   * @returns `true` si la operación fue exitosa.
   */
  toggleActive(id: number, isActive: boolean): Observable<boolean> {
    return this.http.patch<boolean>(
      `${this.API_URL}/${id}/toggle-active`,
      { isActive },
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Obtiene las actividades filtradas para la sección de itinerario.
   * @param itineraryId ID del itinerario (obligatorio)
   * @param departureId ID de la salida (opcional)
   * @param itineraryDayId ID del día de itinerario (opcional)
   * @returns Lista de actividades filtradas
   */
  getForItinerary(
    itineraryId: number,
    departureId?: number,
    itineraryDayId?: number
  ): Observable<IActivityResponse[]> {
    let params = new HttpParams()
      .set('itineraryId', itineraryId.toString())
      .set('isVisibleOnWeb', 'true'); // Siempre enviamos isVisibleOnWeb=true
    if (departureId !== undefined) {
      params = params.set('departureId', departureId.toString());
    }
    if (itineraryDayId !== undefined) {
      params = params.set('itineraryDayId', itineraryDayId.toString());
    }
    return this.http.get<IActivityResponse[]>(`${this.API_URL}/for-itinerary`, {
      params,
    });
  }
}
