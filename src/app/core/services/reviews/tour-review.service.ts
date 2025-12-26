import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TourReviewFilters {
  id?: number | number[];
  tourId?: number | number[];
  reviewTypeId?: number | number[];
  minRating?: number;
  maxRating?: number;
  reviewCount?: number | number[];
  isActive?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  useExactMatchForStrings?: boolean;
}

/**
 * Respuesta del backend para un tour review.
 * Contiene la media ya calculada de las reviews y el contador.
 */
export interface ITourReviewResponse {
  id: number;
  tourId: number;
  reviewTypeId: number;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interfaz para la respuesta de rating promedio.
 */
export interface TourReviewAverageRatingResponse {
  averageRating: number;
  totalReviews: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourReviewService {
  private readonly API_URL = `${environment.reviewsApiUrl}/TourReview`;
  // Cache para evitar llamadas duplicadas: key = "tourId-reviewTypeId-isActive"
  private averageRatingCache = new Map<string, Observable<TourReviewAverageRatingResponse>>();

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las tour reviews disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de tour reviews.
   */
  getAll(filters?: TourReviewFilters, signal?: AbortSignal): Observable<ITourReviewResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const paramName = key.charAt(0).toUpperCase() + key.slice(1);
          
          // Handle array parameters (TourId, ReviewTypeId, ReviewCount, Id)
          if (Array.isArray(value)) {
            value.forEach((item) => {
              params = params.append(paramName, item.toString());
            });
          } else {
            params = params.set(paramName, value.toString());
          }
        }
      });
    }

    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = { params };
    
    if (signal) {
      options.signal = signal;
    }

    return this.http.get<ITourReviewResponse[]>(this.API_URL, options);
  }

  /**
   * Obtiene una tour review específica por su ID.
   * @param id ID de la tour review.
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Tour review correspondiente.
   */
  getById(id: number, signal?: AbortSignal): Observable<ITourReviewResponse> {
    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = {};
    
    if (signal) {
      options.signal = signal;
    }

    return this.http.get<ITourReviewResponse>(`${this.API_URL}/${id}`, options);
  }

  /**
   * Obtiene el conteo total de tour reviews basado en criterios de filtro.
   * @param filters Filtros para aplicar en el conteo.
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Número total de tour reviews.
   */
  getCount(filters?: TourReviewFilters, signal?: AbortSignal): Observable<number> {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const paramName = key.charAt(0).toUpperCase() + key.slice(1);
          
          // Handle array parameters
          if (Array.isArray(value)) {
            value.forEach((item) => {
              params = params.append(paramName, item.toString());
            });
          } else {
            params = params.set(paramName, value.toString());
          }
        }
      });
    }

    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = { params };
    
    if (signal) {
      options.signal = signal;
    }

    return this.http.get<number>(`${this.API_URL}/count`, options);
  }

  /**
   * Obtiene el rating promedio y el conteo de reviews desde TourReview.
   * TourReview ya contiene la media calculada, solo necesitamos obtenerla.
   * Usa cache compartido para evitar llamadas duplicadas.
   * @param filters Filtros para aplicar (debe incluir tourId y reviewTypeId).
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Rating promedio y conteo de reviews.
   */
  getAverageRating(filters?: TourReviewFilters, signal?: AbortSignal): Observable<TourReviewAverageRatingResponse> {
    if (!filters || !filters.tourId) {
      return of({ averageRating: 0, totalReviews: 0 });
    }

    // Crear clave única para el cache
    const tourId = Array.isArray(filters.tourId) ? filters.tourId[0] : filters.tourId;
    const reviewTypeId = Array.isArray(filters.reviewTypeId) ? filters.reviewTypeId[0] : (filters.reviewTypeId || 1);
    const isActive = filters.isActive !== undefined ? filters.isActive : true;
    const cacheKey = `${tourId}-${reviewTypeId}-${isActive}`;

    // Si ya existe en cache, retornar el observable cacheado
    if (this.averageRatingCache.has(cacheKey)) {
      return this.averageRatingCache.get(cacheKey)!;
    }

    // Crear nuevo observable y cachearlo
    const ratingObservable = this.getAll(filters, signal).pipe(
      map((reviews) => {
        if (reviews.length === 0) {
          return {
            averageRating: 0,
            totalReviews: 0
          };
        }

        // TourReview ya contiene la media calculada en el campo rating
        // y el conteo en reviewCount. Tomamos el primer resultado.
        const review = reviews[0];
        return {
          averageRating: review.rating || 0,
          totalReviews: review.reviewCount || 0
        };
      }),
      shareReplay(1) // Compartir el resultado entre múltiples suscriptores
    );

    // Guardar en cache
    this.averageRatingCache.set(cacheKey, ratingObservable);

    return ratingObservable;
  }

  /**
   * Obtiene tour reviews por Tour ID.
   * @param tourId ID del tour.
   * @param additionalFilters Filtros adicionales opcionales.
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de tour reviews del tour.
   */
  getByTourId(tourId: number, additionalFilters?: Partial<TourReviewFilters>, signal?: AbortSignal): Observable<ITourReviewResponse[]> {
    const filters: TourReviewFilters = { tourId, ...additionalFilters };
    return this.getAll(filters, signal);
  }
}

