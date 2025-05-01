import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface AirlineFilter {
  id?: number;
  name?: string;
  codeIATA?: string;
  prefixIATA?: string;
}

export interface Airline {
  id: number;
  name: string | null;
  prefixIATA: string | null;
  codeIATA: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AirlinesService {
  private readonly API_URL = `${environment.hotelsApiUrl}/Airline`;
  private airlineCache: { [prefix: string]: string } = {};

  constructor(private http: HttpClient) {}

  /**
   * Obtiene aerolíneas con filtros opcionales
   * @param filter Criterios de filtro opcionales
   * @returns Observable de array de Airline
   */
  getAirlines(filter?: AirlineFilter): Observable<Airline[]> {
    let params = new HttpParams();

    // Añadir parámetros de filtro si se proporcionan
    if (filter) {
      params = this.addFilterParams(params, filter);
    }

    return this.http.get<Airline[]>(`${this.API_URL}`, { params });
  }

  /**
   * Obtiene el nombre de una aerolínea a partir del prefijo IATA (primeras 2 letras del número de vuelo)
   * @param flightNumber Número de vuelo
   * @returns Observable con el nombre de la aerolínea
   */
  getAirlineNameByFlightNumber(flightNumber: string): Observable<string> {
    if (!flightNumber || flightNumber.length < 2) {
      return of('');
    }
  
    const codeIATA = flightNumber.substring(0, 2);
  
    // Si ya tenemos el nombre en caché, devolverlo directamente
    if (this.airlineCache[codeIATA]) {
      return of(this.airlineCache[codeIATA]);
    }
    
    return this.getAirlines({ codeIATA }).pipe(
      map(airlines => {
        if (airlines && airlines.length > 0) {
          const airlineName = airlines[0].name || codeIATA;
          this.airlineCache[codeIATA] = airlineName;
          return airlineName;
        }
        return codeIATA;
      }),
      catchError(() => {
        return of(codeIATA);
      })
    );
  }

  /**
   * Método auxiliar para añadir parámetros de filtro a HttpParams
   * @param params Objeto HttpParams inicial
   * @param filter Criterios de filtro
   * @returns HttpParams con parámetros de filtro añadidos
   */
  private addFilterParams(params: HttpParams, filter: AirlineFilter): HttpParams {
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            params = params.append(key, item.toString());
          });
        } else {
          params = params.set(key, value.toString());
        }
      }
    });
    return params;
  }
}