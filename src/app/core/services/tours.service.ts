import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TourList } from '../models/tours/tour-list.model';
import {
  CardList,
  ExtraInfoSection,
  Itinerary,
  MarketingSection,
  SupportSection,
  Tour,
} from '../models/tours/tour.model';
import { map } from 'rxjs/operators';

type SelectedFields = Partial<Array<keyof Tour | 'all'>>;

@Injectable({
  providedIn: 'root',
})
export class ToursService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/tours`;

  constructor(private http: HttpClient) {}

  getToursList(): Observable<TourList[]> {
    return this.http.get<TourList[]>(this.API_URL);
  }

  getTourDetail(
    id: string,
    selectedFields: SelectedFields = []
  ): Observable<Tour> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http.get<Tour>(`${this.API_URL}/${id}`, { params });
  }

  getTourCardData(id: string): Observable<Partial<Tour>> {
    return this.getTourDetail(id, [
      'activePeriods',
      'price',
      'monthTags',
      'marketingSection',
      'nextDeparture',
      'basePrice',
      'name',
      'image',
    ]).pipe(map((tourData: Tour) => tourData));
  }

  getItinerarySection(id: string): Observable<Itinerary> {
    return this.getTourDetail(id, ['itinerary-section']).pipe(
      map((tourData: Tour) => tourData['itinerary-section'])
    );
  }

  getCardList(id: string): Observable<CardList[]> {
    return this.getTourDetail(id, ['card-list']).pipe(
      map((tourData: Tour) => tourData['card-list'])
    );
  }

  getExtraInfoSection(id: string): Observable<ExtraInfoSection> {
    return this.getTourDetail(id, ['extra-info-section']).pipe(
      map((tourData: Tour) => tourData['extra-info-section'])
    );
  }

  getMarketingSection(id: string): Observable<MarketingSection> {
    return this.getTourDetail(id, ['marketingSection']).pipe(
      map((tourData: Tour) => tourData.marketingSection)
    );
  }

  getSupportSection(id: string): Observable<SupportSection> {
    return this.getTourDetail(id, ['supportSection']).pipe(
      map((tourData: Tour) => tourData.supportSection)
    );
  }
}
