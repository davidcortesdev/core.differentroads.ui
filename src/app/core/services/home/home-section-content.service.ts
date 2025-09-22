import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Enum para los tipos de contenido disponibles
 */
export enum ContentType {
  IMAGE = 'image',
  VIDEO = 'video',
  TEXT = 'text',
  LINK = 'link',
}

/**
 * Interfaz para crear un nuevo contenido de sección de inicio
 */
export interface HomeSectionContentCreate {
  homeSectionConfigurationId: number;
  contentType: string;
  contentUrl?: string;
  altText?: string;
  title?: string;
  textContent?: string;
  linkUrl?: string;
  buttonText?: string;
  displayOrder: number;
  isActive: boolean;
  additionalConfiguration?: string;
}

/**
 * Interfaz para actualizar un contenido de sección de inicio existente
 */
export interface HomeSectionContentUpdate {
  id: number;
  homeSectionConfigurationId: number;
  contentType: string;
  contentUrl?: string;
  altText?: string;
  title?: string;
  textContent?: string;
  linkUrl?: string;
  buttonText?: string;
  displayOrder: number;
  isActive: boolean;
  additionalConfiguration?: string;
}

/**
 * Interfaz para la respuesta de un contenido de sección de inicio
 */
export interface IHomeSectionContentResponse {
  id: number;
  homeSectionConfigurationId: number;
  contentType: string;
  contentUrl?: string;
  altText?: string;
  title?: string;
  textContent?: string;
  linkUrl?: string;
  buttonText?: string;
  displayOrder: number;
  isActive: boolean;
  additionalConfiguration?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll
 */
export interface HomeSectionContentFilters {
  id?: number;
  homeSectionConfigurationId?: number;
  contentType?: string;
  contentUrl?: string;
  title?: string;
  textContent?: string;
  linkUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HomeSectionContentService {
  private readonly API_URL = `${environment.cmsApiUrl}/HomeSectionContent`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los contenidos de sección de inicio según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de contenidos de sección de inicio.
   */
  getAll(
    filters?: HomeSectionContentFilters
  ): Observable<IHomeSectionContentResponse[]> {
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

    return this.http.get<IHomeSectionContentResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Crea un nuevo contenido de sección de inicio.
   * @param data Datos para crear el contenido de sección de inicio.
   * @returns El contenido de sección de inicio creado.
   */
  create(
    data: HomeSectionContentCreate
  ): Observable<IHomeSectionContentResponse> {
    return this.http.post<IHomeSectionContentResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un contenido de sección de inicio específico por su ID.
   * @param id ID del contenido de sección de inicio.
   * @returns El contenido de sección de inicio encontrado.
   */
  getById(id: number): Observable<IHomeSectionContentResponse> {
    return this.http.get<IHomeSectionContentResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un contenido de sección de inicio existente.
   * @param id ID del contenido de sección de inicio a actualizar.
   * @param data Datos actualizados.
   * @returns El contenido de sección de inicio actualizado.
   */
  update(
    id: number,
    data: HomeSectionContentUpdate
  ): Observable<IHomeSectionContentResponse> {
    return this.http.put<IHomeSectionContentResponse>(
      `${this.API_URL}/${id}`,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Elimina un contenido de sección de inicio existente.
   * @param id ID del contenido de sección de inicio a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene contenidos por ID de configuración de sección.
   * @param homeSectionConfigurationId ID de la configuración de sección.
   * @param isActive Filtrar solo contenidos activos (opcional).
   * @returns Lista de contenidos de la configuración de sección.
   */
  getByConfiguration(
    homeSectionConfigurationId: number,
    isActive?: boolean
  ): Observable<IHomeSectionContentResponse[]> {
    const filters: HomeSectionContentFilters = {
      homeSectionConfigurationId: homeSectionConfigurationId,
    };

    if (isActive !== undefined) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }

  /**
   * Obtiene solo los contenidos activos.
   * @returns Lista de contenidos activos.
   */
  getActive(): Observable<IHomeSectionContentResponse[]> {
    return this.getAll({ isActive: true });
  }

  /**
   * Obtiene contenidos por tipo.
   * @param contentType Tipo de contenido (image, video, text, link).
   * @param isActive Filtrar solo contenidos activos (opcional).
   * @returns Lista de contenidos del tipo especificado.
   */
  getByContentType(
    contentType: string,
    isActive: boolean = true
  ): Observable<IHomeSectionContentResponse[]> {
    const filters: HomeSectionContentFilters = {
      contentType: contentType,
    };

    if (isActive) {
      filters.isActive = isActive;
    }

    return this.getAll(filters);
  }

  /**
   * Obtiene contenidos de imagen.
   * @param isActive Filtrar solo contenidos activos (opcional).
   * @returns Lista de contenidos de imagen.
   */
  getImages(
    isActive: boolean = true
  ): Observable<IHomeSectionContentResponse[]> {
    return this.getByContentType(ContentType.IMAGE, isActive);
  }

  /**
   * Obtiene contenidos de video.
   * @param isActive Filtrar solo contenidos activos (opcional).
   * @returns Lista de contenidos de video.
   */
  getVideos(
    isActive: boolean = true
  ): Observable<IHomeSectionContentResponse[]> {
    return this.getByContentType(ContentType.VIDEO, isActive);
  }

  /**
   * Obtiene contenidos de texto.
   * @param isActive Filtrar solo contenidos activos (opcional).
   * @returns Lista de contenidos de texto.
   */
  getTexts(
    isActive: boolean = true
  ): Observable<IHomeSectionContentResponse[]> {
    return this.getByContentType(ContentType.TEXT, isActive);
  }

  /**
   * Obtiene contenidos de enlace.
   * @param isActive Filtrar solo contenidos activos (opcional).
   * @returns Lista de contenidos de enlace.
   */
  getLinks(
    isActive: boolean = true
  ): Observable<IHomeSectionContentResponse[]> {
    return this.getByContentType(ContentType.LINK, isActive);
  }

  /**
   * Obtiene contenidos ordenados por displayOrder.
   * @param homeSectionConfigurationId ID de la configuración de sección.
   * @param isActive Filtrar solo contenidos activos (opcional).
   * @returns Lista de contenidos ordenados por displayOrder.
   */
  getByConfigurationOrdered(
    homeSectionConfigurationId: number,
    isActive: boolean = true
  ): Observable<IHomeSectionContentResponse[]> {
    return this.getByConfiguration(homeSectionConfigurationId, isActive);
  }

  /**
   * Crea contenido de imagen para banner.
   * @param homeSectionConfigurationId ID de la configuración.
   * @param imageUrl URL de la imagen.
   * @param title Título del banner.
   * @param altText Texto alternativo.
   * @param displayOrder Orden de visualización.
   * @returns El contenido de imagen creado.
   */
  createBannerImage(
    homeSectionConfigurationId: number,
    imageUrl: string,
    title: string,
    altText: string,
    displayOrder: number = 1
  ): Observable<IHomeSectionContentResponse> {
    const bannerContent: HomeSectionContentCreate = {
      homeSectionConfigurationId,
      contentType: ContentType.IMAGE,
      contentUrl: imageUrl,
      altText,
      title,
      displayOrder,
      isActive: true,
    };

    return this.create(bannerContent);
  }

  /**
   * Crea contenido de video para banner.
   * @param homeSectionConfigurationId ID de la configuración.
   * @param videoUrl URL del video.
   * @param title Título del banner.
   * @param altText Texto alternativo.
   * @param displayOrder Orden de visualización.
   * @returns El contenido de video creado.
   */
  createBannerVideo(
    homeSectionConfigurationId: number,
    videoUrl: string,
    title: string,
    altText: string,
    displayOrder: number = 1
  ): Observable<IHomeSectionContentResponse> {
    const bannerContent: HomeSectionContentCreate = {
      homeSectionConfigurationId,
      contentType: ContentType.VIDEO,
      contentUrl: videoUrl,
      altText,
      title,
      displayOrder,
      isActive: true,
    };

    return this.create(bannerContent);
  }

  /**
   * Crea contenido de texto.
   * @param homeSectionConfigurationId ID de la configuración.
   * @param textContent Contenido del texto.
   * @param title Título del contenido.
   * @param displayOrder Orden de visualización.
   * @returns El contenido de texto creado.
   */
  createTextContent(
    homeSectionConfigurationId: number,
    textContent: string,
    title: string,
    displayOrder: number = 1
  ): Observable<IHomeSectionContentResponse> {
    const content: HomeSectionContentCreate = {
      homeSectionConfigurationId,
      contentType: ContentType.TEXT,
      textContent,
      title,
      displayOrder,
      isActive: true,
    };

    return this.create(content);
  }

  /**
   * Crea contenido de enlace con botón.
   * @param homeSectionConfigurationId ID de la configuración.
   * @param linkUrl URL del enlace.
   * @param buttonText Texto del botón.
   * @param title Título del enlace.
   * @param displayOrder Orden de visualización.
   * @returns El contenido de enlace creado.
   */
  createLinkContent(
    homeSectionConfigurationId: number,
    linkUrl: string,
    buttonText: string,
    title: string,
    displayOrder: number = 1
  ): Observable<IHomeSectionContentResponse> {
    const content: HomeSectionContentCreate = {
      homeSectionConfigurationId,
      contentType: ContentType.LINK,
      linkUrl,
      buttonText,
      title,
      displayOrder,
      isActive: true,
    };

    return this.create(content);
  }

  /**
   * Reordena contenidos actualizando sus displayOrder.
   * @param reorderData Array de objetos con id y nuevo displayOrder.
   * @returns Observable de las operaciones de actualización.
   */
  reorderContents(
    reorderData: { id: number; displayOrder: number }[]
  ): Observable<any> {
    return new Observable((observer) => {
      const updatePromises = reorderData.map((item) => {
        return this.getById(item.id)
          .toPromise()
          .then((content) => {
            if (content) {
              const updateData: HomeSectionContentUpdate = {
                ...content,
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
