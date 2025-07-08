import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DepartureActivityCreate {
  id: number;
  departureId: number;
  activityId: number;
}

export interface DepartureActivityUpdate {
  id: number;
  departureId: number;
  activityId: number;
}

export interface IDepartureActivityResponse {
  id: number;
  departureId: number;
  activityId: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DepartureActivityFilters {
  id?: number;
  departureId?: number;
  activityId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureActivityService {
  private readonly API_URL = `${environment.toursApiUrl}/DepartureActivity`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las departure activities según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de departure activities.
   */
  getAll(filters?: DepartureActivityFilters): Observable<IDepartureActivityResponse[]> {
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

    return this.http.get<IDepartureActivityResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva departure activity.
   * @param data Datos para crear la departure activity.
   * @returns La departure activity creada.
   */
  create(data: DepartureActivityCreate): Observable<IDepartureActivityResponse> {
    return this.http.post<IDepartureActivityResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una departure activity específica por su ID.
   * @param id ID de la departure activity.
   * @returns La departure activity encontrada.
   */
  getById(id: number): Observable<IDepartureActivityResponse> {
    return this.http.get<IDepartureActivityResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una departure activity existente.
   * @param id ID de la departure activity a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: DepartureActivityUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una departure activity existente.
   * @param id ID de la departure activity a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene departure activities por ID de departure.
   * @param departureId ID del departure.
   * @returns Lista de departure activities del departure.
   */
  getByDeparture(departureId: number): Observable<IDepartureActivityResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureActivityResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene departure activities por ID de activity.
   * @param activityId ID de la activity.
   * @returns Lista de departure activities de la activity.
   */
  getByActivity(activityId: number): Observable<IDepartureActivityResponse[]> {
    const params = new HttpParams()
      .set('ActivityId', activityId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureActivityResponse[]>(this.API_URL, { params });
  }
}