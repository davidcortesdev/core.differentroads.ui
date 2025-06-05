import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ItineraryFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  tkId?: string;
  tourId?: number;
  isVisibleOnWeb?: boolean;
  isBookable?: boolean;
  itineraryStatusId?: number;
}

/**
 * Modelo para crear un itinerario.
 */
export interface ItineraryCreate {
  code: string | null;
  name: string | null;
  description: string | null;
  tkId: string | null;
  tourId: number;
  isVisibleOnWeb: boolean;
  isBookable: boolean;
  itineraryStatusId?: number | null;
}

/**
 * Modelo para actualizar un itinerario existente.
 */
export interface ItineraryUpdate {
  code: string | null;
  name: string | null;
  description: string | null;
  tkId: string | null;
  tourId: number;
  isVisibleOnWeb: boolean;
  isBookable: boolean;
  itineraryStatusId?: number | null;
}

/**
 * Respuesta del backend para un itinerario.
 */
export interface IItineraryResponse {
  id: number;
  code: string | null;
  name: string | null;
  description: string | null;
  tkId: string | null;
  tourId: number;
  isVisibleOnWeb: boolean;
  isBookable: boolean;
  itineraryStatusId: number;
}

@Injectable({
  providedIn: 'root',
})
export class ItineraryService {
  private readonly API_URL = `${environment.toursApiUrl}/Itinerary`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los itinerarios disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de itinerarios.
   */
  getAll(filter?: ItineraryFilters): Observable<IItineraryResponse[]> {
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

    return this.http.get<IItineraryResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un itinerario específico por su ID.
   * @param id ID del itinerario.
   * @returns Itinerario correspondiente.
   */
  getById(id: number): Observable<IItineraryResponse> {
    return this.http.get<IItineraryResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo itinerario.
   * @param data Datos del itinerario a crear.
   * @returns Itinerario creado.
   */
  create(data: ItineraryCreate): Observable<IItineraryResponse> {
    return this.http.post<IItineraryResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un itinerario existente.
   * @param id ID del itinerario a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: ItineraryUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un itinerario por su ID.
   * @param id ID del itinerario a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}
