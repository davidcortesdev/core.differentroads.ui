import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TourSearchParams {
  searchText?: string;
  startDate?: string; // ISO string yyyy-MM-dd or ISO full; backend accepts DateTime
  endDate?: string;
  tripTypeId?: number;
  fuzzyThreshold?: number;
  tagScoreThreshold?: number;
  flexDays?: number; // ±X días de flexibilidad
}

export interface AutocompleteParams {
  searchText: string;
  minScoreThreshold?: number;
  maxResults?: number;
  includeTours?: boolean;
  includeLocations?: boolean;
  includeTags?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TourSearchService {
  private readonly BASE_URL = `${environment.toursApiUrl}/Tour`;

  constructor(private http: HttpClient) {}

  autocomplete(params: AutocompleteParams): Observable<any[]> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<any[]>(`${this.BASE_URL}/autocomplete`, { params: httpParams });
  }

  search(filter: TourSearchParams): Observable<{ tourId: number }[]> {
    let params = new HttpParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<{ tourId: number }[]>(`${this.BASE_URL}/search`, { params });
  }

  searchWithScore(filter: TourSearchParams): Observable<any[]> {
    let params = new HttpParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<any[]>(`${this.BASE_URL}/search-with-score`, { params });
  }
}


