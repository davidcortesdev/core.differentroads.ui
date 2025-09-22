import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para crear una nueva card de sección de inicio
 */
export interface HomeSectionCardCreate {
  homeSectionConfigurationId: number;
  imageUrl: string;
  imageAlt: string;
  title: string;
  content: string;
  linkUrl?: string;
  buttonText?: string;
  location?: string;
  imageSource?: string;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Interfaz para actualizar una card de sección de inicio existente
 */
export interface HomeSectionCardUpdate {
  id: number;
  homeSectionConfigurationId: number;
  imageUrl: string;
  imageAlt: string;
  title: string;
  content: string;
  linkUrl?: string;
  buttonText?: string;
  location?: string;
  imageSource?: string;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Interfaz para la respuesta de una card de sección de inicio
 */
export interface IHomeSectionCardResponse {
  id: number;
  homeSectionConfigurationId: number;
  imageUrl: string;
  imageAlt: string;
  title: string;
  content: string;
  linkUrl?: string;
  buttonText?: string;
  location?: string;
  imageSource?: string;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll
 */
export interface HomeSectionCardFilters {
  id?: number;
  homeSectionConfigurationId?: number;
  title?: string;
  content?: string;
  linkUrl?: string;
  location?: string;
  imageSource?: string;
  isFeatured?: boolean;
  displayOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HomeSectionCardService {
  private readonly API_URL = `${environment.cmsApiUrl}/HomeSectionCard`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las cards de sección de inicio según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de cards de sección de inicio.
   */
  getAll(
    filters?: HomeSectionCardFilters
  ): Observable<IHomeSectionCardResponse[]> {
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

    return this.http.get<IHomeSectionCardResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva card de sección de inicio.
   * @param data Datos para crear la card de sección de inicio.
   * @returns La card de sección de inicio creada.
   */
  create(data: HomeSectionCardCreate): Observable<IHomeSectionCardResponse> {
    return this.http.post<IHomeSectionCardResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una card de sección de inicio específica por su ID.
   * @param id ID de la card de sección de inicio.
   * @returns La card de sección de inicio encontrada.
   */
  getById(id: number): Observable<IHomeSectionCardResponse> {
    return this.http.get<IHomeSectionCardResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una card de sección de inicio existente.
   * @param id ID de la card de sección de inicio a actualizar.
   * @param data Datos actualizados.
   * @returns La card de sección de inicio actualizada.
   */
  update(
    id: number,
    data: HomeSectionCardUpdate
  ): Observable<IHomeSectionCardResponse> {
    return this.http.put<IHomeSectionCardResponse>(
      `${this.API_URL}/${id}`,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Elimina una card de sección de inicio existente.
   * @param id ID de la card de sección de inicio a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene cards por ID de configuración de sección.
   * @param homeSectionConfigurationId ID de la configuración de sección.
   * @param isActive Filtrar solo cards activas (opcional).
   * @returns Lista de cards de la configuración de sección.
   */
  getByConfiguration(
    homeSectionConfigurationId: number,
    isActive?: boolean
  ): Observable<IHomeSectionCardResponse[]> {
    const filters: HomeSectionCardFilters = {
      homeSectionConfigurationId: homeSectionConfigurationId,
    };

    if (isActive !== undefined) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }

  /**
   * Obtiene solo las cards activas.
   * @returns Lista de cards activas.
   */
  getActive(): Observable<IHomeSectionCardResponse[]> {
    return this.getAll({ isActive: true });
  }

  /**
   * Obtiene solo las cards destacadas.
   * @returns Lista de cards destacadas.
   */
  getFeatured(): Observable<IHomeSectionCardResponse[]> {
    return this.getAll({ isFeatured: true });
  }

  /**
   * Obtiene cards destacadas activas.
   * @returns Lista de cards destacadas activas.
   */
  getActiveFeatured(): Observable<IHomeSectionCardResponse[]> {
    return this.getAll({ isActive: true, isFeatured: true });
  }

  /**
   * Obtiene cards ordenadas por displayOrder.
   * @param homeSectionConfigurationId ID de la configuración de sección.
   * @param isActive Filtrar solo cards activas (opcional).
   * @returns Lista de cards ordenadas por displayOrder.
   */
  getByConfigurationOrdered(
    homeSectionConfigurationId: number,
    isActive: boolean = true
  ): Observable<IHomeSectionCardResponse[]> {
    return this.getByConfiguration(homeSectionConfigurationId, isActive);
  }

  /**
   * Obtiene cards por ubicación.
   * @param location Ubicación a filtrar.
   * @param isActive Filtrar solo cards activas (opcional).
   * @returns Lista de cards de la ubicación especificada.
   */
  getByLocation(
    location: string,
    isActive: boolean = true
  ): Observable<IHomeSectionCardResponse[]> {
    const filters: HomeSectionCardFilters = {
      location: location,
    };

    if (isActive) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }
}
