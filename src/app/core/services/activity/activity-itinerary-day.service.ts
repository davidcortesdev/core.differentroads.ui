import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ActivityItineraryDayFilters {
  id?: number;
  activityId?: number;
  itineraryDayId?: number;
  displayOrder?: number;
  notes?: string;
}

/**
 * Modelo para crear una relación actividad-día de itinerario.
 */
export interface ActivityItineraryDayCreate {
  activityId: number;
  itineraryDayId: number;
  displayOrder: number;
  notes: string | null;
}

/**
 * Modelo para actualizar una relación actividad-día de itinerario existente.
 */
export interface ActivityItineraryDayUpdate {
  activityId: number;
  itineraryDayId: number;
  displayOrder: number;
  notes: string | null;
}

/**
 * Respuesta del backend para una relación actividad-día de itinerario.
 */
export interface IActivityItineraryDayResponse {
  id: number;
  activityId: number;
  itineraryDayId: number;
  displayOrder: number;
  notes: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityItineraryDayService {
  private readonly API_URL = `${environment.toursApiUrl}/ActivityItineraryDay`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las relaciones actividad-día de itinerario disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de relaciones actividad-día de itinerario.
   */
  getAll(filter?: ActivityItineraryDayFilters): Observable<IActivityItineraryDayResponse[]> {
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

    return this.http.get<IActivityItineraryDayResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene una relación específica por su ID.
   * @param id ID de la relación.
   * @returns Relación correspondiente.
   */
  getById(id: number): Observable<IActivityItineraryDayResponse> {
    return this.http.get<IActivityItineraryDayResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene todas las actividades de un día de itinerario específico.
   * @param itineraryDayId ID del día de itinerario.
   * @returns Lista de actividades del día de itinerario.
   */
  getByItineraryDayId(itineraryDayId: number): Observable<IActivityItineraryDayResponse[]> {
    return this.getAll({ itineraryDayId });
  }

  /**
   * Obtiene todas las relaciones de una actividad específica.
   * @param activityId ID de la actividad.
   * @returns Lista de relaciones de la actividad.
   */
  getByActivityId(activityId: number): Observable<IActivityItineraryDayResponse[]> {
    return this.getAll({ activityId });
  }

  /**
   * Crea una nueva relación actividad-día de itinerario.
   * @param data Datos de la relación a crear.
   * @returns Relación creada.
   */
  create(data: ActivityItineraryDayCreate): Observable<IActivityItineraryDayResponse> {
    return this.http.post<IActivityItineraryDayResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza una relación existente.
   * @param id ID de la relación a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: ActivityItineraryDayUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una relación por su ID.
   * @param id ID de la relación a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza el orden de visualización de una actividad en un día específico.
   * @param id ID de la relación.
   * @param displayOrder Nuevo orden de visualización.
   * @returns `true` si la operación fue exitosa.
   */
  updateDisplayOrder(id: number, displayOrder: number): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/${id}/display-order`, { displayOrder }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza las notas de una relación específica.
   * @param id ID de la relación.
   * @param notes Nuevas notas.
   * @returns `true` si la operación fue exitosa.
   */
  updateNotes(id: number, notes: string | null): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/${id}/notes`, { notes }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }
}