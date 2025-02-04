import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HomeSchema } from '../models/home.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/globals/es/home-page`;

  constructor(private http: HttpClient) { }

  getHomeData(): Observable<HomeSchema> {
    return this.http.get<HomeSchema>(this.API_URL);
  }
}