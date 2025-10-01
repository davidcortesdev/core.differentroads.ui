import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TourLocationFilters {
  id?: number;
  tourId?: number;
  tourName?: string;
  locationId?: number;
  locationName?: string;
  tourLocationTypeId?: number;
  tourLocationTypeName?: string;
  displayOrder?: number;
}

/**
 * Interfaz para la respuesta de países con tours por continente.
 */
export interface CountryWithToursResponse {
  id: number;
  name: string;
  code: string;
  continentId: number;
  continentName: string;
  tourCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourLocationService {
  private readonly API_URL = `${environment.toursApiUrl}/TourLocation`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las relaciones tour-localización disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de relaciones tour-localización.
   */
  getAll(filter?: TourLocationFilters): Observable<ITourLocationResponse[]> {
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

    return this.http.get<ITourLocationResponse[]>(this.API_URL, { params });
  }

  getById(id: number): Observable<ITourLocationResponse> {
    return this.http.get<ITourLocationResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene relaciones tour-localización por ID del tour y código de tipo de relación.
   * @param tourId ID del tour
   * @param typeCode Código del tipo de relación
   * @returns Lista de relaciones tour-localización
   */
  getByTourAndType(
    tourId: number,
    typeCode: string
  ): Observable<ITourLocationResponse> {
    return this.http.get<ITourLocationResponse>(
      `${this.API_URL}/bytourandtype/${tourId}/${typeCode}`
    );
  }

  /**
   * Obtiene todos los países relacionados con tours a partir del ID de un continente.
   * @param continentId ID del continente
   * @returns Lista de países con tours
   */
  getCountriesWithToursByContinent(
    continentId: number
  ): Observable<CountryWithToursResponse[]> {
    return this.http.get<CountryWithToursResponse[]>(
      `${this.API_URL}/countries-with-tours/${continentId}`
    );
  }

  /**
   * Obtiene todos los IDs de tours relacionados con una o más ubicaciones específicas.
   * @param locationIds Lista de IDs de ubicaciones (países, continentes, etc.)
   * @returns Lista de IDs de tours
   */
  getToursByLocations(locationIds: number[]): Observable<number[]> {
    let params = new HttpParams();
    
    // Agregar cada locationId como parámetro de consulta
    locationIds.forEach(id => {
      params = params.append('locationIds', id.toString());
    });

    return this.http.get<number[]>(`${this.API_URL}/tours-by-locations`, { params });
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
