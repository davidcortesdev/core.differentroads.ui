import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TagCategoryCreate {
  code: string;
  name: string;
  description?: string;
  id: number;
  rkId: string;
  isActive?: boolean;
}

export interface TagCategoryUpdate {
  code: string;
  name: string;
  description?: string;
  id: number;
  rkId: string;
  isActive?: boolean;
}

export interface ITagCategoryResponse {
  code: string;
  name: string;
  description: string;
  id: number;
  rkId: string;
  isActive: boolean;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TagCategoryFilters {
  code?: string;
  name?: string;
  description?: string;
  id?: number;
  rkId?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TagCategoryService {
  private readonly API_URL = `${environment.masterdataApiUrl}/TagCategory`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las categorías de etiquetas según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de categorías de etiquetas.
   */
  getAll(filters?: TagCategoryFilters): Observable<ITagCategoryResponse[]> {
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

    return this.http.get<ITagCategoryResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva categoría de etiqueta.
   * @param data Datos para crear la categoría.
   * @returns La categoría creada.
   */
  create(data: TagCategoryCreate): Observable<ITagCategoryResponse> {
    return this.http.post<ITagCategoryResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una categoría específica por su ID.
   * @param id ID de la categoría.
   * @returns La categoría encontrada.
   */
  getById(id: number): Observable<ITagCategoryResponse> {
    return this.http.get<ITagCategoryResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una categoría existente.
   * @param id ID de la categoría a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: TagCategoryUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una categoría existente.
   * @param id ID de la categoría a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}