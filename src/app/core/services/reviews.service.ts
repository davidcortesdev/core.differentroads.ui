import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  // Added new properties to match the C# model
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

  constructor(private http: HttpClient) {}

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

    // Add filter parameters if provided
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

    // Add filter parameters if provided
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

    // Add filter parameters if provided
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
  private addFilterParams(params: HttpParams, filter: ReviewFilter): HttpParams {
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Handle arrays (tourIds, travelerIds)
        if (Array.isArray(value)) {
          value.forEach((item) => {
            params = params.append(key, item.toString());
          });
        } else if (value instanceof Date) {
          // Format dates to ISO string
          params = params.set(key, value.toISOString());
        } else {
          params = params.set(key, value.toString());
        }
      }
    });
    return params;
  }
}
