import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TourList } from '../models/tours/tour-list.model';
import { Tour } from '../models/tours/tour.model';

@Injectable({
  providedIn: 'root',
})
export class ToursService {
  private readonly LIST_API_URL = `${environment.apiUrl}/data/cms/collections/es/tours`;
  private readonly DETAIL_API_URL = `${environment.apiUrl}/data/cms/collections/es/tours/`;

  constructor(private http: HttpClient) {}

  getToursList(): Observable<TourList[]> {
    return this.http.get<TourList[]>(this.LIST_API_URL);
  }

  getTourDetail(id: string): Observable<Tour> {
    return this.http.get<Tour>(`${this.DETAIL_API_URL}${id}`);
  }
}
