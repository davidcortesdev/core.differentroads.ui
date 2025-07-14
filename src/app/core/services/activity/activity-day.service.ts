import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ActivityItineraryDayFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  tkId?: string;
  itineraryId?: number;
  isOptional?: boolean;
  imageUrl?: string;
  imageAlt?: string;
}

/**
 * Modelo para crear un día de itinerario de actividad.
 */
export interface ActivityItineraryDayCreate {
  code: string | null;
  name: string | null;
  description: string | null;
  tkId: string | null;
  itineraryId: number;
  isOptional: boolean;
  imageUrl?: string | null;
  imageAlt?: string | null;
}

/**
 * Modelo para actualizar un día de itinerario de actividad existente.
 */
export interface ActivityItineraryDayUpdate {
  code: string | null;
  name: string | null;
  description: string | null;
  tkId: string | null;
  itineraryId: number;
  isOptional: boolean;
  imageUrl?: string | null;
  imageAlt?: string | null;
}

/**
 * Respuesta del backend para un día de itinerario de actividad.
 */
export interface IActivityItineraryDayResponse {
  id: number;
  code: string | null;
  name: string | null;
  description: string | null;
  tkId: string | null;
  itineraryId: number;
  isOptional: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityItineraryDayService {
  private readonly API_URL = `${environment.toursApiUrl}/ActivityItineraryDay`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los días de itinerario de actividad disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de días de itinerario de actividad.
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
   * Obtiene un día de itinerario de actividad específico por su ID.
   * @param id ID del día de itinerario de actividad.
   * @returns Día de itinerario de actividad correspondiente.
   */
  getById(id: number): Observable<IActivityItineraryDayResponse> {
    return this.http.get<IActivityItineraryDayResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene todos los días de un itinerario específico.
   * @param itineraryId ID del itinerario.
   * @returns Lista de días del itinerario.
   */
  getByItineraryId(itineraryId: number): Observable<IActivityItineraryDayResponse[]> {
    return this.getAll({ itineraryId });
  }

  /**
   * Obtiene un día de itinerario por su código SK.
   * @param tkId Código SK del día de itinerario.
   * @returns Días de itinerario correspondientes.
   */
  getBytkId(tkId: string): Observable<IActivityItineraryDayResponse[]> {
    return this.getAll({ tkId });
  }

  /**
   * Obtiene días de itinerario opcionales de un itinerario específico.
   * @param itineraryId ID del itinerario.
   * @returns Lista de días opcionales del itinerario.
   */
  getOptionalByItineraryId(itineraryId: number): Observable<IActivityItineraryDayResponse[]> {
    return this.getAll({ itineraryId, isOptional: true });
  }

  /**
   * Obtiene días de itinerario obligatorios de un itinerario específico.
   * @param itineraryId ID del itinerario.
   * @returns Lista de días obligatorios del itinerario.
   */
  getRequiredByItineraryId(itineraryId: number): Observable<IActivityItineraryDayResponse[]> {
    return this.getAll({ itineraryId, isOptional: false });
  }

  /**
   * Crea un nuevo día de itinerario de actividad.
   * @param data Datos del día de itinerario a crear.
   * @returns Día de itinerario creado.
   */
  create(data: ActivityItineraryDayCreate): Observable<IActivityItineraryDayResponse> {
    return this.http.post<IActivityItineraryDayResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un día de itinerario de actividad existente.
   * @param id ID del día de itinerario a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: ActivityItineraryDayUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un día de itinerario de actividad por su ID.
   * @param id ID del día de itinerario a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Cambia el estado opcional de un día de itinerario.
   * @param id ID del día de itinerario.
   * @param isOptional Nuevo estado opcional.
   * @returns `true` si la operación fue exitosa.
   */
  toggleOptional(id: number, isOptional: boolean): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/${id}/toggle-optional`, { isOptional }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza la imagen de un día de itinerario.
   * @param id ID del día de itinerario.
   * @param imageUrl Nueva URL de la imagen.
   * @param imageAlt Nuevo texto alternativo de la imagen.
   * @returns `true` si la operación fue exitosa.
   */
  updateImage(id: number, imageUrl: string | null, imageAlt: string | null): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/${id}/image`, { imageUrl, imageAlt }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene días agrupados por estado opcional para un itinerario.
   * @param itineraryId ID del itinerario.
   * @returns Objeto con días opcionales y obligatorios.
   */
  getGroupedByOptional(itineraryId: number): Observable<{
    optional: IActivityItineraryDayResponse[];
    required: IActivityItineraryDayResponse[];
  }> {
    return this.http.get<{
      optional: IActivityItineraryDayResponse[];
      required: IActivityItineraryDayResponse[];
    }>(`${this.API_URL}/itinerary/${itineraryId}/grouped-by-optional`);
  }
}