import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ActivityPriceFilters {
  id?: number;
  name?: string;
  description?: string;
  code?: string;
  tkId?: string;
  isActive?: boolean;
}

/**
 * Modelo para crear un precio de actividad.
 */
export interface ActivityPriceCreate {
  name: string | null;
  description: string | null;
  code: string | null;
  tkId: string | null;
  isActive: boolean;
}

/**
 * Modelo para actualizar un precio de actividad existente.
 */
export interface ActivityPriceUpdate {
  name: string | null;
  description: string | null;
  code: string | null;
  tkId: string | null;
  isActive: boolean;
}

/**
 * Respuesta del backend para un precio de actividad.
 */
export interface IActivityPriceResponse {
  id: number;
  name: string | null;
  description: string | null;
  code: string | null;
  tkId: string | null;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityPriceService {
  private readonly API_URL = `${environment.toursApiUrl}/ActivityPrice`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los precios de actividad disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de precios de actividad.
   */
  getAll(filter?: ActivityPriceFilters): Observable<IActivityPriceResponse[]> {
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

    return this.http.get<IActivityPriceResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un precio de actividad específico por su ID.
   * @param id ID del precio de actividad.
   * @returns Precio de actividad correspondiente.
   */
  getById(id: number): Observable<IActivityPriceResponse> {
    return this.http.get<IActivityPriceResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene precios de actividad activos únicamente.
   * @returns Lista de precios de actividad activos.
   */
  getActive(): Observable<IActivityPriceResponse[]> {
    return this.getAll({ isActive: true });
  }

  /**
   * Obtiene precios de actividad inactivos únicamente.
   * @returns Lista de precios de actividad inactivos.
   */
  getInactive(): Observable<IActivityPriceResponse[]> {
    return this.getAll({ isActive: false });
  }

  /**
   * Obtiene un precio de actividad por su código.
   * @param code Código del precio de actividad.
   * @returns Lista de precios con el código especificado.
   */
  getByCode(code: string): Observable<IActivityPriceResponse[]> {
    return this.getAll({ code });
  }

  /**
   * Obtiene un precio de actividad por su código TK.
   * @param tkId Código TK del precio de actividad.
   * @returns Lista de precios con el código TK especificado.
   */
  getByTkId(tkId: string): Observable<IActivityPriceResponse[]> {
    return this.getAll({ tkId });
  }

  /**
   * Busca precios de actividad por nombre (búsqueda parcial).
   * @param name Nombre a buscar.
   * @returns Lista de precios que coinciden con el nombre.
   */
  searchByName(name: string): Observable<IActivityPriceResponse[]> {
    return this.getAll({ name });
  }

  /**
   * Crea un nuevo precio de actividad.
   * @param data Datos del precio de actividad a crear.
   * @returns Precio de actividad creado.
   */
  create(data: ActivityPriceCreate): Observable<IActivityPriceResponse> {
    return this.http.post<IActivityPriceResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un precio de actividad existente.
   * @param id ID del precio de actividad a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: ActivityPriceUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un precio de actividad por su ID.
   * @param id ID del precio de actividad a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Activa o desactiva un precio de actividad.
   * @param id ID del precio de actividad.
   * @param isActive Estado activo/inactivo.
   * @returns `true` si la operación fue exitosa.
   */
  toggleActive(id: number, isActive: boolean): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/${id}/toggle-active`, { isActive }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza solo la información básica (nombre y descripción).
   * @param id ID del precio de actividad.
   * @param name Nuevo nombre.
   * @param description Nueva descripción.
   * @returns `true` si la operación fue exitosa.
   */
  updateBasicInfo(id: number, name: string | null, description: string | null): Observable<boolean> {
    return this.http.patch<boolean>(`${this.API_URL}/${id}/basic-info`, { name, description }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Crea múltiples precios de actividad en lote.
   * @param prices Array de precios a crear.
   * @returns Lista de precios creados.
   */
  createBatch(prices: ActivityPriceCreate[]): Observable<IActivityPriceResponse[]> {
    return this.http.post<IActivityPriceResponse[]>(`${this.API_URL}/batch`, prices, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene estadísticas de precios de actividad.
   * @returns Objeto con estadísticas (total, activos, inactivos).
   */
  getStatistics(): Observable<{ total: number; active: number; inactive: number }> {
    return this.http.get<{ total: number; active: number; inactive: number }>(`${this.API_URL}/statistics`);
  }
}