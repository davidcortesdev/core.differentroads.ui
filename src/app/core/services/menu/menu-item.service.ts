import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface MenuItemCreate {
  name: string;
  menuTipoId: number;
  entidadId?: number;
  slugContenido: string;
  orden: number;
  isActive: boolean;
}

export interface MenuItemUpdate {
  name: string;
  menuTipoId: number;
  entidadId?: number;
  slugContenido: string;
  orden: number;
  isActive: boolean;
}

export interface IMenuItemResponse {
  id: number;
  name: string;
  menuTipoId: number;
  entidadId?: number;
  slugContenido: string;
  orden: number;
  isActive: boolean;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface MenuItemFilters {
  id?: number;
  name?: string;
  menuTipoId?: number;
  entidadId?: number;
  slugContenido?: string;
  orden?: number;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MenuItemService {
  private readonly API_URL = `${environment.cmsApiUrl}/MenuItem`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los elementos de menú disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de elementos de menú.
   */
  getAll(filters?: MenuItemFilters): Observable<IMenuItemResponse[]> {
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

    return this.http.get<IMenuItemResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un elemento de menú específico por su ID.
   * @param id ID del elemento de menú.
   * @returns Elemento de menú específico.
   */
  getById(id: number): Observable<IMenuItemResponse> {
    return this.http.get<IMenuItemResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo elemento de menú.
   * @param data Datos para crear el elemento.
   * @returns Elemento creado.
   */
  create(data: MenuItemCreate): Observable<IMenuItemResponse> {
    return this.http.post<IMenuItemResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un elemento de menú existente.
   * @param id ID del elemento a actualizar.
   * @param data Datos actualizados.
   * @returns Boolean indicando éxito.
   */
  update(id: number, data: MenuItemUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un elemento de menú existente.
   * @param id ID del elemento a eliminar.
   * @returns Boolean indicando éxito.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}
