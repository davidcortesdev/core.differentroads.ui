import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TourList, TourListResponse } from '../models/tours/tour-list.model';
import {
  CardList,
  ExtraInfoSection,
  Itinerary,
  MarketingSection,
  SupportSection,
  Tour,
} from '../models/tours/tour.model';
import { map } from 'rxjs/operators';
import { ProcessedTour } from '../models/tours/processed-tour.model';

type SelectedFields = Partial<Array<keyof Tour | 'all'>>;

interface TourFilters {
  tourType?: string;
  month?: string[];
  tourSeason?: string[];
  price?: string[];
  periodTripType?: string;
  sort?: string; // 'next-departures' | 'min-price' | 'max-price';
  maxDate?: string;
  minDate?: string;
  destination?: string;
  tags?: string[]; // Nuevo filtro para tags
  externalID?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToursService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/tours`;

  constructor(private http: HttpClient) {}

  getToursList(
    selectedFields: SelectedFields = ['all']
  ): Observable<TourListResponse> {
    let params = new HttpParams().set('limit', '1000');

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http.get<TourListResponse>(this.API_URL, { params });
  }

  getFilteredToursList(filters: TourFilters): Observable<{
    data: Tour[];
    filtersOptions: Record<string, string[] | number[] | undefined>;
  }> {
    const selectedFields: SelectedFields = [
      'name',
      'webSlug',
      'price',
      'image',
      'tags',
      'vtags',
      'monthTags',
      'marketingSection',
      'activePeriods',
      'tourType',
      'externalID',
    ];

    const toursObservable = filters.destination
      ? this.getToursFilterByKeyword(filters.destination, selectedFields)
      : this.getToursList(selectedFields);

    return toursObservable.pipe(
      map((toursData: TourListResponse) => {
        const tours = toursData.data ? toursData.data : (toursData as any);

        // Collect possible months and tags
        const monthSet = new Set<string>();
        const tagsSet = new Set<string>();
        tours.forEach((tour: any) => {
          // Check if monthTags is an array before calling forEach
          if (Array.isArray(tour.monthTags)) {
            tour.monthTags.forEach((month: string) => {
              monthSet.add(month);
            });
          }

          // Check if tags is an array before calling forEach
          if (Array.isArray(tour.tags)) {
            tour.tags.forEach((tag: string) => {
              tagsSet.add(tag);
            });
          }

          // Check if vtags is an array before calling forEach
          if (Array.isArray(tour.vtags)) {
            tour.vtags.forEach((tag: string) => {
              tagsSet.add(tag);
            });
          }
        });
        const filtersOptions = {
          month: Array.from(monthSet),
          tags: Array.from(tagsSet),
        };

        // Apply filters to tours
        let filteredTours = tours.filter((tour: any) => {
          const { price } = tour;
          const priceFilters = filters.price || [];
          const tourSeasonFilters = filters.tourSeason || [];
          const tagFilters = filters.tags || [];

          // Ensure tags and vtags are arrays
          const tourTags = Array.isArray(tour.tags) ? tour.tags : [];
          const tourVtags = Array.isArray(tour.vtags) ? tour.vtags : [];
          const tourMonthTags = Array.isArray(tour.monthTags)
            ? tour.monthTags
            : [];

          const priceMatch =
            !priceFilters.length ||
            priceFilters.some(
              (priceFilter: string) =>
                (priceFilter === '0-1000' && price <= 1000) ||
                (priceFilter === '1000-3000' &&
                  price > 1000 &&
                  price <= 3000) ||
                (priceFilter === '3000+' && price > 3000)
            );

          const minDateMatch =
            !filters?.minDate ||
            tour.activePeriods?.some(
              (period: any) => period.dayOne >= filters.minDate!
            );
          const maxDateMatch =
            !filters?.maxDate ||
            tour.activePeriods?.some(
              (period: any) => period.returnDate <= filters.maxDate!
            );

          const tagMatch =
            !tagFilters.length ||
            tagFilters.some(
              (tag: string) => tourTags.includes(tag) || tourVtags.includes(tag)
            );

          return (
            (!filters.tourType ||
              tourTags.includes(filters.tourType) ||
              tourVtags.includes(filters.tourType)) &&
            (!filters.month?.length ||
              filters.month.some((month: string) =>
                tourMonthTags.includes(month)
              )) &&
            (!tourSeasonFilters.length ||
              tourSeasonFilters.some(
                (season: string) =>
                  tourTags.includes(season) || tourVtags.includes(season)
              )) &&
            priceMatch &&
            (!filters.periodTripType ||
              tour.periodTripType === filters.periodTripType) &&
            minDateMatch &&
            maxDateMatch &&
            tagMatch
          );
        });

        // Apply sorting
        if (filters.sort === 'next-departures') {
          filteredTours = filteredTours.sort((a: any, b: any) => {
            const aNextDeparture = a.activePeriods?.[0]?.dayOne ?? 0;
            const bNextDeparture = b.activePeriods?.[0]?.dayOne ?? 0;
            return aNextDeparture - bNextDeparture;
          });
        } else if (filters.sort === 'min-price') {
          filteredTours = filteredTours.sort(
            (a: any, b: any) => a.price - b.price
          );
        } else if (filters.sort === 'max-price') {
          filteredTours = filteredTours.sort(
            (a: any, b: any) => b.price - a.price
          );
        }

        // Fix the incorrect assignment that's causing the error
        if (filters.externalID) {
          filteredTours = filteredTours.filter(
            (tour: any) => tour.externalID === filters.externalID
          );
        }

        return { data: filteredTours, filtersOptions };
      })
    );
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

  getTourDetailBySlug(
    slug: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Tour> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http
      .get<Tour[]>(`${this.API_URL}/filter-by/webSlug/${slug}`, { params })
      .pipe(
        map((tours: Tour[]) => {
          if (tours.length > 0) {
            return tours[0];
          } else {
            throw new Error('No tour found with the given slug');
          }
        })
      );
  }

  getTourDetailByExternalID(
    slug: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Tour> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http
      .get<Tour[]>(`${this.API_URL}/filter-by/externalID/${slug}`, { params })
      .pipe(
        map((tours: Tour[]) => {
          if (tours.length > 0) {
            return tours[0];
          } else {
            throw new Error('No tour found with the given slug');
          }
        })
      );
  }

  getToursFilterByKeyword(
    keyword: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<TourListResponse> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http.get<TourListResponse>(
      `${this.API_URL}/filter-by/name,tags,vtags,cities,country,continent/${keyword}`,
      { params }
    );
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
      'country',
      'webSlug',
      'tourType',
      'externalID',
    ]).pipe(map((tourData: Tour) => tourData));
  }

  getMultipleTourCardData(ids: string[]): Observable<ProcessedTour[]> {
    return new Observable((subscriber) => {
      const tourCards: ProcessedTour[] = [];
      let completed = 0;

      ids.forEach((id) => {
        this.getTourCardData(id).subscribe({
          next: (tour) => {
            const tripType = tour.activePeriods
              ?.map((period) => period.tripType)
              .filter((type): type is string => !!type)
              .filter((value, index, self) => self.indexOf(value) === index);

            const days = tour.activePeriods?.[0]?.days || 0;

            tourCards.push({
              imageUrl: tour.image?.[0]?.url || '',
              title: tour.name || '',
              description:
                tour.country && days
                  ? `${tour.country} en: ${days} dias`
                  : tour.description || '',
              rating: 5,
              tag: tour.marketingSection?.marketingSeasonTag || '',
              price: tour.basePrice || 0,
              availableMonths: (tour.monthTags || []).map(
                (month: string): string => month.toLocaleUpperCase().slice(0, 3)
              ),
              isByDr: tour.tourType !== 'FIT',
              webSlug:
                tour.webSlug ||
                tour.name?.toLowerCase().replace(/\s+/g, '-') ||
                '',
              tripType: tripType || [],
            });
            completed++;

            if (completed === ids.length) {
              subscriber.next(tourCards);
              subscriber.complete();
            }
          },
          error: (error) => subscriber.error(error),
        });
      });
    });
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
