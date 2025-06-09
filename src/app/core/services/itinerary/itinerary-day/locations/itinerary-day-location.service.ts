import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams  } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

/**
 * Modelo para crear una relación entre día de itinerario y localización.
 */
export interface ItineraryDayLocationCreate {
  name: string | null;
  description: string | null;
  itineraryDayId: number;
  locationId: number;
  locationTypeId: number;
  displayOrder: number;
}

/**
 * Modelo para actualizar una relación entre día de itinerario y localización.
 */
export interface ItineraryDayLocationUpdate {
  name: string | null;
  description: string | null;
  itineraryDayId: number;
  locationId: number;
  locationTypeId: number;
  displayOrder: number;
}

/**
 * Respuesta del backend para una relación entre día de itinerario y localización.
 */
export interface IItineraryDayLocationResponse {
  id: number;
  name: string | null;
  description: string | null;
  itineraryDayId: number;
  locationId: number;
  locationTypeId: number;
  displayOrder: number;
}

/**
 * Filtros disponibles para consultar relaciones entre días de itinerario y localizaciones.
 */
export interface ItineraryDayLocationFilters {
    id?: number;
    name?: string;
    itineraryDayId?: number;
    locationId?: number;
    locationTypeId?: number;
    displayOrder?: number;
  }
  

@Injectable({
  providedIn: 'root',
})
export class ItineraryDayLocationService {
  private readonly API_URL = `${environment.toursApiUrl}/ItineraryDayLocation`;

  constructor(private http: HttpClient) {}


    /**
      * Obtiene todas las relaciones entre días de itinerario y localizaciones, con opción de aplicar filtros.
      * @param filters Filtros opcionales para la búsqueda.
      */
     getAll(filters?: ItineraryDayLocationFilters): Observable<IItineraryDayLocationResponse[]> {
       let params = new HttpParams();
   
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
   
       return this.http.get<IItineraryDayLocationResponse[]>(this.API_URL, { params });
     }
   

  /**
   * Obtiene una relación específica por su ID.
   * @param id ID de la relación.
   */
  getById(id: number): Observable<IItineraryDayLocationResponse> {
    return this.http.get<IItineraryDayLocationResponse>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * Crea una nueva relación entre día de itinerario y localización.
   * @param data Datos de la relación.
   */
  create(
    data: ItineraryDayLocationCreate
  ): Observable<IItineraryDayLocationResponse> {
    return this.http.post<IItineraryDayLocationResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza una relación existente.
   * @param id ID de la relación.
   * @param data Datos actualizados.
   */
  update(id: number, data: ItineraryDayLocationUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una relación por su ID.
   * @param id ID de la relación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}
