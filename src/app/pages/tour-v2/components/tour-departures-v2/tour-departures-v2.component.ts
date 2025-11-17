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
import { takeUntil, switchMap, catchError, map, tap, filter } from 'rxjs/operators';
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
} from '../../../../core/services/tour/tour-departures-prices.service';
import {
  ActivityAvailabilityService,
  IActivityAvailabilityResponse,
} from '../../../../core/services/activity/activity-availability.service';
import {
  ActivityPackAvailabilityService,
  IActivityPackAvailabilityResponse,
} from '../../../../core/services/activity/activity-pack-availability.service';
import {
  DepartureAvailabilityService,
  IDepartureAvailabilityResponse,
} from '../../../../core/services/departure/departure-availability.service';

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

  // Mapa de disponibilidad de plazas por departureId (Activity)
  activityAvailabilityByDepartureId: {
    [departureId: number]: IActivityAvailabilityResponse | null;
  } = {};

  // Mapa de disponibilidad de plazas por departureId (ActivityPack)
  activityPackAvailabilityByDepartureId: {
    [departureId: number]: IActivityPackAvailabilityResponse | null;
  } = {};

  // Mapa de disponibilidad de plazas por departureId (Departure)
  departureAvailabilityByDepartureId: {
    [departureId: number]: IDepartureAvailabilityResponse | null;
  } = {};

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
    private activityAvailabilityService: ActivityAvailabilityService,
    private activityPackAvailabilityService: ActivityPackAvailabilityService,
    private departureAvailabilityService: DepartureAvailabilityService
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
            console.warn(
              '⚠️ La respuesta del servicio está vacía o es null/undefined'
            );
            this.cities = [];
            this.filteredCities = [];
            this.selectedCity = null;
            this.citiesLoading = false;
            this.citiesLoadingUpdate.emit(false);
            // Emitir cityUpdate con string vacío cuando no hay ciudades
            this.emitCityUpdate();
            return;
          }

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
            console.warn('⚠️ No hay ciudades disponibles para seleccionar');
            this.citiesLoading = false;
            this.citiesLoadingUpdate.emit(false);
            // Emitir cityUpdate con string vacío cuando no hay ciudades
            this.emitCityUpdate();
            return;
          }

          this.citiesLoading = false;
          this.citiesLoadingUpdate.emit(false);
          
          // Después de cargar ciudades, intentar cargar departures
          // La selección de ciudad se hará después de cargar disponibilidades
          this.loadAllDeparturesForTour();
        },
        error: (error) => {
          console.error('Error cargando ciudades:', error);
          this.cities = [];
          this.filteredCities = [];
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

  private loadDeparturesPrices(activityId: number, departureId: number): Observable<ITourDeparturesPriceResponse[]> {
    if (!activityId || !departureId) {
      return of([]);
    }

    this.pricesLoading = true;

    return this.tourDeparturesPricesService
      .getAll(activityId)
      .pipe(
        takeUntil(this.destroy$),
        tap((pricesResponse: ITourDeparturesPriceResponse[]) => {
          this.departuresPrices = pricesResponse;
          this.pricesLoading = false;

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
              catchError((error) => {
                console.error(`Error obteniendo Age Group ${id}:`, error);
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
        error: (error) => {
          console.error('Error obteniendo conteo:', error);
        },
      });

    this.tourAgeGroupsService
      .hasAgeGroups(this.tourId, this.preview)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (hasAgeGroups) => {
          // Información de grupos obtenida
        },
        error: (error) => {
          console.error('Error verificando grupos de edad:', error);
        },
      });
  }

  private emitAgeGroupsUpdate(): void {
    this.ageGroupsUpdate.emit(this.ageGroupCategories);
  }
  private handleDepartureSelection(event: SelectedDepartureEvent): void {
    this.selectedDeparture = event;
    this.selectedDepartureId = null;

    this.loadAllDeparturesForTour();
    this.loadDepartureDetails(event.departure.id);
  }

  private loadAllDeparturesForTour(): void {
    if (!this.tourId) return;

    this.loading = true;
    this.error = undefined;

    let itineraryFilters: ItineraryFilters;
    if (!this.preview) {
      itineraryFilters = {
        tourId: this.tourId,
        isVisibleOnWeb: true,
        isBookable: true,
      };
    } else {
      itineraryFilters = {
        tourId: this.tourId,
      };
    }

    this.itineraryService
      .getAll(itineraryFilters, this.preview)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((itineraries) => {
          this.allItineraries = itineraries.filter(
            (itinerary) => itinerary.tkId && itinerary.tkId.trim() !== ''
          );

          if (this.allItineraries.length === 0) {
            return of([]);
          }
          const departureRequests = this.allItineraries.map((itinerary) =>
            this.departureService
              .getByItinerary(itinerary.id, this.preview)
              .pipe(
                catchError((error) => {
                  console.error(
                    `Error loading departures for itinerary ${itinerary.id}:`,
                    error
                  );
                  return of([]);
                })
              )
          );

          return forkJoin(departureRequests);
        })
      )
      .subscribe({
        next: (departuresArrays) => {
          this.allDepartures = departuresArrays
            .flat()
            .sort(
              (a, b) =>
                new Date(a.departureDate ?? '').getTime() -
                new Date(b.departureDate ?? '').getTime()
            );

          // Cargar horarios de vuelos para todos los departures
          this.allDepartures.forEach(departure => {
            if (departure.id) {
              this.loadFlightTimes(departure.id);
            }
          });

          // Cargar disponibilidades para todas las ciudades y departures
          this.loadAllAvailabilities().subscribe({
            next: () => {
              this.loading = false;

              // Notificar que allDepartures está listo
              this.allDeparturesReady$.next();

              // Seleccionar ciudad por defecto con disponibilidad
              if (!this.selectedCity && this.cities.length > 0) {
                this.selectDefaultCityWithAvailability();
              }

              // Si no hay departure preseleccionado, auto-seleccionar la más cercana reservable
              if (!this.selectedDeparture && this.allDepartures.length > 0) {
                this.autoSelectNearestBookableDeparture();
              }
            },
            error: (error) => {
              console.error('Error cargando disponibilidades:', error);
              this.loading = false;
              // Continuar de todas formas
              this.allDeparturesReady$.next();
              if (!this.selectedCity && this.cities.length > 0) {
                this.selectDefaultCityWithAvailability();
              }
            }
          });
        },
        error: (error) => {
          console.error('Error cargando departures del tour:', error);
          this.error = 'Error al cargar los departures del tour';
          this.loading = false;
        },
      });
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
            this.selectedCity.activityId &&
            this.departureDetails
          ) {
            return this.loadDeparturesPrices(
              this.selectedCity.activityId,
              this.departureDetails.id
            ).pipe(
              map((prices) => ({ departure, prices }))
            );
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

    // Cargar disponibilidad de plazas
    if (this.departureDetails.id) {
      this.loadDepartureAvailability(this.departureDetails.id);
      if (this.selectedCity?.activityId) {
        this.loadActivityAvailability(
          this.departureDetails.id,
          this.selectedCity.activityId
        );
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
      // Si la salida del selector no es reservable, buscar la más cercana que sí lo sea
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

    const departureFromDetails = {
      id: this.departureDetails.id,
      departureDate: this.departureDetails.departureDate,
      returnDate: this.departureDetails.arrivalDate,
      isBookable: this.departureDetails.isBookable ?? true,
    };
    
    if (departureFromDetails.isBookable) {
      this.addToCart(departureFromDetails);
    }
    this.emitCityUpdate();
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
      console.warn('No hay salidas reservables disponibles');
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
  ): number {
    if (!this.departuresPrices || this.departuresPrices.length === 0) return 0;

    const ageGroupId = this.ageGroupCategories[passengerType].id;
    if (!ageGroupId) return 0;

    const priceData = this.departuresPrices.find(
      (price) =>
        price.ageGroupId === ageGroupId &&
        price.departureId === this.selectedDepartureId
    );

    return priceData ? priceData.total : 0;
  }

  private getPriceForDeparture(departureId: number): number {
    if (!this.selectedCity?.activityId || !this.departuresPrices) return 0;

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
        status: 'available',
        waitingList: false,
        group: this.selectedDeparture?.tripType?.name || 'group',
        isBookable: isBookable,
        availabilityStatus: availabilityStatus.status,
        availabilityMessage: availabilityStatus.message,
        availableSpots: spots,
      };
      return [departure];
    }

    // Filtrar departures por la ciudad seleccionada
    let filteredDepartures = this.allDepartures;
    
    if (this.selectedCity && this.selectedCity.activityId) {
      // Filtrar por activityId de la ciudad seleccionada
      filteredDepartures = this.allDepartures.filter(departure => {
        // Aquí necesitamos la lógica de filtrado por ciudad
        // Por ahora, devolvemos todos los departures para debugging
        return true;
      });
    }

    return filteredDepartures.map((departure) => {
      const adultPrice = this.getPriceForDeparture(departure.id);
      const availabilityStatus = this.getAvailabilityStatus(departure.id);
      const spots = this.getAvailableSpots(departure.id);
      
      // Un departure no es reservable si:
      // 1. No es bookable por defecto, O
      // 2. Las plazas ya se cargaron (spots !== -1) y no hay plazas disponibles (spots === 0)
      // Si spots === -1 significa que aún se está cargando, así que permitimos la reserva
      const isBookable = (departure.isBookable ?? true) && (spots === -1 || spots > 0);

      return {
        id: departure.id,
        departureDate: departure.departureDate,
        returnDate: departure.arrivalDate,
        price: adultPrice,
        status: 'available',
        waitingList: false,
        group: 'group',
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

    if (
      this.selectedCity &&
      this.selectedCity.activityId &&
      this.departureDetails
    ) {
      this.loadDeparturesPrices(
        this.selectedCity.activityId,
        this.departureDetails.id
      );
    }

    // Cargar disponibilidad de plazas para todos los departures cuando cambia la ciudad
    if (this.selectedCity) {
      this.allDepartures.forEach(departure => {
        if (departure.id) {
          // Cargar activityAvailability si la ciudad tiene activityId
          if (this.selectedCity!.activityId) {
            this.loadActivityAvailability(departure.id, this.selectedCity!.activityId!);
          }
          // Cargar activityPackAvailability si la ciudad tiene activityPackId
          if (this.selectedCity!.activityPackId) {
            this.loadActivityPackAvailability(departure.id, this.selectedCity!.activityPackId!);
          }
          // Recargar horarios de vuelos con la nueva ciudad seleccionada
          this.loadFlightTimes(departure.id);
        }
      });
    }

    this.emitCityUpdate();

    // Recalcular precio si hay departure seleccionado
    if (this.selectedDepartureId) {
      this.calculateAndEmitPrice();
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

    // Si los precios ya están disponibles, calcular inmediatamente
    if (
      this.departuresPrices &&
      this.departuresPrices.length > 0 &&
      !this.pricesLoading
    ) {
      this.doCalculateAndEmitPrice();
      return of(undefined);
    }

    // Si no están disponibles, esperar a que pricesReady$ emita
    return this.pricesReady$
      .pipe(
        takeUntil(this.destroy$),
        filter(() => 
          this.departuresPrices &&
          this.departuresPrices.length > 0 &&
          !this.pricesLoading
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
    this.flightsNetService.getFlights(departureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (flightPacks: any[]) => {
          if (flightPacks && flightPacks.length > 0) {
            // Filtrar el flight pack correcto según la ciudad seleccionada
            let selectedFlightPack = null;
            
            if (this.selectedCity && this.selectedCity.activityId) {
              // Buscar el flight pack que coincida con la ciudad seleccionada
              selectedFlightPack = flightPacks.find(pack => {
                if (pack.flights && pack.flights.length > 0) {
                  const outboundFlight = pack.flights.find((f: any) => f.flightTypeId === 4);
                  return outboundFlight && outboundFlight.activityId === this.selectedCity?.activityId;
                }
                return false;
              });
            }
            
            // Si no se encuentra un pack específico, usar el primero (fallback)
            if (!selectedFlightPack) {
              selectedFlightPack = flightPacks[0];
            }
            
            if (selectedFlightPack && selectedFlightPack.flights && selectedFlightPack.flights.length > 0) {
              // Buscar vuelos de ida y vuelta
              const outboundFlight = selectedFlightPack.flights.find((f: any) => f.flightTypeId === 4);
              const returnFlight = selectedFlightPack.flights.find((f: any) => f.flightTypeId === 5);
              
              if (outboundFlight) {
                const depTime = this.formatTime(outboundFlight.departureTime || '');
                const depIata = outboundFlight.departureIATACode || '';
                const arrTime = this.formatTime(outboundFlight.arrivalTime || '');
                const arrIata = outboundFlight.arrivalIATACode || '';
                
                let flightTimes = `${depTime} (${depIata}) → ${arrTime} (${arrIata})`;
                
                if (returnFlight) {
                  const retDepTime = this.formatTime(returnFlight.departureTime || '');
                  const retDepIata = returnFlight.departureIATACode || '';
                  const retArrTime = this.formatTime(returnFlight.arrivalTime || '');
                  const retArrIata = returnFlight.arrivalIATACode || '';
                  
                  flightTimes += `\n${retDepTime} (${retDepIata}) → ${retArrTime} (${retArrIata})`;
                }
                
                this.flightTimesByDepartureId[departureId] = flightTimes;
              }
            }
          }
        },
        error: (err: any) => {
          console.error(`Error cargando horarios de vuelos para departure ${departureId}:`, err);
        }
      });
  }

  // Cargar disponibilidad de plazas para un departure específico (Activity)
  private loadActivityAvailability(departureId: number, activityId: number): void {
    this.activityAvailabilityService
      .getByActivityAndDeparture(activityId, departureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (availabilityArray: IActivityAvailabilityResponse[]) => {
          // Tomar la primera disponibilidad si existe
          if (availabilityArray && availabilityArray.length > 0) {
            this.activityAvailabilityByDepartureId[departureId] = availabilityArray[0];
          } else {
            this.activityAvailabilityByDepartureId[departureId] = null;
          }
          // Si este departure está seleccionado, actualizar y re-emitir
          this.updateSelectedDepartureIfNeeded(departureId);
        },
        error: (err: unknown) => {
          console.error(
            `Error cargando disponibilidad de actividad para departure ${departureId}:`,
            err
          );
          this.activityAvailabilityByDepartureId[departureId] = null;
          this.updateSelectedDepartureIfNeeded(departureId);
        },
      });
  }

  // Cargar disponibilidad de plazas para un departure específico (ActivityPack)
  private loadActivityPackAvailability(departureId: number, activityPackId: number): void {
    this.activityPackAvailabilityService
      .getByActivityPackAndDeparture(activityPackId, departureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (availabilityArray: IActivityPackAvailabilityResponse[]) => {
          // Tomar la primera disponibilidad si existe
          if (availabilityArray && availabilityArray.length > 0) {
            this.activityPackAvailabilityByDepartureId[departureId] = availabilityArray[0];
          } else {
            this.activityPackAvailabilityByDepartureId[departureId] = null;
          }
          // Si este departure está seleccionado, actualizar y re-emitir
          this.updateSelectedDepartureIfNeeded(departureId);
        },
        error: (err: unknown) => {
          console.error(
            `Error cargando disponibilidad de activity pack para departure ${departureId}:`,
            err
          );
          this.activityPackAvailabilityByDepartureId[departureId] = null;
          this.updateSelectedDepartureIfNeeded(departureId);
        },
      });
  }

  // Cargar disponibilidad de plazas para un departure específico (Departure)
  private loadDepartureAvailability(departureId: number): void {
    this.departureAvailabilityService
      .getByDeparture(departureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (availabilityArray: IDepartureAvailabilityResponse[]) => {
          // Tomar la primera disponibilidad si existe
          if (availabilityArray && availabilityArray.length > 0) {
            this.departureAvailabilityByDepartureId[departureId] = availabilityArray[0];
          } else {
            this.departureAvailabilityByDepartureId[departureId] = null;
          }
          // Si este departure está seleccionado, actualizar y re-emitir
          this.updateSelectedDepartureIfNeeded(departureId);
        },
        error: (err: unknown) => {
          console.error(
            `Error cargando disponibilidad de departure ${departureId}:`,
            err
          );
          this.departureAvailabilityByDepartureId[departureId] = null;
          this.updateSelectedDepartureIfNeeded(departureId);
        },
      });
  }

  // Cargar ambas disponibilidades (Activity y Departure)
  private loadAvailability(departureId: number, activityId: number): void {
    this.loadActivityAvailability(departureId, activityId);
    this.loadDepartureAvailability(departureId);
  }

  // Cargar todas las disponibilidades para todas las ciudades y departures
  private loadAllAvailabilities(): Observable<void> {
    const availabilityObservables: Observable<any>[] = [];

    // Cargar disponibilidad de departure para todos los departures
    this.allDepartures.forEach(departure => {
      if (departure.id) {
        availabilityObservables.push(
          this.departureAvailabilityService.getByDeparture(departure.id).pipe(
            takeUntil(this.destroy$),
            tap((availabilityArray: IDepartureAvailabilityResponse[]) => {
              if (availabilityArray && availabilityArray.length > 0) {
                this.departureAvailabilityByDepartureId[departure.id!] = availabilityArray[0];
              } else {
                this.departureAvailabilityByDepartureId[departure.id!] = null;
              }
            }),
            catchError(() => {
              this.departureAvailabilityByDepartureId[departure.id!] = null;
              return of(null);
            })
          )
        );
      }
    });

    // Cargar disponibilidades de activity y activityPack para cada combinación ciudad-departure
    this.cities.forEach(city => {
      this.allDepartures.forEach(departure => {
        if (!departure.id) return;

        // Cargar activityAvailability si la ciudad tiene activityId
        if (city.activityId) {
          availabilityObservables.push(
            this.activityAvailabilityService.getByActivityAndDeparture(city.activityId, departure.id).pipe(
              takeUntil(this.destroy$),
              tap((availabilityArray: IActivityAvailabilityResponse[]) => {
                if (availabilityArray && availabilityArray.length > 0) {
                  this.activityAvailabilityByDepartureId[departure.id] = availabilityArray[0];
                } else {
                  this.activityAvailabilityByDepartureId[departure.id] = null;
                }
              }),
              catchError(() => {
                this.activityAvailabilityByDepartureId[departure.id] = null;
                return of(null);
              })
            )
          );
        }

        // Cargar activityPackAvailability si la ciudad tiene activityPackId
        if (city.activityPackId) {
          availabilityObservables.push(
            this.activityPackAvailabilityService.getByActivityPackAndDeparture(city.activityPackId, departure.id).pipe(
              takeUntil(this.destroy$),
              tap((availabilityArray: IActivityPackAvailabilityResponse[]) => {
                if (availabilityArray && availabilityArray.length > 0) {
                  this.activityPackAvailabilityByDepartureId[departure.id] = availabilityArray[0];
                } else {
                  this.activityPackAvailabilityByDepartureId[departure.id] = null;
                }
              }),
              catchError(() => {
                this.activityPackAvailabilityByDepartureId[departure.id] = null;
                return of(null);
              })
            )
          );
        }
      });
    });

    // Si no hay observables, retornar un observable que completa inmediatamente
    if (availabilityObservables.length === 0) {
      return of(undefined);
    }

    // Usar forkJoin para cargar todas las disponibilidades en paralelo
    return forkJoin(availabilityObservables).pipe(
      map(() => undefined),
      takeUntil(this.destroy$)
    );
  }

  // Obtener el número de plazas disponibles para un departure
  // Usa el valor más restrictivo (mínimo) entre ActivityAvailability, ActivityPackAvailability y DepartureAvailability
  getAvailableSpots(departureId: number): number {
    const activityAvailability = this.activityAvailabilityByDepartureId[departureId];
    const activityPackAvailability = this.activityPackAvailabilityByDepartureId[departureId];
    const departureAvailability = this.departureAvailabilityByDepartureId[departureId];
    
    // Si ninguna está cargada, retornar -1 (aún cargando)
    if (!activityAvailability && !activityPackAvailability && !departureAvailability) {
      return -1;
    }
    
    const activitySpots = activityAvailability?.bookableAvailability ?? Number.MAX_SAFE_INTEGER;
    const activityPackSpots = activityPackAvailability?.bookableAvailability ?? Number.MAX_SAFE_INTEGER;
    const departureSpots = departureAvailability?.bookableAvailability ?? Number.MAX_SAFE_INTEGER;
    
    // Retornar el mínimo (más restrictivo) entre todos
    // Si uno no está disponible, usar los otros
    if (activitySpots === Number.MAX_SAFE_INTEGER && 
        activityPackSpots === Number.MAX_SAFE_INTEGER && 
        departureSpots === Number.MAX_SAFE_INTEGER) {
      return -1; // Ninguno cargado aún
    }
    
    return Math.min(activitySpots, activityPackSpots, departureSpots);
  }

  // Verificar si hay plazas disponibles
  hasAvailableSpots(departureId: number): boolean {
    const spots = this.getAvailableSpots(departureId);
    return spots > 0;
  }

  // Verificar si una ciudad tiene al menos un departure con disponibilidad
  private hasCityAvailability(city: City): boolean {
    if (!city || (!city.activityId && !city.activityPackId)) {
      return false;
    }

    // Verificar si hay al menos un departure con disponibilidad para esta ciudad
    // Necesitamos verificar la disponibilidad específica de esta ciudad (activityId o activityPackId)
    for (const departure of this.allDepartures) {
      if (!departure.id) continue;

      // Obtener disponibilidad específica para esta ciudad
      let spots = -1;
      
      if (city.activityId) {
        const activityAvailability = this.activityAvailabilityByDepartureId[departure.id];
        if (activityAvailability) {
          spots = activityAvailability.bookableAvailability;
        }
      } else if (city.activityPackId) {
        const activityPackAvailability = this.activityPackAvailabilityByDepartureId[departure.id];
        if (activityPackAvailability) {
          spots = activityPackAvailability.bookableAvailability;
        }
      }

      // También considerar departureAvailability como mínimo común
      const departureAvailability = this.departureAvailabilityByDepartureId[departure.id];
      const departureSpots = departureAvailability?.bookableAvailability ?? Number.MAX_SAFE_INTEGER;

      // Calcular el mínimo entre la disponibilidad de la ciudad y la del departure
      let finalSpots = spots;
      if (spots === -1 && departureSpots === Number.MAX_SAFE_INTEGER) {
        continue; // Aún cargando, continuar con el siguiente
      }
      if (spots === -1) {
        finalSpots = departureSpots;
      } else if (departureSpots !== Number.MAX_SAFE_INTEGER) {
        finalSpots = Math.min(spots, departureSpots);
      }

      // Si tiene disponibilidad (finalSpots > 0), la ciudad tiene disponibilidad
      if (finalSpots > 0) {
        return true;
      }
    }

    return false;
  }

  // Seleccionar la primera ciudad que tenga disponibilidad
  private selectDefaultCityWithAvailability(): void {
    if (this.cities.length === 0) {
      return;
    }

    // Buscar la primera ciudad con disponibilidad
    const cityWithAvailability = this.cities.find(city => this.hasCityAvailability(city));

    if (cityWithAvailability) {
      this.selectedCity = cityWithAvailability;
      this.emitCityUpdate();
      
      // Recargar vuelos con la ciudad seleccionada
      this.allDepartures.forEach(departure => {
        if (departure.id) {
          this.loadFlightTimes(departure.id);
        }
      });
    } else {
      // Si ninguna tiene disponibilidad, seleccionar la primera (fallback)
      this.selectedCity = this.cities[0];
      this.emitCityUpdate();
      
      // Recargar vuelos con la ciudad seleccionada
      this.allDepartures.forEach(departure => {
        if (departure.id) {
          this.loadFlightTimes(departure.id);
        }
      });
    }
  }

  // Actualizar y re-emitir departureUpdate si el departure está seleccionado
  private updateSelectedDepartureIfNeeded(departureId: number): void {
    if (this.selectedDepartureId === departureId) {
      // Buscar el departure en filteredDepartures
      const selectedDeparture = this.filteredDepartures.find(dep => dep.id === departureId);
      if (selectedDeparture) {
        // Recalcular isBookable
        const spots = this.getAvailableSpots(departureId);
        const isBookable = (selectedDeparture.isBookable ?? true) && (spots === -1 || spots > 0);
        
        // Crear objeto con isBookable actualizado
        const departureWithAvailability = {
          ...selectedDeparture,
          isBookable: isBookable
        };
        
        // Re-emitir con disponibilidad actualizada
        this.departureUpdate.emit(departureWithAvailability);
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
    } catch (error) {
      console.error('Error formatting date:', error);
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
