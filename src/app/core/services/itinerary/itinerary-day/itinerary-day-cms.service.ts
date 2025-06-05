import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

/**
 * Modelo para crear una entrada CMS de un día de itinerario.
 */
export interface ItineraryDayCMSCreate {
  itineraryDayId: number;
  longTitle?: string | null;
  webDescription?: string | null;
  documentationDescription?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  additionalInfoTitle?: string | null;
  additionalInfoContent?: string | null;
}

/**
 * Modelo para actualizar una entrada CMS de un día de itinerario.
 */
export interface ItineraryDayCMSUpdate extends ItineraryDayCMSCreate {
  id: number;
}

/**
 * Respuesta del backend para una entrada CMS de un día de itinerario.
 */
export interface IItineraryDayCMSResponse {
  id: number;
  itineraryDayId: number;
  longTitle?: string | null;
  webDescription?: string | null;
  documentationDescription?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  additionalInfoTitle?: string | null;
  additionalInfoContent?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ItineraryDayCMSService {
  private readonly API_URL = `${environment.toursApiUrl}/ItineraryDayCMS`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las entradas CMS de días de itinerario.
   */
  getAll(): Observable<IItineraryDayCMSResponse[]> {
    return this.http.get<IItineraryDayCMSResponse[]>(this.API_URL);
  }

  /**
   * Obtiene una entrada CMS específica por su ID.
   * @param id ID de la entrada CMS.
   */
  getById(id: number): Observable<IItineraryDayCMSResponse> {
    return this.http.get<IItineraryDayCMSResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea una nueva entrada CMS para un día de itinerario.
   * @param data Datos de la entrada CMS.
   */
  create(data: ItineraryDayCMSCreate): Observable<IItineraryDayCMSResponse> {
    return this.http.post<IItineraryDayCMSResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza una entrada CMS existente.
   * @param id ID de la entrada CMS.
   * @param data Datos actualizados.
   */
  update(id: number, data: ItineraryDayCMSUpdate): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una entrada CMS por su ID.
   * @param id ID de la entrada CMS.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
