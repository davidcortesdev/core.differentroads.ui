import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Modelo para crear un estado de itinerario.
 */
export interface ItineraryStatusCreate {
  name: string | null;
  description: string | null;
  code: string | null;
}

/**
 * Modelo para actualizar un estado de itinerario.
 */
export interface ItineraryStatusUpdate {
  name: string | null;
  description: string | null;
}

/**
 * Respuesta del backend para un estado de itinerario.
 */
export interface IItineraryStatusResponse {
  id: number;
  name: string | null;
  description: string | null;
  code: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ItineraryStatusService {
  private readonly API_URL = `${environment.toursApiUrl}/ItineraryStatus`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los estados de itinerario.
   */
  getAll(): Observable<IItineraryStatusResponse[]> {
    return this.http.get<IItineraryStatusResponse[]>(this.API_URL);
  }

  /**
   * Obtiene un estado de itinerario por su ID.
   * @param id ID del estado.
   */
  getById(id: number): Observable<IItineraryStatusResponse> {
    return this.http.get<IItineraryStatusResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo estado de itinerario.
   * @param data Datos del estado.
   */
  create(data: ItineraryStatusCreate): Observable<IItineraryStatusResponse> {
    return this.http.post<IItineraryStatusResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza un estado de itinerario existente.
   * @param id ID del estado.
   * @param data Datos actualizados.
   */
  update(id: number, data: ItineraryStatusUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un estado de itinerario por su ID.
   * @param id ID del estado.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}
