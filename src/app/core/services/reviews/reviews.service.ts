import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReviewFilters {
  id?: number;
  text?: string;
  reviewStatusId?: number;
  rating?: number;
  accommodationRating?: number;
  activitiesRating?: number;
  destinationRating?: number;
  guideRating?: number;
  priceQualityRating?: number;
  overallTourRating?: number;
  showOnHomePage?: boolean;
  showOnTourPage?: boolean;
  tourId?: number;
  userId?: number;
  departureId?: number;
  externalId?: string;
  reviewDate?: string;
  includeInAverageRating?: boolean;
}

/**
 * Modelo para crear una review.
 */
export interface ReviewCreate {
  text: string;
  reviewStatusId: number;
  rating: number;
  accommodationRating?: number;
  activitiesRating?: number;
  destinationRating?: number;
  guideRating?: number;
  priceQualityRating?: number;
  overallTourRating?: number;
  showOnHomePage?: boolean;
  showOnTourPage?: boolean;
  tourId: number;
  userId: number;
  departureId: number;
  externalId?: string;
  reviewDate?: string;
  includeInAverageRating?: boolean;
}

/**
 * Modelo para actualizar una review existente.
 */
export interface ReviewUpdate {
  text?: string;
  reviewStatusId?: number;
  rating?: number;
  accommodationRating?: number;
  activitiesRating?: number;
  destinationRating?: number;
  guideRating?: number;
  priceQualityRating?: number;
  overallTourRating?: number;
  showOnHomePage?: boolean;
  showOnTourPage?: boolean;
  tourId?: number;
  userId?: number;
  departureId?: number;
  externalId?: string;
  reviewDate?: string;
  includeInAverageRating?: boolean;
}

/**
 * Respuesta del backend para una review.
 */
export interface IReviewResponse {
  id: number;
  text: string;
  reviewStatusId: number;
  rating: number;
  accommodationRating: number;
  activitiesRating: number;
  destinationRating: number;
  guideRating: number;
  priceQualityRating: number;
  overallTourRating: number;
  showOnHomePage: boolean;
  showOnTourPage: boolean;
  tourId: number;
  userId: number;
  departureId: number;
  externalId: string;
  reviewDate: string;
  includeInAverageRating: boolean;
}

/**
 * Interfaz para la respuesta de rating promedio.
 */
export interface AverageRatingResponse {
  averageRating: number;
  totalReviews: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewsService {
  private readonly API_URL = `${environment.reviewsApiUrl}/Review`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las reviews disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de reviews.
   */
  getAll(filter?: ReviewFilters): Observable<IReviewResponse[]> {
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

    return this.http.get<IReviewResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene una review específica por su ID.
   * @param id ID de la review.
   * @returns Review correspondiente.
   */
  getById(id: number): Observable<IReviewResponse> {
    return this.http.get<IReviewResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea una nueva review.
   * @param data Datos de la review a crear.
   * @returns Review creada.
   */
  create(data: ReviewCreate): Observable<IReviewResponse> {
    return this.http.post<IReviewResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza una review existente.
   * @param id ID de la review a actualizar.
   * @param data Datos actualizados.
   * @returns Review actualizada.
   */
  update(id: number, data: ReviewUpdate): Observable<IReviewResponse> {
    return this.http.put<IReviewResponse>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una review por su ID.
   * @param id ID de la review a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene las top N reviews basadas en rating.
   * @param count Número de reviews a obtener.
   * @param filters Filtros adicionales para aplicar.
   * @returns Lista de las mejores reviews.
   */
  getTopReviews(count: number, filters?: ReviewFilters): Observable<IReviewResponse[]> {
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

    return this.http.get<IReviewResponse[]>(`${this.API_URL}/top/${count}`, { params });
  }

  /**
   * Obtiene el conteo total de reviews basado en criterios de filtro.
   * @param filters Filtros para aplicar en el conteo.
   * @returns Número total de reviews.
   */
  getCount(filters?: ReviewFilters): Observable<number> {
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

    return this.http.get<number>(`${this.API_URL}/count`, { params });
  }

  /**
   * Obtiene el rating promedio de reviews basado en criterios de filtro.
   * @param filters Filtros para aplicar en el cálculo.
   * @returns Rating promedio.
   */
  getAverageRating(filters?: ReviewFilters): Observable<AverageRatingResponse> {
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

    return this.http.get<AverageRatingResponse>(`${this.API_URL}/average-rating`, { params });
  }

  /**
   * Obtiene reviews por Tour ID.
   * @param tourId ID del tour.
   * @param additionalFilters Filtros adicionales opcionales.
   * @returns Lista de reviews del tour.
   */
  getByTourId(tourId: number, additionalFilters?: Partial<ReviewFilters>): Observable<IReviewResponse[]> {
    const filters: ReviewFilters = { tourId, ...additionalFilters };
    return this.getAll(filters);
  }

  /**
   * Obtiene reviews por Departure ID.
   * @param departureId ID de la salida.
   * @param additionalFilters Filtros adicionales opcionales.
   * @returns Lista de reviews de la salida.
   */
  getByDepartureId(departureId: number, additionalFilters?: Partial<ReviewFilters>): Observable<IReviewResponse[]> {
    const filters: ReviewFilters = { departureId, ...additionalFilters };
    return this.getAll(filters);
  }

  /**
   * Obtiene reviews por User ID.
   * @param userId ID del viajero.
   * @param additionalFilters Filtros adicionales opcionales.
   * @returns Lista de reviews del viajero.
   */
  getByUserId(userId: number, additionalFilters?: Partial<ReviewFilters>): Observable<IReviewResponse[]> {
    const filters: ReviewFilters = { userId, ...additionalFilters };
    return this.getAll(filters);
  }

  /**
   * Obtiene reviews para mostrar en la página de inicio.
   * @param additionalFilters Filtros adicionales opcionales.
   * @returns Lista de reviews para homepage.
   */
  getForHomePage(additionalFilters?: Partial<ReviewFilters>): Observable<IReviewResponse[]> {
    const filters: ReviewFilters = { showOnHomePage: true, ...additionalFilters };
    return this.getAll(filters);
  }

  /**
   * Obtiene reviews para mostrar en la página del  tour.
   * @param tourId ID del tour (opcional).
   * @param additionalFilters Filtros adicionales opcionales.
   * @returns Lista de reviews para tour page.
   */
  getForTourPage(tourId?: number, additionalFilters?: Partial<ReviewFilters>): Observable<IReviewResponse[]> {
    const filters: ReviewFilters = { 
      showOnTourPage: true, 
      ...(tourId && { tourId }), 
      ...additionalFilters 
    };
    return this.getAll(filters);
  }
}