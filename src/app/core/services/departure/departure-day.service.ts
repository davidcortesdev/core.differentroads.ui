import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DepartureDayCreate {
  departureId: number;
  itineraryDayId: number;
  dayNumber: number;
  date: string;
  tkId: string;
  id: number;
}

export interface DepartureDayUpdate {
  departureId: number;
  itineraryDayId: number;
  dayNumber: number;
  date: string;
  tkId: string;
  id: number;
}

export interface IDepartureDayResponse {
  departureId: number;
  itineraryDayId: number;
  dayNumber: number;
  date: string;
  tkId: string;
  id: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DepartureDayFilters {
  departureId?: number;
  itineraryDayId?: number;
  dayNumber?: number;
  date?: string;
  tkId?: string;
  id?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureDayService {
  private readonly API_URL = `${environment.toursApiUrl}/DepartureDay`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los días de salida según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de días de salida.
   */
  getAll(filters?: DepartureDayFilters): Observable<IDepartureDayResponse[]> {
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

    return this.http.get<IDepartureDayResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo día de salida.
   * @param data Datos para crear el día de salida.
   * @returns El día de salida creado.
   */
  create(data: DepartureDayCreate): Observable<IDepartureDayResponse> {
    return this.http.post<IDepartureDayResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un día de salida específico por su ID.
   * @param id ID del día de salida.
   * @returns El día de salida encontrado.
   */
  getById(id: number): Observable<IDepartureDayResponse> {
    return this.http.get<IDepartureDayResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un día de salida existente.
   * @param id ID del día de salida a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: DepartureDayUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un día de salida existente.
   * @param id ID del día de salida a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene días de salida por departureId.
   * @param departureId ID de la salida.
   * @returns Lista de días de salida que coinciden con el departureId.
   */
  getByDepartureId(departureId: number): Observable<IDepartureDayResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('useExactMatchForStrings', 'false');
        
    return this.http.get<IDepartureDayResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene días de salida por itineraryDayId.
   * @param itineraryDayId ID del día del itinerario.
   * @returns Lista de días de salida que coinciden con el itineraryDayId.
   */
  getByItineraryDayId(itineraryDayId: number): Observable<IDepartureDayResponse[]> {
    const params = new HttpParams()
      .set('ItineraryDayId', itineraryDayId.toString())
      .set('useExactMatchForStrings', 'false');
        
    return this.http.get<IDepartureDayResponse[]>(this.API_URL, { params });
  }
}