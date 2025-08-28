import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReviewStatusFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

/**
 * Modelo para crear un review status.
 */
export interface ReviewStatusCreate {
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  displayOrder: number;
}

/**
 * Modelo para actualizar un review status existente.
 */
export interface ReviewStatusUpdate {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

/**
 * Respuesta del backend para un review status.
 */
export interface IReviewStatusResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  displayOrder: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewStatusService {
  private readonly API_URL = `${environment.reviewsApiUrl}/ReviewStatus`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los review statuses disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de review statuses.
   */
  getAll(filters?: ReviewStatusFilters): Observable<IReviewStatusResponse[]> {
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

    return this.http.get<IReviewStatusResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un review status específico por su ID.
   * @param id ID del review status.
   * @returns Review status correspondiente.
   */
  getById(id: number): Observable<IReviewStatusResponse> {
    return this.http.get<IReviewStatusResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo review status.
   * @param data Datos del review status a crear.
   * @returns Review status creado.
   */
  create(data: ReviewStatusCreate): Observable<IReviewStatusResponse> {
    return this.http.post<IReviewStatusResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un review status existente.
   * @param id ID del review status a actualizar.
   * @param data Datos actualizados.
   * @returns Review status actualizado.
   */
  update(
    id: number,
    data: ReviewStatusUpdate
  ): Observable<IReviewStatusResponse> {
    return this.http.put<IReviewStatusResponse>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un review status por su ID.
   * @param id ID del review status a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene review statuses activos ordenados por displayOrder.
   * @returns Lista de review statuses activos.
   */
  getActiveStatuses(): Observable<IReviewStatusResponse[]> {
    const filters: ReviewStatusFilters = { isActive: true };
    return this.getAll(filters);
  }

  /**
   * Obtiene un review status por su código.
   * @param code Código del review status.
   * @returns Review status correspondiente.
   */
  getByCode(code: string): Observable<IReviewStatusResponse[]> {
    const filters: ReviewStatusFilters = { code };
    return this.getAll(filters);
  }

  /**
   * Busca review statuses por nombre (búsqueda parcial).
   * @param name Nombre o parte del nombre a buscar.
   * @returns Lista de review statuses que coinciden.
   */
  searchByName(name: string): Observable<IReviewStatusResponse[]> {
    const filters: ReviewStatusFilters = { name };
    return this.getAll(filters);
  }
}
