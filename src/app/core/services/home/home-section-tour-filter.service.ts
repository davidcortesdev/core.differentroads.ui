import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Enum para los tipos de filtro de tours disponibles
 */
export enum TourFilterType {
  TAG = 'tag',
  LOCATION = 'location',
  SPECIFIC_TOURS = 'specific_tours',
}

/**
 * Interfaz para crear un nuevo filtro de tours de sección de inicio
 */
export interface HomeSectionTourFilterCreate {
  homeSectionConfigurationId: number;
  filterType: string;
  tagId?: number;
  locationId?: number;
  specificTourIds?: string;
  viewMoreButtonText?: string;
  viewMoreButtonUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Interfaz para actualizar un filtro de tours de sección de inicio existente
 */
export interface HomeSectionTourFilterUpdate {
  id: number;
  homeSectionConfigurationId: number;
  filterType: string;
  tagId?: number;
  locationId?: number;
  specificTourIds?: string;
  viewMoreButtonText?: string;
  viewMoreButtonUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Interfaz para la respuesta de un filtro de tours de sección de inicio
 */
export interface IHomeSectionTourFilterResponse {
  id: number;
  homeSectionConfigurationId: number;
  filterType: string;
  tagId?: number;
  locationId?: number;
  specificTourIds?: string;
  viewMoreButtonText?: string;
  viewMoreButtonUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Interfaz para los filtros disponibles en el método getAll
 */
export interface HomeSectionTourFilterFilters {
  id?: number;
  homeSectionConfigurationId?: number;
  filterType?: string;
  tagId?: number;
  locationId?: number;
  viewMoreButtonText?: string;
  viewMoreButtonUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * Interfaz para simplificar la creación de filtros específicos
 */
export interface TourFilterData {
  homeSectionConfigurationId: number;
  viewMoreButtonText?: string;
  viewMoreButtonUrl?: string;
  displayOrder: number;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class HomeSectionTourFilterService {
  private readonly API_URL = `${environment.cmsApiUrl}/HomeSectionTourFilter`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los filtros de tours de sección de inicio según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de filtros de tours de sección de inicio.
   */
  getAll(
    filters?: HomeSectionTourFilterFilters
  ): Observable<IHomeSectionTourFilterResponse[]> {
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

    return this.http.get<IHomeSectionTourFilterResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Crea un nuevo filtro de tours de sección de inicio.
   * @param data Datos para crear el filtro de tours de sección de inicio.
   * @returns El filtro de tours de sección de inicio creado.
   */
  create(
    data: HomeSectionTourFilterCreate
  ): Observable<IHomeSectionTourFilterResponse> {
    return this.http.post<IHomeSectionTourFilterResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un filtro de tours de sección de inicio específico por su ID.
   * @param id ID del filtro de tours de sección de inicio.
   * @returns El filtro de tours de sección de inicio encontrado.
   */
  getById(id: number): Observable<IHomeSectionTourFilterResponse> {
    return this.http.get<IHomeSectionTourFilterResponse>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * Actualiza un filtro de tours de sección de inicio existente.
   * @param id ID del filtro de tours de sección de inicio a actualizar.
   * @param data Datos actualizados.
   * @returns El filtro de tours de sección de inicio actualizado.
   */
  update(
    id: number,
    data: HomeSectionTourFilterUpdate
  ): Observable<IHomeSectionTourFilterResponse> {
    return this.http.put<IHomeSectionTourFilterResponse>(
      `${this.API_URL}/${id}`,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Elimina un filtro de tours de sección de inicio existente.
   * @param id ID del filtro de tours de sección de inicio a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene filtros por ID de configuración de sección.
   * @param homeSectionConfigurationId ID de la configuración de sección.
   * @param isActive Filtrar solo filtros activos (opcional).
   * @returns Lista de filtros de la configuración de sección.
   */
  getByConfiguration(
    homeSectionConfigurationId: number,
    isActive?: boolean
  ): Observable<IHomeSectionTourFilterResponse[]> {
    const filters: HomeSectionTourFilterFilters = {
      homeSectionConfigurationId: homeSectionConfigurationId,
    };

    if (isActive !== undefined) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }

  /**
   * Obtiene solo los filtros activos.
   * @returns Lista de filtros activos.
   */
  getActive(): Observable<IHomeSectionTourFilterResponse[]> {
    return this.getAll({ isActive: true });
  }

  /**
   * Obtiene filtros por tipo.
   * @param filterType Tipo de filtro (tag, location, specific_tours).
   * @param isActive Filtrar solo filtros activos (opcional).
   * @returns Lista de filtros del tipo especificado.
   */
  getByFilterType(
    filterType: string,
    isActive: boolean = true
  ): Observable<IHomeSectionTourFilterResponse[]> {
    const filters: HomeSectionTourFilterFilters = {
      filterType: filterType,
    };

    if (isActive) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }

  /**
   * Obtiene filtros ordenados por displayOrder.
   * @param homeSectionConfigurationId ID de la configuración de sección.
   * @param isActive Filtrar solo filtros activos (opcional).
   * @returns Lista de filtros ordenados por displayOrder.
   */
  getByConfigurationOrdered(
    homeSectionConfigurationId: number,
    isActive: boolean = true
  ): Observable<IHomeSectionTourFilterResponse[]> {
    return this.getByConfiguration(homeSectionConfigurationId, isActive);
  }

  /**
   * Crea filtro por tag.
   * @param data Datos base del filtro.
   * @param tagId ID del tag a filtrar.
   * @returns El filtro por tag creado.
   */
  createTagFilter(
    data: TourFilterData,
    tagId: number
  ): Observable<IHomeSectionTourFilterResponse> {
    const tagFilter: HomeSectionTourFilterCreate = {
      ...data,
      filterType: TourFilterType.TAG,
      tagId: tagId,
      isActive: data.isActive ?? true,
    };

    return this.create(tagFilter);
  }

  /**
   * Crea filtro por localización.
   * @param data Datos base del filtro.
   * @param locationId ID de la localización a filtrar.
   * @returns El filtro por localización creado.
   */
  createLocationFilter(
    data: TourFilterData,
    locationId: number
  ): Observable<IHomeSectionTourFilterResponse> {
    const locationFilter: HomeSectionTourFilterCreate = {
      ...data,
      filterType: TourFilterType.LOCATION,
      locationId: locationId,
      isActive: data.isActive ?? true,
    };

    return this.create(locationFilter);
  }

  /**
   * Crea filtro por tours específicos.
   * @param data Datos base del filtro.
   * @param tourIds Array de IDs de tours específicos.
   * @returns El filtro por tours específicos creado.
   */
  createSpecificToursFilter(
    data: TourFilterData,
    tourIds: number[]
  ): Observable<IHomeSectionTourFilterResponse> {
    const specificToursFilter: HomeSectionTourFilterCreate = {
      ...data,
      filterType: TourFilterType.SPECIFIC_TOURS,
      specificTourIds: JSON.stringify(tourIds),
      isActive: data.isActive ?? true,
    };

    return this.create(specificToursFilter);
  }

  /**
   * Obtiene filtros por tag.
   * @param isActive Filtrar solo filtros activos (opcional).
   * @returns Lista de filtros por tag.
   */
  getTagFilters(
    isActive: boolean = true
  ): Observable<IHomeSectionTourFilterResponse[]> {
    return this.getByFilterType(TourFilterType.TAG, isActive);
  }

  /**
   * Obtiene filtros por localización.
   * @param isActive Filtrar solo filtros activos (opcional).
   * @returns Lista de filtros por localización.
   */
  getLocationFilters(
    isActive: boolean = true
  ): Observable<IHomeSectionTourFilterResponse[]> {
    return this.getByFilterType(TourFilterType.LOCATION, isActive);
  }

  /**
   * Obtiene filtros por tours específicos.
   * @param isActive Filtrar solo filtros activos (opcional).
   * @returns Lista de filtros por tours específicos.
   */
  getSpecificToursFilters(
    isActive: boolean = true
  ): Observable<IHomeSectionTourFilterResponse[]> {
    return this.getByFilterType(TourFilterType.SPECIFIC_TOURS, isActive);
  }

  /**
   * Obtiene filtros por tag específico.
   * @param tagId ID del tag.
   * @param isActive Filtrar solo filtros activos (opcional).
   * @returns Lista de filtros del tag especificado.
   */
  getByTagId(
    tagId: number,
    isActive: boolean = true
  ): Observable<IHomeSectionTourFilterResponse[]> {
    const filters: HomeSectionTourFilterFilters = {
      tagId: tagId,
    };

    if (isActive) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }

  /**
   * Obtiene filtros por localización específica.
   * @param locationId ID de la localización.
   * @param isActive Filtrar solo filtros activos (opcional).
   * @returns Lista de filtros de la localización especificada.
   */
  getByLocationId(
    locationId: number,
    isActive: boolean = true
  ): Observable<IHomeSectionTourFilterResponse[]> {
    const filters: HomeSectionTourFilterFilters = {
      locationId: locationId,
    };

    if (isActive) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }

  /**
   * Parsea los IDs de tours específicos desde string JSON.
   * @param specificTourIds String JSON con los IDs de tours.
   * @returns Array de IDs de tours o array vacío si hay error.
   */
  parseSpecificTourIds(specificTourIds?: string): number[] {
    if (!specificTourIds) return [];

    try {
      return JSON.parse(specificTourIds);
    } catch (error) {
      return [];
    }
  }

  /**
   * Reordena filtros actualizando sus displayOrder.
   * @param reorderData Array de objetos con id y nuevo displayOrder.
   * @returns Observable de las operaciones de actualización.
   */
  reorderFilters(
    reorderData: { id: number; displayOrder: number }[]
  ): Observable<any> {
    return new Observable((observer) => {
      const updatePromises = reorderData.map((item) => {
        return this.getById(item.id)
          .toPromise()
          .then((filter) => {
            if (filter) {
              const updateData: HomeSectionTourFilterUpdate = {
                ...filter,
                displayOrder: item.displayOrder,
              };
              return this.update(item.id, updateData).toPromise();
            }
            return null;
          });
      });

      Promise.all(updatePromises)
        .then((results) => {
          observer.next(results);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  /**
   * Actualiza el estado activo de múltiples filtros.
   * @param filterIds Array de IDs de filtros.
   * @param isActive Nuevo estado activo.
   * @returns Observable de las operaciones de actualización.
   */
  updateMultipleStatus(
    filterIds: number[],
    isActive: boolean
  ): Observable<any> {
    return new Observable((observer) => {
      const updatePromises = filterIds.map((id) => {
        return this.getById(id)
          .toPromise()
          .then((filter) => {
            if (filter) {
              const updateData: HomeSectionTourFilterUpdate = {
                ...filter,
                isActive: isActive,
              };
              return this.update(id, updateData).toPromise();
            }
            return null;
          });
      });

      Promise.all(updatePromises)
        .then((results) => {
          observer.next(results);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }
}
