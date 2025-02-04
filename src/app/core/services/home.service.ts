import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HomeSchema } from '../models/home.model';
import { environment } from '../../../environments/environment';
import { BannerSection } from '../models/banner/banner-section.model';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/globals/es/home-page`;

  constructor(private http: HttpClient) { }

  getHomeData(): Observable<HomeSchema> {
    return this.http.get<HomeSchema>(this.API_URL);
  }

  getBannerSection(): Observable<BannerSection> {
    return this.getHomeData().pipe(
      map((homeData: HomeSchema) => homeData['banner-section'])
    );
  }
}