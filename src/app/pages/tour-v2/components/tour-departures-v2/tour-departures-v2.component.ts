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

// ✅ INTERFACES para tipado fuerte
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

  @Output() priceUpdate = new EventEmitter<number>();
  @Output() cityUpdate = new EventEmitter<string>();
  @Output() departureUpdate = new EventEmitter<any>();
  @Output() passengersUpdate = new EventEmitter<{
    adults: number;
    children: number;
    babies: number;
    total: number;
  }>();
  // ✅ NUEVO OUTPUT: Emitir información de age groups
  @Output() ageGroupsUpdate = new EventEmitter<AgeGroupCategories>();

  // Control de destrucción del componente
  private destroy$ = new Subject<void>();

  // Estados del componente
  loading = false;
  error: string | undefined;
  citiesLoading = false;

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
    this.updatePassengerText();

    // Emitir estado inicial de pasajeros
    setTimeout(() => {
      this.emitPassengersUpdate();
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

    this.citiesLoading = true;

    this.tourDepartureCitiesService
      .getAll(this.tourId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (citiesResponse: ITourDepartureCityResponse[]) => {
          // Convertir respuesta del servicio a formato del componente
          const mappedCities = citiesResponse.map((city) => ({
            name: city.name,
            code: city.name.toUpperCase().replace(/\s+/g, '_'),
            activityId: city.activityId,
          }));

          // Ordenar: "Sin Vuelos" primero, luego el resto alfabéticamente
          this.cities = mappedCities.sort((a, b) => {
            const aIsSinVuelos =
              a.name.toLowerCase().includes('sin vuelos') ||
              a.name.toLowerCase().includes('sin vuelo');
            const bIsSinVuelos =
              b.name.toLowerCase().includes('sin vuelos') ||
              b.name.toLowerCase().includes('sin vuelo');

            if (aIsSinVuelos && !bIsSinVuelos) return -1;
            if (!aIsSinVuelos && bIsSinVuelos) return 1;
            return a.name.localeCompare(b.name);
          });

          this.filteredCities = [...this.cities];

          // Buscar "Sin Vuelos" en la respuesta de la API y establecerlo como seleccionado
          const sinVuelosCity = this.cities.find(
            (city) =>
              city.name.toLowerCase().includes('sin vuelos') ||
              city.name.toLowerCase().includes('sin vuelo')
          );

          if (sinVuelosCity) {
            this.selectedCity = sinVuelosCity;
          } else if (this.cities.length > 0) {
            // Si no hay "Sin Vuelos", tomar la primera ciudad
            this.selectedCity = this.cities[0];
          }

          this.citiesLoading = false;
        },
        error: (error) => {
          console.error('Error cargando ciudades:', error);
          // Fallback a lista vacía en caso de error
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

    this.tourDeparturesPricesService
      .getAll(activityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pricesResponse: ITourDeparturesPriceResponse[]) => {
          // Filtrar solo los precios del departure seleccionado
          const filteredPrices = pricesResponse.filter(
            (price) => price.departureId === departureId
          );

          this.departuresPrices = filteredPrices;

          // Calcular precio cuando los precios ya están cargados
          if (this.selectedDepartureId) {
            this.calculateAndEmitPrice();
          }
        },
        error: (error) => {
          console.error('Error cargando precios:', error);
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

          // Obtener detalles de cada grupo de edad
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
          // Filtrar grupos válidos
          this.tourAgeGroups = ageGroups.filter(
            (group) => group !== null
          ) as IAgeGroupResponse[];

          if (this.tourAgeGroups.length > 0) {
            // Determinar qué tipos de pasajeros están permitidos
            this.determineAllowedPassengerTypes();

            // ✅ NUEVO: Emitir información de age groups al componente padre
            this.emitAgeGroupsUpdate();
          }

          // Obtener información adicional
          this.getAdditionalAgeGroupInfo();
        },
        error: (error) => {
          console.error('Error cargando grupos de edad:', error);

          // En caso de error, permitir todos los tipos
          this.allowedPassengerTypes = {
            adults: true,
            children: true,
            babies: true,
          };
        },
      });
  }

  private determineAllowedPassengerTypes(): void {
    // Inicializar como no permitidos
    this.allowedPassengerTypes = {
      adults: false,
      children: false,
      babies: false,
    };

    // Resetear IDs de categorías
    this.ageGroupCategories.adults.id = null;
    this.ageGroupCategories.children.id = null;
    this.ageGroupCategories.babies.id = null;

    // Revisar cada grupo de edad para determinar qué categorías están permitidas
    this.tourAgeGroups.forEach((group) => {
      // Determinar categoría basada en rangos de edad del grupo
      this.categorizeAgeGroup(group);
    });

    // Actualizar propiedades legacy para compatibilidad
    this.adultAgeGroupId = this.ageGroupCategories.adults.id;
    this.childAgeGroupId = this.ageGroupCategories.children.id;
    this.babyAgeGroupId = this.ageGroupCategories.babies.id;

    // Si ningún tipo está permitido, permitir adultos por defecto
    if (
      !this.allowedPassengerTypes.adults &&
      !this.allowedPassengerTypes.children &&
      !this.allowedPassengerTypes.babies
    ) {
      this.allowedPassengerTypes.adults = true;
    }

    // Resetear pasajeros si algunos tipos no están permitidos
    this.resetDisallowedPassengers();
  }

  private categorizeAgeGroup(group: IAgeGroupResponse): void {
    // Determinar categoría basándose en el código o nombre del grupo
    const groupCode = group.code?.toLowerCase() || '';
    const groupName = group.name?.toLowerCase() || '';

    // Intentar identificar por código o nombre
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
      // Si no se puede categorizar por código/nombre, usar rangos de edad como fallback
      this.categorizeByAgeRange(group);
    }
  }

  private isAdultGroup(code: string, name: string): boolean {
    const adultKeywords = [
      'adult',
      'adulto',
      'adultos',
      'mayor',
      'mayores',
      'grown',
      'senior',
    ];
    return adultKeywords.some(
      (keyword) => code.includes(keyword) || name.includes(keyword)
    );
  }

  private isChildGroup(code: string, name: string): boolean {
    const childKeywords = [
      'child',
      'children',
      'niño',
      'niños',
      'menor',
      'menores',
      'kid',
      'kids',
      'junior',
    ];
    return childKeywords.some(
      (keyword) => code.includes(keyword) || name.includes(keyword)
    );
  }

  private isBabyGroup(code: string, name: string): boolean {
    const babyKeywords = [
      'baby',
      'babies',
      'bebé',
      'bebés',
      'infant',
      'infants',
      'toddler',
    ];
    return babyKeywords.some(
      (keyword) => code.includes(keyword) || name.includes(keyword)
    );
  }

  private categorizeByAgeRange(group: IAgeGroupResponse): void {
    // Ordenar grupos por edad mínima para asignar categorías lógicamente
    const sortedGroups = [...this.tourAgeGroups].sort(
      (a, b) => a.lowerLimitAge - b.lowerLimitAge
    );
    const currentIndex = sortedGroups.findIndex((g) => g.id === group.id);

    // Asignar categorías basándose en la posición en la lista ordenada
    if (currentIndex === 0 && group.lowerLimitAge === 0) {
      // Primer grupo que empieza en 0 = bebés
      this.allowedPassengerTypes.babies = true;
      this.ageGroupCategories.babies.id = group.id;
      this.ageGroupCategories.babies.lowerAge = group.lowerLimitAge;
      this.ageGroupCategories.babies.upperAge = group.upperLimitAge;
    } else if (currentIndex === sortedGroups.length - 1) {
      // Último grupo = adultos
      this.allowedPassengerTypes.adults = true;
      this.ageGroupCategories.adults.id = group.id;
      this.ageGroupCategories.adults.lowerAge = group.lowerLimitAge;
      this.ageGroupCategories.adults.upperAge = group.upperLimitAge;
    } else {
      // Grupos intermedios = niños
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

    // Asegurar que siempre haya al menos 1 adulto si están permitidos
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

    // Obtener el conteo
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

    // Verificar si tiene grupos de edad
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

  // ✅ NUEVO MÉTODO: Emitir información de age groups
  private emitAgeGroupsUpdate(): void {
    this.ageGroupsUpdate.emit(this.ageGroupCategories);
  }

  private handleDepartureSelection(event: SelectedDepartureEvent): void {
    this.selectedDeparture = event;
    this.selectedDepartureId = null; // Reset selection cuando cambia departure
    this.loadDepartureDetails(event.departure.id);
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
      formattedDepartureDate: this.formatDate(this.departureDetails.departureDate ?? ''),
      arrivalDate: this.departureDetails.arrivalDate ?? '',
      formattedArrivalDate: this.formatDate(this.departureDetails.arrivalDate ?? ''),
      itineraryId: this.departureDetails.itineraryId,
      itineraryName: this.selectedDeparture.itineraryName,
      departureId: this.departureDetails.id,
      departureName: this.selectedDeparture.departure.name || 'Sin nombre',
      tripTypeName: this.selectedDeparture.tripType?.name || 'Sin tipo',
    };

    // Verificar validaciones después de actualizar info
    this.shouldBlockKidsAndBabies = this.checkIfShouldBlockKids();

    // Si se deben bloquear y hay niños o bebés seleccionados, resetearlos
    if (this.shouldBlockKidsAndBabies) {
      if (this.travelers.children > 0 || this.travelers.babies > 0) {
        this.travelers.children = 0;
        this.travelers.babies = 0;
        this.updatePassengerText();
      }
    }

    // Cargar precios primero, luego ejecutar addToCart
    if (
      this.selectedCity &&
      this.selectedCity.activityId &&
      this.departureDetails
    ) {
      // Cargar precios primero
      this.loadDeparturesPrices(
        this.selectedCity.activityId,
        this.departureDetails.id
      );
    }

    // Ejecutar addToCart después de un pequeño delay para que carguen los precios
    setTimeout(() => {
      if (this.filteredDepartures.length > 0) {
        this.addToCart(this.filteredDepartures[0]);
        this.emitCityUpdate();
      }
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
      const diffTime = Math.abs(arrivalDate.getTime() - departureDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  }

  // Validaciones del ejemplo
  checkIfShouldBlockKids(): boolean {
    // Si no hay departure seleccionado, no bloqueamos
    if (!this.selectedDepartureId || this.filteredDepartures.length === 0) {
      return false;
    }

    // Encontrar la salida seleccionada
    const selectedDeparture = this.filteredDepartures.find(
      (d) => d.id === this.selectedDepartureId
    );

    if (!selectedDeparture) {
      return false;
    }

    // Si el precio es 0 o el tipo de viaje es 'single', bloqueamos
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
      (price) => price.ageGroupId === ageGroupId
    );
    return priceData ? priceData.total : 0;
  }

  // Convertir el departure actual en formato para la tabla
  get filteredDepartures(): any[] {
    if (!this.departureDetails) return [];

    // Obtener el precio de adultos para mostrar en la tabla (precio base)
    const adultPrice = this.getPriceByPassengerType('adults');

    const departure = {
      id: this.departureDetails.id,
      departureDate: this.departureDetails.departureDate ?? '',
      returnDate: this.departureDetails.arrivalDate ?? '',
      price: adultPrice, // Usar precio real del servicio para adultos
      status: 'available',
      waitingList: false,
      group: this.selectedDeparture?.tripType?.name || 'group',
    };

    return [departure];
  }

  // Métodos para ciudades
  filterCities(event: any): void {
    const query = event.query;
    this.filteredCities = this.cities.filter((city) =>
      city.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  onCityChange(event: any): void {
    this.selectedCity = event;

    // Cargar precios cuando se selecciona una ciudad y hay departure seleccionado
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

    this.emitCityUpdate();
  }

  private emitCityUpdate(): void {
    if (!this.selectedCity) {
      this.cityUpdate.emit('');
      return;
    }

    // Formato condicional: Solo mostrar "Sin Vuelos" o "Vuelo desde [ciudad]"
    const isSinVuelos =
      this.selectedCity.name.toLowerCase().includes('sin vuelos') ||
      this.selectedCity.name.toLowerCase().includes('sin vuelo');

    const cityText = isSinVuelos
      ? 'Sin Vuelos'
      : `Vuelo desde ${this.selectedCity.name}`;
    this.cityUpdate.emit(cityText);
  }

  // Métodos para pasajeros
  togglePassengersPanel(event: Event): void {
    this.showPassengersPanel = !this.showPassengersPanel;
    event.stopPropagation();
  }

  updatePassengers(type: keyof Travelers, change: number): void {
    this.shouldBlockKidsAndBabies = this.checkIfShouldBlockKids();

    if (type === 'adults') {
      // Verificar si los adultos están permitidos
      if (!this.allowedPassengerTypes.adults && change > 0) {
        this.showPassengerTypeNotAllowedToast('adultos');
        return;
      }
      this.travelers.adults = Math.max(1, this.travelers.adults + change);
    } else if (type === 'children') {
      // Verificar si los niños están permitidos
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
      // Verificar si los bebés están permitidos
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

    // Si hay departure seleccionado, actualizar precio
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

    // Actualizar precio si hay departure seleccionado
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
    // Marcar como seleccionado para cambiar el botón
    this.selectedDepartureId = item.id;

    // Calcular y emitir precio total
    this.calculateAndEmitPrice();

    // Emitir departure seleccionado
    this.departureUpdate.emit(item);
  }

  private calculateAndEmitPrice(): void {
    if (!this.selectedDepartureId) return;

    const selectedDeparture = this.filteredDepartures.find(
      (d) => d.id === this.selectedDepartureId
    );

    if (!selectedDeparture) return;

    // Calcular precio total con precios diferenciados por tipo de pasajero
    const adultPrice = this.getPriceByPassengerType('adults');
    const childPrice = this.getPriceByPassengerType('children');
    const babyPrice = this.getPriceByPassengerType('babies');

    // Calcular precio total
    const totalPrice =
      this.travelers.adults * adultPrice +
      this.travelers.children * childPrice +
      this.travelers.babies * babyPrice;

    this.priceUpdate.emit(totalPrice);
  }

  // Verificar si el departure está seleccionado
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

    // Si no hay datos de age group, retornar string vacío
    if (!category.lowerAge && category.lowerAge !== 0) return '';
    if (!category.upperAge && category.upperAge !== 0) return '';

    // Caso especial: si la edad superior es muy alta (99+), mostrar como "X+ años"
    if (category.upperAge >= 99) {
      return `${category.lowerAge}+ años`;
    }

    // Caso especial: si es solo una edad específica
    if (category.lowerAge === category.upperAge) {
      return `${category.lowerAge} años`;
    }

    // Caso normal: rango de edades
    return `${category.lowerAge}-${category.upperAge} años`;
  }
}
