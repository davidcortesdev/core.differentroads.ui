import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ActivityTypeFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  skId?: string;
  isActive?: boolean;
}

/**
 * Modelo para crear un tipo de actividad.
 */
export interface ActivityTypeCreate {
  code: string | null;
  name: string | null;
  description: string | null;
  skId: string | null;
  isActive: boolean;
}

/**
 * Modelo para actualizar un tipo de actividad existente.
 */
export interface ActivityTypeUpdate {
  code: string | null;
  name: string | null;
  description: string | null;
  skId: string | null;
  isActive: boolean;
}

/**
 * Respuesta del backend para un tipo de actividad.
 */
export interface IActivityTypeResponse {
  id: number;
  code: string | null;
  name: string | null;
  description: string | null;
  skId: string | null;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityTypeService {
  private readonly API_URL = `${environment.toursApiUrl}/ActivityType`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de actividad disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de tipos de actividad.
   */
  getAll(filter?: ActivityTypeFilters): Observable<IActivityTypeResponse[]> {
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

    return this.http.get<IActivityTypeResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un tipo de actividad específico por su ID.
   * @param id ID del tipo de actividad.
   * @returns Tipo de actividad correspondiente.
   */
  getById(id: number): Observable<IActivityTypeResponse> {
    return this.http.get<IActivityTypeResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene tipos de actividad activos únicamente.
   * @returns Lista de tipos de actividad activos.
   */
  getActive(): Observable<IActivityTypeResponse[]> {
    return this.getAll({ isActive: true });
  }

  /**
   * Obtiene tipos de actividad inactivos únicamente.
   * @returns Lista de tipos de actividad inactivos.
   */
  getInactive(): Observable<IActivityTypeResponse[]> {
    return this.getAll({ isActive: false });
  }

  /**
   * Obtiene un tipo de actividad por su código.
   * @param code Código del tipo de actividad.
   * @returns Lista de tipos con el código especificado.
   */
  getByCode(code: string): Observable<IActivityTypeResponse[]> {
    return this.getAll({ code });
  }

  /**
   * Obtiene un tipo de actividad por su código SK.
   * @param skId Código SK del tipo de actividad.
   * @returns Lista de tipos con el código SK especificado.
   */
  getBySkId(skId: string): Observable<IActivityTypeResponse[]> {
    return this.getAll({ skId });
  }

  /**
   * Busca tipos de actividad por nombre (búsqueda parcial).
   * @param name Nombre a buscar.
   * @returns Lista de tipos que coinciden con el nombre.
   */
  searchByName(name: string): Observable<IActivityTypeResponse[]> {
    return this.getAll({ name });
  }

  /**
   * Crea un nuevo tipo de actividad.
   * @param data Datos del tipo de actividad a crear.
   * @returns Tipo de actividad creado.
   */
  create(data: ActivityTypeCreate): Observable<IActivityTypeResponse> {
    return this.http.post<IActivityTypeResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un tipo de actividad existente.
   * @param id ID del tipo de actividad a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: ActivityTypeUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un tipo de actividad por su ID.
   * @param id ID del tipo de actividad a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Activa o desactiva un tipo de actividad.
   * @param id ID del tipo de actividad.
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
   * @param id ID del tipo de actividad.
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
   * Crea múltiples tipos de actividad en lote.
   * @param types Array de tipos a crear.
   * @returns Lista de tipos creados.
   */
  createBatch(types: ActivityTypeCreate[]): Observable<IActivityTypeResponse[]> {
    return this.http.post<IActivityTypeResponse[]>(`${this.API_URL}/batch`, types, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene estadísticas de tipos de actividad.
   * @returns Objeto con estadísticas (total, activos, inactivos).
   */
  getStatistics(): Observable<{ total: number; active: number; inactive: number }> {
    return this.http.get<{ total: number; active: number; inactive: number }>(`${this.API_URL}/statistics`);
  }

  /**
   * Valida si un código ya existe.
   * @param code Código a validar.
   * @param excludeId ID a excluir de la validación (para updates).
   * @returns `true` si el código está disponible.
   */
  validateCode(code: string, excludeId?: number): Observable<boolean> {
    let params = new HttpParams().set('code', code);
    if (excludeId) {
      params = params.set('excludeId', excludeId.toString());
    }
    return this.http.get<boolean>(`${this.API_URL}/validate-code`, { params });
  }
}