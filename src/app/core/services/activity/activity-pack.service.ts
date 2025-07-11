import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ActivityActivityPackFilters {
  id?: number;
  activityId?: number;
  activityPackId?: number;
}

/**
 * Modelo para crear una relación ActivityActivityPack.
 */
export interface ActivityActivityPackCreate {
  activityId: number;
  activityPackId: number;
}

/**
 * Modelo para actualizar una relación ActivityActivityPack existente.
 */
export interface ActivityActivityPackUpdate {
  activityId: number;
  activityPackId: number;
}

/**
 * Respuesta del backend para una relación ActivityActivityPack.
 */
export interface IActivityActivityPackResponse {
  id: number;
  activityId: number;
  activityPackId: number;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityActivityPackService {
  private readonly API_URL = `${environment.toursApiUrl}/ActivityActivityPack`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las relaciones ActivityActivityPack disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de relaciones ActivityActivityPack.
   */
  getAll(filter?: ActivityActivityPackFilters): Observable<IActivityActivityPackResponse[]> {
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

    return this.http.get<IActivityActivityPackResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene una relación ActivityActivityPack específica por su ID.
   * @param id ID de la relación ActivityActivityPack.
   * @returns Relación ActivityActivityPack correspondiente.
   */
  getById(id: number): Observable<IActivityActivityPackResponse> {
    return this.http.get<IActivityActivityPackResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene todas las relaciones por Activity ID.
   * @param activityId ID de la actividad.
   * @returns Lista de relaciones ActivityActivityPack para la actividad especificada.
   */
  getByActivityId(activityId: number): Observable<IActivityActivityPackResponse[]> {
    return this.getAll({ activityId });
  }

  /**
   * Obtiene todas las relaciones por ActivityPack ID.
   * @param activityPackId ID del pack de actividades.
   * @returns Lista de relaciones ActivityActivityPack para el pack especificado.
   */
  getByActivityPackId(activityPackId: number): Observable<IActivityActivityPackResponse[]> {
    return this.getAll({ activityPackId });
  }

  /**
   * Crea una nueva relación ActivityActivityPack.
   * @param data Datos de la relación a crear.
   * @returns Relación ActivityActivityPack creada.
   */
  create(data: ActivityActivityPackCreate): Observable<IActivityActivityPackResponse> {
    return this.http.post<IActivityActivityPackResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza una relación ActivityActivityPack existente.
   * @param id ID de la relación a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: ActivityActivityPackUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una relación ActivityActivityPack por su ID.
   * @param id ID de la relación a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Elimina una relación por Activity ID y ActivityPack ID.
   * @param activityId ID de la actividad.
   * @param activityPackId ID del pack de actividades.
   * @returns `true` si la eliminación fue exitosa.
   */
  deleteByActivityAndPack(activityId: number, activityPackId: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/activity/${activityId}/pack/${activityPackId}`);
  }

  /**
   * Crea múltiples relaciones ActivityActivityPack en lote.
   * @param relations Array de relaciones a crear.
   * @returns Lista de relaciones creadas.
   */
  createBatch(relations: ActivityActivityPackCreate[]): Observable<IActivityActivityPackResponse[]> {
    return this.http.post<IActivityActivityPackResponse[]>(`${this.API_URL}/batch`, relations, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }
}