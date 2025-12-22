import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para la respuesta de un tema de sección de inicio
 */
export interface IHomeSectionThemeResponse {
  id: number;
  code: string;
  name?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll
 */
export interface HomeSectionThemeFilters {
  id?: number;
  code?: string;
  name?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HomeSectionThemeService {
  private readonly API_URL = `${environment.cmsApiUrl}/HomeSectionTheme`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los temas de sección de inicio según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de temas de sección de inicio.
   */
  getAll(
    filters?: HomeSectionThemeFilters
  ): Observable<IHomeSectionThemeResponse[]> {
    let params = new HttpParams();

    // Agregar parámetros de filtro si se proporcionan
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

    return this.http.get<IHomeSectionThemeResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene un tema de sección de inicio específico por su ID.
   * @param id ID del tema de sección de inicio.
   * @returns El tema de sección de inicio encontrado.
   */
  getById(id: number): Observable<IHomeSectionThemeResponse> {
    return this.http.get<IHomeSectionThemeResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene un tema por su código.
   * @param code Código del tema (ej: "DARK", "LIGHT").
   * @returns El tema encontrado.
   */
  getByCode(code: string): Observable<IHomeSectionThemeResponse[]> {
    return this.getAll({ code });
  }
}

