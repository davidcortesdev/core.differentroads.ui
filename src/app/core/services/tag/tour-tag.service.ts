import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TourTagCreate {
  tourId: number;
  tagId: number;
  tourTagRelationTypeId: number;
  displayOrder?: number;
}

export interface TourTagUpdate {
  tourId: number;
  tagId: number;
  tourTagRelationTypeId: number;
  displayOrder?: number;
}

export interface ITourTagResponse {
  id: number;
  tourId: number;
  tagId: number;
  tourTagRelationTypeId: number;
  displayOrder: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TourTagFilters {
  id?: number;
  tourId?: number;
  tagId?: number;
  tourTagRelationTypeId?: number;
  displayOrder?: number;
}

/**
 * Interfaz para la respuesta de tours por tipo de etiqueta.
 */
export interface ToursByTagTypeResponse {
  id: number;
  name: string;
  description?: string;
  tagTypeId: number;
  tagTypeName: string;
  tourCount: number;
  tours?: TourSummary[];
}

/**
 * Interfaz para resumen de tour.
 */
export interface TourSummary {
  id: number;
  name: string;
  code?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TourTagService {
  private readonly API_URL = `${environment.toursApiUrl}/TourTag`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las relaciones entre tours y etiquetas según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de relaciones tour-etiqueta.
   */
  getAll(filters?: TourTagFilters): Observable<ITourTagResponse[]> {
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

    return this.http.get<ITourTagResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva relación entre tour y etiqueta.
   * @param data Datos para crear la relación.
   * @returns La relación creada.
   */
  create(data: TourTagCreate): Observable<ITourTagResponse> {
    return this.http.post<ITourTagResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una relación específica por su ID.
   * @param id ID de la relación.
   * @returns La relación encontrada.
   */
  getById(id: number): Observable<ITourTagResponse> {
    return this.http.get<ITourTagResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una relación existente.
   * @param id ID de la relación a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: TourTagUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una relación existente.
   * @param id ID de la relación a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene relaciones tour-etiqueta por ID del tour y código de tipo de relación.
   * @param tourId ID del tour.
   * @param typeCode Código de tipo de relación.
   * @returns Lista de relaciones que coinciden con los criterios.
   */
  getByTourAndType(
    tourId: number,
    typeCode: string
  ): Observable<ITourTagResponse[]> {
    return this.http.get<ITourTagResponse[]>(
      `${this.API_URL}/bytourandtype/${tourId}/${typeCode}`
    );
  }

  /**
   * Obtiene todos los tours relacionados con etiquetas de un tipo específico.
   * @param tagTypeId ID del tipo de etiqueta.
   * @returns Lista de tours agrupados por etiquetas del tipo especificado.
   */
  getToursByTagType(tagTypeId: number): Observable<ToursByTagTypeResponse[]> {
    return this.http.get<ToursByTagTypeResponse[]>(
      `${this.API_URL}/tours-by-tagtype/${tagTypeId}`
    );
  }

  /**
   * Obtiene todos los IDs de tours relacionados con una o más etiquetas específicas.
   * @param tagIds Lista de IDs de etiquetas
   * @returns Lista de IDs de tours
   */
  getToursByTags(tagIds: number[]): Observable<number[]> {
    let params = new HttpParams();
    
    // Agregar cada tagId como parámetro de consulta
    tagIds.forEach(id => {
      params = params.append('tagIds', id.toString());
    });

    return this.http.get<number[]>(`${this.API_URL}/tours-by-tags`, { params });
  }
}
