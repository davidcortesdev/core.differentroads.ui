import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HomeSchema } from '../models/home/home.model';
import { environment } from '../../../environments/environment';
import { FeaturedToursSection } from '../models/home/featured-tours/featured-tour.model';
import { TravelersSection } from '../models/blocks/travelers/travelers-section.model';
import { Block, BlockType } from '../models/blocks/block.model';
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

  getTravelersSection(id?: string): Observable<TravelersSection> {
    return this.getHomeData().pipe(
      map((homeData: HomeSchema) => {
        if (id && homeData.blocks) {
          const block = homeData.blocks.find(
            (b) => b.name === id && b.type === BlockType.TravelersSection
          );

          if (block && block.content) {
            return block.content as TravelersSection;
          }
        }
        if ('travelers-section' in homeData) {
          return homeData['travelers-section'] as TravelersSection;
        }
        console.warn('No se encontró ninguna sección de viajeros.');
        return {
          title: '',
          reviews: {
            title: '',
            ['reviews-cards']: [],
          },
          ['travelers-cards']: [],
          featured: { description: '' },
        } as TravelersSection;
      }),
      catchError((error) => {
        console.error('Error al obtener la sección de viajeros:', error);
        return of({
          title: '',
          reviews: {
            title: '',
            ['reviews-cards']: [],
          },
          ['travelers-cards']: [],
          featured: { description: '' },
        } as TravelersSection);
      })
    );
  }

  getDynamicSections(): Observable<Block[]> {
    return this.getHomeData().pipe(
      map((homeData: HomeSchema) =>
        [
          ...(homeData.blocks || []),
          {
            type: BlockType.TourSection,
            name: 'tours-section',
            content: homeData['featured-tours'],
          },
          {
            type: BlockType.TravelersSection,
            name: 'travelers-section',
            content: homeData['travelers-section'] as TravelersSection,
          },
        ].sort((a, b) => (a?.content?.order || 20) - (b?.content?.order || 20))
      )
    );
  }
  getSEO(): Observable<SEO> {
    return this.getHomeData().pipe(map((homeData: HomeSchema) => homeData.seo));
  }
}
