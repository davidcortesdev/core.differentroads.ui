import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para crear una nueva sección de inicio
 */
export interface HomeSectionCreate {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  requiresConfiguration: boolean;
}

/**
 * Interfaz para actualizar una sección de inicio existente
 */
export interface HomeSectionUpdate {
  id: number;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  requiresConfiguration: boolean;
}

/**
 * Interfaz para la respuesta de una sección de inicio
 */
export interface IHomeSectionResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  requiresConfiguration: boolean;
}

/**
 * Interfaz para los filtros disponibles en el método getAll
 */
export interface HomeSectionFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  requiresConfiguration?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class HomeSectionService {
  private readonly API_URL = `${environment.cmsApiUrl}/HomeSection`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las secciones de inicio según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de secciones de inicio.
   */
  getAll(filters?: HomeSectionFilters): Observable<IHomeSectionResponse[]> {
    let params = new HttpParams();

    // Agregar parámetros de filtro si se proporcionan
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

    return this.http.get<IHomeSectionResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva sección de inicio.
   * @param data Datos para crear la sección de inicio.
   * @returns La sección de inicio creada.
   */
  create(data: HomeSectionCreate): Observable<IHomeSectionResponse> {
    return this.http.post<IHomeSectionResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una sección de inicio específica por su ID.
   * @param id ID de la sección de inicio.
   * @returns La sección de inicio encontrada.
   */
  getById(id: number): Observable<IHomeSectionResponse> {
    return this.http.get<IHomeSectionResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una sección de inicio existente.
   * @param id ID de la sección de inicio a actualizar.
   * @param data Datos actualizados.
   * @returns La sección de inicio actualizada.
   */
  update(
    id: number,
    data: HomeSectionUpdate
  ): Observable<IHomeSectionResponse> {
    return this.http.put<IHomeSectionResponse>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una sección de inicio existente.
   * @param id ID de la sección de inicio a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene solo las secciones de inicio activas.
   * @returns Lista de secciones de inicio activas.
   */
  getActive(): Observable<IHomeSectionResponse[]> {
    return this.getAll({ isActive: true });
  }

  /**
   * Obtiene solo las secciones que requieren configuración.
   * @returns Lista de secciones que requieren configuración.
   */
  getRequiringConfiguration(): Observable<IHomeSectionResponse[]> {
    return this.getAll({ requiresConfiguration: true });
  }

  /**
   * Obtiene secciones activas que requieren configuración.
   * @returns Lista de secciones activas que requieren configuración.
   */
  getActiveRequiringConfiguration(): Observable<IHomeSectionResponse[]> {
    return this.getAll({ isActive: true, requiresConfiguration: true });
  }
}
