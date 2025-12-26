import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ICMSTourResponse {
  id: number;
  tourId: string;
  imageUrl?: string;
  imageAlt?: string;
  creatorId?: number;
  creatorComments?: string;
}

export interface CMSTourCreate {
  tourId: string;
  imageUrl?: string;
  imageAlt?: string;
  creatorId?: number;
  creatorComments?: string;
}

export interface CMSTourUpdate {
  tourId: string;
  imageUrl?: string;
  imageAlt?: string;
  creatorId?: number;
  creatorComments?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CMSTourService {
  private readonly API_URL = `${environment.toursApiUrl}/TourCMS`;

  constructor(private http: HttpClient) {}

  getAllTours(params?: {
    id?: number;
    tourId?: number;
    imageUrl?: string;
    imageAlt?: string;
    creatorId?: number;
    creatorComments?: string;
  }, signal?: AbortSignal): Observable<ICMSTourResponse[]> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.id !== undefined)
        httpParams = httpParams.set('Id', params.id.toString());
      if (params.tourId) httpParams = httpParams.set('tourId', params.tourId);
      if (params.imageUrl) httpParams = httpParams.set('imageUrl', params.imageUrl);
      if (params.imageAlt) httpParams = httpParams.set('imageAlt', params.imageAlt);
      if (params.creatorId) httpParams = httpParams.set('creatorId', params.creatorId);
      if (params.creatorComments) httpParams = httpParams.set('creatorComments', params.creatorComments);
    }

    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = { params: httpParams };
    
    if (signal) {
      options.signal = signal;
    }

    return this.http.get<ICMSTourResponse[]>(this.API_URL, options);
  }

  getTourById(id: number, signal?: AbortSignal): Observable<ICMSTourResponse> {
    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = {};
    
    if (signal) {
      options.signal = signal;
    }

    return this.http.get<ICMSTourResponse>(`${this.API_URL}/${id}`, options);
  }

  createTour(tourData: CMSTourCreate): Observable<ICMSTourResponse> {
    return this.http.post<ICMSTourResponse>(this.API_URL, tourData);
  }

  updateTour(id: number, tourData: CMSTourUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, tourData);
  }

  deleteTour(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}
