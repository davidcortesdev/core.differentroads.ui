import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Interfaces generadas a partir del swagger de amadeus-dev-swagger.json para el endpoint /FlightSearch
 */
export interface FlightSearchRequest {
  departureId: number;
  reservationId: number;
  tipoViaje: 'Ida' | 'Vuelta' | 'IdaVuelta'; // Ahora es string según swagger
  iataOrigen?: string | null;
  iataDestino?: string | null;
}

export interface FlightSearchResponse {
  // La respuesta no está definida en detalle en el swagger, así que se deja como any
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class FlightSearchService {
  private readonly API_URL = `${environment.amadeusApiUrl}/FlightSearch`;

  constructor(private http: HttpClient) {}

  /**
   * Realiza una búsqueda de vuelos usando el endpoint /FlightSearch
   * @param request Objeto con los parámetros de búsqueda
   * @returns Observable con la respuesta de la API
   */
  searchFlights(request: FlightSearchRequest): Observable<FlightSearchResponse> {
    return this.http.post<FlightSearchResponse>(
      this.API_URL,
      request,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }
} 