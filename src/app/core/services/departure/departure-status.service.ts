import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DepartureStatusCreate {
  name: string;
  description: string;
  id: number;
  code: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
}

export interface DepartureStatusUpdate {
  name: string;
  description: string;
  id: number;
  code: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
}

export interface IDepartureStatusResponse {
  name: string;
  description: string;
  id: number;
  code: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DepartureStatusFilters {
  name?: string;
  description?: string;
  id?: number;
  code?: string;
  color?: string;
  displayOrder?: number;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureStatusService {
  private readonly API_URL = `${environment.toursApiUrl}/DepartureStatus`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los estados de departure según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de estados de departure.
   */
  getAll(filters?: DepartureStatusFilters): Observable<IDepartureStatusResponse[]> {
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

    return this.http.get<IDepartureStatusResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo estado de departure.
   * @param data Datos para crear el estado de departure.
   * @returns El estado de departure creado.
   */
  create(data: DepartureStatusCreate): Observable<IDepartureStatusResponse> {
    return this.http.post<IDepartureStatusResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un estado de departure específico por su ID.
   * @param id ID del estado de departure.
   * @returns El estado de departure encontrado.
   */
  getById(id: number): Observable<IDepartureStatusResponse> {
    return this.http.get<IDepartureStatusResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un estado de departure existente.
   * @param id ID del estado de departure a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: DepartureStatusUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un estado de departure existente.
   * @param id ID del estado de departure a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene estados de departure por código.
   * @param code Código del estado de departure.
   * @returns Lista de estados de departure que coinciden con el código.
   */
  getByCode(code: string): Observable<IDepartureStatusResponse[]> {
    const params = new HttpParams()
      .set('Code', code)
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureStatusResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene solo los estados activos.
   * @returns Lista de estados de departure activos.
   */
  getActiveStatuses(): Observable<IDepartureStatusResponse[]> {
    const params = new HttpParams()
      .set('IsActive', 'true')
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureStatusResponse[]>(this.API_URL, { params });
  }
}