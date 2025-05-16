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
  filterByStatus?: boolean; // Nuevo parámetro para controlar el filtrado por status
  unpublish?: boolean; // Nuevo parámetro para controlar si se muestran tours no publicados
}

@Injectable({
  providedIn: 'root',
})
export class ToursService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/tours`;

  constructor(private http: HttpClient) {}

  // Método auxiliar para verificar si un tour está publicado (insensible a mayúsculas/minúsculas)
  private isPublished(status: string | undefined): boolean {
    return status?.toLowerCase() === 'published';
  }

  // Método auxiliar para asegurar que status esté incluido en selectedFields
  private ensureStatusField(selectedFields: SelectedFields): SelectedFields {
    if (selectedFields.includes('all')) {
      return selectedFields;
    }

    // Si no incluye 'all', asegurarse de que 'status' esté incluido
    if (!selectedFields.includes('status' as keyof Tour)) {
      return [...selectedFields, 'status' as keyof Tour];
    }

    return selectedFields;
  }

  // Método auxiliar para filtrar tours por status published
  private filterPublishedTours<T extends Tour[]>(
    data: T,
    filterByStatus: boolean = true
  ): T {
    if (!filterByStatus) {
      return data; // Retornar todos los tours sin filtrar si filterByStatus es false
    }
    return data.filter((tour) => this.isPublished(tour.status)) as T;
  }

  getToursList(
    selectedFields: SelectedFields = ['all'],
    filterByStatus: boolean = true
  ): Observable<TourListResponse> {
    let params = new HttpParams().set('limit', '1000');

    // Asegurar que status esté incluido si vamos a filtrar por él o si se solicitan todos los campos
    const fieldsWithStatus = filterByStatus
      ? this.ensureStatusField(selectedFields)
      : selectedFields;

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http.get<TourListResponse>(this.API_URL, { params }).pipe(
      map((response: TourListResponse) => {
        if (response && response.data && filterByStatus) {
          // Filtrar solo los tours con status published si filterByStatus es true
          response.data = response.data.filter((tour) =>
            this.isPublished(tour.status)
          );
        }
        return response;
      })
    );
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
      'status', // Añadido status aquí
    ];

    // Extraer el parámetro filterByStatus de los filtros, con valor predeterminado true
    const filterByStatus =
      filters.filterByStatus !== undefined ? filters.filterByStatus : true;
    // Extraer el parámetro unpublish, que es lo opuesto a filterByStatus
    const unpublish = filters.unpublish === true;
    const effectiveFilterByStatus = !unpublish && filterByStatus;

    const toursObservable = filters.destination
      ? this.getToursFilterByKeyword(
          filters.destination,
          selectedFields,
          effectiveFilterByStatus
        )
      : this.getToursList(selectedFields, effectiveFilterByStatus);

    return toursObservable.pipe(
      map((toursData: TourListResponse) => {
        const tours = toursData.data ? toursData.data : (toursData as any);

        // Filtrar solo tours publicados si filterByStatus es true y unpublish es false
        const filteredTours = effectiveFilterByStatus
          ? tours.filter((tour: any) => this.isPublished(tour.status))
          : tours;

        // Collect possible months and tags
        const monthSet = new Set<string>();
        const tagsSet = new Set<string>();
        filteredTours.forEach((tour: any) => {
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
        let filteredTours2 = filteredTours.filter((tour: any) => {
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
          filteredTours2 = filteredTours2.sort((a: any, b: any) => {
            const aNextDeparture = a.activePeriods?.[0]?.dayOne ?? 0;
            const bNextDeparture = b.activePeriods?.[0]?.dayOne ?? 0;
            return aNextDeparture - bNextDeparture;
          });
        } else if (filters.sort === 'min-price') {
          filteredTours2 = filteredTours2.sort(
            (a: any, b: any) => a.price - b.price
          );
        } else if (filters.sort === 'max-price') {
          filteredTours2 = filteredTours2.sort(
            (a: any, b: any) => b.price - a.price
          );
        }

        if (filters.externalID) {
          filteredTours2 = filteredTours2.filter(
            (tour: any) => tour.externalID === filters.externalID
          );
        }

        return { data: filteredTours2, filtersOptions };
      })
    );
  }

  getTourDetail(
    id: string,
    selectedFields: SelectedFields = [],
    filterByStatus: boolean = true
  ): Observable<Tour> {
    let params = new HttpParams();

    // Asegurar que status esté incluido si vamos a filtrar por él
    const fieldsWithStatus = filterByStatus
      ? this.ensureStatusField(selectedFields)
      : selectedFields;

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http.get<Tour>(`${this.API_URL}/${id}`, { params }).pipe(
      map((tour: Tour) => {
        if (tour && filterByStatus && !this.isPublished(tour.status)) {
          throw new Error('Tour not found or not published');
        }
        return tour;
      })
    );
  }

  getTourDetailBySlug(
    slug: string,
    selectedFields: SelectedFields = ['all'],
    filterByStatus: boolean = true
  ): Observable<Tour> {
    let params = new HttpParams();

    // Asegurar que status esté incluido si vamos a filtrar por él
    const fieldsWithStatus = filterByStatus
      ? this.ensureStatusField(selectedFields)
      : selectedFields;

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http
      .get<Tour[]>(`${this.API_URL}/filter-by/webSlug/${slug}`, { params })
      .pipe(
        map((tours: Tour[]) => {
          // Si filterByStatus es true, filtrar solo tours publicados
          const filteredTours = filterByStatus
            ? tours.filter((tour) => this.isPublished(tour.status))
            : tours;

          if (filteredTours.length > 0) {
            return filteredTours[0];
          } else {
            throw new Error(
              filterByStatus
                ? 'No published tour found with the given slug'
                : 'No tour found with the given slug'
            );
          }
        })
      );
  }

  getTourDetailByExternalID(
    slug: string,
    selectedFields: SelectedFields = ['all'],
    filterByStatus: boolean = true
  ): Observable<Tour> {
    let params = new HttpParams();

    // Asegurar que status esté incluido si vamos a filtrar por él
    const fieldsWithStatus = filterByStatus
      ? this.ensureStatusField(selectedFields)
      : selectedFields;

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http
      .get<Tour[]>(`${this.API_URL}/filter-by/externalID/${slug}`, { params })
      .pipe(
        map((tours: Tour[]) => {
          // Si filterByStatus es true, filtrar solo tours publicados
          const filteredTours = filterByStatus
            ? tours.filter((tour) => this.isPublished(tour.status))
            : tours;

          if (filteredTours.length > 0) {
            return filteredTours[0];
          } else {
            throw new Error(
              filterByStatus
                ? 'No published tour found with the given external ID'
                : 'No tour found with the given external ID'
            );
          }
        })
      );
  }

  getToursFilterByKeyword(
    keyword: string,
    selectedFields: SelectedFields = ['all'],
    filterByStatus: boolean = true
  ): Observable<TourListResponse> {
    let params = new HttpParams();

    // Asegurar que status esté incluido si vamos a filtrar por él
    const fieldsWithStatus = filterByStatus
      ? this.ensureStatusField(selectedFields)
      : selectedFields;

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http
      .get<TourListResponse>(
        `${this.API_URL}/filter-by/name,tags,vtags,cities,country,continent/${keyword}`,
        { params }
      )
      .pipe(
        map((response: TourListResponse) => {
          if (response && response.data && filterByStatus) {
            // Filtrar solo los tours con status published si filterByStatus es true
            response.data = response.data.filter((tour) =>
              this.isPublished(tour.status)
            );
          }
          return response;
        })
      );
  }

  getTourCardData(
    id: string,
    filterByStatus: boolean = true
  ): Observable<Partial<Tour>> {
    return this.getTourDetail(
      id,
      [
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
        'status',
      ],
      filterByStatus
    ).pipe(map((tourData: Tour) => tourData));
  }

  getMultipleTourCardData(
    ids: string[],
    filterByStatus: boolean = true
  ): Observable<ProcessedTour[]> {
    return new Observable((subscriber) => {
      const tourCards: ProcessedTour[] = [];
      let completed = 0;
      let errors = 0;

      ids.forEach((id) => {
        this.getTourCardData(id, filterByStatus).subscribe({
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
              price: tour.price || 0,
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

            if (completed + errors === ids.length) {
              subscriber.next(tourCards);
              subscriber.complete();
            }
          },
          error: (error) => {
            errors++;
            if (completed + errors === ids.length) {
              subscriber.next(tourCards);
              subscriber.complete();
            }
          },
        });
      });
    });
  }

  getItinerarySection(
    id: string,
    filterByStatus: boolean = true
  ): Observable<Itinerary> {
    return this.getTourDetail(
      id,
      ['itinerary-section', 'status'],
      filterByStatus
    ).pipe(map((tourData: Tour) => tourData['itinerary-section']));
  }

  getCardList(
    id: string,
    filterByStatus: boolean = true
  ): Observable<CardList[]> {
    return this.getTourDetail(id, ['card-list', 'status'], filterByStatus).pipe(
      map((tourData: Tour) => tourData['card-list'])
    );
  }

  getExtraInfoSection(
    id: string,
    filterByStatus: boolean = true
  ): Observable<ExtraInfoSection> {
    return this.getTourDetail(
      id,
      ['extra-info-section', 'status'],
      filterByStatus
    ).pipe(map((tourData: Tour) => tourData['extra-info-section']));
  }

  getMarketingSection(
    id: string,
    filterByStatus: boolean = true
  ): Observable<MarketingSection> {
    return this.getTourDetail(
      id,
      ['marketingSection', 'status'],
      filterByStatus
    ).pipe(map((tourData: Tour) => tourData.marketingSection));
  }

  getSupportSection(
    id: string,
    filterByStatus: boolean = true
  ): Observable<SupportSection> {
    return this.getTourDetail(
      id,
      ['supportSection', 'status'],
      filterByStatus
    ).pipe(map((tourData: Tour) => tourData.supportSection));
  }
}
