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
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { MessageService } from 'primeng/api';

// Importar la interface del selector
import { SelectedDepartureEvent } from '../tour-itinerary-v2/components/selector-itinerary/selector-itinerary.component';

// Importar servicios necesarios
import {
  DepartureService,
  IDepartureResponse,
} from '../../../../core/services/departure/departure.service';
import {
  ItineraryService,
  IItineraryResponse,
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

// Interfaces para los datos
interface City {
  name: string;
  code: string;
  activityId?: number;
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

  // Control de destrucción del componente
  private destroy$ = new Subject<void>();

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

  constructor(
    private departureService: DepartureService,
    private itineraryService: ItineraryService,
    private tourDepartureCitiesService: TourDepartureCitiesService,
    private tourAgeGroupsService: TourAgeGroupsService,
    private ageGroupService: AgeGroupService,
    private tourDeparturesPricesService: TourDeparturesPricesService,
    private messageService: MessageService
  ) {
    console.log('🏗️ Constructor TourDeparturesV2Component iniciado');

    this.updatePassengerText();

    // Emitir estado inicial
    setTimeout(() => {
      console.log('🚀 Emitiendo estado inicial del componente');
      this.emitPassengersUpdate();
      this.priceUpdate.emit(0);
      this.departureUpdate.emit(null);
    }, 0);
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

    console.log('🚀 INICIANDO loadCities() - tourId:', this.tourId);
    this.citiesLoading = true;

    this.tourDepartureCitiesService
      .getAll(this.tourId, {}, !this.preview)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (citiesResponse: ITourDepartureCityResponse[]) => {
          console.log('🔍 Data obtenida para ciudades de origen:', {
            rawResponse: citiesResponse,
            tourId: this.tourId,
            responseLength: citiesResponse.length,
            responseType: typeof citiesResponse,
            isArray: Array.isArray(citiesResponse),
            firstItem: citiesResponse[0],
            lastItem: citiesResponse[citiesResponse.length - 1],
          });

          // Validar si la respuesta está vacía o es null/undefined
          if (!citiesResponse || citiesResponse.length === 0) {
            console.warn(
              '⚠️ La respuesta del servicio está vacía o es null/undefined'
            );
            this.cities = [];
            this.filteredCities = [];
            this.selectedCity = null;
            this.citiesLoading = false;
            return;
          }

          const mappedCities = citiesResponse.map((city, index) => {
            console.log(`📍 Mapeando ciudad ${index + 1}:`, {
              originalCity: city,
              name: city.name,
              code: city.name.toUpperCase().replace(/\s+/g, '_'),
              activityId: city.activityId,
              cityType: typeof city,
              hasName: !!city.name,
              hasActivityId: !!city.activityId,
            });

            return {
              name: city.name,
              code: city.name.toUpperCase().replace(/\s+/g, '_'),
              activityId: city.activityId,
            };
          });

          console.log('🗺️ Ciudades mapeadas:', mappedCities);

          // Validar el mapeo
          const validCities = mappedCities.filter(
            (city) => city.name && city.name.trim() !== ''
          );
          const invalidCities = mappedCities.filter(
            (city) => !city.name || city.name.trim() === ''
          );

          console.log('✅ Ciudades válidas:', validCities);
          console.log('❌ Ciudades inválidas:', invalidCities);

          // Verificar si realmente existe alguna ciudad "Sin Vuelos" en los datos
          const hasSinVuelosCities = validCities.some(
            (city) =>
              city.name.toLowerCase().includes('sin vuelos') ||
              city.name.toLowerCase().includes('sin vuelo')
          );

          console.log('🔍 Verificando existencia de ciudades "Sin Vuelos":', {
            hasSinVuelosCities,
            totalCities: validCities.length,
          });

          // Solo aplicar lógica de "Sin Vuelos" si realmente existen esas ciudades
          if (hasSinVuelosCities) {
            console.log(
              '✅ Se encontraron ciudades "Sin Vuelos", aplicando lógica especial'
            );

            this.cities = validCities.sort((a, b) => {
              const aIsSinVuelos =
                a.name.toLowerCase().includes('sin vuelos') ||
                a.name.toLowerCase().includes('sin vuelo');
              const bIsSinVuelos =
                b.name.toLowerCase().includes('sin vuelos') ||
                b.name.toLowerCase().includes('sin vuelo');

              console.log(`🔄 Ordenando: "${a.name}" vs "${b.name}"`, {
                aIsSinVuelos,
                bIsSinVuelos,
                aName: a.name,
                bName: b.name,
              });

              if (aIsSinVuelos && !bIsSinVuelos) return -1;
              if (!aIsSinVuelos && bIsSinVuelos) return 1;
              return a.name.localeCompare(b.name);
            });

            console.log(
              '📋 Ciudades ordenadas (con lógica Sin Vuelos):',
              this.cities
            );

            this.filteredCities = [...this.cities];

            const sinVuelosCity = this.cities.find(
              (city) =>
                city.name.toLowerCase().includes('sin vuelos') ||
                city.name.toLowerCase().includes('sin vuelo')
            );

            console.log('🔍 Buscando ciudad "Sin Vuelos":', {
              found: !!sinVuelosCity,
              city: sinVuelosCity,
              searchCriteria: ['sin vuelos', 'sin vuelo'],
            });

            if (sinVuelosCity) {
              this.selectedCity = sinVuelosCity;
              console.log(
                '✈️ Ciudad "Sin Vuelos" seleccionada:',
                sinVuelosCity
              );
            } else if (this.cities.length > 0) {
              this.selectedCity = this.cities[0];
              console.log(
                '🏙️ Primera ciudad seleccionada por defecto:',
                this.selectedCity
              );
            }
          } else {
            console.log(
              '❌ No se encontraron ciudades "Sin Vuelos", usando ordenamiento normal'
            );

            // Si no hay ciudades "Sin Vuelos", usar ordenamiento alfabético normal
            this.cities = validCities.sort((a, b) =>
              a.name.localeCompare(b.name)
            );
            console.log(
              '📋 Ciudades ordenadas (orden alfabético normal):',
              this.cities
            );

            this.filteredCities = [...this.cities];

            // Seleccionar la primera ciudad disponible
            if (this.cities.length > 0) {
              this.selectedCity = this.cities[0];
              console.log(
                '🏙️ Primera ciudad seleccionada (sin lógica Sin Vuelos):',
                this.selectedCity
              );
            }
          }

          if (this.cities.length === 0) {
            console.warn('⚠️ No hay ciudades disponibles para seleccionar');
          }

          console.log('✅ Estado final del select de ciudades:', {
            cities: this.cities,
            filteredCities: this.filteredCities,
            selectedCity: this.selectedCity,
            citiesLoading: this.citiesLoading,
            citiesCount: this.cities.length,
            filteredCount: this.filteredCities.length,
            hasSelectedCity: !!this.selectedCity,
          });

          this.citiesLoading = false;
        },
        error: (error) => {
          console.error('Error cargando ciudades:', error);
          this.cities = [];
          this.filteredCities = [];
          this.selectedCity = null;
          this.citiesLoading = false;

          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar las ciudades de origen.',
            life: 5000,
          });
        },
      });
  }

  private loadDeparturesPrices(activityId: number, departureId: number): void {
    if (!activityId || !departureId) return;

    this.pricesLoading = true;

    this.tourDeparturesPricesService
      .getAll(activityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pricesResponse: ITourDeparturesPriceResponse[]) => {
          this.departuresPrices = pricesResponse;
          this.pricesLoading = false;

          // Calcular precio si hay departure seleccionado
          if (this.selectedDepartureId) {
            this.calculateAndEmitPrice();
          }
        },
        error: (error) => {
          console.error('Error cargando precios:', error);
          this.pricesLoading = false;
        },
      });
  }

  private loadAgeGroups(): void {
    if (!this.tourId) return;

    this.tourAgeGroupsService
      .getAll(this.tourId)
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
      this.ageGroupCategories.adults.lowerAge = group.lowerLimitAge;
      this.ageGroupCategories.adults.upperAge = group.upperLimitAge;
    } else if (this.isChildGroup(groupCode, groupName)) {
      this.allowedPassengerTypes.children = true;
      this.ageGroupCategories.children.id = group.id;
      this.ageGroupCategories.children.lowerAge = group.lowerLimitAge;
      this.ageGroupCategories.children.upperAge = group.upperLimitAge;
    } else if (this.isBabyGroup(groupCode, groupName)) {
      this.allowedPassengerTypes.babies = true;
      this.ageGroupCategories.babies.id = group.id;
      this.ageGroupCategories.babies.lowerAge = group.lowerLimitAge;
      this.ageGroupCategories.babies.upperAge = group.upperLimitAge;
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
      (a, b) => a.lowerLimitAge - b.lowerLimitAge
    );
    const currentIndex = sortedGroups.findIndex((g) => g.id === group.id);

    if (currentIndex === 0 && group.lowerLimitAge === 0) {
      this.allowedPassengerTypes.babies = true;
      this.ageGroupCategories.babies.id = group.id;
      this.ageGroupCategories.babies.lowerAge = group.lowerLimitAge;
      this.ageGroupCategories.babies.upperAge = group.upperLimitAge;
    } else if (currentIndex === sortedGroups.length - 1) {
      this.allowedPassengerTypes.adults = true;
      this.ageGroupCategories.adults.id = group.id;
      this.ageGroupCategories.adults.lowerAge = group.lowerLimitAge;
      this.ageGroupCategories.adults.upperAge = group.upperLimitAge;
    } else {
      this.allowedPassengerTypes.children = true;
      this.ageGroupCategories.children.id = group.id;
      this.ageGroupCategories.children.lowerAge = group.lowerLimitAge;
      this.ageGroupCategories.children.upperAge = group.upperLimitAge;
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
      .getCount(this.tourId)
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
      .hasAgeGroups(this.tourId)
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

    const itineraryFilters = {
      tourId: this.tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    this.itineraryService
      .getAll(itineraryFilters)
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
            this.departureService.getByItinerary(itinerary.id).pipe(
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

          this.loading = false;
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
      .getById(departureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (departure) => {
          this.departureDetails = departure;
          this.updateDepartureInfo();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando detalles del departure:', error);
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

    // Auto-selección del departure desde el selector
    setTimeout(() => {
      const selectedDepartureFromSelector = this.filteredDepartures.find(
        (dep) => dep.id === this.selectedDeparture?.departure.id
      );

      if (selectedDepartureFromSelector) {
        this.addToCart(selectedDepartureFromSelector);
      }

      this.emitCityUpdate();
    }, 100);
  }

  private formatDate(dateString: string): string {
    if (!dateString) return 'Fecha no disponible';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
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

    return isSingleTrip || selectedDeparture.price === 0;
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
      const departure = {
        id: this.departureDetails.id,
        departureDate: this.departureDetails.departureDate,
        returnDate: this.departureDetails.arrivalDate,
        price: adultPrice,
        status: 'available',
        waitingList: false,
        group: this.selectedDeparture?.tripType?.name || 'group',
      };
      return [departure];
    }

    return this.allDepartures.map((departure) => {
      const adultPrice = this.getPriceForDeparture(departure.id);

      return {
        id: departure.id,
        departureDate: departure.departureDate,
        returnDate: departure.arrivalDate,
        price: adultPrice,
        status: 'available',
        waitingList: false,
        group: 'group',
      };
    });
  }

  filterCities(event: any): void {
    console.log('🔍 filterCities() llamado con:', {
      event,
      query: event?.query,
      queryType: typeof event?.query,
      citiesCount: this.cities.length,
      currentFilteredCount: this.filteredCities.length,
    });

    const query = event.query;

    if (!query || query.trim() === '') {
      console.log('📋 Sin filtro, mostrando todas las ciudades');
      this.filteredCities = [...this.cities];
      return;
    }

    const filtered = this.cities.filter((city) => {
      const matches = city.name.toLowerCase().includes(query.toLowerCase());
      console.log(
        `🔍 Filtrando "${city.name}" con query "${query}": ${matches}`
      );
      return matches;
    });

    this.filteredCities = filtered;

    console.log('✅ Filtrado completado:', {
      originalQuery: query,
      filteredCount: filtered.length,
      filteredCities: filtered.map((c) => c.name),
    });
  }

  onCityChange(event: any): void {
    console.log('🔄 onCityChange() llamado con:', {
      event,
      eventType: typeof event,
      isObject: typeof event === 'object',
      hasName: event?.name,
      hasActivityId: event?.activityId,
      previousSelectedCity: this.selectedCity,
    });

    this.selectedCity = event;

    console.log('✅ Nueva ciudad seleccionada:', {
      selectedCity: this.selectedCity,
      name: this.selectedCity?.name,
      activityId: this.selectedCity?.activityId,
      departureDetails: this.departureDetails,
    });

    if (
      this.selectedCity &&
      this.selectedCity.activityId &&
      this.departureDetails
    ) {
      console.log('💰 Cargando precios para:', {
        activityId: this.selectedCity.activityId,
        departureId: this.departureDetails.id,
      });

      this.loadDeparturesPrices(
        this.selectedCity.activityId,
        this.departureDetails.id
      );
    } else {
      console.log('⚠️ No se pueden cargar precios:', {
        hasSelectedCity: !!this.selectedCity,
        hasActivityId: !!this.selectedCity?.activityId,
        hasDepartureDetails: !!this.departureDetails,
      });
    }

    this.emitCityUpdate();

    // Recalcular precio si hay departure seleccionado
    if (this.selectedDepartureId) {
      console.log(
        '💵 Recalculando precio para departure:',
        this.selectedDepartureId
      );
      setTimeout(() => {
        this.calculateAndEmitPrice();
      }, 300);
    }
  }

  private emitCityUpdate(): void {
    if (!this.selectedCity) {
      this.cityUpdate.emit('');
      return;
    }

    // Verificar si realmente existe la opción "Sin Vuelos" en las ciudades disponibles
    const hasSinVuelosOption = this.cities.some(
      (city) =>
        city.name.toLowerCase().includes('sin vuelos') ||
        city.name.toLowerCase().includes('sin vuelo')
    );

    console.log('🌍 emitCityUpdate - Verificando opción Sin Vuelos:', {
      selectedCity: this.selectedCity.name,
      hasSinVuelosOption,
      totalCities: this.cities.length,
    });

    const isSinVuelos =
      this.selectedCity.name.toLowerCase().includes('sin vuelos') ||
      this.selectedCity.name.toLowerCase().includes('sin vuelo');

    let cityText: string;

    if (isSinVuelos && hasSinVuelosOption) {
      // Solo mostrar "Sin Vuelos" si realmente existe esa opción en el servicio
      cityText = 'Sin Vuelos';
      console.log(
        '✈️ Emitiendo "Sin Vuelos" (opción disponible en el servicio)'
      );
    } else if (isSinVuelos && !hasSinVuelosOption) {
      // Si la ciudad seleccionada tiene "sin vuelos" pero no está en el servicio, mostrar el nombre completo
      cityText = this.selectedCity.name;
      console.log(
        '⚠️ Ciudad con "sin vuelos" pero no disponible en servicio, mostrando nombre completo'
      );
    } else {
      // Ciudad normal con vuelo
      cityText = `Vuelo desde ${this.selectedCity.name}`;
      console.log('🛫 Emitiendo ciudad con vuelo:', cityText);
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
    this.selectedDepartureId = item.id;
    this.calculateAndEmitPrice();
    this.departureUpdate.emit(item);
  }

  private calculateAndEmitPrice(): void {
    if (!this.selectedDepartureId) {
      this.priceUpdate.emit(0);
      return;
    }

    if (
      !this.departuresPrices ||
      this.departuresPrices.length === 0 ||
      this.pricesLoading
    ) {
      setTimeout(() => {
        if (
          this.departuresPrices &&
          this.departuresPrices.length > 0 &&
          !this.pricesLoading
        ) {
          this.calculateAndEmitPrice();
        }
      }, 100);
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
}
