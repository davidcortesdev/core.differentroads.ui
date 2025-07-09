import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TourTagRelationTypeCreate {
  name: string;
  description?: string;
  id: number;
  code: string;
  isVisible?: boolean;
  isInternal?: boolean;
  displayOrder?: number;
}

export interface TourTagRelationTypeUpdate {
  name: string;
  description?: string;
  id: number;
  code: string;
  isVisible?: boolean;
  isInternal?: boolean;
  displayOrder?: number;
}

export interface ITourTagRelationTypeResponse {
  name: string;
  description: string;
  id: number;
  code: string;
  isVisible: boolean;
  isInternal: boolean;
  displayOrder: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TourTagRelationTypeFilters {
  name?: string;
  description?: string;
  id?: number;
  code?: string;
  isVisible?: boolean;
  isInternal?: boolean;
  displayOrder?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourTagRelationTypeService {
  private readonly API_URL = `${environment.toursApiUrl}/TourTagRelationType`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene tipos de relación basados en criterios de filtro.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de tipos de relación.
   */
  getAll(filters?: TourTagRelationTypeFilters): Observable<ITourTagRelationTypeResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<ITourTagRelationTypeResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo tipo de relación.
   * @param data Datos para crear el tipo de relación.
   * @returns El tipo de relación creado.
   */
  create(data: TourTagRelationTypeCreate): Observable<ITourTagRelationTypeResponse> {
    return this.http.post<ITourTagRelationTypeResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un tipo de relación específico por su ID.
   * @param id ID del tipo de relación.
   * @returns El tipo de relación encontrado.
   */
  getById(id: number): Observable<ITourTagRelationTypeResponse> {
    return this.http.get<ITourTagRelationTypeResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un tipo de relación existente.
   * @param id ID del tipo de relación a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: TourTagRelationTypeUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un tipo de relación.
   * @param id ID del tipo de relación a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}