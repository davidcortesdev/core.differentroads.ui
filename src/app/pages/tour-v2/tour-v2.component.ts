import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TourService, Tour } from '../../core/services/tour/tour.service';
import { catchError, switchMap, map } from 'rxjs/operators';
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
import { concatMap } from 'rxjs/operators';

// ✅ INTERFACES para tipado fuerte
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

// ✅ NUEVA INTERFACE: Para el departure seleccionado
interface SelectedDepartureData {
  id: number;
  departureDate?: string;
  returnDate?: string;
  price?: number;
  status?: string;
  waitingList?: boolean;
  group?: string;
}

// ✅ NUEVA INTERFACE: Para los datos de actualización de pasajeros
interface PassengersUpdateData {
  adults: number;
  children: number;
  babies: number;
  total: number;
}

// ✅ NUEVA INTERFACE: Para análisis de tipos de actividades
interface ActivityTypesAnalysis {
  hasAct: boolean;
  hasPack: boolean;
  actCount: number;
  packCount: number;
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
  // Total del carrito
  totalPrice: number = 0;
  
  // Flag para evitar disparos duplicados del evento view_item
  private viewItemTracked: boolean = false;

  // Ciudad seleccionada - no debe tener valor inicial
  selectedCity: string = '';

  // ✅ TIPADO FUERTE: Departure seleccionado
  selectedDepartureData: SelectedDepartureData | null = null;

  // Total de pasajeros
  totalPassengers: number = 1;

  // Array para almacenar actividades seleccionadas
  selectedActivities: ActivityHighlight[] = [];

  // Flag para controlar cuándo mostrar el estado de actividades
  showActivitiesStatus: boolean = false;

  selectedActivityPackId: number | null = null; // ✅ AGREGAR
  onActivityPackIdUpdate(activityPackId: number | null): void {
    this.selectedActivityPackId = activityPackId;
  }

  // ✅ NUEVA PROPIEDAD: Análisis de tipos de actividades
  activityTypesAnalysis: ActivityTypesAnalysis = {
    hasAct: false,
    hasPack: false,
    actCount: 0,
    packCount: 0,
  };

  // Propiedades para age groups y datos detallados de pasajeros con tipado fuerte
  passengersData: PassengersData = { adults: 1, children: 0, babies: 0 };
  ageGroupCategories: AgeGroupCategories = {
    adults: { id: null, lowerAge: null, upperAge: null },
    children: { id: null, lowerAge: null, upperAge: null },
    babies: { id: null, lowerAge: null, upperAge: null },
  };

  // Propiedades para datos del tour (analytics)
  tourCountry: string = '';
  tourContinent: string = '';
  tourRating: number | null = null;
  tourDuration: string = '';
  tourTripType: string = '';
  tourProductStyle: string = '';

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
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Tour - Different Roads');
    this.route.paramMap.subscribe((params) => {
      const slug: string | null = params.get('slug');
      
      // Detectar si estamos en modo preview basándonos en la URL
      const currentUrl = this.router.url;
      const isPreview = currentUrl.includes('/preview');
      
      if (slug) {
        // Resetear el flag cuando se navega a un tour diferente
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

  private loadTourBySlug(slug: string): void {
    this.loading = true;
    this.error = null;

    this.tourService
      .getTours({ slug, filterByVisible: !this.preview })
      .pipe(
        catchError((err: Error) => {
          console.error('Error al cargar el tour:', err);
          this.error =
            'Error al cargar el tour. Por favor, inténtalo de nuevo más tarde.';
          return of([]);
        })
      )
      .subscribe((tours: Tour[]) => {
        if (tours && tours.length > 0) {
          this.tour = tours[0];
          
          // Disparar evento view_item cuando se carga el tour exitosamente
          this.trackViewItem(this.tour);
        } else {
          this.error = 'No se encontró el tour solicitado';
        }
        this.loading = false;
      });
  }

  onDepartureSelected(event: SelectedDepartureEvent): void {
    this.selectedDepartureEvent = event;
    // Reset precio al cambiar departure
    this.totalPrice = 0;

    // Limpiar actividades y activar la visualización del estado
    this.selectedActivities = [];
    this.showActivitiesStatus = true; // Activar para mostrar "Sin actividades opcionales"

    // ✅ NUEVO: Reset del análisis de tipos al cambiar departure
    this.resetActivityTypesAnalysis();
  }

  // Manejar selección de actividad desde el componente hijo - MODIFICADO
  onActivitySelected(activityHighlight: ActivityHighlight): void {
    // Actualizar el array de actividades seleccionadas
    const existingIndex: number = this.selectedActivities.findIndex(
      (activity: ActivityHighlight) => activity.id === activityHighlight.id
    );

    if (existingIndex !== -1) {
      // Si ya existe, actualizar el estado
      this.selectedActivities[existingIndex] = { ...activityHighlight };
    } else {
      // Si no existe, agregar nueva actividad
      this.selectedActivities.push({ ...activityHighlight });
    }

    // Remover actividades que ya no están agregadas
    this.selectedActivities = this.selectedActivities.filter(
      (activity: ActivityHighlight) => activity.added
    );

    // ✅ NUEVO: Analizar tipos de actividades después de cada cambio
    this.analyzeActivityTypes();
  }

  // ✅ NUEVO MÉTODO: Analizar tipos de actividades seleccionadas
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

  // ✅ NUEVO MÉTODO: Reset del análisis de tipos
  private resetActivityTypesAnalysis(): void {
    this.activityTypesAnalysis = {
      hasAct: false,
      hasPack: false,
      actCount: 0,
      packCount: 0,
    };
  }

  // Recibir actualización de precio
  onPriceUpdate(price: number): void {
    this.totalPrice = price;
  }

  // Recibir actualización de ciudad
  onCityUpdate(city: string): void {
    this.selectedCity = city;
  }

  // ✅ TIPADO FUERTE: Recibir actualización de departure
  onDepartureUpdate(departure: SelectedDepartureData | null): void {
    this.selectedDepartureData = departure;
  }

  // ✅ TIPADO FUERTE: Recibir actualización del total de pasajeros con interface
  onPassengersUpdate(passengersUpdateData: PassengersUpdateData): void {
    // Calcular total de pasajeros (adultos + niños + bebés)
    this.totalPassengers =
      passengersUpdateData.adults +
      passengersUpdateData.children +
      passengersUpdateData.babies;

    // Guardar datos detallados de pasajeros
    this.passengersData = {
      adults: passengersUpdateData.adults,
      children: passengersUpdateData.children,
      babies: passengersUpdateData.babies,
    };
  }

  // Recibir información de age groups desde el componente TourDeparturesV2Component
  onAgeGroupsUpdate(ageGroupCategories: AgeGroupCategories): void {
    this.ageGroupCategories = ageGroupCategories;
  }

  /**
   * Disparar evento view_item cuando se visualiza la ficha del tour
   * Solo se ejecuta una vez por sesión para evitar duplicados
   */
  private trackViewItem(tour: Tour): void {
    // Evitar disparos duplicados
    if (this.viewItemTracked) {
      return;
    }
    
    // Marcar como trackeado INMEDIATAMENTE antes de hacer cualquier cosa
    this.viewItemTracked = true;
    
    // Obtener contexto de navegación desde el state de la navegación (sin modificar URL)
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || window.history.state;
    
    const itemListId = state?.['listId'] || '';
    const itemListName = state?.['listName'] || '';
    
    // Obtener todos los datos completos del tour usando buildEcommerceItemFromTourData
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
              map((userData) => ({ item, userData }))
            );
          }),
          catchError(() => {
            // Si falla getCurrentUserData, usar el item sin userData
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
        console.error('Error obteniendo datos completos del tour para view_item:', error);
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

  /**
   * Obtiene todos los datos completos del tour desde los servicios adicionales para view_item
   */
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
            tourType: undefined
          } as TourDataForEcommerce);
        }

