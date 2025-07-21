import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DepartureCreate {
  id: number;
  code: string;
  tkId: string;
  itineraryId: number;
  isVisibleOnWeb: boolean;
  isBookable: boolean;
  departureDate: string;
  arrivalDate: string;
  departureStatusId: number;
  tripTypeId: number;
}

export interface DepartureUpdate {
  id: number;
  code: string;
  tkId: string;
  itineraryId: number;
  isVisibleOnWeb: boolean;
  isBookable: boolean;
  departureDate: string;
  arrivalDate: string;
  departureStatusId: number;
  tripTypeId: number;
}

export interface IDepartureResponse {
  id: number;
  code?: string | null;
  tkId?: string | null;
  itineraryId: number;
  isVisibleOnWeb: boolean;
  isBookable: boolean;
  departureDate?: string | null;
  arrivalDate?: string | null;
  departureStatusId?: number | null;
  tripTypeId?: number | null;
  isConsolidadorVuelosActive?: boolean;
  includeTourConsolidadorSearchLocations?: boolean;
  maxArrivalDateAtAirport?: string | null;
  maxArrivalTimeAtAirport?: string | null;
  minDepartureDateFromAirport?: string | null;
  minDepartureTimeFromAirport?: string | null;
  arrivalAirportIATA?: string | null;
  departureAirportIATA?: string | null;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DepartureFilters {
  id?: number;
  code?: string;
  tkId?: string;
  itineraryId?: number;
  isVisibleOnWeb?: boolean;
  isBookable?: boolean;
  departureDate?: string;
  arrivalDate?: string;
  departureStatusId?: number;
  tripTypeId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureService {
  private readonly API_URL = `${environment.toursApiUrl}/Departure`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las departures según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de departures.
   */
  getAll(filters?: DepartureFilters): Observable<IDepartureResponse[]> {
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

    return this.http.get<IDepartureResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva departure.
   * @param data Datos para crear la departure.
   * @returns La departure creada.
   */
  create(data: DepartureCreate): Observable<IDepartureResponse> {
    return this.http.post<IDepartureResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene una departure específica por su ID.
   * @param id ID de la departure.
   * @returns La departure encontrada.
   */
  getById(id: number): Observable<IDepartureResponse> {
    return this.http.get<IDepartureResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza una departure existente.
   * @param id ID de la departure a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: DepartureUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una departure existente.
   * @param id ID de la departure a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene departures por ID de itinerario.
   * @param itineraryId ID del itinerario.
   * @returns Lista de departures del itinerario.
   */
  getByItinerary(itineraryId: number): Observable<IDepartureResponse[]> {
    const params = new HttpParams()
      .set('ItineraryId', itineraryId.toString())
      .set('useExactMatchForStrings', 'false');
    
    return this.http.get<IDepartureResponse[]>(this.API_URL, { params });
  }
}