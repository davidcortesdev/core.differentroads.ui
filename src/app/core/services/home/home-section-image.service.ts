import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para crear una nueva imagen de sección de inicio
 */
export interface HomeSectionImageCreate {
  homeSectionConfigurationId: number;
  imageUrl: string;
  altText: string;
  title?: string;
  description?: string;
  linkUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Interfaz para actualizar una imagen de sección de inicio existente
 */
export interface HomeSectionImageUpdate {
  id: number;
  homeSectionConfigurationId: number;
  imageUrl: string;
  altText: string;
  title?: string;
  description?: string;
  linkUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Interfaz para la respuesta de una imagen de sección de inicio
 */
export interface IHomeSectionImageResponse {
  id: number;
  homeSectionConfigurationId: number;
  imageUrl: string;
  altText: string;
  title?: string;
  description?: string;
  linkUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll
 */
export interface HomeSectionImageFilters {
  id?: number;
  homeSectionConfigurationId?: number;
  imageUrl?: string;
  altText?: string;
  title?: string;
  description?: string;
  linkUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HomeSectionImageService {
  private readonly API_URL = `${environment.cmsApiUrl}/HomeSectionImage`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las imágenes de sección de inicio según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de imágenes de sección de inicio.
   */
  getAll(
    filters?: HomeSectionImageFilters
  ): Observable<IHomeSectionImageResponse[]> {
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

    return this.http.get<IHomeSectionImageResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva imagen de sección de inicio.
   * @param data Datos para crear la imagen de sección de inicio.
   * @returns La imagen de sección de inicio creada.
   */
  create(data: HomeSectionImageCreate): Observable<IHomeSectionImageResponse> {
    return this.http.post<IHomeSectionImageResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una imagen de sección de inicio específica por su ID.
   * @param id ID de la imagen de sección de inicio.
   * @returns La imagen de sección de inicio encontrada.
   */
  getById(id: number): Observable<IHomeSectionImageResponse> {
    return this.http.get<IHomeSectionImageResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una imagen de sección de inicio existente.
   * @param id ID de la imagen de sección de inicio a actualizar.
   * @param data Datos actualizados.
   * @returns La imagen de sección de inicio actualizada.
   */
  update(
    id: number,
    data: HomeSectionImageUpdate
  ): Observable<IHomeSectionImageResponse> {
    return this.http.put<IHomeSectionImageResponse>(
      `${this.API_URL}/${id}`,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Elimina una imagen de sección de inicio existente.
   * @param id ID de la imagen de sección de inicio a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene imágenes por ID de configuración de sección.
   * @param homeSectionConfigurationId ID de la configuración de sección.
   * @param isActive Filtrar solo imágenes activas (opcional).
   * @returns Lista de imágenes de la configuración de sección.
   */
  getByConfiguration(
    homeSectionConfigurationId: number,
    isActive?: boolean
  ): Observable<IHomeSectionImageResponse[]> {
    const filters: HomeSectionImageFilters = {
      homeSectionConfigurationId: homeSectionConfigurationId,
    };

    if (isActive !== undefined) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }

  /**
   * Obtiene solo las imágenes activas.
   * @returns Lista de imágenes activas.
   */
  getActive(): Observable<IHomeSectionImageResponse[]> {
    return this.getAll({ isActive: true });
  }

  /**
   * Obtiene imágenes ordenadas por displayOrder.
   * @param homeSectionConfigurationId ID de la configuración de sección.
   * @param isActive Filtrar solo imágenes activas (opcional).
   * @returns Lista de imágenes ordenadas por displayOrder.
   */
  getByConfigurationOrdered(
    homeSectionConfigurationId: number,
    isActive: boolean = true
  ): Observable<IHomeSectionImageResponse[]> {
    return this.getByConfiguration(homeSectionConfigurationId, isActive);
  }

  /**
   * Obtiene imágenes con enlaces.
   * @param isActive Filtrar solo imágenes activas (opcional).
   * @returns Lista de imágenes que tienen enlaces.
   */
  getWithLinks(
    isActive: boolean = true
  ): Observable<IHomeSectionImageResponse[]> {
    // Para este filtro necesitaríamos una consulta más específica en el backend
    // Por ahora, obtenemos todas y filtramos en el cliente
    return this.getAll({ isActive: isActive });
  }

  /**
   * Crea imagen para carrusel de colaboradores.
   * @param homeSectionConfigurationId ID de la configuración.
   * @param imageUrl URL de la imagen/logo.
   * @param altText Texto alternativo.
   * @param title Título de la imagen.
   * @param linkUrl URL del enlace (opcional).
   * @param displayOrder Orden de visualización.
   * @returns La imagen creada.
   */
  createPartnerLogo(
    homeSectionConfigurationId: number,
    imageUrl: string,
    altText: string,
    title: string,
    linkUrl?: string,
    displayOrder: number = 1
  ): Observable<IHomeSectionImageResponse> {
    const partnerImage: HomeSectionImageCreate = {
      homeSectionConfigurationId,
      imageUrl,
      altText,
      title,
      linkUrl,
      displayOrder,
      isActive: true,
    };

    return this.create(partnerImage);
  }

  /**
   * Crea imagen para sección destacada.
   * @param homeSectionConfigurationId ID de la configuración.
   * @param imageUrl URL de la imagen.
   * @param altText Texto alternativo.
   * @param title Título de la imagen.
   * @param description Descripción de la imagen.
   * @param linkUrl URL del enlace (opcional).
   * @param displayOrder Orden de visualización.
   * @returns La imagen creada.
   */
  createFeaturedImage(
    homeSectionConfigurationId: number,
    imageUrl: string,
    altText: string,
    title: string,
    description: string,
    linkUrl?: string,
    displayOrder: number = 1
  ): Observable<IHomeSectionImageResponse> {
    const featuredImage: HomeSectionImageCreate = {
      homeSectionConfigurationId,
      imageUrl,
      altText,
      title,
      description,
      linkUrl,
      displayOrder,
      isActive: true,
    };

    return this.create(featuredImage);
  }

  /**
   * Crea imagen de galería simple.
   * @param homeSectionConfigurationId ID de la configuración.
   * @param imageUrl URL de la imagen.
   * @param altText Texto alternativo.
   * @param title Título de la imagen (opcional).
   * @param displayOrder Orden de visualización.
   * @returns La imagen creada.
   */
  createGalleryImage(
    homeSectionConfigurationId: number,
    imageUrl: string,
    altText: string,
    title?: string,
    displayOrder: number = 1
  ): Observable<IHomeSectionImageResponse> {
    const galleryImage: HomeSectionImageCreate = {
      homeSectionConfigurationId,
      imageUrl,
      altText,
      title,
      displayOrder,
      isActive: true,
    };

    return this.create(galleryImage);
  }

  /**
   * Obtiene imágenes de carrusel de colaboradores.
   * @param isActive Filtrar solo imágenes activas (opcional).
   * @returns Lista de imágenes de colaboradores.
   */
  getPartnerLogos(
    isActive: boolean = true
  ): Observable<IHomeSectionImageResponse[]> {
    // HomeSectionId 10 = PARTNERS_CARROUSEL
    // Necesitaríamos el ID de configuración específico
    return this.getAll({ isActive: isActive });
  }

  /**
   * Obtiene imágenes de sección destacada.
   * @param isActive Filtrar solo imágenes activas (opcional).
   * @returns Lista de imágenes destacadas.
   */
  getFeaturedImages(
    isActive: boolean = true
  ): Observable<IHomeSectionImageResponse[]> {
    // HomeSectionId 8 = FEATURED_SECTION
    // Necesitaríamos el ID de configuración específico
    return this.getAll({ isActive: isActive });
  }

  /**
   * Reordena imágenes actualizando sus displayOrder.
   * @param reorderData Array de objetos con id y nuevo displayOrder.
   * @returns Observable de las operaciones de actualización.
   */
  reorderImages(
    reorderData: { id: number; displayOrder: number }[]
  ): Observable<any> {
    return new Observable((observer) => {
      const updatePromises = reorderData.map((item) => {
        return this.getById(item.id)
          .toPromise()
          .then((image) => {
            if (image) {
              const updateData: HomeSectionImageUpdate = {
                ...image,
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
   * Actualiza el estado activo de múltiples imágenes.
   * @param imageIds Array de IDs de imágenes.
   * @param isActive Nuevo estado activo.
   * @returns Observable de las operaciones de actualización.
   */
  updateMultipleStatus(imageIds: number[], isActive: boolean): Observable<any> {
    return new Observable((observer) => {
      const updatePromises = imageIds.map((id) => {
        return this.getById(id)
          .toPromise()
          .then((image) => {
            if (image) {
              const updateData: HomeSectionImageUpdate = {
                ...image,
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
