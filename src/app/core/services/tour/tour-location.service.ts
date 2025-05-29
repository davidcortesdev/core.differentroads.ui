import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TourLocationCreate {
  tourId: number;
  locationId: number;
  tourLocationTypeId: number;
  displayOrder: number;
}

export interface TourLocationUpdate {
  tourId: number;
  locationId: number;
  tourLocationTypeId: number;
  displayOrder: number;
}

export interface ITourLocationResponse {
  id: number;
  tourId: number;
  tourName: string | null;
  locationId: number;
  locationName: string | null;
  tourLocationTypeId: number;
  tourLocationTypeName: string | null;
  displayOrder: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourLocationService {
  private readonly API_URL = `${environment.toursApiUrl}/TourLocation`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ITourLocationResponse[]> {
    return this.http.get<ITourLocationResponse[]>(this.API_URL);
  }

  getById(id: number): Observable<ITourLocationResponse> {
    return this.http.get<ITourLocationResponse>(`${this.API_URL}/${id}`);
  }

  create(data: TourLocationCreate): Observable<ITourLocationResponse> {
    return this.http.post<ITourLocationResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  update(id: number, data: TourLocationUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}
