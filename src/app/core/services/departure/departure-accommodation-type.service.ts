import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DepartureAccommodationTypeCreate {
  id: number;
  code: string;
  name: string;
  description: string;
  isShared: boolean;
  isSameSexOnly: boolean;
}

export interface DepartureAccommodationTypeUpdate {
  id: number;
  code: string;
  name: string;
  description: string;
  isShared: boolean;
  isSameSexOnly: boolean;
}

export interface IDepartureAccommodationTypeResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  isShared: boolean;
  isSameSexOnly: boolean;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DepartureAccommodationTypeFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  isShared?: boolean;
  isSameSexOnly?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureAccommodationTypeService {
  private readonly API_URL = `${environment.toursApiUrl}/DepartureAccommodationType`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de alojamiento según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de tipos de alojamiento.
   */
  getAll(filters?: DepartureAccommodationTypeFilters): Observable<IDepartureAccommodationTypeResponse[]> {
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

    return this.http.get<IDepartureAccommodationTypeResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo tipo de alojamiento.
   * @param data Datos para crear el tipo de alojamiento.
   * @returns El tipo de alojamiento creado.
   */
  create(data: DepartureAccommodationTypeCreate): Observable<IDepartureAccommodationTypeResponse> {
    return this.http.post<IDepartureAccommodationTypeResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un tipo de alojamiento específico por su ID.
   * @param id ID del tipo de alojamiento.
   * @returns El tipo de alojamiento encontrado.
   */
  getById(id: number): Observable<IDepartureAccommodationTypeResponse> {
    return this.http.get<IDepartureAccommodationTypeResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un tipo de alojamiento existente.
   * @param id ID del tipo de alojamiento a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: DepartureAccommodationTypeUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un tipo de alojamiento existente.
   * @param id ID del tipo de alojamiento a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene tipos de alojamiento por código.
   * @param code Código del tipo de alojamiento.
   * @returns Lista de tipos de alojamiento que coinciden con el código.
   */
  getByCode(code: string): Observable<IDepartureAccommodationTypeResponse[]> {
    const params = new HttpParams()
      .set('Code', code)
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureAccommodationTypeResponse[]>(this.API_URL, { params });
  }
}