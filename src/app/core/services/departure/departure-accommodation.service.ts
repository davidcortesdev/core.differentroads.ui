import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DepartureAccommodationCreate {
  name: string;
  description: string;
  id: number;
  tkId: string;
  departureId: number;
  accommodationTypeId: number;
  capacity: number;
  notes: string;
}

export interface DepartureAccommodationUpdate {
  name: string;
  description: string;
  id: number;
  tkId: string;
  departureId: number;
  accommodationTypeId: number;
  capacity: number;
  notes: string;
}

export interface IDepartureAccommodationResponse {
  name: string;
  description: string;
  id: number;
  tkId: string;
  departureId: number;
  accommodationTypeId: number;
  capacity: number;
  notes: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DepartureAccommodationFilters {
  name?: string;
  description?: string;
  id?: number;
  tkId?: string;
  departureId?: number;
  accommodationTypeId?: number;
  capacity?: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureAccommodationService {
  private readonly API_URL = `${environment.toursApiUrl}/DepartureAccommodation`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las accommodation de departures según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de departure accommodations.
   */
  getAll(filters?: DepartureAccommodationFilters): Observable<IDepartureAccommodationResponse[]> {
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

    return this.http.get<IDepartureAccommodationResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva departure accommodation.
   * @param data Datos para crear la departure accommodation.
   * @returns La departure accommodation creada.
   */
  create(data: DepartureAccommodationCreate): Observable<IDepartureAccommodationResponse> {
    return this.http.post<IDepartureAccommodationResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una departure accommodation específica por su ID.
   * @param id ID de la departure accommodation.
   * @returns La departure accommodation encontrada.
   */
  getById(id: number): Observable<IDepartureAccommodationResponse> {
    return this.http.get<IDepartureAccommodationResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una departure accommodation existente.
   * @param id ID de la departure accommodation a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: DepartureAccommodationUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una departure accommodation existente.
   * @param id ID de la departure accommodation a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene departure accommodations por ID de departure.
   * @param departureId ID del departure.
   * @returns Lista de accommodations del departure.
   */
  getByDeparture(departureId: number): Observable<IDepartureAccommodationResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureAccommodationResponse[]>(this.API_URL, { params });
  }
}