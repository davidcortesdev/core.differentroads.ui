import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

/**
 * Modelo para crear un día de itinerario.
 */
export interface ItineraryDayCreate {
  name: string | null;
  description: string | null;
  itineraryId: number;
  dayNumber: number;
}

/**
 * Modelo para actualizar un día de itinerario.
 */
export interface ItineraryDayUpdate {
  name: string | null;
  description: string | null;
  itineraryId: number;
  dayNumber: number;
}

/**
 * Respuesta del backend para un día de itinerario.
 */
export interface IItineraryDayResponse {
  id: number;
  name: string | null;
  description: string | null;
  itineraryId: number;
  dayNumber: number;
}

@Injectable({
  providedIn: 'root',
})
export class ItineraryDayService {
  private readonly API_URL = `${environment.toursApiUrl}/ItineraryDay`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los días de itinerario.
   * @returns Lista de días de itinerario.
   */
  getAll(): Observable<IItineraryDayResponse[]> {
    return this.http.get<IItineraryDayResponse[]>(this.API_URL);
  }

  /**
   * Obtiene un día de itinerario por su ID.
   * @param id ID del día de itinerario.
   * @returns Día de itinerario correspondiente.
   */
  getById(id: number): Observable<IItineraryDayResponse> {
    return this.http.get<IItineraryDayResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo día de itinerario.
   * @param data Datos del día de itinerario a crear.
   * @returns Día de itinerario creado.
   */
  create(data: ItineraryDayCreate): Observable<IItineraryDayResponse> {
    return this.http.post<IItineraryDayResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un día de itinerario existente.
   * @param id ID del día de itinerario a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: ItineraryDayUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un día de itinerario por su ID.
   * @param id ID del día de itinerario a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}
