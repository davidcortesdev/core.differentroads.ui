import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TourService, Tour } from '../../core/services/tour/tour.service';
import { catchError, switchMap, map, first, concatMap } from 'rxjs/operators';
import { SelectedDepartureEvent } from './components/tour-itinerary-v2/components/selector-itinerary/selector-itinerary.component';
import { ActivityHighlight } from '../../shared/components/activity-card/activity-card.component';
import { AnalyticsService } from '../../core/services/analytics/analytics.service';
import { AuthenticateService } from '../../core/services/auth/auth-service.service';
import { Title } from '@angular/platform-browser';
import { TourTagService } from '../../core/services/tag/tour-tag.service';
import { TagService } from '../../core/services/tag/tag.service';
import { ItineraryService, ItineraryFilters } from '../../core/services/itinerary/itinerary.service';
import { ItineraryDayService, IItineraryDayResponse } from '../../core/services/itinerary/itinerary-day/itinerary-day.service';
import { TourLocationService, ITourLocationResponse } from '../../core/services/tour/tour-location.service';
import { LocationNetService, Location } from '../../core/services/locations/locationNet.service';
import { DepartureService, IDepartureResponse } from '../../core/services/departure/departure.service';
import { TourDataForEcommerce } from '../../core/services/analytics/analytics.service';
import { forkJoin, Observable, of } from 'rxjs';
import { TripTypeService, ITripTypeResponse } from '../../core/services/trip-type/trip-type.service';

interface PassengersData {
  adults: number;
  children: number;
  babies: number;
}

interface AgeGroupCategory {
  id: number | null;
  lowerAge: number | null;
  upperAge: number | null;
}

interface AgeGroupCategories {
  adults: AgeGroupCategory;
  children: AgeGroupCategory;
  babies: AgeGroupCategory;
}

interface SelectedDepartureData {
  id: number;
  departureDate?: string;
  returnDate?: string;
  price?: number;
  status?: string;
  waitingList?: boolean;
  group?: string;
}

interface PassengersUpdateData {
  adults: number;
  children: number;
  babies: number;
  total: number;
}

interface ActivityTypesAnalysis {
  hasAct: boolean;
  hasPack: boolean;
  actCount: number;
  packCount: number;
}

interface TourTripType {
  name: string;
  code: string;
  color: string;
  abbreviation: string;
}

@Component({
  selector: 'app-tour-v2',
  standalone: false,
  templateUrl: './tour-v2.component.html',
  styleUrls: ['./tour-v2.component.scss'],
})
export class TourV2Component implements OnInit {
  tourSlug: string = '';
  tour: Tour | null = null;
  loading: boolean = true;
  error: string | null = null;
  selectedDepartureEvent: SelectedDepartureEvent | null = null;
  preview: boolean = false;
  totalPrice: number = 0;
  
  private viewItemTracked: boolean = false;

  selectedCity: string = '';

  citiesLoading: boolean = false;

  selectedDepartureData: SelectedDepartureData | null = null;

  totalPassengers: number = 1;

  selectedActivities: ActivityHighlight[] = [];

  showActivitiesStatus: boolean = false;

  selectedActivityPackId: number | null = null;
  onActivityPackIdUpdate(activityPackId: number | null): void {
    this.selectedActivityPackId = activityPackId;
  }

  activityTypesAnalysis: ActivityTypesAnalysis = {
    hasAct: false,
    hasPack: false,
    actCount: 0,
    packCount: 0,
  };

  passengersData: PassengersData = { adults: 1, children: 0, babies: 0 };
  ageGroupCategories: AgeGroupCategories = {
    adults: { id: null, lowerAge: null, upperAge: null },
    children: { id: null, lowerAge: null, upperAge: null },
    babies: { id: null, lowerAge: null, upperAge: null },
  };

  tourCountry: string = '';
  tourContinent: string = '';
  tourRating: number | null = null;
  tourDuration: string = '';
  tourTripType: string = '';
  tourProductStyle: string = '';

  private tripTypesMap: Map<number, ITripTypeResponse> = new Map();
  
  tourTripTypes: TourTripType[] = [];

