import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReviewTypeFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  isGoogleRating?: boolean;
  displayOrder?: number;
  showInReviewsPage?: boolean;
  useExactMatchForStrings?: boolean;
}

/**
 * Respuesta del backend para un review type.
 */
export interface IReviewTypeResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  tkId: string | null;
  isActive: boolean;
  isGoogleRating: boolean;
  displayOrder: number;
  showInReviewsPage: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewTypeService {
  private readonly API_URL = `${environment.reviewsApiUrl}/ReviewType`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los review types disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Lista de review types.
   */
  getAll(filters?: ReviewTypeFilters, signal?: AbortSignal): Observable<IReviewTypeResponse[]> {
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

    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = { params };
    
    if (signal) {
      options.signal = signal;
    }

    return this.http.get<IReviewTypeResponse[]>(this.API_URL, options);
  }

  /**
   * Obtiene un review type específico por su ID.
   * @param id ID del review type.
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Review type correspondiente.
   */
  getById(id: number, signal?: AbortSignal): Observable<IReviewTypeResponse> {
    const options: {
      params?: HttpParams | { [param: string]: any };
      signal?: AbortSignal;
    } = {};
    
    if (signal) {
      options.signal = signal;
    }

    return this.http.get<IReviewTypeResponse>(`${this.API_URL}/${id}`, options);
  }

  /**
   * Obtiene un review type por su código.
   * @param code Código del review type (ej: "GENERAL").
   * @param signal Signal de cancelación opcional para abortar la petición HTTP.
   * @returns Review type correspondiente o null si no se encuentra.
   */
  getByCode(code: string, signal?: AbortSignal): Observable<IReviewTypeResponse | null> {
    const filters: ReviewTypeFilters = { 
      code,
      useExactMatchForStrings: true 
    };
    
    return this.getAll(filters, signal).pipe(
      map((types) => {
        const found = types.find((type) => type.code === code);
        return found || null;
      })
    );
  }
}

