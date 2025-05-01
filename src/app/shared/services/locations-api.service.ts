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
  zipCode?: string;
  population?: number;
  isCapital?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LocationsApiService {
  private baseUrl = environment.localizacionesApiUrl || '';

  constructor(private http: HttpClient) { }

  /**
   * Busca una comunidad/municipio por nombre
   */
  searchCommunityByName(name: string): Observable<LocationMunicipality[]> {
    const url = `${this.baseUrl}/Community`;
    const params = { Name: name };

    return this.http.get<LocationMunicipality[]>(url, { params }).pipe(
      catchError(error => {
        console.error('Error al buscar comunidad por nombre:', error);
        return of([]);
      })
    );
  }

  /**
   * Busca una comunidad/municipio por ID
   */
  getCommunityById(id: number): Observable<LocationMunicipality> {
    const url = `${this.baseUrl}/Community/${id}`;

    return this.http.get<LocationMunicipality>(url).pipe(
      catchError(error => {
        console.error(`Error al obtener comunidad con ID ${id}:`, error);
        throw error;
      })
    );
  }

  /**
   * Busca una ciudad por nombre
   */
  /**
   * Busca una ciudad por nombre
   */
  searchCityByName(name: string): Observable<LocationMunicipality[]> {
    const url = `${this.baseUrl}/City`;
    const params = { Name: name };
  
    return this.http.get<LocationMunicipality[]>(url, { params }).pipe(
      catchError(error => {
        console.error('Error al buscar ciudad por nombre:', error);
        return of([]);
      })
    );
  }

  /**
   * Busca una ciudad por ID
   */
  getCityById(id: number): Observable<LocationMunicipality> {
    const url = `${this.baseUrl}/City/${id}`;

    return this.http.get<LocationMunicipality>(url).pipe(
      catchError(error => {
        console.error(`Error al obtener ciudad con ID ${id}:`, error);
        throw error;
      })
    );
  }
}