  constructor(
    private titleService: Title,
    private route: ActivatedRoute,
    private router: Router,
    private tourService: TourService,
    private analyticsService: AnalyticsService,
    private authService: AuthenticateService,
    private tourTagService: TourTagService,
    private tagService: TagService,
    private itineraryService: ItineraryService,
    private itineraryDayService: ItineraryDayService,
    private tourLocationService: TourLocationService,
    private locationService: LocationNetService,
    private departureService: DepartureService,
    private tripTypeService: TripTypeService
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Tour - Different Roads');
    this.route.paramMap.subscribe((params) => {
      const slug: string | null = params.get('slug');
      
      const currentUrl = this.router.url;
      const isPreview = currentUrl.includes('/preview');
      
      if (slug) {
        if (this.tourSlug !== slug) {
          this.viewItemTracked = false;
        }
        
        this.tourSlug = slug;
        this.preview = isPreview;
        this.loadTourBySlug(slug);
      } else {
        this.error = 'No se proporcionó un slug de tour válido';
        this.loading = false;
      }
    });
  }
private getTourTripTypesForAnalytics(tourId: number): Observable<string[]> {
  const itineraryFilters: ItineraryFilters = {
    tourId: tourId,
    isVisibleOnWeb: true,
    isBookable: true,
  };

  return this.itineraryService.getAll(itineraryFilters, false).pipe(
    switchMap((itineraries) => {
      if (itineraries.length === 0) {
        return of([]);
      }

      const departureRequests = itineraries.map((itinerary) =>
        this.departureService.getByItinerary(itinerary.id, false).pipe(
          catchError(() => of([] as IDepartureResponse[]))
        )
      );

      return departureRequests.length > 0 
        ? forkJoin(departureRequests).pipe(
            map((departureArrays: IDepartureResponse[][]) => {
              const allDepartures = departureArrays.flat();
              const tripTypeNames: string[] = [];
              
              allDepartures.forEach((departure: IDepartureResponse) => {
                if (departure.tripTypeId && this.tripTypesMap.size > 0) {
                  const tripTypeInfo = this.tripTypesMap.get(departure.tripTypeId);
                  if (tripTypeInfo && !tripTypeNames.includes(tripTypeInfo.name)) {
                    tripTypeNames.push(tripTypeInfo.name);
                  }
                }
              });
              
              return tripTypeNames;
            }),
            catchError(() => of([]))
          )
        : of([]);
    }),
    catchError(() => of([]))
  );
}

  private loadTripTypes(): Observable<void> {
    return this.tripTypeService.getActiveTripTypes().pipe(
      map((tripTypes: ITripTypeResponse[]) => {
        this.tripTypesMap.clear();
        tripTypes.forEach(tripType => {
          const abbreviation = tripType.name.charAt(0).toUpperCase();
          
          this.tripTypesMap.set(tripType.id, {
            ...tripType,
            abbreviation: abbreviation
          });
        });
        
      }),
      catchError((error) => {
        return of(undefined);
      })
    );
  }

  private processTourTripTypes(departures: IDepartureResponse[]): void {
    const tripTypes: TourTripType[] = [];
  
    if (this.tripTypesMap.size > 0 && departures && departures.length > 0) {
      departures.forEach((departure: IDepartureResponse) => {
        if (departure.tripTypeId) {
          const tripTypeInfo = this.tripTypesMap.get(departure.tripTypeId);
          if (tripTypeInfo && !tripTypes.some(t => t.code === tripTypeInfo.code)) {
            tripTypes.push({
              name: tripTypeInfo.name,
              code: tripTypeInfo.code,
              color: tripTypeInfo.color,
              abbreviation: tripTypeInfo.abbreviation
            });
          }
        }
      });
    }
  
    this.tourTripTypes = tripTypes;
    
  }

  private loadTourTripTypes(tourId: number): void {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };
  
