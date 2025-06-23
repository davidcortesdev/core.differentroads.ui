import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DepartureHotelCreate {
  id: number;
  departureId: number;
  itineraryDayId: number;
  hotelId: number;
  notes: string;
  isPrimary: boolean;
}

export interface DepartureHotelUpdate {
  id: number;
  departureId: number;
  itineraryDayId: number;
  hotelId: number;
  notes: string;
  isPrimary: boolean;
}

export interface IDepartureHotelResponse {
  id: number;
  departureId: number;
  itineraryDayId: number;
  hotelId: number;
  notes: string;
  isPrimary: boolean;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DepartureHotelFilters {
  id?: number;
  departureId?: number;
  itineraryDayId?: number;
  hotelId?: number;
  notes?: string;
  isPrimary?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureHotelService {
  private readonly API_URL = `${environment.toursApiUrl}/DepartureHotel`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las asignaciones de hoteles según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de asignaciones de hoteles.
   */
  getAll(filters?: DepartureHotelFilters): Observable<IDepartureHotelResponse[]> {
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

    return this.http.get<IDepartureHotelResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva asignación de hotel.
   * @param data Datos para crear la asignación de hotel.
   * @returns La asignación de hotel creada.
   */
  create(data: DepartureHotelCreate): Observable<IDepartureHotelResponse> {
    return this.http.post<IDepartureHotelResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una asignación de hotel específica por su ID.
   * @param id ID de la asignación de hotel.
   * @returns La asignación de hotel encontrada.
   */
  getById(id: number): Observable<IDepartureHotelResponse> {
    return this.http.get<IDepartureHotelResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una asignación de hotel existente.
   * @param id ID de la asignación de hotel a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: DepartureHotelUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una asignación de hotel existente.
   * @param id ID de la asignación de hotel a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene asignaciones de hoteles por ID de departure.
   * @param departureId ID del departure.
   * @returns Lista de asignaciones de hoteles del departure.
   */
  getByDeparture(departureId: number): Observable<IDepartureHotelResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureHotelResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene asignaciones de hoteles por ID de día de itinerario.
   * @param itineraryDayId ID del día de itinerario.
   * @returns Lista de asignaciones de hoteles del día.
   */
  getByItineraryDay(itineraryDayId: number): Observable<IDepartureHotelResponse[]> {
    const params = new HttpParams()
      .set('ItineraryDayId', itineraryDayId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureHotelResponse[]>(this.API_URL, { params });
  }
}