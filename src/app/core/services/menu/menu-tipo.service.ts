import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface MenuTipoCreate {
  code: string;
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
}

export interface MenuTipoUpdate {
  code: string;
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
}

export interface IMenuTipoResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  slug: string;
  isActive: boolean;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface MenuTipoFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  slug?: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MenuTipoService {
  private readonly API_URL = `${environment.cmsApiUrl}/MenuTipo`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de menú disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de tipos de menú.
   */
  getAll(filters?: MenuTipoFilters): Observable<IMenuTipoResponse[]> {
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

    return this.http.get<IMenuTipoResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un tipo de menú específico por su ID.
   * @param id ID del tipo de menú.
   * @returns Tipo de menú específico.
   */
  getById(id: number): Observable<IMenuTipoResponse> {
    return this.http.get<IMenuTipoResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo tipo de menú.
   * @param data Datos para crear el tipo.
   * @returns Tipo creado.
   */
  create(data: MenuTipoCreate): Observable<IMenuTipoResponse> {
    return this.http.post<IMenuTipoResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un tipo de menú existente.
   * @param id ID del tipo a actualizar.
   * @param data Datos actualizados.
   * @returns Tipo actualizado.
   */
  update(id: number, data: MenuTipoUpdate): Observable<IMenuTipoResponse> {
    return this.http.put<IMenuTipoResponse>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un tipo de menú existente.
   * @param id ID del tipo a eliminar.
   * @returns Boolean indicando éxito.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}