    this.itineraryService.getAll(itineraryFilters, false).pipe(
      switchMap((itineraries) => {
        if (itineraries.length === 0) {
          return of([] as IDepartureResponse[]);
        }
  
        const departureRequests = itineraries.map((itinerary) =>
          this.departureService.getByItinerary(itinerary.id, false).pipe(
            catchError(() => of([] as IDepartureResponse[]))
          )
        );
  
        return departureRequests.length > 0 
          ? forkJoin(departureRequests).pipe(
              map((departureArrays: IDepartureResponse[][]) => {
                return departureArrays.flat();
              })
            )
          : of([] as IDepartureResponse[]);
      }),
      catchError(() => of([] as IDepartureResponse[]))
    ).subscribe((departures: IDepartureResponse[]) => {
      this.processTourTripTypes(departures);
    });
  }

  private loadTourBySlug(slug: string): void {
    this.loading = true;
    this.error = null;
  
    this.loadTripTypes().pipe(
      switchMap(() => {
        return this.tourService.getTours({ slug, filterByVisible: !this.preview });
      }),
      catchError((err: Error) => {
        this.error = 'Error al cargar el tour. Por favor, inténtalo de nuevo más tarde.';
        return of([]);
      })
    ).subscribe((tours: Tour[]) => {
      if (tours && tours.length > 0) {
        this.tour = tours[0];
        
        if (this.tour.name) {
          this.titleService.setTitle(`${this.tour.name} - Different Roads`);
        }
        
        this.loadTourTripTypes(this.tour.id!);
        
        this.trackViewItem(this.tour);
      } else {
        this.error = 'No se encontró el tour solicitado';
      }
      this.loading = false;
    });
  }

  onDepartureSelected(event: SelectedDepartureEvent): void {
    this.selectedDepartureEvent = event;
    this.totalPrice = 0;

    this.selectedActivities = [];
    this.showActivitiesStatus = true;

    this.resetActivityTypesAnalysis();
  }

  onActivitySelected(activityHighlight: ActivityHighlight): void {
    const existingIndex: number = this.selectedActivities.findIndex(
      (activity: ActivityHighlight) => activity.id === activityHighlight.id
    );

    if (existingIndex !== -1) {
      this.selectedActivities[existingIndex] = { ...activityHighlight };
    } else {
      this.selectedActivities.push({ ...activityHighlight });
    }

    this.selectedActivities = this.selectedActivities.filter(
      (activity: ActivityHighlight) => activity.added
    );

    this.analyzeActivityTypes();
  }

  private analyzeActivityTypes(): void {
    const addedActivities = this.selectedActivities.filter(
      (activity) => activity.added
    );

    const actCount = addedActivities.filter(
      (activity) => activity.type === 'act'
    ).length;
    const packCount = addedActivities.filter(
      (activity) => activity.type === 'pack'
    ).length;

    this.activityTypesAnalysis = {
      hasAct: actCount > 0,
      hasPack: packCount > 0,
      actCount: actCount,
      packCount: packCount,
    };
  }

  private resetActivityTypesAnalysis(): void {
    this.activityTypesAnalysis = {
      hasAct: false,
      hasPack: false,
      actCount: 0,
      packCount: 0,
    };
  }

  onPriceUpdate(price: number): void {
    this.totalPrice = price;
  }

  onCityUpdate(city: string): void {
    this.selectedCity = city;
  }

  onCitiesLoadingUpdate(loading: boolean): void {
    this.citiesLoading = loading;
  }

  onDepartureUpdate(departure: SelectedDepartureData | null): void {
    this.selectedDepartureData = departure;
  }

  onPassengersUpdate(passengersUpdateData: PassengersUpdateData): void {
    this.totalPassengers =
      passengersUpdateData.adults +
      passengersUpdateData.children +
      passengersUpdateData.babies;

    this.passengersData = {
      adults: passengersUpdateData.adults,
      children: passengersUpdateData.children,
      babies: passengersUpdateData.babies,
    };
  }

  onAgeGroupsUpdate(ageGroupCategories: AgeGroupCategories): void {
    this.ageGroupCategories = ageGroupCategories;
  }

  private trackViewItem(tour: Tour): void {
    if (this.viewItemTracked) {
      return;
    }
    
    this.viewItemTracked = true;
    
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || window.history.state;
    
    const itemListId = state?.['listId'] || '';
    const itemListName = state?.['listName'] || '';
    
    this.getCompleteTourDataForViewItem(tour.id!).pipe(
      switchMap((tourDataForEcommerce: TourDataForEcommerce) => {
        return this.analyticsService.buildEcommerceItemFromTourData(
          tourDataForEcommerce,
          itemListId || 'tour_detail',
          itemListName || 'Detalle de Tour',
          tour.id?.toString()
        ).pipe(
          switchMap((item) => {
            return this.analyticsService.getCurrentUserData().pipe(
              first(),
              map((userData) => ({ item, userData }))
            );
          }),
          catchError(() => {
            return this.analyticsService.buildEcommerceItemFromTourData(
              tourDataForEcommerce,
              itemListId || 'tour_detail',
              itemListName || 'Detalle de Tour',
              tour.id?.toString()
            ).pipe(
              map((item) => ({ item, userData: undefined }))
            );
          })
        );
      }),
      catchError((error) => {
        return of(null);
      })
    ).subscribe((result: { item: any; userData?: any } | null) => {
      if (result && result.item) {
        this.analyticsService.viewItem(
          itemListId || 'tour_detail',
          itemListName || 'Detalle de Tour',
          result.item,
          result.userData
        );
      }
    });
  }
  private getCompleteTourDataForViewItem(tourId: number): Observable<TourDataForEcommerce> {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };
  
    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      concatMap((itineraries) => {
        if (itineraries.length === 0) {
          return of({
            id: tourId,
            days: undefined,
            nights: undefined,
            destination: { continent: undefined, country: undefined },
            monthTags: undefined,
            tourType: undefined,
            tripTypes: undefined
          } as TourDataForEcommerce);
        }
  
        const itineraryDaysRequest = this.itineraryDayService
          .getAll({ itineraryId: itineraries[0].id })
          .pipe(catchError(() => of([] as IItineraryDayResponse[])));
        
        const locationRequest = forkJoin({
          countryLocations: this.tourLocationService.getByTourAndType(tourId, 'COUNTRY').pipe(
            map((response) => Array.isArray(response) ? response : response ? [response] : []),
            catchError(() => of([] as ITourLocationResponse[]))
          ),
          continentLocations: this.tourLocationService.getByTourAndType(tourId, 'CONTINENT').pipe(
            map((response) => Array.isArray(response) ? response : response ? [response] : []),
            catchError(() => of([] as ITourLocationResponse[]))
          )
        }).pipe(
          switchMap(({ countryLocations, continentLocations }) => {
            const locationIds = [
              ...countryLocations.map(tl => tl.locationId),
              ...continentLocations.map(tl => tl.locationId)
            ].filter(id => id !== undefined && id !== null);
            
            if (locationIds.length === 0) {
              return of({ continent: '', country: '' });
            }
            
            return this.locationService.getLocationsByIds(locationIds).pipe(
              map((locations: Location[]) => {
                const countries = countryLocations
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map(tl => locations.find(l => l.id === tl.locationId)?.name)
                  .filter(name => name) as string[];
                
                const continents = continentLocations
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map(tl => locations.find(l => l.id === tl.locationId)?.name)
                  .filter(name => name) as string[];
                
                return {
                  continent: continents.join(', ') || '',
                  country: countries.join(', ') || ''
                };
              }),
              catchError(() => of({ continent: '', country: '' }))
            );
          })
        );
  
        return forkJoin({
          itineraryDays: itineraryDaysRequest,
          locationData: locationRequest,
          monthTags: this.tourService
            .getDepartureMonths(tourId, !this.preview)
            .pipe(catchError(() => of([] as number[]))),
          tour: this.tourService.getById(tourId, false),
          tripTypes: this.getTourTripTypesForAnalytics(tourId)
        }).pipe(
          map(({ itineraryDays, locationData, monthTags, tour, tripTypes }) => {
            const days = itineraryDays.length;
            const nights = days > 0 ? days - 1 : 0;
            
            let tourType = tour.tripTypeId === 1 ? 'FIT' : 'Grupos';
            
            if (tripTypes && tripTypes.length > 0) {
              tourType = tripTypes.join(', ');
            }

            const availableMonths: string[] = Array.isArray(monthTags)
              ? this.tourService.mapDepartureMonthNumbersToNames(
                  monthTags as number[]
                )
              : [];

            return {
              id: tourId,
              tkId: tour.tkId ?? undefined,
              name: tour.name ?? undefined,
              destination: {
                continent: locationData.continent || undefined,
                country: locationData.country || undefined
              },
              days: days > 0 ? days : undefined,
              nights: nights > 0 ? nights : undefined,
              rating: undefined,
              monthTags: availableMonths.length > 0 ? availableMonths : undefined,
              tourType: tourType,
              flightCity: 'Sin vuelo',
              price: tour.minPrice ?? undefined,
              totalPassengers: undefined,
              childrenCount: undefined,
              tripTypes: tripTypes.length > 0 ? tripTypes : undefined
            } as TourDataForEcommerce;
          }),
          catchError(() => of({
            id: tourId,
            days: undefined,
            nights: undefined,
            destination: { continent: undefined, country: undefined },
            monthTags: undefined,
            tourType: undefined,
            tripTypes: undefined
          } as TourDataForEcommerce))
        );
      }),
      catchError(() => of({
        id: tourId,
        days: undefined,
        nights: undefined,
        destination: { continent: undefined, country: undefined },
            monthTags: undefined,
            tourType: undefined,
            tripTypes: undefined
          } as TourDataForEcommerce))
    );
  }

  private getUserData() {
    if (this.authService.isAuthenticatedValue()) {
      const email = this.authService.getUserEmailValue();
      const cognitoId = this.authService.getCognitoIdValue();
      
      const userData = this.analyticsService.getUserData(
        email,
        undefined,
        cognitoId
      );
      return userData;
    }
    return undefined;
  }
}
