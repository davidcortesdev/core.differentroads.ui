import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TagCreate {
  code: string;
  name: string;
  description?: string;
  id: number;
  rkId: string;
  tagCategoryId: number;
  languageId: number;
  isActive?: boolean;
}

export interface TagUpdate {
  code: string;
  name: string;
  description?: string;
  id: number;
  rkId: string;
  tagCategoryId: number;
  languageId: number;
  isActive?: boolean;
}

export interface ITagResponse {
  code: string;
  name: string;
  description: string;
  id: number;
  rkId: string;
  tagCategoryId: number;
  languageId: number;
  isActive: boolean;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TagFilters {
  code?: string;
  name?: string;
  description?: string;
  id?: number;
  rkId?: string;
  tagCategoryId?: number;
  languageId?: number;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TagService {
  private readonly API_URL = `${environment.masterdataApiUrl}/Tag`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las etiquetas según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de etiquetas.
   */
  getAll(filters?: TagFilters): Observable<ITagResponse[]> {
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

    return this.http.get<ITagResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva etiqueta.
   * @param data Datos para crear la etiqueta.
   * @returns La etiqueta creada.
   */
  create(data: TagCreate): Observable<ITagResponse> {
    return this.http.post<ITagResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una etiqueta específica por su ID.
   * @param id ID de la etiqueta.
   * @returns La etiqueta encontrada.
   */
  getById(id: number): Observable<ITagResponse> {
    return this.http.get<ITagResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una etiqueta existente.
   * @param id ID de la etiqueta a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: TagUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una etiqueta existente.
   * @param id ID de la etiqueta a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}