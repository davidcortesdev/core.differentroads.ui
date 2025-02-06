import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HomeSchema } from '../models/home/home.model';
import { environment } from '../../../environments/environment';
import { FeaturedToursSection } from '../models/home/featured-tours/featured-tour.model';
import { TravelersSection } from '../models/home/travelers/travelers-section.model';
import { Block } from '../models/blocks/block.model';
import { SEO } from '../models/commons/seo.model';
import { BannerSection } from '../models/home/banner/banner-section.model';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/globals/es/home-page`;

  constructor(private http: HttpClient) {}

  getHomeData(): Observable<HomeSchema> {
    return this.http.get<HomeSchema>(this.API_URL);
  }

  getBannerSection(): Observable<BannerSection> {
    return this.getHomeData().pipe(
      map((homeData: HomeSchema) => homeData['banner-section'])
    );
  }

  getFeaturedToursSection(): Observable<FeaturedToursSection> {
    return this.getHomeData().pipe(
      map((homeData: HomeSchema) => homeData['featured-tours'])
    );
  }

  getTravelersSection(): Observable<TravelersSection> {
    return this.getHomeData().pipe(
      map((homeData: HomeSchema) => homeData['travelers-section'])
    );
  }

  getDynamicSections(): Observable<Block[]> {
    return this.getHomeData().pipe(
      map((homeData: HomeSchema) => homeData.blocks)
    );
  }

  getSEO(): Observable<SEO> {
    return this.getHomeData().pipe(map((homeData: HomeSchema) => homeData.seo));
  }
}
