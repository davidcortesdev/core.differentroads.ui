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
   * @returns Lista de review types.
   */
  getAll(filters?: ReviewTypeFilters): Observable<IReviewTypeResponse[]> {
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

    return this.http.get<IReviewTypeResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un review type específico por su ID.
   * @param id ID del review type.
   * @returns Review type correspondiente.
   */
  getById(id: number): Observable<IReviewTypeResponse> {
    return this.http.get<IReviewTypeResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene un review type por su código.
   * @param code Código del review type (ej: "GENERAL").
   * @returns Review type correspondiente o null si no se encuentra.
   */
  getByCode(code: string): Observable<IReviewTypeResponse | null> {
    const filters: ReviewTypeFilters = { 
      code,
      useExactMatchForStrings: true 
    };
    
    return this.getAll(filters).pipe(
      map((types) => {
        const found = types.find((type) => type.code === code);
        return found || null;
      })
    );
  }
}

