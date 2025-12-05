import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import { Subject, forkJoin, of, Observable, combineLatest, ReplaySubject } from 'rxjs';
import { takeUntil, switchMap, catchError, map, tap, filter, finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { AnalyticsService } from '../../../../core/services/analytics/analytics.service';

// Importar la interface del selector
import { SelectedDepartureEvent } from '../tour-itinerary-v2/components/selector-itinerary/selector-itinerary.component';

// Importar servicios necesarios
import {
  DepartureService,
  IDepartureResponse,
} from '../../../../core/services/departure/departure.service';
import { FlightsNetService } from '../../../../pages/checkout-v2/services/flightsNet.service';
import { AirportCityCacheService } from '../../../../core/services/locations/airport-city-cache.service';
import {
  ItineraryService,
  IItineraryResponse,
  ItineraryFilters,
} from '../../../../core/services/itinerary/itinerary.service';
import {
  TourDepartureCitiesService,
  ITourDepartureCityResponse,
} from '../../../../core/services/tour/tour-departure-cities.service';
import { TourAgeGroupsService } from '../../../../core/services/tour/tour-age-groups.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../../../core/services/agegroup/age-group.service';
import {
  TourDeparturesPricesService,
  ITourDeparturesPriceResponse,
  TourDeparturesPriceFilters,
} from '../../../../core/services/tour/tour-departures-prices.service';
import {
  DepartureAvailabilityService,
  IDepartureAvailabilityResponse,
  IDefaultDepartureSelectionResponse,
  IDepartureAvailabilityByTourResponse,
} from '../../../../core/services/departure/departure-availability.service';
import {
  TripTypeService,
  ITripTypeResponse,
} from '../../../../core/services/trip-type/trip-type.service';

// Interfaces para los datos
interface City {
  name: string;
  code: string;
  activityId?: number;
  activityPackId?: number;
}

interface Travelers {
  adults: number;
  children: number;
  babies: number;
}

// Interfaces para tipado fuerte
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

interface AllowedPassengerTypes {
  adults: boolean;
  children: boolean;
  babies: boolean;
}

interface ActivityPackAvailabilityData {
  id: number;
  departureId: number;
  activityPackId: number;
  bookableAvailability: number;
  guaranteedAvailability: number;
  onRequestAvailability: number;
  availabilityMargin: number;
  adjustedAvailability: number;
  lastAvailabilityUpdate: string;
}

@Component({
  selector: 'app-tour-departures-v2',
  standalone: false,
  templateUrl: './tour-departures-v2.component.html',
  styleUrl: './tour-departures-v2.component.scss',
  providers: [MessageService],
})
export class TourDeparturesV2Component implements OnInit, OnDestroy, OnChanges {
  @Input() tourId: number | undefined;
  @Input() tourData: any = null; // Datos completos del tour para analytics
  @Input() selectedDepartureEvent: SelectedDepartureEvent | null = null;
  @Input() preview: boolean = false;
  @Output() priceUpdate = new EventEmitter<number>();
  @Output() cityUpdate = new EventEmitter<string>();
  @Output() departureUpdate = new EventEmitter<any>();
  @Output() passengersUpdate = new EventEmitter<{
    adults: number;
    children: number;
    babies: number;
    total: number;
  }>();
  @Output() ageGroupsUpdate = new EventEmitter<AgeGroupCategories>();
  @Output() activityPackIdUpdate = new EventEmitter<number | null>();
  @Output() citiesLoadingUpdate = new EventEmitter<boolean>();

  // Control de destrucción del componente
  private destroy$ = new Subject<void>();
  
  // Subject para notificar cuando allDepartures esté disponible (ReplaySubject para mantener último valor)
  private allDeparturesReady$ = new ReplaySubject<void>(1);
  
  // Subject para notificar cuando los precios estén disponibles (ReplaySubject para mantener último valor)
  private pricesReady$ = new ReplaySubject<void>(1);

  // Estados del componente
  loading = false;
  error: string | undefined;
  citiesLoading = false;
  pricesLoading = false;
  pricesError = false;

  // Propiedades para precios
  departuresPrices: ITourDeparturesPriceResponse[] = [];
  adultAgeGroupId: number | null = null;
  childAgeGroupId: number | null = null;
  babyAgeGroupId: number | null = null;

  // Propiedades para rangos de edad específicos con tipado fuerte
  ageGroupCategories: AgeGroupCategories = {
    adults: { id: null, lowerAge: null, upperAge: null },
    children: { id: null, lowerAge: null, upperAge: null },
    babies: { id: null, lowerAge: null, upperAge: null },
  };

  // Propiedades para grupos de edad
  tourAgeGroups: IAgeGroupResponse[] = [];
  allowedPassengerTypes: AllowedPassengerTypes = {
    adults: true,
    children: true,
    babies: true,
  };

  // Datos del departure seleccionado
  selectedDeparture: SelectedDepartureEvent | null = null;
  departureDetails: IDepartureResponse | null = null;
  itineraryDetails: IItineraryResponse | null = null;

  // Propiedades para manejar múltiples departures
  allDepartures: IDepartureResponse[] = [];
  allItineraries: IItineraryResponse[] = [];
  
  // Mapa de departures por ciudad (activityPackId)
  departuresByCity: Map<number, IDepartureAvailabilityByTourResponse[]> = new Map();
  
  // Información de selección por defecto
  defaultSelection: IDefaultDepartureSelectionResponse | null = null;

  // Datos para mostrar
  departureInfo = {
    departureDate: '',
    formattedDepartureDate: '',
    arrivalDate: '',
    formattedArrivalDate: '',
    itineraryId: 0,
    itineraryName: '',
    departureId: 0,
    departureName: '',
    tripTypeName: '',
  };

  // Ciudades desde el servicio
  cities: City[] = [];
  filteredCities: City[] = [];
  selectedCity: City | null = null;
  // Mantener todas las ciudades originales para poder obtener todos los activityIds por nombre
  allCitiesFromService: ITourDepartureCityResponse[] = [];

  // Pasajeros
  travelers: Travelers = {
    adults: 1,
    children: 0,
    babies: 0,
  };

  showPassengersPanel = false;

  // Validaciones del ejemplo
  shouldBlockKidsAndBabies: boolean = false;
  selectedDepartureId: number | null = null;
  passengerText: string = '1 Adulto';

  // Mapa de horarios de vuelos por departureId
  flightTimesByDepartureId: { [departureId: number]: string } = {};

  // Mapa de disponibilidad de plazas por departureId (ActivityPack)
  activityPackAvailabilityByDepartureId: {
    [departureId: number]: ActivityPackAvailabilityData | null;
  } = {};

  // Mapa de disponibilidad de plazas por departureId (Departure)
  departureAvailabilityByDepartureId: {
    [departureId: number]: IDepartureAvailabilityResponse | null;
  } = {};

  // Mapa de tipos de viaje por ID
  tripTypesMap: Map<number, ITripTypeResponse> = new Map();

  constructor(
    private departureService: DepartureService,
    private itineraryService: ItineraryService,
    private tourDepartureCitiesService: TourDepartureCitiesService,
    private tourAgeGroupsService: TourAgeGroupsService,
    private ageGroupService: AgeGroupService,
    private tourDeparturesPricesService: TourDeparturesPricesService,
    private messageService: MessageService,
    private analyticsService: AnalyticsService,
    private flightsNetService: FlightsNetService,
    private airportCityCacheService: AirportCityCacheService,
    private departureAvailabilityService: DepartureAvailabilityService,
    private tripTypeService: TripTypeService
  ) {
    this.updatePassengerText();

    // Emitir estado inicial
    this.emitPassengersUpdate();
    this.priceUpdate.emit(0);
    this.departureUpdate.emit(null);
  }

  ngOnInit(): void {
    if (!this.tourId) {
      this.error = 'ID del tour no proporcionado';
      return;
    }

    this.loadTripTypes();
    this.loadCities();
    this.loadAgeGroups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['selectedDepartureEvent'] &&
      changes['selectedDepartureEvent'].currentValue
    ) {
      const departureEvent = changes['selectedDepartureEvent'].currentValue;
      this.handleDepartureSelection(departureEvent);
    }

    if (
      changes['tourId'] &&
      changes['tourId'].currentValue &&
      !changes['tourId'].firstChange
    ) {
      this.loadCities();
      this.loadAgeGroups();
    }
  }

  private loadCities(): void {
    if (!this.tourId) return;

    this.citiesLoading = true;
    this.citiesLoadingUpdate.emit(true);

    this.tourDepartureCitiesService
      .getAll(this.tourId, {}, !this.preview)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (citiesResponse: ITourDepartureCityResponse[]) => {
          // Validar si la respuesta está vacía o es null/undefined
          if (!citiesResponse || citiesResponse.length === 0) {
            this.cities = [];
            this.filteredCities = [];
            this.allCitiesFromService = [];
            this.selectedCity = null;
            this.citiesLoading = false;
            this.citiesLoadingUpdate.emit(false);
            // Emitir cityUpdate con string vacío cuando no hay ciudades
            this.emitCityUpdate();
            return;
          }

          // Guardar todas las ciudades originales para poder obtener todos los activityIds
          this.allCitiesFromService = citiesResponse;

          const mappedCities = citiesResponse.map((city, index) => {
            return {
              name: city.name,
              code: city.name.toUpperCase().replace(/\s+/g, '_'),
              activityId: city.activityId,
              activityPackId: city.activityPackId,
            };
          });

          // Validar el mapeo
          const validCities = mappedCities.filter(
            (city) => city.name && city.name.trim() !== ''
          );
          const invalidCities = mappedCities.filter(
            (city) => !city.name || city.name.trim() === ''
          );

          // Eliminar duplicados basándose en el nombre normalizado (sin espacios extra, case-insensitive)
          // Mantener la primera ciudad encontrada para cada nombre (para mostrar en el selector)
          const uniqueCitiesMap = new Map<string, City>();
          validCities.forEach((city) => {
            const normalizedName = city.name.trim().toLowerCase();
            // Si ya existe, mantener la que tenga activityId y activityPackId (más completa)
            if (uniqueCitiesMap.has(normalizedName)) {
              const existingCity = uniqueCitiesMap.get(normalizedName);
              if (existingCity) {
                // Preferir la ciudad que tenga activityId y activityPackId
                const existingHasIds = existingCity.activityId && existingCity.activityPackId;
                const currentHasIds = city.activityId && city.activityPackId;
                if (currentHasIds && !existingHasIds) {
                  uniqueCitiesMap.set(normalizedName, city);
                }
              }
            } else {
              uniqueCitiesMap.set(normalizedName, city);
            }
          });
          const uniqueCities = Array.from(uniqueCitiesMap.values());

          // Asignar ciudades sin seleccionar ninguna todavía
          // La selección se hará después de cargar disponibilidades
          this.cities = uniqueCities;
          this.filteredCities = [...this.cities];

          if (this.cities.length === 0) {
            this.citiesLoading = false;
            this.citiesLoadingUpdate.emit(false);
            // Emitir cityUpdate con string vacío cuando no hay ciudades
            this.emitCityUpdate();
            return;
          }

          this.citiesLoading = false;
          this.citiesLoadingUpdate.emit(false);
          
          // Cargar selección por defecto y luego departures por ciudad
          this.loadDefaultSelection();
        },
        error: (error) => {
          console.error('Error cargando ciudades:', error);
          this.cities = [];
          this.filteredCities = [];
          this.allCitiesFromService = [];
          this.selectedCity = null;
          this.citiesLoading = false;
          this.citiesLoadingUpdate.emit(false);

          // Emitir cityUpdate con string vacío en caso de error
          this.emitCityUpdate();

          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar las ciudades de origen.',
            life: 5000,
          });
        },
      });
  }

  /**
   * Obtiene todos los activityIds que coinciden con el nombre de la ciudad seleccionada
   */
  private getActivityIdsForSelectedCity(): number[] {
    if (!this.selectedCity) {
      return [];
    }

    const normalizedSelectedName = this.selectedCity.name.trim().toLowerCase();
    
    // Buscar todas las ciudades que coincidan con el nombre (case-insensitive)
    const matchingCities = this.allCitiesFromService.filter(
      (city) => city.name.trim().toLowerCase() === normalizedSelectedName && city.activityId
    );

    // Extraer todos los activityIds únicos
    const activityIds = matchingCities
      .map(city => city.activityId)
      .filter((id, index, self) => self.indexOf(id) === index); // Eliminar duplicados

    return activityIds;
  }

  private loadDeparturesPrices(activityIds: number[] | number, departureId?: number): Observable<ITourDeparturesPriceResponse[]> {
    // Normalizar a array
    const activityIdsArray = Array.isArray(activityIds) ? activityIds : [activityIds];
    
    // Filtrar activityIds válidos
    const validActivityIds = activityIdsArray.filter(id => id && id > 0);
    
    if (validActivityIds.length === 0) {
      return of([]);
    }
    // departureId es opcional - si es 0 o undefined, cargar todos los precios para los activityIds

    this.pricesLoading = true;
    this.pricesError = false;

    // Construir filtros con tourVisibility según la lógica de preview
    // Si preview === false: pasar tourVisibility = true (filtrar solo visibles)
    // Si preview === true: no pasar tourVisibility (mostrar todos)
    const filters: TourDeparturesPriceFilters = {};
    if (!this.preview) {
      filters.tourVisibility = !this.preview; // Esto será true cuando preview es false
    }

    return this.tourDeparturesPricesService
      .getAll(validActivityIds, filters)
      .pipe(
        takeUntil(this.destroy$),
        tap((pricesResponse: ITourDeparturesPriceResponse[]) => {
          this.departuresPrices = pricesResponse;
          this.pricesLoading = false;
          this.pricesError = false;

          // Notificar que los precios están listos
          this.pricesReady$.next();

          // Recargar horarios de vuelos cuando se cargan los precios
          if (this.filteredDepartures && this.filteredDepartures.length > 0) {
            // Cargar horarios para todos los departures filtrados
            this.filteredDepartures.forEach(departure => {
              if (departure.id) {
                this.loadFlightTimes(departure.id);
              }
            });
          }
        }),
        catchError((error) => {
          console.error('Error cargando precios:', error);
          this.pricesLoading = false;
          this.pricesError = true;
          this.departuresPrices = [];
          // Notificar que hubo un error para que se actualice la UI
          this.pricesReady$.next();
          return of([]);
        })
      );
  }

  private loadAgeGroups(): void {
    if (!this.tourId) return;

    this.tourAgeGroupsService
      .getAll(this.tourId, {}, this.preview)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((ageGroupIds: number[]) => {
          if (ageGroupIds.length === 0) {
            this.tourAgeGroups = [];
            this.allowedPassengerTypes = {
              adults: true,
              children: true,
              babies: true,
            };
            return of([]);
          }

          const ageGroupRequests = ageGroupIds.map((id) =>
            this.ageGroupService.getById(id).pipe(
              catchError(() => {
                return of(null);
              })
            )
          );

          return forkJoin(ageGroupRequests);
        })
      )
      .subscribe({
        next: (ageGroups: (IAgeGroupResponse | null)[]) => {
          this.tourAgeGroups = ageGroups.filter(
            (group) => group !== null
          ) as IAgeGroupResponse[];

          if (this.tourAgeGroups.length > 0) {
            this.determineAllowedPassengerTypes();
            this.emitAgeGroupsUpdate();
          }

          this.getAdditionalAgeGroupInfo();
        },
        error: (error) => {
          console.error('Error cargando grupos de edad:', error);
          this.allowedPassengerTypes = {
            adults: true,
            children: true,
            babies: true,
          };
        },
      });
  }

  private determineAllowedPassengerTypes(): void {
    this.allowedPassengerTypes = {
      adults: false,
      children: false,
      babies: false,
    };

    this.ageGroupCategories.adults.id = null;
    this.ageGroupCategories.children.id = null;
    this.ageGroupCategories.babies.id = null;

    this.tourAgeGroups.forEach((group) => {
      this.categorizeAgeGroup(group);
    });

    this.adultAgeGroupId = this.ageGroupCategories.adults.id;
    this.childAgeGroupId = this.ageGroupCategories.children.id;
    this.babyAgeGroupId = this.ageGroupCategories.babies.id;

    if (
      !this.allowedPassengerTypes.adults &&
      !this.allowedPassengerTypes.children &&
      !this.allowedPassengerTypes.babies
    ) {
      this.allowedPassengerTypes.adults = true;
    }

    this.resetDisallowedPassengers();
  }

  private categorizeAgeGroup(group: IAgeGroupResponse): void {
    const groupCode = group.code?.toLowerCase() || '';
    const groupName = group.name?.toLowerCase() || '';

    if (this.isAdultGroup(groupCode, groupName)) {
      this.allowedPassengerTypes.adults = true;
      this.ageGroupCategories.adults.id = group.id;
      this.ageGroupCategories.adults.lowerAge = group.lowerLimitAge ?? null;
      this.ageGroupCategories.adults.upperAge = group.upperLimitAge ?? null;
    } else if (this.isChildGroup(groupCode, groupName)) {
      this.allowedPassengerTypes.children = true;
      this.ageGroupCategories.children.id = group.id;
      this.ageGroupCategories.children.lowerAge = group.lowerLimitAge ?? null;
      this.ageGroupCategories.children.upperAge = group.upperLimitAge ?? null;
    } else if (this.isBabyGroup(groupCode, groupName)) {
      this.allowedPassengerTypes.babies = true;
      this.ageGroupCategories.babies.id = group.id;
      this.ageGroupCategories.babies.lowerAge = group.lowerLimitAge ?? null;
      this.ageGroupCategories.babies.upperAge = group.upperLimitAge ?? null;
    } else {
      this.categorizeByAgeRange(group);
    }
  }

  private isAdultGroup(code: string, name: string): boolean {
    const adultKeywords = ['adulto', 'adultos'];
    return adultKeywords.some(
      (keyword) => code.includes(keyword) || name.includes(keyword)
    );
  }

  private isChildGroup(code: string, name: string): boolean {
    const childKeywords = ['niño', 'niños'];
    return childKeywords.some(
      (keyword) => code.includes(keyword) || name.includes(keyword)
    );
  }

  private isBabyGroup(code: string, name: string): boolean {
    const babyKeywords = ['bebé', 'bebés'];
    return babyKeywords.some(
      (keyword) => code.includes(keyword) || name.includes(keyword)
    );
  }

  private categorizeByAgeRange(group: IAgeGroupResponse): void {
    const sortedGroups = [...this.tourAgeGroups].sort(
      (a, b) => (a.lowerLimitAge ?? 0) - (b.lowerLimitAge ?? 0)
    );
    const currentIndex = sortedGroups.findIndex((g) => g.id === group.id);

    if (currentIndex === 0 && group.lowerLimitAge === 0) {
      this.allowedPassengerTypes.babies = true;
      this.ageGroupCategories.babies.id = group.id;
      this.ageGroupCategories.babies.lowerAge = group.lowerLimitAge ?? null;
      this.ageGroupCategories.babies.upperAge = group.upperLimitAge ?? null;
    } else if (currentIndex === sortedGroups.length - 1) {
      this.allowedPassengerTypes.adults = true;
      this.ageGroupCategories.adults.id = group.id;
      this.ageGroupCategories.adults.lowerAge = group.lowerLimitAge ?? null;
      this.ageGroupCategories.adults.upperAge = group.upperLimitAge ?? null;
    } else {
      this.allowedPassengerTypes.children = true;
      this.ageGroupCategories.children.id = group.id;
      this.ageGroupCategories.children.lowerAge = group.lowerLimitAge ?? null;
      this.ageGroupCategories.children.upperAge = group.upperLimitAge ?? null;
    }
  }

  private resetDisallowedPassengers(): void {
    let changed = false;

    if (!this.allowedPassengerTypes.children && this.travelers.children > 0) {
      this.travelers.children = 0;
      changed = true;
    }

    if (!this.allowedPassengerTypes.babies && this.travelers.babies > 0) {
      this.travelers.babies = 0;
      changed = true;
    }

    if (this.allowedPassengerTypes.adults && this.travelers.adults < 1) {
      this.travelers.adults = 1;
      changed = true;
    }

    if (changed) {
      this.updatePassengerText();
      this.emitPassengersUpdate();
    }
  }

  private getAdditionalAgeGroupInfo(): void {
    if (!this.tourId) return;

    this.tourAgeGroupsService
      .getCount(this.tourId, this.preview)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          // Conteo obtenido
        },
        error: () => {
        },
      });

    this.tourAgeGroupsService
      .hasAgeGroups(this.tourId, this.preview)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (hasAgeGroups) => {
          // Información de grupos obtenida
        },
        error: () => {
        },
      });
  }

  private emitAgeGroupsUpdate(): void {
    this.ageGroupsUpdate.emit(this.ageGroupCategories);
  }

  private loadTripTypes(): void {
    this.tripTypeService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tripTypes: ITripTypeResponse[]) => {
          this.tripTypesMap.clear();
          tripTypes.forEach((tripType) => {
            this.tripTypesMap.set(tripType.id, tripType);
          });
        },
        error: (error) => {
          console.error('Error cargando tipos de viaje:', error);
        },
      });
  }

  getTripTypeName(tripTypeId: number | null | undefined): string {
    if (!tripTypeId) {
      return 'Sin tipo';
    }
    const tripType = this.tripTypesMap.get(tripTypeId);
    return tripType ? tripType.name : 'Sin tipo';
  }

  getTripType(tripTypeId: number | null | undefined): ITripTypeResponse | null {
    if (!tripTypeId) {
      return null;
    }
    return this.tripTypesMap.get(tripTypeId) || null;
  }

  private handleDepartureSelection(event: SelectedDepartureEvent): void {
    this.selectedDeparture = event;
    this.selectedDepartureId = null;

    this.loadDepartureDetails(event.departure.id);
  }

  private loadDefaultSelection(): void {
    if (!this.tourId) {
      this.loadDeparturesForAllCities();
      return;
    }

    this.departureAvailabilityService
      .getDefaultSelectionByTour(this.tourId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          return of(null);
        })
      )
      .subscribe({
        next: (defaultSelection) => {
          this.defaultSelection = defaultSelection;
          this.loadDeparturesForAllCities();
        },
        error: () => {
          this.loadDeparturesForAllCities();
        }
      });
  }

  private loadDeparturesForAllCities(): void {
    if (!this.tourId || this.cities.length === 0) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = undefined;

    const cityObservables = this.cities
      .filter((city) => city.activityPackId)
      .map((city) =>
        this.departureAvailabilityService
          .getByTourAndActivityPack(this.tourId!, city.activityPackId!, true)
          .pipe(
            takeUntil(this.destroy$),
            map((departures) => ({
              activityPackId: city.activityPackId!,
              departures: departures || [],
            })),
            catchError(() => {
              return of({
                activityPackId: city.activityPackId!,
                departures: [] as IDepartureAvailabilityByTourResponse[],
              });
            })
          )
      );

    if (cityObservables.length === 0) {
      this.loading = false;
      return;
    }

    forkJoin(cityObservables)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.error = 'Error al cargar los departures del tour';
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
          this.allDeparturesReady$.next();
        })
      )
      .subscribe({
        next: (results) => {
          this.departuresByCity.clear();
          
          if (results && results.length > 0) {
            results.forEach((result) => {
              if (result && result.activityPackId && result.departures) {
                this.departuresByCity.set(result.activityPackId, result.departures);
              }
            });
          }

          this.buildAllDeparturesFromCityData();

          // Seleccionar ciudad por defecto si no hay una seleccionada
          if (!this.selectedCity && this.cities.length > 0) {
            // Priorizar ciudad del defaultSelection si existe
            if (this.defaultSelection?.activityPackId) {
              const defaultCity = this.cities.find(
                (city) => city.activityPackId === this.defaultSelection?.activityPackId
              );
              if (defaultCity) {
                this.selectedCity = defaultCity;
                this.emitCityUpdate();
                this.loadCityRelatedData();
                
                // Cargar precios y seleccionar departure
                const activityIds = this.getActivityIdsForSelectedCity();
                if (activityIds.length > 0) {
                  this.loadDeparturesPrices(activityIds, 0).subscribe({
                    next: () => {
                      if (this.defaultSelection?.departureId) {
                        this.selectDefaultDeparture(this.defaultSelection.departureId);
                      } else if (this.filteredDepartures.length > 0) {
                        this.autoSelectNearestBookableDeparture();
                      }
                    }
                  });
                } else {
                  if (this.defaultSelection?.departureId) {
                    this.selectDefaultDeparture(this.defaultSelection.departureId);
                  } else if (this.filteredDepartures.length > 0) {
                    this.autoSelectNearestBookableDeparture();
                  }
                }
              } else {
                // Si no se encuentra la ciudad del defaultSelection, usar selectDefaultCityWithAvailability
                this.selectDefaultCityWithAvailability();
              }
            } else {
              // Si no hay defaultSelection, usar selectDefaultCityWithAvailability
              this.selectDefaultCityWithAvailability();
            }
          }

          // Si hay ciudad seleccionada pero no departure, seleccionar uno
          if (this.selectedCity && !this.selectedDepartureId && !this.defaultSelection?.departureId && this.filteredDepartures.length > 0) {
            this.autoSelectNearestBookableDeparture();
          }
        },
        error: (error) => {
          this.error = 'Error al cargar los departures del tour';
        },
      });
  }

  private buildAllDeparturesFromCityData(): void {
    const allDeparturesMap = new Map<number, IDepartureResponse>();
    const departureIdsToLoad = new Set<number>();
    
    this.departuresByCity.forEach((departures, activityPackId) => {
      departures.forEach((departureData) => {
        if (!allDeparturesMap.has(departureData.departureId)) {
          const departure: IDepartureResponse = {
            id: departureData.departureId,
            code: departureData.departureCode,
            tkId: '',
            itineraryId: 0,
            isVisibleOnWeb: true,
            isBookable: departureData.isBookable ?? false,
            departureDate: departureData.departureDate,
            arrivalDate: departureData.arrivalDate,
            departureStatusId: 0,
            tripTypeId: null,
            isConsolidadorVuelosActive: false,
            includeTourConsolidadorSearchLocations: false,
            maxArrivalDateAtAirport: null,
            maxArrivalTimeAtAirport: null,
            minDepartureDateFromAirport: null,
            minDepartureTimeFromAirport: null,
            arrivalAirportIATA: null,
            departureAirportIATA: null,
          };
          
          allDeparturesMap.set(departureData.departureId, departure);
          departureIdsToLoad.add(departureData.departureId);
          
          this.departureAvailabilityByDepartureId[departureData.departureId] = {
            id: 0,
            departureId: departureData.departureId,
            maxPax: null,
            minPax: null,
            currentPax: 0,
            bookableAvailability: departureData.departureAvailability,
            guaranteedAvailability: 0,
            onRequestAvailability: 0,
            availabilityMargin: 0,
            adjustedAvailability: 0,
            lastAvailabilityUpdate: '',
          };
          
          if (departureData.activityPackAvailability !== undefined) {
            this.activityPackAvailabilityByDepartureId[departureData.departureId] = {
              id: 0,
              departureId: departureData.departureId,
              activityPackId: activityPackId,
              bookableAvailability: departureData.activityPackAvailability,
              guaranteedAvailability: 0,
              onRequestAvailability: 0,
              availabilityMargin: 0,
              adjustedAvailability: 0,
              lastAvailabilityUpdate: '',
            };
          }
        }
      });
    });

    this.allDepartures = Array.from(allDeparturesMap.values()).sort(
      (a, b) =>
        new Date(a.departureDate ?? '').getTime() -
        new Date(b.departureDate ?? '').getTime()
    );

    // Cargar tripTypeIds de los departures en paralelo
    if (departureIdsToLoad.size > 0) {
      const departureRequests = Array.from(departureIdsToLoad).map((departureId) =>
        this.departureService.getById(departureId, this.preview).pipe(
          catchError(() => of(null))
        )
      );

      forkJoin(departureRequests)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (departures) => {
            departures.forEach((departure) => {
              if (departure && departure.id) {
                const existingDeparture = allDeparturesMap.get(departure.id);
                if (existingDeparture) {
                  existingDeparture.tripTypeId = departure.tripTypeId ?? null;
                }
              }
            });
          },
          error: (error) => {
            console.error('Error cargando tripTypeIds de departures:', error);
          },
        });
    }
  }


  private loadDepartureDetails(departureId: number): void {
    this.loading = true;
    this.error = undefined;

    this.departureService
      .getById(departureId, this.preview)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((departure) => {
          this.departureDetails = departure;
          
          // Si hay ciudad seleccionada con activityId, cargar precios
          if (
            this.selectedCity &&
            this.departureDetails
          ) {
            const activityIds = this.getActivityIdsForSelectedCity();
            if (activityIds.length > 0) {
              return this.loadDeparturesPrices(
                activityIds,
                this.departureDetails.id
              ).pipe(
                map((prices) => ({ departure, prices }))
              );
            }
          }
          
          // Si no hay ciudad, retornar solo el departure
          return of({ departure, prices: [] });
        }),
        catchError((error) => {
          console.error('Error cargando detalles del departure:', error);
          this.error = 'Error al cargar los detalles del departure';
          this.loading = false;
          return of({ departure: null, prices: [] });
        })
      )
      .subscribe({
        next: ({ departure, prices }) => {
          if (departure) {
            this.updateDepartureInfo();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error en el flujo de carga:', error);
          this.error = 'Error al cargar los detalles del departure';
          this.loading = false;
        },
      });
  }

  private updateDepartureInfo(): void {
    if (!this.selectedDeparture || !this.departureDetails) return;

    this.departureInfo = {
      departureDate: this.departureDetails.departureDate ?? '',
      formattedDepartureDate: this.formatDate(
        this.departureDetails.departureDate ?? ''
      ),
      arrivalDate: this.departureDetails.arrivalDate ?? '',
      formattedArrivalDate: this.formatDate(
        this.departureDetails.arrivalDate ?? ''
      ),
      itineraryId: this.departureDetails.itineraryId,
      itineraryName: this.selectedDeparture.itineraryName,
      departureId: this.departureDetails.id,
      departureName: this.selectedDeparture.departure.name || 'Sin nombre',
      tripTypeName: this.selectedDeparture.tripType?.name || 'Sin tipo',
    };

    this.shouldBlockKidsAndBabies = this.checkIfShouldBlockKids();

    if (this.shouldBlockKidsAndBabies) {
      if (this.travelers.children > 0 || this.travelers.babies > 0) {
        this.travelers.children = 0;
        this.travelers.babies = 0;
        this.updatePassengerText();
      }
    }


    // Auto-selección del departure desde el selector
    // Si allDepartures ya está cargado, proceder inmediatamente
    // Si no, esperar a que esté disponible
    this.processDepartureSelection();
  }

  /**
   * Procesa la selección del departure, esperando a que allDepartures esté disponible si es necesario
   */
  private processDepartureSelection(): void {
    // Si allDepartures ya está cargado, proceder inmediatamente
    if (this.allDepartures.length > 0) {
      this.executeDepartureSelection();
      return;
    }

    // Si no está cargado, esperar a que allDeparturesReady$ emita
    this.allDeparturesReady$
      .pipe(
        takeUntil(this.destroy$),
        // Usar take(1) para completar después de la primera emisión
        // Si ya se emitió antes, usar of para proceder inmediatamente
        switchMap(() => {
          if (this.allDepartures.length > 0) {
            return of(true);
          }
          return of(false);
        })
      )
      .subscribe({
        next: (hasDepartures) => {
          if (hasDepartures) {
            this.executeDepartureSelection();
          } else {
            // Si no hay departures después de esperar, usar departureDetails directamente
            this.executeDepartureSelectionFromDetails();
          }
        }
      });
  }

  /**
   * Ejecuta la selección del departure cuando allDepartures está disponible
   */
  private executeDepartureSelection(): void {
    const selectedDepartureFromSelector = this.filteredDepartures.find(
      (dep) => dep.id === this.selectedDeparture?.departure.id
    );

    // Intentar seleccionar la salida del selector si es reservable
    if (selectedDepartureFromSelector && selectedDepartureFromSelector.isBookable) {
      this.addToCart(selectedDepartureFromSelector);
    } else if (selectedDepartureFromSelector && !selectedDepartureFromSelector.isBookable) {
      // Si la salida del selector no es reservable, emitir evento con isBookable: false para deshabilitar el botón
      this.selectedDepartureId = selectedDepartureFromSelector.id;
      const departureWithAvailability = {
        id: selectedDepartureFromSelector.id,
        departureDate: selectedDepartureFromSelector.departureDate,
        returnDate: selectedDepartureFromSelector.returnDate,
        price: selectedDepartureFromSelector.price,
        status: selectedDepartureFromSelector.status,
        waitingList: selectedDepartureFromSelector.waitingList,
        group: selectedDepartureFromSelector.group,
        isBookable: false
      };
      this.departureUpdate.emit(departureWithAvailability);
      // Luego buscar la más cercana que sí lo sea
      this.autoSelectNearestBookableDeparture();
    } else {
      // Si no hay salida del selector, auto-seleccionar la más cercana reservable
      this.autoSelectNearestBookableDeparture();
    }

    this.emitCityUpdate();
  }

  /**
   * Ejecuta la selección del departure usando departureDetails cuando allDepartures no está disponible
   */
  private executeDepartureSelectionFromDetails(): void {
    if (!this.departureDetails) return;

    const spots = this.getAvailableSpots(this.departureDetails.id);
    const isBookable = (this.departureDetails.isBookable ?? true) && (spots === -1 || spots > 0);
    
      const adultPrice = this.getPriceForDeparture(this.departureDetails.id);
      const departureFromDetails = {
        id: this.departureDetails.id,
        departureDate: this.departureDetails.departureDate,
        returnDate: this.departureDetails.arrivalDate,
        price: adultPrice,
        priceError: adultPrice === null,
        isBookable: isBookable,
      };
    
    if (departureFromDetails.isBookable) {
      this.addToCart(departureFromDetails);
    } else {
      // Si no es bookable, emitir evento con isBookable: false para deshabilitar el botón
      this.selectedDepartureId = departureFromDetails.id;
      const price = this.getPriceForDeparture(departureFromDetails.id);
      const departureWithAvailability = {
        id: departureFromDetails.id,
        departureDate: departureFromDetails.departureDate,
        returnDate: departureFromDetails.returnDate,
        price: price,
        priceError: price === null,
        status: 'available',
        waitingList: false,
        group: '',
        isBookable: false
      };
      this.departureUpdate.emit(departureWithAvailability);
    }
    this.emitCityUpdate();
  }

  /**
   * Selecciona el departure por defecto del endpoint
   */
  private selectDefaultDeparture(departureId: number): void {
    if (!departureId) return;

    // Buscar primero en filteredDepartures, si está vacío buscar en allDepartures
    let defaultDeparture = this.filteredDepartures.find(
      (dep) => dep.id === departureId
    );

    if (!defaultDeparture) {
      const departureFromAll = this.allDepartures.find(
        (dep) => dep.id === departureId
      );
      
      if (departureFromAll) {
        const adultPrice = this.getPriceForDeparture(departureFromAll.id);
        const availabilityStatus = this.getAvailabilityStatus(departureFromAll.id);
        const spots = this.getAvailableSpots(departureFromAll.id);
        const isBookable = (departureFromAll.isBookable ?? true) && (spots === -1 || spots > 0);
        
        defaultDeparture = {
          id: departureFromAll.id,
          departureDate: departureFromAll.departureDate,
          returnDate: departureFromAll.arrivalDate,
          price: adultPrice,
          priceError: adultPrice === null,
          status: 'available',
          waitingList: false,
          group: '',
          isBookable: isBookable,
          availabilityStatus: availabilityStatus.status,
          availabilityMessage: availabilityStatus.message,
          availableSpots: spots,
        };
      }
    }

    if (defaultDeparture) {
      this.addToCart(defaultDeparture);
    } else {
      this.autoSelectNearestBookableDeparture();
    }
  }

  /**
   * Auto-selecciona la salida más cercana que sea reservable (isBookable: true)
   */
  private autoSelectNearestBookableDeparture(): void {
    if (this.filteredDepartures.length === 0) return;

    // Filtrar solo salidas reservables
    const bookableDepartures = this.filteredDepartures.filter(
      (dep) => dep.isBookable === true
    );

    if (bookableDepartures.length === 0) {
      return;
    }

    // Obtener la fecha actual
    const now = new Date();

    // Buscar la primera salida futura y reservable
    const futureDeparture = bookableDepartures.find(
      (dep) => new Date(dep.departureDate) >= now
    );

    // Si hay una salida futura, seleccionarla; si no, seleccionar la primera disponible
    const nearestBookable = futureDeparture || bookableDepartures[0];

    if (nearestBookable) {
      this.addToCart(nearestBookable);
    }
  }


  get tripDuration(): number {
    if (!this.departureDetails) return 0;

    try {
      const departureDate = new Date(this.departureDetails.departureDate ?? '');
      const arrivalDate = new Date(this.departureDetails.arrivalDate ?? '');
      const diffTime = Math.abs(
        arrivalDate.getTime() - departureDate.getTime()
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  }

  checkIfShouldBlockKids(): boolean {
    if (!this.selectedDepartureId || this.filteredDepartures.length === 0) {
      return false;
    }

    const selectedDeparture = this.filteredDepartures.find(
      (d) => d.id === this.selectedDepartureId
    );

    if (!selectedDeparture) {
      return false;
    }

    const isSingleTrip =
      selectedDeparture.group?.toLowerCase().includes('single') ||
      this.getTripTypeInfo(selectedDeparture.group)?.class === 'single';

    return isSingleTrip; //|| selectedDeparture.price === 0;
  }

  showBlockedPassengersToast(): void {
    const selectedDeparture = this.filteredDepartures.find(
      (d) => d.id === this.selectedDepartureId
    );

    const isSingleTrip =
      selectedDeparture?.group?.toLowerCase().includes('single') ||
      this.getTripTypeInfo(selectedDeparture?.group)?.class === 'single';

    let message = '';
    if (isSingleTrip) {
      message = 'Esta salida es para Singles y solo permite pasajeros adultos';
    } else if (selectedDeparture?.price === 0) {
      message = 'Esta salida con precio 0€ no permite añadir niños o bebés';
    } else {
      message = 'No se pueden añadir niños o bebés a este viaje';
    }

    this.messageService.add({
      severity: 'warn',
      summary: 'Pasajeros no permitidos',
      detail: message,
      life: 3000,
    });
  }

  private getPriceByPassengerType(
    passengerType: 'adults' | 'children' | 'babies'
  ): number | null {
    // Si hubo un error al cargar los precios, retornar null para indicar error
    if (this.pricesError) {
      return null;
    }

    // Si se intentó cargar precios (no está cargando) pero no hay precios y hay error, retornar null
    if ((!this.departuresPrices || this.departuresPrices.length === 0) && !this.pricesLoading && this.pricesError) {
      return null;
    }

    // Si no hay precios cargados pero aún está cargando, retornar 0 (esperando)
    if (!this.departuresPrices || this.departuresPrices.length === 0) {
      return 0;
    }

    const ageGroupId = this.ageGroupCategories[passengerType].id;
    if (!ageGroupId) return 0;

    const priceData = this.departuresPrices.find(
      (price) =>
        price.ageGroupId === ageGroupId &&
        price.departureId === this.selectedDepartureId
    );

    return priceData ? priceData.total : 0;
  }

  private getPriceForDeparture(departureId: number): number | null {
    // Si hubo un error al cargar los precios, retornar null para indicar error
    if (this.pricesError) {
      return null;
    }

    // Si no hay activityId, no se pueden cargar precios, retornar 0
    if (!this.selectedCity?.activityId) {
      return 0;
    }

    // Si no hay precios cargados pero aún está cargando, retornar 0 (esperando)
    if (!this.departuresPrices || this.departuresPrices.length === 0) {
      // Si ya se intentó cargar (no está cargando) y hay error, retornar null
      if (!this.pricesLoading && this.pricesError) {
        return null;
      }
      return 0;
    }

    const priceData = this.departuresPrices.find(
      (price) =>
        price.departureId === departureId &&
        price.ageGroupId === this.ageGroupCategories.adults.id
    );

    return priceData ? priceData.total : 0;
  }

  get filteredDepartures(): any[] {
    if (this.allDepartures.length === 0) {
      if (!this.departureDetails) return [];

      const adultPrice = this.getPriceByPassengerType('adults');
      const availabilityStatus = this.getAvailabilityStatus(this.departureDetails.id);
      const spots = this.getAvailableSpots(this.departureDetails.id);
      const isBookable = (this.departureDetails.isBookable ?? true) && (spots === -1 || spots > 0);
      
      const departure = {
        id: this.departureDetails.id,
        departureDate: this.departureDetails.departureDate,
        returnDate: this.departureDetails.arrivalDate,
        price: adultPrice,
        priceError: adultPrice === null,
        status: 'available',
        waitingList: false,
        group: this.selectedDeparture?.tripType?.name || 'group',
        tripTypeId: this.departureDetails.tripTypeId ?? null,
        isBookable: isBookable,
        availabilityStatus: availabilityStatus.status,
        availabilityMessage: availabilityStatus.message,
        availableSpots: spots,
      };
      return [departure];
    }

    let filteredDepartures = this.allDepartures;
    
    if (this.selectedCity && this.selectedCity.activityPackId) {
      const cityDepartures = this.departuresByCity.get(this.selectedCity.activityPackId);
      if (cityDepartures && cityDepartures.length > 0) {
        const departureIds = new Set(cityDepartures.map((d) => d.departureId));
        filteredDepartures = this.allDepartures.filter((departure) =>
          departureIds.has(departure.id!)
        );
      } else {
        filteredDepartures = [];
      }
    }

    return filteredDepartures.map((departure) => {
      const adultPrice = this.getPriceForDeparture(departure.id);
      const availabilityStatus = this.getAvailabilityStatus(departure.id);
      const spots = this.getAvailableSpots(departure.id);
      
      const isBookable = (departure.isBookable ?? true) && (spots === -1 || spots > 0);

      const priceError = adultPrice === null || this.pricesError;

      return {
        id: departure.id,
        departureDate: departure.departureDate,
        returnDate: departure.arrivalDate,
        price: adultPrice,
        priceError: priceError,
        status: 'available',
        waitingList: false,
        group: 'group',
        tripTypeId: departure.tripTypeId ?? null,
        isBookable: isBookable,
        availabilityStatus: availabilityStatus.status,
        availabilityMessage: availabilityStatus.message,
        availableSpots: this.getAvailableSpots(departure.id),
      };
    });
  }

  filterCities(event: any): void {
    const query = event.query;

    if (!query || query.trim() === '') {
      this.filteredCities = [...this.cities];
      return;
    }

    const filtered = this.cities.filter((city) => {
      const matches = city.name.toLowerCase().includes(query.toLowerCase());
      return matches;
    });

    this.filteredCities = filtered;
  }

  onCityChange(event: any): void {
    this.selectedCity = event;
    this.loadCityRelatedData();
    this.emitCityUpdate();

    if (this.selectedDepartureId) {
      this.calculateAndEmitPrice();
    }
  }

  private loadCityRelatedData(): void {
    if (!this.selectedCity) return;

    const activityIds = this.getActivityIdsForSelectedCity();
    if (activityIds.length > 0) {
      this.loadDeparturesPrices(activityIds, 0).subscribe();
    }

    // Solo cargar flight times para los departures de la ciudad seleccionada
    const cityDepartures = this.departuresByCity.get(this.selectedCity.activityPackId!);
    if (cityDepartures) {
      cityDepartures.forEach(departureData => {
        if (departureData.departureId) {
          this.loadFlightTimes(departureData.departureId);
        }
      });
    }
  }

  private emitCityUpdate(): void {
    if (!this.selectedCity) {
      this.cityUpdate.emit('');
      this.activityPackIdUpdate.emit(null);
      return;
    }

    // ✅ AGREGAR emisión
    this.activityPackIdUpdate.emit(this.selectedCity.activityPackId || null);

    // Verificar si realmente existe la opción "Sin Vuelos" en las ciudades disponibles
    const hasSinVuelosOption = this.cities.some(
      (city) =>
        city.name.toLowerCase().includes('sin vuelos') ||
        city.name.toLowerCase().includes('sin vuelo')
    );

    const isSinVuelos =
      this.selectedCity.name.toLowerCase().includes('sin vuelos') ||
      this.selectedCity.name.toLowerCase().includes('sin vuelo');

    let cityText: string;

    if (isSinVuelos && hasSinVuelosOption) {
      // Solo mostrar "Sin Vuelos" si realmente existe esa opción en el servicio
      cityText = 'Sin Vuelos';
    } else if (isSinVuelos && !hasSinVuelosOption) {
      // Si la ciudad seleccionada tiene "sin vuelos" pero no está en el servicio, mostrar el nombre completo
      cityText = this.selectedCity.name;
    } else {
      // Ciudad normal con vuelo
      cityText = `Vuelo desde ${this.selectedCity.name}`;
    }

    this.cityUpdate.emit(cityText);
  }

  togglePassengersPanel(event: Event): void {
    this.showPassengersPanel = !this.showPassengersPanel;
    event.stopPropagation();
  }

  updatePassengers(type: keyof Travelers, change: number): void {
    this.shouldBlockKidsAndBabies = this.checkIfShouldBlockKids();

    if (type === 'adults') {
      if (!this.allowedPassengerTypes.adults && change > 0) {
        this.showPassengerTypeNotAllowedToast('adultos');
        return;
      }
      this.travelers.adults = Math.max(1, this.travelers.adults + change);
    } else if (type === 'children') {
      if (!this.allowedPassengerTypes.children && change > 0) {
        this.showPassengerTypeNotAllowedToast('niños');
        return;
      }
      if (this.shouldBlockKidsAndBabies && change > 0) {
        this.showBlockedPassengersToast();
        return;
      }
      this.travelers.children = Math.max(0, this.travelers.children + change);
    } else if (type === 'babies') {
      if (!this.allowedPassengerTypes.babies && change > 0) {
        this.showPassengerTypeNotAllowedToast('bebés');
        return;
      }
      if (this.shouldBlockKidsAndBabies && change > 0) {
        this.showBlockedPassengersToast();
        return;
      }
      this.travelers.babies = Math.max(0, this.travelers.babies + change);
    }

    this.updatePassengerText();
    this.emitPassengersUpdate();

    if (this.selectedDepartureId) {
      this.calculateAndEmitPrice();
    }
  }

  private showPassengerTypeNotAllowedToast(passengerType: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Tipo de pasajero no permitido',
      detail: `Este tour no permite ${passengerType} según los grupos de edad configurados.`,
      life: 4000,
    });
  }

  updatePassengerText(): void {
    const parts = [];

    if (this.travelers.adults > 0) {
      parts.push(
        `${this.travelers.adults} ${
          this.travelers.adults === 1 ? 'Adulto' : 'Adultos'
        }`
      );
    }

    if (this.travelers.children > 0) {
      parts.push(
        `${this.travelers.children} ${
          this.travelers.children === 1 ? 'Niño' : 'Niños'
        }`
      );
    }

    if (this.travelers.babies > 0) {
      parts.push(
        `${this.travelers.babies} ${
          this.travelers.babies === 1 ? 'Bebé' : 'Bebés'
        }`
      );
    }

    this.passengerText = parts.join(', ');
  }

  applyPassengers(): void {
    this.showPassengersPanel = false;
    this.emitPassengersUpdate();

    if (this.selectedDepartureId) {
      this.calculateAndEmitPrice();
    }
  }

  private emitPassengersUpdate(): void {
    this.passengersUpdate.emit({
      adults: this.travelers.adults,
      children: this.travelers.children,
      babies: this.travelers.babies,
      total:
        this.travelers.adults + this.travelers.children + this.travelers.babies,
    });
  }

  getTripTypeInfo(group: string): any {
    if (!group) return undefined;

    const type = group.toLowerCase();

    if (type.includes('single') || type.includes('singles')) {
      return {
        title: 'Single',
        description: 'Viaje individual',
        class: 'single',
      };
    }

    if (type.includes('group') || type.includes('grupo')) {
      return { title: 'Group', description: 'Viaje en grupo', class: 'group' };
    }

    if (type.includes('private') || type.includes('privado')) {
      return {
        title: 'Private',
        description: 'Viaje privado',
        class: 'private',
      };
    }

    return undefined;
  }

  addToCart(item: any): void {
    // Validar que la salida sea reservable
    if (!item.isBookable) {
      const availabilityStatus = this.getAvailabilityStatus(item.id);
      let detail = 'Esta salida no está disponible para reservar.';
      
      if (availabilityStatus.status === 'no-spots') {
        detail = 'No hay plazas disponibles para esta salida.';
      } else if (availabilityStatus.status === 'last-spots') {
        detail = 'Quedan muy pocas plazas disponibles.';
      }
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Salida no disponible',
        detail: detail,
        life: 3000,
      });
      
      // IMPORTANTE: Emitir el evento con isBookable: false para que el botón "Reservar mi tour" se deshabilite
      this.selectedDepartureId = item.id;
      const departureWithAvailability = {
        id: item.id,
        departureDate: item.departureDate,
        returnDate: item.returnDate,
        price: item.price,
        status: item.status,
        waitingList: item.waitingList,
        group: item.group,
        isBookable: false
      };
      this.departureUpdate.emit(departureWithAvailability);
      return;
    }

    this.selectedDepartureId = item.id;
    
    // Calcular precio y luego emitir departureUpdate con isBookable actualizado
    this.calculateAndEmitPriceObservable().subscribe({
      next: () => {
        // Recalcular isBookable antes de emitir
        const spots = this.getAvailableSpots(item.id);
        const isBookable = (item.isBookable ?? true) && (spots === -1 || spots > 0);
        
        // Crear objeto con isBookable actualizado
        const departureWithAvailability = {
          ...item,
          isBookable: isBookable
        };
        
        this.departureUpdate.emit(departureWithAvailability);
      }
    });
  }

  private calculateAndEmitPrice(): void {
    this.calculateAndEmitPriceObservable().subscribe();
  }

  private calculateAndEmitPriceObservable(): Observable<void> {
    if (!this.selectedDepartureId) {
      this.priceUpdate.emit(0);
      return of(undefined);
    }

    // Si hay un error, calcular inmediatamente para mostrar el error
    if (this.pricesError && !this.pricesLoading) {
      this.doCalculateAndEmitPrice();
      return of(undefined);
    }

    // Si los precios ya están disponibles, calcular inmediatamente
    if (
      this.departuresPrices &&
      this.departuresPrices.length > 0 &&
      !this.pricesLoading
    ) {
      this.doCalculateAndEmitPrice();
      return of(undefined);
    }

    // Si no están disponibles, esperar a que pricesReady$ emita o haya un error
    return this.pricesReady$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => 
          (this.departuresPrices &&
          this.departuresPrices.length > 0 &&
          !this.pricesLoading) ||
          (this.pricesError && !this.pricesLoading)
        ),
        map(() => {
          this.doCalculateAndEmitPrice();
          return undefined;
        })
      );
  }

  /**
   * Calcula y emite el precio (asume que los precios ya están disponibles)
   */
  private doCalculateAndEmitPrice(): void {
    if (!this.selectedDepartureId) {
      this.priceUpdate.emit(0);
      return;
    }

    const selectedDeparture = this.filteredDepartures.find(
      (d) => d.id === this.selectedDepartureId
    );

    if (!selectedDeparture) {
      this.priceUpdate.emit(0);
      return;
    }

    const adultPrice = this.getPriceByPassengerType('adults');
    const childPrice = this.getPriceByPassengerType('children');
    const babyPrice = this.getPriceByPassengerType('babies');

    // Si hay algún error (precio null), emitir -1 para indicar error
    if (adultPrice === null || childPrice === null || babyPrice === null) {
      this.priceUpdate.emit(-1);
      return;
    }

    const totalPrice =
      this.travelers.adults * adultPrice +
      this.travelers.children * childPrice +
      this.travelers.babies * babyPrice;

    this.priceUpdate.emit(totalPrice);
  }

  isDepartureSelected(item: any): boolean {
    return this.selectedDepartureId === item.id;
  }

  get hasSelectedDeparture(): boolean {
    return this.selectedDeparture !== null;
  }

  get hasValidData(): boolean {
    return !this.loading && !this.error && this.hasSelectedDeparture;
  }

  getAgeText(passengerType: 'adults' | 'children' | 'babies'): string {
    const category = this.ageGroupCategories[passengerType];

    if (!category.lowerAge && category.lowerAge !== 0) return '';
    if (!category.upperAge && category.upperAge !== 0) return '';

    if (category.upperAge >= 99) {
      return `${category.lowerAge}+ años`;
    }

    if (category.lowerAge === category.upperAge) {
      return `${category.lowerAge} años`;
    }

    return `${category.lowerAge}-${category.upperAge} años`;
  }
  // ✅ AGREGAR ESTE MÉTODO AL FINAL DEL COMPONENTE TypeScript

  trackByDepartureId(index: number, item: any): any {
    return item.id; // Usar ID único para evitar re-renderizado innecesario
  }

  // Método para obtener horarios de vuelos
  getFlightTimes(departureId: number): string {
    const flightTimes = this.flightTimesByDepartureId[departureId] || '';
    return flightTimes;
  }

  // Método para obtener líneas de vuelos separadas
  getFlightTimesLines(departureId: number): string[] {
    const flightTimes = this.flightTimesByDepartureId[departureId];
    if (!flightTimes) return [];
    
    return flightTimes.split('\n');
  }

  // Cargar horarios de vuelos para un departure específico
  private loadFlightTimes(departureId: number): void {
    if (!this.selectedCity?.activityPackId) return;

    this.flightsNetService.getFlights(departureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (flightPacks: any[]) => {
          if (flightPacks && flightPacks.length > 0) {
            let selectedFlightPack = flightPacks.find(
              (pack) => pack.id === this.selectedCity?.activityPackId
            );
            
            if (!selectedFlightPack && flightPacks.length > 0) {
              selectedFlightPack = flightPacks[0];
            }
            
            if (selectedFlightPack && selectedFlightPack.flights && selectedFlightPack.flights.length > 0) {
              const outboundFlight = selectedFlightPack.flights.find((f: any) => f.flightTypeId === 4);
              const returnFlight = selectedFlightPack.flights.find((f: any) => f.flightTypeId === 5);
              
              if (outboundFlight) {
                const depTime = this.formatTime(outboundFlight.departureTime || '');
                const depIata = outboundFlight.departureIATACode || '';
                const arrTime = this.formatTime(outboundFlight.arrivalTime || '');
                const arrIata = outboundFlight.arrivalIATACode || '';
                
                // Verificar si la llegada es al día siguiente
                let arrivalSuffix = '';
                if (outboundFlight.departureDate && outboundFlight.arrivalDate) {
                  const outboundDepDate = new Date(outboundFlight.departureDate);
                  const outboundArrDate = new Date(outboundFlight.arrivalDate);
                  // Comparar solo las fechas (sin hora)
                  if (outboundArrDate.toDateString() !== outboundDepDate.toDateString()) {
                    arrivalSuffix = ' +1';
                  }
                }
                
                let flightTimes = `${depTime} (${depIata}) → ${arrTime}${arrivalSuffix} (${arrIata})`;
                
                if (returnFlight) {
                  const retDepTime = this.formatTime(returnFlight.departureTime || '');
                  const retDepIata = returnFlight.departureIATACode || '';
                  const retArrTime = this.formatTime(returnFlight.arrivalTime || '');
                  const retArrIata = returnFlight.arrivalIATACode || '';
                  
                  // Verificar si la llegada del vuelo de regreso es al día siguiente
                  let returnArrivalSuffix = '';
                  if (returnFlight.departureDate && returnFlight.arrivalDate) {
                    const returnDepDate = new Date(returnFlight.departureDate);
                    const returnArrDate = new Date(returnFlight.arrivalDate);
                    // Comparar solo las fechas (sin hora)
                    if (returnArrDate.toDateString() !== returnDepDate.toDateString()) {
                      returnArrivalSuffix = ' +1';
                    }
                  }
                  
                  flightTimes += `\n${retDepTime} (${retDepIata}) → ${retArrTime}${returnArrivalSuffix} (${retArrIata})`;
                }
                
                this.flightTimesByDepartureId[departureId] = flightTimes;
              }
            }
          }
        },
        error: () => {
        }
      });
  }

  // Obtener el número de plazas disponibles para un departure
  // Usa el valor más restrictivo del nuevo endpoint by-tour cuando está disponible
  getAvailableSpots(departureId: number): number {
    if (this.selectedCity?.activityPackId) {
      const cityDepartures = this.departuresByCity.get(this.selectedCity.activityPackId);
      if (cityDepartures) {
        const departureData = cityDepartures.find((d) => d.departureId === departureId);
        if (departureData) {
          return departureData.mostRestrictiveAvailability;
        }
      }
    }

    // Fallback: usar datos de availability que vienen del nuevo endpoint (poblados en buildAllDeparturesFromCityData)
    const activityPackAvailability = this.activityPackAvailabilityByDepartureId[departureId];
    const departureAvailability = this.departureAvailabilityByDepartureId[departureId];
    
    if (!activityPackAvailability && !departureAvailability) {
      return -1;
    }
    
    const activityPackSpots = activityPackAvailability?.bookableAvailability ?? Number.MAX_SAFE_INTEGER;
    const departureSpots = departureAvailability?.bookableAvailability ?? Number.MAX_SAFE_INTEGER;
    
    if (activityPackSpots === Number.MAX_SAFE_INTEGER && 
        departureSpots === Number.MAX_SAFE_INTEGER) {
      return -1;
    }
    
    return Math.min(activityPackSpots, departureSpots);
  }

  // Verificar si hay plazas disponibles
  hasAvailableSpots(departureId: number): boolean {
    const spots = this.getAvailableSpots(departureId);
    return spots > 0;
  }

  // Verificar si una ciudad tiene al menos un departure con disponibilidad
  private hasCityAvailability(city: City): boolean {
    if (!city || !city.activityPackId) {
      return false;
    }

    const cityDepartures = this.departuresByCity.get(city.activityPackId);
    if (!cityDepartures || cityDepartures.length === 0) {
      return false;
    }

    return cityDepartures.some(
      (departure) => departure.mostRestrictiveAvailability > 0
    );
  }

  // Seleccionar la primera ciudad que tenga disponibilidad
  private selectDefaultCityWithAvailability(): void {
    if (this.cities.length === 0) {
      return;
    }

    // Buscar la primera ciudad con disponibilidad
    const cityWithAvailability = this.cities.find(city => this.hasCityAvailability(city));
    this.selectedCity = cityWithAvailability || this.cities[0];
    
    this.emitCityUpdate();
    this.loadCityRelatedData();
    
    // Cargar precios y seleccionar departure si hay activityIds
    const activityIds = this.getActivityIdsForSelectedCity();
    if (activityIds.length > 0) {
      this.loadDeparturesPrices(activityIds, 0).subscribe({
        next: () => {
          if (this.filteredDepartures.length > 0) {
            this.autoSelectNearestBookableDeparture();
          }
        }
      });
    } else {
      // Si no hay activityId, verificar si hay departures disponibles
      const cityDepartures = this.departuresByCity.get(this.selectedCity.activityPackId!);
      if (cityDepartures && cityDepartures.length > 0) {
        this.autoSelectNearestBookableDeparture();
      }
    }
  }


  // Obtener el estado de plazas para mostrar en la UI
  getAvailabilityStatus(departureId: number): {
    status: 'available' | 'last-spots' | 'no-spots' | 'loading';
    message: string;
  } {
    const spots = this.getAvailableSpots(departureId);
    
    if (spots === -1) {
      return { status: 'loading', message: '' };
    }
    
    if (spots === 0) {
      return { status: 'no-spots', message: 'SIN PLAZAS' };
    }
    
    if (spots <= 4) {
      return { status: 'last-spots', message: 'Últimas plazas' };
    }
    
    return { status: 'available', message: '' };
  }

  private formatTime(timeString: string): string {
    if (!timeString) return '';
    
    // Si ya es un formato de hora (HH:MM:SS), devolverlo directamente
    if (timeString.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
      return timeString.substring(0, 5); // Tomar solo HH:MM
    }
    
    // Si es una fecha completa, formatearla
    const date = new Date(timeString);
    if (isNaN(date.getTime())) {
      return timeString; // Si no es una fecha válida, devolver el string original
    }
    
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: false 
    });
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';

    try {
      // Parsear la fecha directamente sin agregar tiempo para evitar problemas de zona horaria
      const [year, month, day] = dateString.split('-').map(Number);
      
      // Crear fecha usando los componentes individuales
      const dateObj = new Date(year, month - 1, day); // month - 1 porque los meses van de 0-11

      // Verificar que la fecha es válida
      if (isNaN(dateObj.getTime())) {
        return '';
      }

      // Formatear usando toLocaleDateString con opciones específicas
      return dateObj
        .toLocaleDateString('es-ES', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        .replace(/^\w/, (c) => c.toUpperCase());
    } catch {
      return '';
    }
  }

  /**
   * Verifica si la ciudad seleccionada es "sin vuelos"
   * @returns true si se seleccionó "sin vuelos"
   */
  isSinVuelosSelected(): boolean {
    if (!this.selectedCity) {
      return false;
    }

    return this.selectedCity.name.toLowerCase().includes('sin vuelos') ||
           this.selectedCity.name.toLowerCase().includes('sin vuelo');
  }
}
