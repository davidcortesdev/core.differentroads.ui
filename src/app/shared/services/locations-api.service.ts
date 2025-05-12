import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface LocationMunicipality {
  id: number;
  code: string;
  name: string;
  countyId: number;
  lat?: number;
  lng?: number;
  stateId?: number;
  countryId?: number;
  continentId?: number;
  zipcode?: string;
  population?: number;
  isCapital?: boolean;
}
// Interfaz para los filtros de búsqueda de ciudad
export interface CityFilter {
  name?: string;
  countryId?: number;
  stateId?: number;
}

// Interfaz para la respuesta de búsqueda de ciudad
export interface CityResponse {
  id: number;
  name: string;
  lat?: number;
  lng?: number;
  countryId?: number;
  stateId?: number;
}

export interface CountryFilter {
  /**
   * Filtrar por ID del país
   */
  Id?: number
  /**
   * Filtrar por nombre del país (coincidencia parcial)
   */;
  name?: string
  /**
   * Filtrar por código del país (coincidencia exacta)
   */;
  code?: string
  /**
   * Filtrar por ID del continente
   */;
  continentId?: number;
}

export interface ILocationCountryCreate {
  /**
   * El código ISO del país
   */
  code: string
  /**
   * El nombre del país
   */;
  name: string
  /**
   * La descripción del país
   */;
  description?: string
  /**
   * El ID del continente al que pertenece el país
   */;
  continentId?: number;
}

export interface ILocationCountryUpdate extends ILocationCountryCreate {
  /**
   * El identificador único del país
   */
  id: number;
}

export interface ILocationCountryResponse extends ILocationCountryUpdate {
  /**
   * El nombre del continente al que pertenece el país
   */
  continentName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LocationsApiService {
  private baseUrl = environment.locationsApiUrl || '';

  constructor(private http: HttpClient) {}

  /**
   * Busca una comunidad/municipio por nombre
   */
  searchCommunityByname(name: string): Observable<LocationMunicipality[]> {
    const url = `${this.baseUrl}/LocationMunicipality`;
    const params = { name: name };

    return this.http.get<LocationMunicipality[]>(url, { params }).pipe(
      catchError((error) => {
        console.error('Error al buscar comunidad por nombre:', error);
        return of([]);
      })
    );
  }

  /**
   * Busca una comunidad/municipio por ID
   */
  getCommunityById(id: number): Observable<LocationMunicipality> {
    const url = `${this.baseUrl}/LocationMunicipality/${id}`;

    return this.http.get<LocationMunicipality>(url).pipe(
      catchError((error) => {
        console.error(`Error al obtener comunidad con ID ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Busca una ciudad por nombre
   */
  searchCityByFilter(
    cityFilter: CityFilter
  ): Observable<LocationMunicipality[]> {
    const url = `${this.baseUrl}/LocationCity`;

    const params: { [key: string]: string | number } = {};

    if (cityFilter.name !== undefined) {
      params['name'] = cityFilter.name;
    }

    if (cityFilter.countryId !== undefined) {
      params['CountryId'] = cityFilter.countryId;
    }

    if (cityFilter.stateId !== undefined) {
      params['StateId'] = cityFilter.stateId;
    }

    return this.http.get<LocationMunicipality[]>(url, { params }).pipe(
      catchError((error) => {
        console.error('Error al buscar ciudad por nombre:', error);
        return of([]);
      })
    );
  }

  /**
   * Busca una ciudad por ID
   */
  getCityById(id: number): Observable<LocationMunicipality> {
    const url = `${this.baseUrl}/LocationCity/${id}`;

    return this.http.get<LocationMunicipality>(url).pipe(
      catchError((error) => {
        console.error(`Error al obtener ciudad con ID ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Busca un país por filtros
   */
  searchCountryByFilter(
    countryFilter: CountryFilter
  ): Observable<ILocationCountryResponse[]> {
    const url = `${this.baseUrl}/LocationCountry`;

    const params: { [key: string]: string | number } = {};

    if (countryFilter.name !== undefined) {
      params['name'] = countryFilter.name;
    }

    if (countryFilter.code !== undefined) {
      params['code'] = countryFilter.code;
    }

    if (countryFilter.continentId !== undefined) {
      params['continentId'] = countryFilter.continentId;
    }

    return this.http.get<ILocationCountryResponse[]>(url, { params }).pipe(
      catchError((error) => {
        console.error('Error al buscar país por filtro:', error);
        return of([]);
      })
    );
  }

  /**
   * Busca un país por ID
   */
  getCountryById(id: number): Observable<ILocationCountryResponse> {
    const url = `${this.baseUrl}/LocationCountry/${id}`;

    return this.http.get<ILocationCountryResponse>(url).pipe(
      catchError((error) => {
        console.error(`Error al obtener país con ID ${id}:`, error);
        throw error;
      })
    );
  }
}
