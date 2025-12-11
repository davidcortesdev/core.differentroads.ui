import {
  Component,
  Input,
  Output,
  OnInit,
  EventEmitter,
  HostListener,
  ElementRef,
  Renderer2,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  TourService,
  Tour,
} from '../../../../core/services/tour/tour.service';
import {
  TourLocationService,
  ITourLocationResponse,
} from '../../../../core/services/tour/tour-location.service';
import {
  LocationNetService,
  Location,
} from '../../../../core/services/locations/locationNet.service';
import {
  ReservationService,
  ReservationCreate,
  IReservationResponse,
  ReservationCompleteCreate,
  IReservationTravelerData,
} from '../../../../core/services/reservation/reservation.service';
import {
  ReservationTravelerService,
  ReservationTravelerCreate,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerActivityService,
  ReservationTravelerActivityCreate,
} from '../../../../core/services/reservation/reservation-traveler-activity.service';
// ✅ SOLO AGREGANDO: Servicio para paquetes
import {
  ReservationTravelerActivityPackService,
  ReservationTravelerActivityPackCreate,
} from '../../../../core/services/reservation/reservation-traveler-activity-pack.service';
import { Subscription, forkJoin, of, Observable, Subject } from 'rxjs';
import { catchError, map, switchMap, concatMap, takeUntil, finalize } from 'rxjs/operators';
import { TourTagService } from '../../../../core/services/tag/tour-tag.service';
import { TagService } from '../../../../core/services/tag/tag.service';
import { ItineraryService, ItineraryFilters } from '../../../../core/services/itinerary/itinerary.service';
import { ItineraryDayService, IItineraryDayResponse } from '../../../../core/services/itinerary/itinerary-day/itinerary-day.service';
import { DepartureService, IDepartureResponse } from '../../../../core/services/departure/departure.service';
import { TourDataForEcommerce } from '../../../../core/services/analytics/analytics.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ActivityHighlight } from '../../../../shared/components/activity-card/activity-card.component';
import { environment } from '../../../../../environments/environment';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { UsersNetService } from '../../../../core/services/users/usersNet.service';
import { AnalyticsService } from '../../../../core/services/analytics/analytics.service';
import { ReservationStatusService } from '../../../../core/services/reservation/reservation-status.service';
import { ReviewsService } from '../../../../core/services/reviews/reviews.service';
import { TripTypeService, ITripTypeResponse } from '../../../../core/services/trip-type/trip-type.service';
import { TourReviewService } from '../../../../core/services/reviews/tour-review.service';

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

// ✅ INTERFACE: Para análisis de tipos de actividades
interface ActivityTypesAnalysis {
  hasAct: boolean;
  hasPack: boolean;
  actCount: number;
  packCount: number;
}

// ✅ INTERFACE para resultados de creación de actividades
interface ActivityCreationResult {
  success: boolean;
  activity: ActivityHighlight;
  result?: any;
  error?: any;
}