        // Obtener días de itinerario del primer itinerario disponible
        const itineraryDaysRequest = this.itineraryDayService
          .getAll({ itineraryId: itineraries[0].id })
          .pipe(catchError(() => of([] as IItineraryDayResponse[])));

        // Obtener continent y country
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

        // Obtener departures para extraer monthTags desde las fechas
        const departureRequests = itineraries.map((itinerary) =>
          this.departureService.getByItinerary(itinerary.id, false).pipe(
            catchError(() => of([] as IDepartureResponse[]))
          )
        );

        const monthTagsRequest = departureRequests.length > 0 
          ? forkJoin(departureRequests).pipe(
              map((departureArrays: IDepartureResponse[][]) => {
                const allDepartures = departureArrays.flat();
                const availableMonths: string[] = [];
                
                // Extraer meses de las fechas de departure
                allDepartures.forEach((departure: IDepartureResponse) => {
                  if (departure.departureDate) {
                    const date = new Date(departure.departureDate);
                    const monthIndex = date.getMonth(); // 0-11
                    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    if (monthIndex >= 0 && monthIndex < 12) {
                      const monthName = monthNames[monthIndex];
                      if (!availableMonths.includes(monthName)) {
                        availableMonths.push(monthName);
                      }
                    }
                  }
                });
                
                return availableMonths;
              }),
              catchError(() => of([]))
            )
          : of([]);

        return forkJoin({
          itineraryDays: itineraryDaysRequest,
          locationData: locationRequest,
          monthTags: monthTagsRequest,
          tour: this.tourService.getById(tourId, false)
        }).pipe(
          map(({ itineraryDays, locationData, monthTags, tour }) => {
            const days = itineraryDays.length;
            const nights = days > 0 ? days - 1 : 0;
            const tourType = tour.tripTypeId === 1 ? 'FIT' : 'Grupos';

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
              rating: undefined, // Rating se obtiene de reviews, por ahora undefined
              monthTags: monthTags.length > 0 ? monthTags : undefined,
              tourType: tourType,
              flightCity: 'Sin vuelo',
              price: tour.minPrice ?? undefined,
              totalPassengers: undefined, // No aplica en view_item - usuario aún no ha seleccionado pasajeros
              childrenCount: undefined // No aplica en view_item
            } as TourDataForEcommerce;
          }),
          catchError(() => of({
            id: tourId,
            days: undefined,
            nights: undefined,
            destination: { continent: undefined, country: undefined },
            monthTags: undefined,
            tourType: undefined
          } as TourDataForEcommerce))
        );
      }),
      catchError(() => of({
        id: tourId,
        days: undefined,
        nights: undefined,
        destination: { continent: undefined, country: undefined },
        monthTags: undefined,
        tourType: undefined
      } as TourDataForEcommerce))
    );
  }

  /**
   * Obtener datos del usuario actual si está logueado
   */
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
