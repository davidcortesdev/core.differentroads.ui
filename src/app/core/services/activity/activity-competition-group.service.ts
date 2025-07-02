import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ActivityCompetitionGroupFilters {
  id?: number;
  tkId?: string;
  itineraryId?: number;
  name?: string;
  code?: string;
  description?: string;
  isOptional?: boolean;
  webInfo?: string;
  reservationInfo?: string;
}

/**
 * Modelo para crear un grupo de competición de actividades.
 */
export interface ActivityCompetitionGroupCreate {
  tkId: string | null;
  itineraryId: number;
  name: string | null;
  code: string | null;
  description: string | null;
  isOptional: boolean;
  webInfo?: string | null;
  reservationInfo?: string | null;
}

/**
 * Modelo para actualizar un grupo de competición de actividades existente.
 */
export interface ActivityCompetitionGroupUpdate {
  tkId: string | null;
  itineraryId: number;
  name: string | null;
  code: string | null;
  description: string | null;
  isOptional: boolean;
  webInfo?: string | null;
  reservationInfo?: string | null;
}

/**
 * Respuesta del backend para un grupo de competición de actividades.
 */
export interface IActivityCompetitionGroupResponse {
  id: number;
  tkId: string | null;
  itineraryId: number;
  name: string | null;
  code: string | null;
  description: string | null;
  isOptional: boolean;
  webInfo: string | null;
  reservationInfo: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityCompetitionGroupService {
  private readonly API_URL = `${environment.toursApiUrl}/ActivityCompetitionGroup`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los grupos de competición de actividades disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de grupos de competición de actividades.
   */
  getAll(filter?: ActivityCompetitionGroupFilters): Observable<IActivityCompetitionGroupResponse[]> {
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

    return this.http.get<IActivityCompetitionGroupResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un grupo de competición de actividades específico por su ID.
   * @param id ID del grupo de competición de actividades.
   * @returns Grupo de competición de actividades correspondiente.
   */
  getById(id: number): Observable<IActivityCompetitionGroupResponse> {
    return this.http.get<IActivityCompetitionGroupResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene todos los grupos de competición de un itinerario específico.
   * @param itineraryId ID del itinerario.
   * @returns Lista de grupos de competición del itinerario.
   */
  getByItineraryId(itineraryId: number): Observable<IActivityCompetitionGroupResponse[]> {
    return this.getAll({ itineraryId });
  }

  /**
   * Obtiene un grupo de competición por su código TK.
   * @param tkId Código TK del grupo de competición.
   * @returns Grupo de competición correspondiente.
   */
  getByTkId(tkId: string): Observable<IActivityCompetitionGroupResponse[]> {
    return this.getAll({ tkId });
  }

  /**
   * Crea un nuevo grupo de competición de actividades.
   * @param data Datos del grupo de competición a crear.
   * @returns Grupo de competición creado.
   */
  create(data: ActivityCompetitionGroupCreate): Observable<IActivityCompetitionGroupResponse> {
    return this.http.post<IActivityCompetitionGroupResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un grupo de competición de actividades existente.
   * @param id ID del grupo de competición a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: ActivityCompetitionGroupUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un grupo de competición de actividades por su ID.
   * @param id ID del grupo de competición a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Cambia el estado opcional de un grupo de competición.
   * @param id ID del grupo de competición.
   * @param isOptional Nuevo estado opcional.
   * @returns `true` si la operación fue exitosa.
   */
  toggleOptional(id: number, isOptional: boolean): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/${id}/toggle-optional`, { isOptional }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene grupos de competición opcionales y no opcionales por separado.
   * @param itineraryId ID del itinerario.
   * @returns Objeto con grupos opcionales y no opcionales.
   */
  getGroupedByOptional(itineraryId: number): Observable<{
    optional: IActivityCompetitionGroupResponse[];
    required: IActivityCompetitionGroupResponse[];
  }> {
    return this.http.get<{
      optional: IActivityCompetitionGroupResponse[];
      required: IActivityCompetitionGroupResponse[];
    }>(`${this.API_URL}/itinerary/${itineraryId}/grouped-by-optional`);
  }
}