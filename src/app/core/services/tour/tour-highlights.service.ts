import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TourHighlightFilters {
  id?: number;
  name?: string;
  description?: string;
  tourId?: number;
  isActive?: boolean;
  order?: number;
  createdDate?: string;
  updatedDate?: string;
}

/**
 * Modelo para crear un punto destacado del tour.
 */
export interface TourHighlightCreate {
  name: string;
  description: string | null;
  tourId: number;
  isActive: boolean;
  order?: number | null;
}

/**
 * Modelo para actualizar un punto destacado del tour existente.
 */
export interface TourHighlightUpdate {
  name: string;
  description: string | null;
  tourId: number;
  isActive: boolean;
  order?: number | null;
}

/**
 * Respuesta del backend para un punto destacado del tour.
 */
export interface ITourHighlightResponse {
  id: number;
  name: string;
  description: string | null;
  tourId: number;
  isActive: boolean;
  order: number | null;
  createdDate: string;
  updatedDate: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TourHighlightsService {
  private readonly API_URL = `${environment.toursApiUrl}/TourHighlight`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los puntos destacados disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de puntos destacados.
   */
  getAll(filter?: TourHighlightFilters): Observable<ITourHighlightResponse[]> {
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

    return this.http.get<ITourHighlightResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un punto destacado específico por su ID.
   * @param id ID del punto destacado.
   * @returns Punto destacado correspondiente.
   */
  getById(id: number): Observable<ITourHighlightResponse> {
    return this.http.get<ITourHighlightResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo punto destacado.
   * @param data Datos del punto destacado a crear.
   * @returns Punto destacado creado.
   */
  create(data: TourHighlightCreate): Observable<ITourHighlightResponse> {
    return this.http.post<ITourHighlightResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un punto destacado existente.
   * @param id ID del punto destacado a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: TourHighlightUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un punto destacado por su ID.
   * @param id ID del punto destacado a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}