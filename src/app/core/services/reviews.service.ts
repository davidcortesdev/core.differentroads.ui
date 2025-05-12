import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PeriodsService } from './periods.service';
import { Period } from '../models/tours/period.model';

export interface ReviewFilter {
  id?: number;
  tourId?: number;
  travelerId?: number;
  departureId?: number;
  minRating?: number;
  maxRating?: number;
  showOnHomePage?: boolean;
  showOnTourPage?: boolean;
  externalId?: string;
  textContains?: string;
  createdFrom?: Date | string;
  createdTo?: Date | string;
  tourIds?: number[];
  travelerIds?: number[];
  reviewDate?: Date | string;
  status?: string;
}

export interface Review {
  id: number;
  tourId: number;
  travelerId: number;
  departureId?: number;
  rating: number;
  title: string;
  text: string;
  showOnHomePage: boolean;
  showOnTourPage: boolean;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
  travelerName: string;
  tourName?: string;
  reviewDate: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewsService {
  private readonly API_URL = `${environment.reviewsApiUrl}/Review`;

  constructor(
    private http: HttpClient,
    private periodsService: PeriodsService
  ) {}

  /**
   * Get reviews with optional filters
   * @param filter Optional filter criteria
   * @returns Observable of Review array
   */
  getReviews(filter?: ReviewFilter): Observable<Review[]> {
    let params = new HttpParams();

    if (filter) {
      params = this.addFilterParams(params, filter);
    }
    return this.http.get<Review[]>(`${this.API_URL}`, { params });
  }

  /**
   * Get reviews by period external ID
   * @param externalId External ID of the period
   * @returns Observable of Review array with period information
   */
  getReviewsByPeriodExternalId(externalId: string): Observable<Review[]> {
    return this.periodsService.getPeriodDetail(externalId).pipe(
      tap(period => console.log('Periodo obtenido:', period)), 
      switchMap((period: Period) => {
        if (!period) {
          return of([]);
        }
      
        const filter: ReviewFilter = {
          externalId: externalId
        };
        
        return this.getReviews(filter).pipe(
          tap(reviews => console.log('Reseñas obtenidas:', reviews)), 
          map(reviews => {
            return reviews.map(review => ({
              ...review,
              tourName: period.tourName, 
              reviewDate: period.dayOne, 
              
              travelerName: review.travelerName || 'Viajero Anónimo'
            }));
          })
        );
      })
    );
  }

  /**
   * Get top reviews with optional filters
   * @param count Number of reviews to retrieve
   * @param filter Optional filter criteria
   * @returns Observable of Review array
   */
  getTopReviews(
    count: number = 5,
    filter?: ReviewFilter
  ): Observable<Review[]> {
    let params = new HttpParams();
    if (filter) {
      params = this.addFilterParams(params, filter);
    }
    return this.http.get<Review[]>(`${this.API_URL}/top/${count}`, { params });
  }

  /**
   * Get the count of reviews with optional filters
   * @param filter Optional filter criteria
   * @returns Observable of the review count
   */
  getReviewCount(filter?: ReviewFilter): Observable<number> {
    let params = new HttpParams();

    if (filter) {
      params = this.addFilterParams(params, filter);
    }

    return this.http.get<number>(`${this.API_URL}/count`, { params });
  }

  /**
   * Get the average rating of reviews with optional filters
   * @param filter Optional filter criteria
   * @returns Observable of the average rating
   */
  getAverageRating(filter?: ReviewFilter): Observable<number> {
    let params = new HttpParams();

    if (filter) {
      params = this.addFilterParams(params, filter);
    }

    return this.http.get<number>(`${this.API_URL}/average-rating`, { params });
  }

  /**
   * Helper method to add filter parameters to HttpParams
   * @param params Initial HttpParams object
   * @param filter Filter criteria
   * @returns HttpParams with filter parameters added
   */
  private addFilterParams(
    params: HttpParams,
    filter: ReviewFilter
  ): HttpParams {
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            params = params.append(key, item.toString());
          });
        } else if (value instanceof Date) {
          params = params.set(key, value.toISOString());
        } else {
          params = params.set(key, value.toString());
        }
      }
    });
    return params;
  }

  /**
   * Save a new review
   * @param review Review data to save
   * @returns Observable of the saved review or response
   */
  saveReview(review: any): Observable<any> {
    // Crear una copia del objeto para no modificar el original
    const reviewToSend = { ...review };
    
    // Eliminar la transformación de tourId a tour_id
    // No hacer ninguna transformación, mantener tourId como está
    
    console.log('Review a guardar (con tourId):', reviewToSend);
    
    return this.http.post<any>(`${this.API_URL}`, reviewToSend, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain',
      },
    });
  }
}
