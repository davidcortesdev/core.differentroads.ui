import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HomeSchema } from '../models/home.model';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private readonly API_URL = 'https://api.differentroads.co/dev/v3/data/cms/globals/es/home-page';

  constructor(private http: HttpClient) { }

  getHomeData(): Observable<HomeSchema> {
    return this.http.get<HomeSchema>(this.API_URL);
  }
}