import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TourLocationTypeFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  displayOrder?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourLocationTypeService {
  private readonly API_URL = `${environment.toursApiUrl}/TourLocationType`;

  constructor(private http: HttpClient) {}

   /**
   * Obtiene todos los tipos de ubicación de tour disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de tipos de ubicación de tour.
   */
   getAll(filter?: TourLocationTypeFilters): Observable<ITourLocationTypeResponse[]> {
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

    return this.http.get<ITourLocationTypeResponse[]>(this.API_URL, { params });
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
