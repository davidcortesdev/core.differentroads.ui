import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TourReviewFilters {
  id?: number;
  tourId?: number;
  reviewTypeId?: number;
  minRating?: number;
  maxRating?: number;
  isActive?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  useExactMatchForStrings?: boolean;
}

/**
 * Respuesta del backend para un tour review.
 */
export interface ITourReviewResponse {
  id: number;
  tourId: number;
  reviewTypeId: number;
  rating: number;
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

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las tour reviews disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de tour reviews.
   */
  getAll(filters?: TourReviewFilters): Observable<ITourReviewResponse[]> {
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

    return this.http.get<ITourReviewResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene una tour review específica por su ID.
   * @param id ID de la tour review.
   * @returns Tour review correspondiente.
   */
  getById(id: number): Observable<ITourReviewResponse> {
    return this.http.get<ITourReviewResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene el conteo total de tour reviews basado en criterios de filtro.
   * @param filters Filtros para aplicar en el conteo.
   * @returns Número total de tour reviews.
   */
  getCount(filters?: TourReviewFilters): Observable<number> {
    let params = new HttpParams();

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
   * Obtiene el rating promedio de tour reviews basado en criterios de filtro.
   * Calcula el promedio desde los resultados de getAll usando el campo rating.
   * @param filters Filtros para aplicar en el cálculo.
   * @returns Rating promedio.
   */
  getAverageRating(filters?: TourReviewFilters): Observable<TourReviewAverageRatingResponse> {
    // Obtener todas las tour reviews que cumplen los filtros
    return this.getAll(filters).pipe(
      map((reviews) => {
        if (reviews.length === 0) {
          return {
            averageRating: 0,
            totalReviews: 0
          };
        }

        // Calcular el promedio desde el campo rating de cada review
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;

        return {
          averageRating: Math.round(averageRating * 10) / 10, // Redondear a 1 decimal
          totalReviews: reviews.length
        };
      })
    );
  }

  /**
   * Obtiene tour reviews por Tour ID.
   * @param tourId ID del tour.
   * @param additionalFilters Filtros adicionales opcionales.
   * @returns Lista de tour reviews del tour.
   */
  getByTourId(tourId: number, additionalFilters?: Partial<TourReviewFilters>): Observable<ITourReviewResponse[]> {
    const filters: TourReviewFilters = { tourId, ...additionalFilters };
    return this.getAll(filters);
  }
}

