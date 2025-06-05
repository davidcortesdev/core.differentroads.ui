import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

/**
 * Modelo para crear un tipo de localización de día de itinerario.
 */
export interface ItineraryDayLocationTypeCreate {
  name: string | null;
  description: string | null;
  code: string | null;
  isActive: boolean;
  tkId: string | null;
}

/**
 * Modelo para actualizar un tipo de localización de día de itinerario.
 */
export interface ItineraryDayLocationTypeUpdate {
  name: string | null;
  description: string | null;
  code: string | null;
  isActive: boolean;
  tkId: string | null;
}

/**
 * Respuesta del backend para un tipo de localización de día de itinerario.
 */
export interface IItineraryDayLocationTypeResponse {
  id: number;
  name: string | null;
  description: string | null;
  code: string | null;
  isActive: boolean;
  tkId: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ItineraryDayLocationTypeService {
  private readonly API_URL = `${environment.toursApiUrl}/ItineraryDayLocationType`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de localización de día de itinerario.
   */
  getAll(): Observable<IItineraryDayLocationTypeResponse[]> {
    return this.http.get<IItineraryDayLocationTypeResponse[]>(this.API_URL);
  }

  /**
   * Obtiene un tipo de localización por su ID.
   * @param id ID del tipo de localización.
   */
  getById(id: number): Observable<IItineraryDayLocationTypeResponse> {
    return this.http.get<IItineraryDayLocationTypeResponse>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * Crea un nuevo tipo de localización de día de itinerario.
   * @param data Datos del tipo de localización.
   */
  create(
    data: ItineraryDayLocationTypeCreate
  ): Observable<IItineraryDayLocationTypeResponse> {
    return this.http.post<IItineraryDayLocationTypeResponse>(
      this.API_URL,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Actualiza un tipo de localización existente.
   * @param id ID del tipo de localización.
   * @param data Datos actualizados.
   */
  update(
    id: number,
    data: ItineraryDayLocationTypeUpdate
  ): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un tipo de localización por su ID.
   * @param id ID del tipo de localización.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}
