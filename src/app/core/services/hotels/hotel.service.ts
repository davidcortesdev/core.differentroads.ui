import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz create
 */
export interface HotelCreate {
  code: string;
  name: string;
  description: string;
  stars: string;
  address: string;
  category: number;
  imageUrl: string;
  imageAlt: string;
  phone: string;
  website: string;
  bookingUrl: string;
  bookingRating: number;
  countryLocationId: number;
  cityLocationId: number;
}

/**
 * Interfaz update
 */
export interface HotelUpdate {
  code: string;
  name: string;
  description: string;
  stars: string;
  address: string;
  category: number;
  imageUrl: string;
  imageAlt: string;
  phone: string;
  website: string;
  bookingUrl: string;
  bookingRating: number;
  countryLocationId: number;
  cityLocationId: number;
}

/**
 * Interfaz response
 */
export interface IHotelResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  stars: string;
  address: string;
  category: number;
  imageUrl: string;
  imageAlt: string;
  phone: string;
  website: string;
  bookingUrl: string;
  bookingRating: number;
  countryLocationId: number;
  cityLocationId: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface HotelFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  stars?: string;
  address?: string;
  category?: number;
  imageUrl?: string;
  imageAlt?: string;
  phone?: string;
  website?: string;
  bookingUrl?: string;
  bookingRating?: number;
  countryLocationId?: number;
  cityLocationId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class HotelService {
  private readonly API_URL = `${environment.hotelsApiUrl}/Hotel`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los hoteles según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de hoteles.
   */
  getAll(filters?: HotelFilters): Observable<IHotelResponse[]> {
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

    return this.http.get<IHotelResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo hotel.
   * @param data Datos para crear el hotel.
   * @returns El hotel creado.
   */
  create(data: HotelCreate): Observable<IHotelResponse> {
    return this.http.post<IHotelResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un hotel específico por su ID.
   * @param id ID del hotel.
   * @returns El hotel encontrado.
   */
  getById(id: number): Observable<IHotelResponse> {
    return this.http.get<IHotelResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un hotel existente.
   * @param id ID del hotel a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: HotelUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un hotel existente.
   * @param id ID del hotel a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}