import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TourLocationTypeCreate {
  code: string | null;
  name: string | null;
  description: string | null;
  displayOrder: number;
}

export interface TourLocationTypeUpdate {
  code: string | null;
  name: string | null;
  description: string | null;
  displayOrder: number;
}

export interface ITourLocationTypeResponse {
  id: number;
  code: string | null;
  name: string | null;
  description: string | null;
  displayOrder: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourLocationTypeService {
  private readonly API_URL = `${environment.toursApiUrl}/TourLocationType`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ITourLocationTypeResponse[]> {
    return this.http.get<ITourLocationTypeResponse[]>(this.API_URL);
  }

  getById(id: number): Observable<ITourLocationTypeResponse> {
    return this.http.get<ITourLocationTypeResponse>(`${this.API_URL}/${id}`);
  }

  create(data: TourLocationTypeCreate): Observable<ITourLocationTypeResponse> {
    return this.http.post<ITourLocationTypeResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  update(id: number, data: TourLocationTypeUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}
