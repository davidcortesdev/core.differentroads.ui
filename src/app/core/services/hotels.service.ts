import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Hotel } from '../models/tours/tour.model';

@Injectable({
  providedIn: 'root',
})
export class HotelsService {
  // Base API endpoint for hoteles
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/hotels`;

  constructor(private http: HttpClient) {}

  // Retorna todos los hoteles disponibles
  getAllHotels(): Observable<Hotel[]> {
    return this.http.get<Hotel[]>(this.API_URL);
  }

  // Retorna un hotel por su id, permitiendo seleccionar campos específicos
  getHotelById(
    id: string,
    selectedFields: Partial<Array<keyof Hotel | 'all'>> = ['all']
  ): Observable<Hotel> {
    let params = new HttpParams();
    if (selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }
    return this.http.get<Hotel>(`${this.API_URL}/${id}`, { params });
  }
}
