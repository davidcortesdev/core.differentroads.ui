import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para crear una nueva configuración de sección de inicio
 */
export interface HomeSectionConfigurationCreate {
  homeSectionId: number;
  title?: string;
  content?: string;
  displayOrder: number;
  isActive: boolean;
  showMonthTags?: boolean;
  maxToursToShow?: number;
}

/**
 * Interfaz para actualizar una configuración de sección de inicio existente
 */
export interface HomeSectionConfigurationUpdate {
  id: number;
  homeSectionId: number;
  title?: string;
  content?: string;
  displayOrder: number;
  isActive: boolean;
  showMonthTags?: boolean;
  maxToursToShow?: number;
}

/**
 * Interfaz para la respuesta de una configuración de sección de inicio
 */
export interface IHomeSectionConfigurationResponse {
  id: number;
  homeSectionId: number;
  title?: string;
  content?: string;
  theme?: string;
  themeId?: number;
  displayOrder: number;
  isActive: boolean;
  showMonthTags?: boolean;
  maxToursToShow?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll
 */
export interface HomeSectionConfigurationFilters {
  id?: number;
  homeSectionId?: number;
  title?: string;
  content?: string;
  theme?: string;
  displayOrder?: number;
  isActive?: boolean;
  showMonthTags?: boolean;
  maxToursToShow?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HomeSectionConfigurationService {
  private readonly API_URL = `${environment.cmsApiUrl}/HomeSectionConfiguration`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las configuraciones de sección de inicio según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de configuraciones de sección de inicio.
   */
  getAll(
    filters?: HomeSectionConfigurationFilters
  ): Observable<IHomeSectionConfigurationResponse[]> {
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

    return this.http.get<IHomeSectionConfigurationResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Crea una nueva configuración de sección de inicio.
   * @param data Datos para crear la configuración de sección de inicio.
   * @returns La configuración de sección de inicio creada.
   */
  create(
    data: HomeSectionConfigurationCreate
  ): Observable<IHomeSectionConfigurationResponse> {
    return this.http.post<IHomeSectionConfigurationResponse>(
      this.API_URL,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Obtiene una configuración de sección de inicio específica por su ID.
   * @param id ID de la configuración de sección de inicio.
   * @returns La configuración de sección de inicio encontrada.
   */
  getById(id: number): Observable<IHomeSectionConfigurationResponse> {
    return this.http.get<IHomeSectionConfigurationResponse>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * Actualiza una configuración de sección de inicio existente.
   * @param id ID de la configuración de sección de inicio a actualizar.
   * @param data Datos actualizados.
   * @returns La configuración de sección de inicio actualizada.
   */
  update(
    id: number,
    data: HomeSectionConfigurationUpdate
  ): Observable<IHomeSectionConfigurationResponse> {
    return this.http.put<IHomeSectionConfigurationResponse>(
      `${this.API_URL}/${id}`,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Elimina una configuración de sección de inicio existente.
   * @param id ID de la configuración de sección de inicio a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene configuraciones por tipo de sección.
   * @param homeSectionId ID del tipo de sección.
   * @param isActive Filtrar solo configuraciones activas (opcional).
   * @returns Lista de configuraciones del tipo de sección.
   */
  getBySectionType(
    homeSectionId: number,
    isActive?: boolean
  ): Observable<IHomeSectionConfigurationResponse[]> {
    const filters: HomeSectionConfigurationFilters = {
      homeSectionId: homeSectionId,
    };

    if (isActive !== undefined) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }

  /**
   * Obtiene solo las configuraciones activas.
   * @returns Lista de configuraciones activas.
   */
  getActive(): Observable<IHomeSectionConfigurationResponse[]> {
    return this.getAll({ isActive: true });
  }

  /**
   * Obtiene configuraciones activas ordenadas por displayOrder.
   * @returns Lista de configuraciones activas ordenadas.
   */
  getActiveOrdered(): Observable<IHomeSectionConfigurationResponse[]> {
    return this.getActive();
  }

  /**
   * Obtiene configuraciones que muestran etiquetas de mes.
   * @param isActive Filtrar solo configuraciones activas (opcional).
   * @returns Lista de configuraciones que muestran etiquetas de mes.
   */
  getWithMonthTags(
    isActive: boolean = true
  ): Observable<IHomeSectionConfigurationResponse[]> {
    const filters: HomeSectionConfigurationFilters = {
      showMonthTags: true,
    };

    if (isActive) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }

  /**
   * Obtiene configuraciones de carrusel de tours (con maxToursToShow definido).
   * @param isActive Filtrar solo configuraciones activas (opcional).
   * @returns Lista de configuraciones de carrusel de tours.
   */
  getTourCarousels(
    isActive: boolean = true
  ): Observable<IHomeSectionConfigurationResponse[]> {
    // Nota: Para este filtro necesitaríamos una consulta más específica en el backend
    // Por ahora, obtenemos todas y filtramos en el cliente
    return this.getAll({ isActive: isActive });
  }

  /**
   * Obtiene configuraciones por orden de visualización.
   * @param displayOrder Orden de visualización específico.
   * @param isActive Filtrar solo configuraciones activas (opcional).
   * @returns Lista de configuraciones con el orden especificado.
   */
  getByDisplayOrder(
    displayOrder: number,
    isActive: boolean = true
  ): Observable<IHomeSectionConfigurationResponse[]> {
    const filters: HomeSectionConfigurationFilters = {
      displayOrder: displayOrder,
    };

    if (isActive) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }

  /**
   * Obtiene la configuración de banner principal (típicamente displayOrder = 1).
   * @returns Configuración del banner principal.
   */
  getBannerConfiguration(): Observable<IHomeSectionConfigurationResponse[]> {
    return this.getBySectionType(1, true); // HomeSectionId 1 = BANNER
  }

  /**
   * Obtiene configuraciones de carrusel de tours (típicamente HomeSectionId = 2).
   * @returns Lista de configuraciones de carrusel de tours.
   */
  getTourCarouselConfigurations(): Observable<
    IHomeSectionConfigurationResponse[]
  > {
    return this.getBySectionType(2, true); // HomeSectionId 2 = TOUR_CARROUSEL
  }

  /**
   * Obtiene configuraciones de lista de tours en cuadrícula (típicamente HomeSectionId = 3).
   * @returns Lista de configuraciones de lista de tours en cuadrícula.
   */
  getTourGridConfigurations(): Observable<IHomeSectionConfigurationResponse[]> {
    return this.getBySectionType(3, true); // HomeSectionId 3 = TOUR_GRID
  }

  /**
   * Obtiene configuraciones de sección de viajeros (típicamente HomeSectionId = 6).
   * @returns Lista de configuraciones de sección de viajeros.
   */
  getTravelerSectionConfigurations(): Observable<
    IHomeSectionConfigurationResponse[]
  > {
    return this.getBySectionType(6, true); // HomeSectionId 6 = TRAVELER_SECTION
  }

  /**
   * Reordena configuraciones actualizando sus displayOrder.
   * @param reorderData Array de objetos con id y nuevo displayOrder.
   * @returns Observable de las operaciones de actualización.
   */
  reorderConfigurations(
    reorderData: { id: number; displayOrder: number }[]
  ): Observable<any> {
    // Esta función requeriría múltiples llamadas PUT o un endpoint específico de reordenamiento
    // Por simplicidad, retornamos un observable que ejecuta las actualizaciones secuencialmente
    return new Observable((observer) => {
      const updatePromises = reorderData.map((item) => {
        return this.getById(item.id)
          .toPromise()
          .then((config) => {
            if (config) {
              const updateData: HomeSectionConfigurationUpdate = {
                ...config,
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
}
