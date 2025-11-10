import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TripTypeCreate {
  code: string;
  name: string;
  description?: string;
  tkId?: string;
  isActive?: boolean;
  color?: string;
}

export interface TripTypeUpdate {
  code: string;
  name: string;
  description?: string;
  tkId?: string;
  isActive?: boolean;
  color?: string;
}

export interface ITripTypeResponse {
  code: string;
  name: string;
  description: string;
  tkId: string;
  isActive: boolean;
  color: string;
  id: number;
  abbreviation: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TripTypeFilters {
  id?: number;
  tkId?: string;
  code?: string;
  name?: string;
  isActive?: boolean;
  color?: string;
  useExactMatchForStrings?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TripTypeService {
  private readonly API_URL = `${environment.masterdataApiUrl}/TripType`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de viaje según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de tipos de viaje.
   */
  getAll(filters?: TripTypeFilters): Observable<ITripTypeResponse[]> {
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

    return this.http.get<ITripTypeResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo tipo de viaje.
   * @param data Datos para crear el tipo de viaje.
   * @returns El tipo de viaje creado.
   */
  create(data: TripTypeCreate): Observable<ITripTypeResponse> {
    return this.http.post<ITripTypeResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un tipo de viaje específico por su ID.
   * @param id ID del tipo de viaje.
   * @returns El tipo de viaje encontrado.
   */
  getById(id: number): Observable<ITripTypeResponse> {
    return this.http.get<ITripTypeResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un tipo de viaje existente.
   * @param id ID del tipo de viaje a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: TripTypeUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un tipo de viaje existente.
   * @param id ID del tipo de viaje a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene tipos de viaje por código.
   * @param code Código del tipo de viaje.
   * @returns Lista de tipos de viaje que coinciden con el código.
   */
  getByCode(code: string): Observable<ITripTypeResponse[]> {
    const params = new HttpParams()
      .set('Code', code)
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<ITripTypeResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene solo los tipos de viaje activos.
   * @returns Lista de tipos de viaje activos.
   */
  getActiveTripTypes(): Observable<ITripTypeResponse[]> {
    const params = new HttpParams()
      .set('IsActive', 'true')
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<ITripTypeResponse[]>(this.API_URL, { params });
  }
}