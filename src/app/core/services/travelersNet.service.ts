import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Traveler {
  id: number;
  name: string;
  email: string;
  code?: string;
  // Otros campos que pueda tener un viajero
}

export interface TravelerFilter {
  email?: string;
  name?: string;
  code?: string;
  // Otros campos para filtrar viajeros
}

@Injectable({
  providedIn: 'root'
})
export class TravelersNetService {
  private apiUrl = environment.apiUrl + '/api/travelers';
  private tourApiUrl = environment.apiUrl + '/api/tours';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene un viajero por su ID
   * @param id ID del viajero
   * @returns Observable con los datos del viajero
   */
  getTravelerById(id: number): Observable<Traveler> {
    return this.http.get<Traveler>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtiene viajeros según un filtro
   * @param filter Filtro para buscar viajeros
   * @returns Observable con la lista de viajeros que coinciden con el filtro
   */
  getTravelers(filter: TravelerFilter): Observable<Traveler[]> {
    let params = new HttpParams();
    
    if (filter.email) {
      params = params.set('email', filter.email);
    }
    if (filter.name) {
      params = params.set('name', filter.name);
    }
    if (filter.code) {
      params = params.set('code', filter.code);
    }
    
    return this.http.get<Traveler[]>(this.apiUrl, { params });
  }

  /**
   * Crea un nuevo viajero
   * @param traveler Datos del viajero a crear
   * @returns Observable con los datos del viajero creado
   */
  createTraveler(traveler: Partial<Traveler>): Observable<Traveler> {
    return this.http.post<Traveler>(this.apiUrl, traveler);
  }

  /**
   * Obtiene el ID del tour a partir del ID del período
   * @param periodId ID del período
   * @returns Observable con el ID del tour
   */
  getTourIdByPeriodId(periodId: string): Observable<number> {
    return this.http.get<number>(`${this.tourApiUrl}/byPeriod/${periodId}`);
  }
}