@Component({
  selector: 'app-tour-header-v2',
  standalone: false,
  templateUrl: './tour-header-v2.component.html',
  styleUrls: ['./tour-header-v2.component.scss'],
})
export class TourHeaderV2Component
  implements OnInit, AfterViewInit, OnDestroy, OnChanges
{
  @Input() tourId: number | undefined;
  @Input() totalPrice: number = 0;
  @Input() selectedCity: string = '';
  @Input() citiesLoading: boolean = false;
  @Input() selectedDeparture: any = null;
  @Input() totalPassengers: number = 1;
  @Input() selectedActivities: ActivityHighlight[] = [];
  @Input() showActivitiesStatus: boolean = false;
  @Input() passengersData: PassengersData = {
    adults: 1,
    children: 0,
    babies: 0,
  };
  @Input() ageGroupCategories: AgeGroupCategories = {
    adults: { id: null, lowerAge: null, upperAge: null },
    children: { id: null, lowerAge: null, upperAge: null },
    babies: { id: null, lowerAge: null, upperAge: null },
  };
  @Input() activityTypesAnalysis: ActivityTypesAnalysis = {
    hasAct: false,
    hasPack: false,
    actCount: 0,
    packCount: 0,
  };
  @Input() preview: boolean = false;
  @Input() selectedActivityPackId: number | null = null;
  @Input() tourTripTypes?: {
    name: string;
    code: string;
    color: string;
    abbreviation: string;
  }[];
  // Trip types obtenidos directamente en el componente
  tourTripTypesLocal: {
    name: string;
    code: string;
    color: string;
    abbreviation: string;
  }[] = [];
  isLoadingTripTypes = false;
  // Tour data
  tour: Partial<Tour> = {};

  // Información geográfica
  country: string = '';
  continent: string = '';

  // Scroll effect
  private isScrolled = false;
  private headerHeight = 0;
  private subscriptions = new Subscription();
  // Cancellation token independiente para la petición de trip types
  private tripTypesDestroy$ = new Subject<void>();

  // Estado para controlar el proceso de reservación
  isCreatingReservation = false;

  // Propiedad para detectar modo standalone
  isStandaloneMode: boolean = false;

  // Propiedades para rating y reviews
  averageRating: number | null = null;
  reviewCount: number = 0;
  isLoadingRating: boolean = false;

  private lastLoadedTourId: number | undefined = undefined;

  constructor(
    private tourService: TourService,
    private tourLocationService: TourLocationService,
    private locationNetService: LocationNetService,
    private reservationService: ReservationService,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerActivityService: ReservationTravelerActivityService,
    // ✅ SOLO AGREGANDO: Servicio para paquetes
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private tourTagService: TourTagService,
    private tagService: TagService,
    private itineraryService: ItineraryService,
    private itineraryDayService: ItineraryDayService,
    private departureService: DepartureService,
    private el: ElementRef,
    private renderer: Renderer2,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService,
    private analyticsService: AnalyticsService,
    private reservationStatusService: ReservationStatusService,
    private reviewsService: ReviewsService,
    private tripTypeService: TripTypeService,
    private tourReviewService: TourReviewService
  ) {}

  ngOnInit() {
    // Resetear el flag al inicializar para evitar estados bloqueados
    this.isCreatingReservation = false;
    // Detectar si estamos en modo standalone
    this.detectStandaloneMode();
    if (this.tourId) {
      this.loadTourData(this.tourId);
      // Cargar trip types usando el nuevo endpoint
      this.loadTripTypes(this.tourId);
      // NO cargar rating aquí - se carga en ngOnChanges para evitar duplicados
      // this.loadRatingAndReviewCount(this.tourId);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tourId'] && changes['tourId'].currentValue) {
      this.loadTourData(changes['tourId'].currentValue);
      // Cargar trip types usando el nuevo endpoint
      this.loadTripTypes(changes['tourId'].currentValue);
      // Cargar rating y reviews
      this.loadRatingAndReviewCount(changes['tourId'].currentValue);
    }
  }

  ngAfterViewInit() {
    this.setHeaderHeight();
  }

  ngOnDestroy() {
    // Cancelar petición de trip types
    this.tripTypesDestroy$.next();
    this.tripTypesDestroy$.complete();
    this.subscriptions.unsubscribe();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.handleScrollEffect();
  }

  get hasPrice(): boolean {
    return this.totalPriceWithActivities > 0;
  }

  get totalPriceWithActivities(): number {
    const activitiesTotal = this.selectedActivities
      .filter((activity) => activity.added)
      .reduce((sum, activity) => sum + (activity.price || 0), 0);

    return this.totalPrice + activitiesTotal;
  }

  get addedActivities(): ActivityHighlight[] {
    return this.selectedActivities.filter((activity) => activity.added);
  }

  get hasAddedActivities(): boolean {
    return this.addedActivities.length > 0;
  }

  get shouldShowActivitiesStatus(): boolean {
    return (
      this.showActivitiesStatus &&
      this.selectedDeparture &&
      this.selectedDeparture.departureDate
    );
  }

  // ✅ GETTER: Verificar si hay fecha seleccionada
  get hasSelectedDate(): boolean {
    return !!(
      this.selectedDeparture &&
      this.selectedDeparture.departureDate
    );
  }

  // ✅ GETTER: Verificar si todos los datos del header están listos
  get isHeaderDataReady(): boolean {
    // Verificar que las ciudades ya no están cargando
    if (this.citiesLoading) {
      return false;
    }
    
    // Verificar que hay ciudad seleccionada
    if (!this.selectedCity || this.selectedCity.trim() === '') {
      return false;
    }
    
    // Verificar que hay departure seleccionado con fecha
    if (!this.selectedDeparture || !this.selectedDeparture.departureDate) {
      return false;
    }
    
    // Verificar que el precio se ha establecido (puede ser 0, pero debe haberse establecido)
    // Si totalPrice es 0 pero citiesLoading es false y hay ciudad, significa que ya se procesó
    // Por lo tanto, consideramos que está listo si citiesLoading es false
    
    return true;
  }

  // ✅ GETTER: Verificar si el departure seleccionado es reservable
  get isDepartureBookable(): boolean {
    if (!this.selectedDeparture) {
      return false;
    }
    
    // Verificar isBookable del departure
    // Si isBookable es explícitamente false, no es reservable
    if (this.selectedDeparture.isBookable === false) {
      return false;
    }
    
    // Si isBookable es true o undefined, es reservable
    return true;
  }

  // ✅ GETTER dinámico para texto de actividades
  get activitiesStatusText(): string {
    if (!this.hasAddedActivities) {
      return 'Sin actividades opcionales';
    }

    const analysis = this.activityTypesAnalysis;

    if (analysis.hasAct && analysis.hasPack) {
      return 'Con actividades opcionales y paquetes';
    }

    if (analysis.hasAct && !analysis.hasPack) {
      return 'Con actividades opcionales';
    }

    if (!analysis.hasAct && analysis.hasPack) {
      return 'Con paquete de actividades';
    }

    return 'Con actividades opcionales';
  }

  get activitiesDetailText(): string {
    if (!this.hasAddedActivities) {
      return '';
    }

    const analysis = this.activityTypesAnalysis;
    const parts: string[] = [];

    if (analysis.hasAct) {
      parts.push(
        `${analysis.actCount} actividad${analysis.actCount !== 1 ? 'es' : ''}`
      );
    }

    if (analysis.hasPack) {
      parts.push(
        `${analysis.packCount} paquete${analysis.packCount !== 1 ? 's' : ''}`
      );
    }

    return parts.join(' y ');
  }

  get formattedPrice(): string {
    if (this.totalPriceWithActivities <= 0) return '';

    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(this.totalPriceWithActivities);
  }

  get formattedFlights(): string {
    return this.selectedCity || '';
  }

  get formattedDepartureWithType(): string {
    if (!this.selectedDeparture || !this.selectedDeparture.departureDate)
      return '';

    try {
      const dateString = this.selectedDeparture.departureDate;
      const dateParts = dateString.split('-');

      if (dateParts.length !== 3) return dateString;

      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);

      const date = new Date(year, month, day);

      const formattedDate = date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
      });

      const isSingle = this.selectedDeparture.group
        ?.toLowerCase()
        .includes('single');

      if (isSingle) {
        return `${formattedDate} (S) - Single`;
      }

      return formattedDate;
    } catch {
      return this.selectedDeparture.departureDate;
    }
  }

  // Detectar si estamos en modo standalone
  private detectStandaloneMode(): void {
    // Verificar si la URL contiene 'standalone'
    const currentPath = window.location.pathname;
    this.isStandaloneMode = currentPath.includes('/standalone/');
  }

  // Cargar rating promedio y conteo de reviews desde TourReview con ReviewTypeId = 1 (GENERAL)
  private loadRatingAndReviewCount(tourId: number): void {
    if (!tourId) return;
    
    // Evitar llamadas duplicadas para el mismo tourId
    if (this.lastLoadedTourId === tourId) {
      return;
    }
    this.lastLoadedTourId = tourId;

    this.isLoadingRating = true;

    // Usar TourReviewService con ReviewTypeId = 1 (GENERAL) directamente
    const filters = {
      tourId: [tourId],
      reviewTypeId: [1], // ID 1 para tipo GENERAL
      isActive: true
    };

    this.subscriptions.add(
      this.tourReviewService.getAverageRating(filters).pipe(
        catchError((error) => {
          console.error('Error al cargar rating promedio desde TourReview:', error);
          this.averageRating = null;
          this.reviewCount = 0;
          this.isLoadingRating = false;
          return of({ averageRating: 0, totalReviews: 0 });
        })
      ).subscribe({
        next: (ratingResponse) => {
          if (ratingResponse) {
            this.averageRating = ratingResponse.averageRating > 0 
              ? Math.round(ratingResponse.averageRating * 10) / 10 
              : null;
            this.reviewCount = ratingResponse.totalReviews || 0;
          } else {
            this.averageRating = null;
            this.reviewCount = 0;
          }
          this.isLoadingRating = false;
        },
        error: (error) => {
          console.error('Error cargando rating y reviews desde TourReview:', error);
          this.averageRating = null;
          this.reviewCount = 0;
          this.isLoadingRating = false;
        }
      })
    );
  }

  // Formatear el número de reviews
  getFormattedReviewCount(): string {
    if (this.reviewCount === 0) return '';
    return `${this.reviewCount} ${this.reviewCount === 1 ? 'Review' : 'Reviews'}`;
  }

  // Extraer el prefijo del título (todo antes del último ":")
  getTitlePrefix(): string {
    const tourName = this.tour.name || '';
    const lastColonIndex = tourName.lastIndexOf(':');
    
    if (lastColonIndex === -1) {
      return 'Detalles del Tour: ';
    }
    
    return tourName.substring(0, lastColonIndex + 1) + ' ';
  }

  // Extraer el título sin prefijo (todo después del último ":")
  getTitleWithoutPrefix(): string {
    const tourName = this.tour.name || '';
    const lastColonIndex = tourName.lastIndexOf(':');
    
    if (lastColonIndex === -1) {
      return tourName;
    }
    
    return tourName.substring(lastColonIndex + 1).trim();
  }

  // Hacer scroll a la sección de reviews usando el ID, teniendo en cuenta el header flotante
  scrollToReviews(): void {
    const reviewsSection = document.getElementById('tour-reviews');
    if (reviewsSection) {
      // Obtener la altura del header flotante (si está fijo)
      const headerElement = this.el.nativeElement.querySelector('.tour-header');
      const headerHeight = headerElement ? headerElement.offsetHeight : 0;
      
      // Calcular la posición del elemento menos la altura del header
      const elementPosition = reviewsSection.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 150; // 100px de margen adicional para mejor visibilidad
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  // Obtener tooltip para el botón de reservar
  getBookingTooltip(): string {
    if (this.preview) {
      return 'No es posible reservar un tour en modo preview';
    }
    if (this.isStandaloneMode) {
      return 'Botón deshabilitado, reserva desde la lista de tours.';
    }
    if (!this.hasSelectedDate) {
      return 'Debes seleccionar una fecha de salida para poder reservar';
    }
    if (!this.isDepartureBookable) {
      return 'Esta salida no tiene disponibilidad';
    }
    return '';
  }

  /**
   * Carga los tipos de viaje usando el nuevo endpoint /api/Tour/{id}/triptype-ids
   * Esta petición es independiente y tiene su propio cancellation token
   * @param tourId ID del tour
   */
  private loadTripTypes(tourId: number): void {
    if (!tourId) return;

    this.isLoadingTripTypes = true;

    // Petición independiente con su propio cancellation token
    this.tourService
      .getTripTypeIds(tourId, !this.preview)
      .pipe(
        takeUntil(this.tripTypesDestroy$),
        catchError((error) => {
          console.error('Error al obtener tripTypeIds del tour:', error);
          return of([]);
        })
      )
      .subscribe((tripTypeIds: number[]) => {
        if (tripTypeIds.length === 0) {
          this.isLoadingTripTypes = false;
          return;
        }

        // Obtener todos los trip types usando la lista de IDs directamente
        // Crear peticiones para cada ID y combinarlas
        const tripTypeRequests = tripTypeIds.map((id) =>
          this.tripTypeService.getById(id).pipe(
            takeUntil(this.tripTypesDestroy$),
            catchError((error) => {
              console.error(`Error al obtener trip type con ID ${id}:`, error);
              return of(null);
            })
          )
        );

        forkJoin(tripTypeRequests)
          .pipe(
            takeUntil(this.tripTypesDestroy$),
            catchError((error) => {
              console.error('Error al obtener detalles de trip types:', error);
              return of([]);
            }),
            finalize(() => {
              this.isLoadingTripTypes = false;
            })
          )
          .subscribe((tripTypes: (ITripTypeResponse | null)[]) => {
            // Filtrar nulls y mapear a el formato esperado
            const validTripTypes = tripTypes.filter(
              (tt): tt is ITripTypeResponse => tt !== null
            );

            const mappedTripTypes = validTripTypes.map((tripType) => ({
              name: tripType.name,
              code: tripType.code,
              color: tripType.color || '#D3D3D3', // Gris clarito si el color es null
              abbreviation: tripType.abbreviation || tripType.name.charAt(0).toUpperCase(),
            }));

            // Actualizar trip types locales
            this.tourTripTypesLocal = mappedTripTypes;
          });
      });
  }

  private loadTourData(tourId: number) {
    
    // ✅ LÓGICA: Si es preview, buscar tours no visibles también
    const filterByVisible = !this.preview;
    
    this.subscriptions.add(
      this.tourService.getById(tourId, filterByVisible).pipe(
        switchMap((tourData) => {
          this.tour = { ...tourData };
          this.loadCountryAndContinent(tourId);
          
          // Obtener el primer tag visible del tour
          return this.tourTagService.getByTourAndType(tourId, 'VISIBLE').pipe(
            switchMap((tourTags) => {
              if (tourTags.length > 0 && tourTags[0]?.tagId && tourTags[0].tagId > 0) {
                const firstTagId = tourTags[0].tagId;
                return this.tagService.getById(firstTagId).pipe(
                  map((tag) => tag?.name || null),
                  catchError(() => of(null))
                );
              }
              return of(null);
            }),
            catchError(() => of(null)),
            map((tagName) => {
              if (tagName && tagName.trim().length > 0) {
                (this.tour as any).tag = tagName.trim();
              }
              return tourData;
            })
          );
        }),
        catchError((error) => {
          console.error('💥 Error cargando tour:', error);
          return of(null);
        })
      ).subscribe()
    );
  }

  private loadCountryAndContinent(tourId: number): void {
    this.subscriptions.add(
      forkJoin([
        this.tourLocationService.getByTourAndType(tourId, 'COUNTRY').pipe(
          map((response) =>
            Array.isArray(response) ? response : response ? [response] : []
          ),
          catchError((error) => {
            return of([]);
          })
        ),
        this.tourLocationService.getByTourAndType(tourId, 'CONTINENT').pipe(
          map((response) =>
            Array.isArray(response) ? response : response ? [response] : []
          ),
          catchError((error) => {
            return of([]);
          })
        ),
      ])
        .pipe(
          switchMap(([countryLocations, continentLocations]) => {
            const validCountryLocations = countryLocations.filter(
              (loc) => loc && loc.id && loc.locationId
            );
            const validContinentLocations = continentLocations.filter(
              (loc) => loc && loc.id && loc.locationId
            );

            const allLocationIds = [
              ...validCountryLocations.map((tl) => tl.locationId),
              ...validContinentLocations.map((tl) => tl.locationId),
            ];
            const uniqueLocationIds = [...new Set(allLocationIds)];

            if (uniqueLocationIds.length === 0) {
              return of({
                countryLocations: validCountryLocations,
                continentLocations: validContinentLocations,
                locations: [],
              });
            }

            return this.locationNetService
              .getLocationsByIds(uniqueLocationIds)
              .pipe(
                map((locations) => ({
                  countryLocations: validCountryLocations,
                  continentLocations: validContinentLocations,
                  locations,
                })),
                catchError((error) => {
                  return of({
                    countryLocations: validCountryLocations,
                    continentLocations: validContinentLocations,
                    locations: [],
                  });
                })
              );
          })
        )
        .subscribe(({ countryLocations, continentLocations, locations }) => {
          const locationsMap = new Map<number, Location>();
          locations.forEach((location) => {
            locationsMap.set(location.id, location);
          });

          const countries = countryLocations
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((tl) => locationsMap.get(tl.locationId)?.name)
            .filter((name) => name) as string[];

          const continents = continentLocations
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((tl) => locationsMap.get(tl.locationId)?.name)
            .filter((name) => name) as string[];

          this.country = countries.join(', ');
          this.continent = continents.join(', ');
        })
    );
  }

  private setHeaderHeight() {
    const headerElement = this.el.nativeElement.querySelector('.tour-header');
    if (headerElement) {
      this.headerHeight = headerElement.offsetHeight;
      document.documentElement.style.setProperty(
        '--header-height',
        `${this.headerHeight}px`
      );
    }
  }

  private handleScrollEffect() {
    const scrollPosition =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    const headerElement = this.el.nativeElement.querySelector('.tour-header');

    if (!headerElement) return;

    const scrollThreshold = 100;

    if (scrollPosition > scrollThreshold && !this.isScrolled) {
      this.renderer.addClass(headerElement, 'scrolled');
      this.renderer.addClass(this.el.nativeElement, 'header-fixed');
      this.isScrolled = true;
    } else if (scrollPosition <= scrollThreshold && this.isScrolled) {
      this.renderer.removeClass(headerElement, 'scrolled');
      this.renderer.removeClass(this.el.nativeElement, 'header-fixed');
      this.isScrolled = false;
    }
  }

  onCountryClick(event: MouseEvent, fullCountryText: string): void {
    event.preventDefault();

    const clickedCountry = this.getClickedCountry(event, fullCountryText);
    if (clickedCountry) {
      this.router.navigate(['/tours'], {
        queryParams: {
          destination: clickedCountry,
        },
      });
    }
  }

  private getClickedCountry(
    event: MouseEvent,
    fullText: string
  ): string | null {
    const target = event.target as HTMLElement;
    const countries = fullText
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c);

    if (countries.length === 1) {
      return countries[0];
    }

    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;

    const tempElement = document.createElement('span');
    tempElement.style.visibility = 'hidden';
    tempElement.style.position = 'absolute';
    tempElement.style.fontSize = window.getComputedStyle(target).fontSize;
    tempElement.style.fontFamily = window.getComputedStyle(target).fontFamily;
    document.body.appendChild(tempElement);

    let currentX = 0;
    let clickedCountry: string | null = null;

    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      const separator = i < countries.length - 1 ? ', ' : '';
      const textToMeasure = country + separator;

      tempElement.textContent = textToMeasure;
      const textWidth = tempElement.offsetWidth;

      if (clickX >= currentX && clickX <= currentX + textWidth) {
        tempElement.textContent = country;
        const countryWidth = tempElement.offsetWidth;

        if (clickX <= currentX + countryWidth) {
          clickedCountry = country;
          break;
        }
      }

      currentX += textWidth;
    }

    document.body.removeChild(tempElement);
    return clickedCountry;
  }

  @Output() bookingClick = new EventEmitter<void>();

  // ✅ MÉTODO: Validar actividad
  private validateActivity(activity: ActivityHighlight): {
    isValid: boolean;
    error?: string;
  } {
    const activityId = parseInt(activity.id);

    if (isNaN(activityId) || activityId <= 0) {
      return {
        isValid: false,
        error: `ID de actividad inválido: ${activity.id}`,
      };
    }

    if (
      !activity.type ||
      (activity.type !== 'act' && activity.type !== 'pack')
    ) {
      return {
        isValid: false,
        error: `Tipo de actividad inválido: ${activity.type}. Debe ser 'act' o 'pack'`,
      };
    }

    // ✅ VALIDACIÓN ADICIONAL: Verificar que el título no esté vacío
    if (!activity.title || activity.title.trim() === '') {
      return {
        isValid: false,
        error: `Título de actividad vacío para ID: ${activity.id}`,
      };
    }

    return { isValid: true };
  }

  // ✅ MÉTODO NUEVO: Verificar si ya existe la actividad/paquete para un viajero
  private checkExistingActivity(
    travelerId: number,
    activity: ActivityHighlight
  ): Observable<boolean> {
    if (activity.type === 'act') {
      // Verificar si ya existe la actividad individual
      return this.reservationTravelerActivityService
        .getByReservationTraveler(travelerId)
        .pipe(
          map((existingActivities) => {
            const exists = existingActivities.some(
              (existing) => existing.activityId === parseInt(activity.id)
            );

            return exists;
          }),
          catchError((error) => {
            console.error('❌ Error verificando actividad existente:', error);
            return of(false); // En caso de error, permitir crear
          })
        );
    } else if (activity.type === 'pack') {
      // Verificar si ya existe el paquete
      return this.reservationTravelerActivityPackService
        .getByReservationTraveler(travelerId)
        .pipe(
          map((existingPacks) => {
            const exists = existingPacks.some(
              (existing) => existing.activityPackId === parseInt(activity.id)
            );

            return exists;
          }),
          catchError((error) => {
            console.error('❌ Error verificando paquete existente:', error);
            return of(false); // En caso de error, permitir crear
          })
        );
    }

    return of(false);
  }

  // ✅ MÉTODO MODIFICADO: Crear actividad individual con verificación de duplicados
  private createTravelerActivity(
    travelerId: number,
    activity: ActivityHighlight
  ): Observable<ActivityCreationResult> {
    const validation = this.validateActivity(activity);

    if (!validation.isValid) {
      console.error(
        '❌ Booking - Actividad inválida:',
        validation.error,
        activity
      );
      return of({
        success: false,
        activity: activity,
        error: validation.error,
      });
    }

    // ✅ VALIDACIÓN ADICIONAL: Verificar que no sea un paquete
    if (activity.type !== 'act') {
      console.error(
        '❌ Booking - Error de tipo: Se intentó crear actividad individual con tipo incorrecto:',
        activity.type,
        activity
      );
      return of({
        success: false,
        activity: activity,
        error: `Tipo incorrecto para actividad individual: ${activity.type}`,
      });
    }

    // ✅ VERIFICAR DUPLICADOS antes de crear
    return this.checkExistingActivity(travelerId, activity).pipe(
      switchMap((exists) => {
        if (exists) {

          return of({
            success: true,
            activity: activity,
            result: { message: 'Actividad ya existía' },
          });
        }

        const travelerActivityData: ReservationTravelerActivityCreate = {
          id: 0,
          reservationTravelerId: travelerId,
          activityId: parseInt(activity.id),
        };

        return this.reservationTravelerActivityService
          .create(travelerActivityData)
          .pipe(
            map((result) => {

              return {
                success: true,
                activity: activity,
                result: result,
              };
            }),
            catchError((error) => {

              return of({
                success: false,
                activity: activity,
                error: error,
              });
            })
          );
      })
    );
  }

  // ✅ MÉTODO MODIFICADO: Crear paquete de actividades con verificación de duplicados
  private createTravelerActivityPack(
    travelerId: number,
    activity: ActivityHighlight
  ): Observable<ActivityCreationResult> {
    const validation = this.validateActivity(activity);

    if (!validation.isValid) {
      console.error(
        '❌ Booking - Paquete inválido:',
        validation.error,
        activity
      );
      return of({
        success: false,
        activity: activity,
        error: validation.error,
      });
    }

    // ✅ VALIDACIÓN ADICIONAL: Verificar que sea un paquete
    if (activity.type !== 'pack') {
      console.error(
        '❌ Booking - Error de tipo: Se intentó crear paquete con tipo incorrecto:',
        activity.type,
        activity
      );
      return of({
        success: false,
        activity: activity,
        error: `Tipo incorrecto para paquete: ${activity.type}`,
      });
    }

    // ✅ VERIFICAR DUPLICADOS antes de crear
    return this.checkExistingActivity(travelerId, activity).pipe(
      switchMap((exists) => {
        if (exists) {

          return of({
            success: true,
            activity: activity,
            result: { message: 'Paquete ya existía' },
          });
        }

        const travelerActivityPackData: ReservationTravelerActivityPackCreate =
          {
            id: 0,
            reservationTravelerId: travelerId,
            activityPackId: parseInt(activity.id), // ✅ activityPackId para paquetes
          };

        return this.reservationTravelerActivityPackService
          .create(travelerActivityPackData)
          .pipe(
            map((result) => {

              return {
                success: true,
                activity: activity,
                result: result,
              };
            }),
            catchError((error) => {
              console.error(
                '❌ Booking - Error creando paquete de actividades:',
                {
                  travelerId,
                  activityPackId: activity.id,
                  activityTitle: activity.title,
                  error: error,
                }
              );

              return of({
                success: false,
                activity: activity,
                error: error,
              });
            })
          );
      })
    );
  }

  // ✅ MÉTODO MODIFICADO: Procesar actividades usando servicios apropiados según tipo
  private processActivitiesForTravelers(travelers: any[]): Observable<{
    successful: number;
    failed: number;
    details: ActivityCreationResult[];
  }> {
    const addedActivities = this.addedActivities;
    const departureActivityPackId = this.selectedActivityPackId;

    // ✅ COMBINAR actividades manuales + paquete automático del departure
    const allActivitiesToProcess: Array<{
      activity: ActivityHighlight;
      isFromDeparture: boolean;
    }> = [];

    // 1. Agregar actividades seleccionadas manualmente
    addedActivities.forEach((activity) => {
      allActivitiesToProcess.push({ activity, isFromDeparture: false });
    });

    // 2. Agregar paquete automático del departure si existe
    if (departureActivityPackId && departureActivityPackId > 0) {
      const departurePack: ActivityHighlight = {
        id: departureActivityPackId.toString(),
        title: 'Paquete de actividades del departure',
        description: 'Paquete automático incluido en el departure',
        image: '',
        recommended: false,
        optional: false,
        added: true,
        price: 0, // Precio incluido en el departure
        imageAlt: 'Paquete del departure',
        type: 'pack',
      };

      allActivitiesToProcess.push({
        activity: departurePack,
        isFromDeparture: true,
      });

    }

    if (allActivitiesToProcess.length === 0) {
      return of({ successful: 0, failed: 0, details: [] });
    }

    // ✅ OPTIMIZACIÓN: Crear un solo registro por actividad/paquete por viajero
    const activityObservables: Observable<ActivityCreationResult>[] = [];

    // Para cada actividad/paquete (manual + automático), crear un registro por cada viajero
    allActivitiesToProcess.forEach(({ activity, isFromDeparture }) => {
      travelers.forEach((traveler: any) => {
        // ✅ USAR SERVICIO APROPIADO SEGÚN TIPO
        if (activity.type === 'act') {
          activityObservables.push(
            this.createTravelerActivity(traveler.id, activity)
          );
        } else if (activity.type === 'pack') {
          activityObservables.push(
            this.createTravelerActivityPack(traveler.id, activity)
          );
        }
      });
    });

    if (activityObservables.length === 0) {
      return of({ successful: 0, failed: 0, details: [] });
    }

    return forkJoin(activityObservables).pipe(
      map((results: ActivityCreationResult[]) => {
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        return { successful, failed, details: results };
      }),
      catchError((error) => {
        console.error('💥 Booking - Error fatal en procesamiento:', error);
        throw error;
      })
    );
  }

  onBookingClick(): void {
    // Bloquear desde modo standalone
    if (this.isStandaloneMode) {
      return;
    }

    // Bloquear desde checkout: este botón solo debe funcionar en la página del tour
    const currentUrl = this.router.url || window.location.pathname || '';
    if (currentUrl.startsWith('/checkout')) {
      return;
    }

    // Disparar evento add_to_cart incluso si no hay fecha seleccionada
    this.trackAddToCart();

    if (!this.selectedDeparture || !this.selectedDeparture.id) {
      alert('Por favor, selecciona una fecha de salida antes de continuar.');
      return;
    }

    if (!this.tourId) {
      alert('Error: No se pudo identificar el tour.');
      return;
    }

    // ✅ MOSTRAR RESUMEN DE ACTIVIDADES ANTES DE RESERVAR
    if (
      this.hasAddedActivities ||
      (this.selectedActivityPackId && this.selectedActivityPackId > 0)
    ) {
      const activitySummary = this.getActivitySummary();

    }

    // Evitar clicks repetidos solo mientras se está creando la reserva
    if (this.isCreatingReservation) {
      return;
    }

    // Obtener el ID del usuario logueado
    this.authService.getCognitoId().subscribe({
      next: (cognitoId) => {
        if (cognitoId) {
          // Buscar el usuario por Cognito ID para obtener su ID en la base de datos
          this.usersNetService.getUsersByCognitoId(cognitoId).subscribe({
            next: (users) => {
              let userId: number | null = null; // Valor por defecto si no se encuentra el usuario

              if (users && users.length > 0) {
                userId = users[0].id;
              }

              this.createReservation(userId);
            },
            error: (error) => {
              console.error('Error buscando usuario por Cognito ID:', error);
              // El flag se manejará dentro de createReservation
              this.createReservation(null); // Usar null en caso de error
            },
          });
        } else {
          this.createReservation(null);
        }
      },
      error: (error) => {
        console.error('Error obteniendo Cognito ID:', error);
        // El flag se manejará dentro de createReservation
        this.createReservation(null); // Usar null en caso de error
      },
    });
  }

  /**
   * Disparar evento add_to_cart cuando el usuario hace clic en "Reservar mi tour"
   */
  private trackAddToCart(): void {
    if (!this.tour || !this.tour.id) return;

    // Obtener contexto de navegación desde el state del router (sin modificar URL)
    const state = window.history.state;
    const itemListId = state?.['listId'] || '';
    const itemListName = state?.['listName'] || '';

    // Obtener todos los datos completos del tour usando buildEcommerceItemFromTourData
    this.getCompleteTourDataForAddToCart(this.tour.id).pipe(
      switchMap((tourDataForEcommerce: TourDataForEcommerce) => {
        // Actualizar con datos del departure seleccionado y pasajeros
        if (this.selectedDeparture) {
          tourDataForEcommerce.departureDate = this.selectedDeparture.departureDate || undefined;
          tourDataForEcommerce.returnDate = this.selectedDeparture.returnDate || undefined;
          tourDataForEcommerce.price = this.selectedDeparture.price || tourDataForEcommerce.price;
          tourDataForEcommerce.flightCity = this.selectedDeparture.city || 'Sin vuelo';
        }
        if (this.passengersData) {
          tourDataForEcommerce.totalPassengers = this.passengersData.adults || undefined;
          tourDataForEcommerce.childrenCount = ((this.passengersData.children || 0) + (this.passengersData.babies || 0)).toString() || undefined;
        }
        // Obtener actividades seleccionadas
        if (this.addedActivities && this.addedActivities.length > 0) {
          tourDataForEcommerce.activitiesText = this.addedActivities.map(a => a.title || '').filter(t => t).join(', ') || undefined;
        }

        return this.analyticsService.buildEcommerceItemFromTourData(
          tourDataForEcommerce,
          itemListId || 'tour_detail',
          itemListName || 'Detalle de Tour',
          this.tour.id?.toString()
        ).pipe(
          switchMap((item) => {
            // Actualizar item_variant con ciudad del departure
            const itemVariant = this.selectedDeparture?.city 
              ? `${tourDataForEcommerce.tkId || this.tour.id} - ${this.selectedDeparture.city}`
              : item.item_variant;
            
            const adjustedItem = {
              ...item,
              item_variant: itemVariant,
              price: this.selectedDeparture?.price || tourDataForEcommerce.price || item.price || 0
            };

            return this.analyticsService.getCurrentUserData().pipe(
              map((userData) => ({ item: adjustedItem, userData }))
            );
          }),
          catchError(() => {
            // Si falla getCurrentUserData, usar el item sin userData
            return this.analyticsService.buildEcommerceItemFromTourData(
              tourDataForEcommerce,
              itemListId || 'tour_detail',
              itemListName || 'Detalle de Tour',
              this.tour.id?.toString()
            ).pipe(
              map((item) => {
                const itemVariant = this.selectedDeparture?.city 
                  ? `${tourDataForEcommerce.tkId || this.tour.id} - ${this.selectedDeparture.city}`
                  : item.item_variant;
                return { 
                  item: {
                    ...item,
                    item_variant: itemVariant,
                    price: this.selectedDeparture?.price || tourDataForEcommerce.price || item.price || 0
                  }, 
                  userData: undefined 
                };
              })
            );
          })
        );
      }),
      catchError((error) => {
        console.error('Error obteniendo datos completos del tour para add_to_cart:', error);
        return of(null);
      })
    ).subscribe((result) => {
      if (result && result.item) {
        const price = this.selectedDeparture?.price || this.tour.minPrice || 0;
        this.analyticsService.addToCart(
          'EUR',
          price,
          result.item,
          result.userData
        );
      }
    });
  }

  /**
   * Obtiene todos los datos completos del tour desde los servicios adicionales para add_to_cart
   */
  private getCompleteTourDataForAddToCart(tourId: number): Observable<TourDataForEcommerce> {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      concatMap((itineraries) => {
        if (itineraries.length === 0) {
          return this.tourService.getById(tourId, false).pipe(
            map((tour) => ({
              id: tourId,
              tkId: tour.tkId ?? undefined,
              name: tour.name ?? undefined,
              destination: { continent: undefined, country: undefined },
              days: undefined,
              nights: undefined,
              rating: undefined, // Ya no se obtiene de reviewsService, se obtiene de TourReview
              monthTags: undefined,
              tourType: tour.tripTypeId === 1 ? 'FIT' : 'Grupos',
              price: tour.minPrice ?? undefined
            } as TourDataForEcommerce))
          );
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
            
            return this.locationNetService.getLocationsByIds(locationIds).pipe(
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
              rating: undefined, // Ya no se obtiene de reviewsService, se obtiene de TourReview
              monthTags: monthTags.length > 0 ? monthTags : undefined,
              tourType: tourType,
              flightCity: 'Sin vuelo',
              price: tour.minPrice ?? undefined
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

  // ✅ MÉTODO NUEVO: Obtener resumen de actividades seleccionadas
  private getActivitySummary(): {
    totalActivities: number;
    totalPacks: number;
    activities: string[];
    packs: string[];
    totalPrice: number;
    departurePackIncluded: boolean;
  } {
    const activities = this.addedActivities.filter((a) => a.type === 'act');
    const manualPacks = this.addedActivities.filter((a) => a.type === 'pack');

    // ✅ INCLUIR paquete automático del departure
    const hasDeparturePack = Boolean(
      this.selectedActivityPackId && this.selectedActivityPackId > 0
    );
    const totalPacks = manualPacks.length + (hasDeparturePack ? 1 : 0);

    const activitiesList = activities.map((a) => `${a.title} (€${a.price})`);
    const packsList = [
      ...manualPacks.map((a) => `${a.title} (€${a.price})`),
      ...(hasDeparturePack ? [`Paquete del departure (incluido)`] : []),
    ];

    const totalPrice = this.addedActivities.reduce(
      (sum, a) => sum + (a.price || 0),
      0
    );

    return {
      totalActivities: activities.length,
      totalPacks: totalPacks,
      activities: activitiesList,
      packs: packsList,
      totalPrice,
      departurePackIncluded: hasDeparturePack,
    };
  }

  // ✅ MÉTODO NUEVO: Preparar datos de viajeros para createComplete
  private prepareTravelersData(): IReservationTravelerData[] {
    const travelersData: IReservationTravelerData[] = [];
    let travelerNumber = 1;

    // Validar que existan los age groups necesarios
    if (this.passengersData.adults > 0 && !this.ageGroupCategories.adults.id) {
      throw new Error('Age group for adults not found');
    }
    if (this.passengersData.children > 0 && !this.ageGroupCategories.children.id) {
      throw new Error('Age group for children not found');
    }
    if (this.passengersData.babies > 0 && !this.ageGroupCategories.babies.id) {
      throw new Error('Age group for babies not found');
    }

    // Crear viajeros para adultos
    for (let i = 0; i < this.passengersData.adults; i++) {
      const isLeadTraveler = travelerNumber === 1;
      travelersData.push({
        ageGroupId: this.ageGroupCategories.adults.id!,
        isLeadTraveler: isLeadTraveler,
        tkId: null,
      });
      travelerNumber++;
    }

    // Crear viajeros para niños
    for (let i = 0; i < this.passengersData.children; i++) {
      travelersData.push({
        ageGroupId: this.ageGroupCategories.children.id!,
        isLeadTraveler: false,
        tkId: null,
      });
      travelerNumber++;
    }

    // Crear viajeros para bebés
    for (let i = 0; i < this.passengersData.babies; i++) {
      travelersData.push({
        ageGroupId: this.ageGroupCategories.babies.id!,
        isLeadTraveler: false,
        tkId: null,
      });
      travelerNumber++;
    }

    return travelersData;
  }

  // ✅ MÉTODO NUEVO: Preparar datos de actividades para createComplete
  private prepareActivitiesData(): {
    activityIds: number[];
    activityPackIds: number[];
  } {
    const activityIds: number[] = [];
    const activityPackIds: number[] = [];

    // Procesar actividades seleccionadas manualmente
    this.addedActivities.forEach((activity) => {
      const activityId = parseInt(activity.id);
      if (!isNaN(activityId) && activityId > 0) {
        if (activity.type === 'act') {
          activityIds.push(activityId);
        } else if (activity.type === 'pack') {
          activityPackIds.push(activityId);
        }
      }
    });

    // Procesar paquete automático del departure
    if (this.selectedActivityPackId && this.selectedActivityPackId > 0) {
      activityPackIds.push(this.selectedActivityPackId);
    }

    return { activityIds, activityPackIds };
  }

  private createReservation(userId: number | null): void {
    // Defensa en profundidad: nunca crear desde checkout, aunque alguien llame directo
    const currentUrl = this.router.url || window.location.pathname || '';
    if (currentUrl.startsWith('/checkout')) {
      return;
    }

    // Reentrada: si ya estamos creando, salir
    if (this.isCreatingReservation) {
      return;
    }
    this.isCreatingReservation = true;
    try {
      // ✅ OBTENER ID DEL ESTADO DRAFT DINÁMICAMENTE
      this.reservationStatusService.getByCode('DRAFT').subscribe({
        next: (draftStatuses) => {
          if (!draftStatuses || draftStatuses.length === 0) {
            throw new Error('DRAFT status not found');
          }

          const draftStatusId = draftStatuses[0].id;

          // ✅ PREPARAR DATOS DE LA RESERVA
          const reservationData: ReservationCreate = {
            tkId: '',
            reservationStatusId: draftStatusId, // ✅ USAR ID DINÁMICO DE DRAFT
            retailerId: environment.retaileriddefault,
            tourId: this.tourId!,
            departureId: this.selectedDeparture.id,
            userId: userId,
            totalPassengers: this.totalPassengers || 1,
            totalAmount: this.totalPriceWithActivities || 0,
          };

          // ✅ PREPARAR DATOS DE VIAJEROS
          const travelersData: IReservationTravelerData[] = this.prepareTravelersData();

          // ✅ PREPARAR ACTIVIDADES Y PAQUETES
          const { activityIds, activityPackIds } = this.prepareActivitiesData();

          // ✅ CREAR RESERVA COMPLETA
          const completeData: ReservationCompleteCreate = {
            reservation: reservationData,
            travelers: travelersData,
            activityIds: activityIds.length > 0 ? activityIds : null,
            activityPackIds: activityPackIds.length > 0 ? activityPackIds : null,
          };

          this.subscriptions.add(
            this.reservationService.createComplete(completeData).subscribe({
              next: (createdReservation: IReservationResponse) => {

                // Obtener contexto de la lista desde el state del router y pasarlo al checkout
                const state = window.history.state;
                const listId = state?.['listId'] || '';
                const listName = state?.['listName'] || '';
                
                // Navegar al checkout pasando los datos por state (sin modificar URL)
                this.router.navigate(['/checkout', createdReservation.id], {
                  state: {
                    listId: listId,
                    listName: listName
                  }
                });
              },
              error: (error) => {
                console.error('💥 Booking - Error fatal en el proceso:', {
                  error: error,
                  errorMessage: error.message,
                  errorStatus: error.status,
                });

                let errorMessage =
                  'Error al crear la reservación. Por favor, inténtalo de nuevo.';

                // ✅ MENSAJES DE ERROR MÁS ESPECÍFICOS
                if (error.status === 500) {
                  errorMessage =
                    'Error interno del servidor. Por favor, contacta al soporte técnico.';
                } else if (error.status === 400) {
                  errorMessage =
                    'Datos inválidos. Por favor, verifica la información e inténtalo de nuevo.';
                } else if (error.status === 404) {
                  errorMessage =
                    'Recurso no encontrado. Por favor, verifica que el tour y la fecha seleccionada sean válidos.';
                } else if (error.status === 0 || !error.status) {
                  errorMessage =
                    'Sin conexión al servidor. Por favor, verifica tu conexión a internet.';
                }

                alert(errorMessage);
              },
              complete: () => {
                this.isCreatingReservation = false;
              },
            })
          );
        },
        error: (error) => {
          console.error('💥 Error obteniendo estado DRAFT:', error);
          this.isCreatingReservation = false;
          alert('Error al obtener el estado de reservación. Por favor, inténtalo de nuevo.');
        }
      });
    } catch (error) {
      console.error('💥 Booking - Error en preparación de datos:', error);
      this.isCreatingReservation = false;
      
      let errorMessage = 'Error al preparar los datos de la reservación.';
      
      if (error instanceof Error) {
        if (error.message.includes('Age group')) {
          errorMessage = 'Error: No se pudo determinar el grupo de edad. Por favor, verifica la información e inténtalo de nuevo.';
        }
      }
      
      alert(errorMessage);
    }
  }

  /**
   * Obtener datos del usuario actual si está logueado
   */
  private getUserData() {
    if (this.authService.isAuthenticatedValue()) {
      return this.analyticsService.getUserData(
        this.authService.getUserEmailValue(),
        undefined,
        this.authService.getCognitoIdValue()
      );
    }
    return undefined;
  }
}
