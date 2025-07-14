import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { MessageService } from 'primeng/api';

// Importar la interface del selector
import { SelectedDepartureEvent } from '../tour-itinerary-v2/components/selector-itinerary/selector-itinerary.component';

// Importar servicios necesarios
import { DepartureService, IDepartureResponse } from '../../../../core/services/departure/departure.service';
import { ItineraryService, IItineraryResponse } from '../../../../core/services/itinerary/itinerary.service';
import { TourDepartureCitiesService, ITourDepartureCityResponse } from '../../../../core/services/tour/tour-departure-cities.service';
import { TourAgeGroupsService } from '../../../../core/services/tour/tour-age-groups.service';
import { AgeGroupService, IAgeGroupResponse } from '../../../../core/services/agegroup/age-group.service';

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

@Component({
  selector: 'app-tour-departures-v2',
  standalone: false,
  templateUrl: './tour-departures-v2.component.html',
  styleUrl: './tour-departures-v2.component.scss',
  providers: [MessageService]
})
export class TourDeparturesV2Component implements OnInit, OnDestroy, OnChanges {
  @Input() tourId: number | undefined;
  @Input() selectedDepartureEvent: SelectedDepartureEvent | null = null;

  // ✅ OUTPUTS
  @Output() priceUpdate = new EventEmitter<number>();
  @Output() cityUpdate = new EventEmitter<string>();
  @Output() departureUpdate = new EventEmitter<any>();
  @Output() passengersUpdate = new EventEmitter<any>();

  // Control de destrucción del componente
  private destroy$ = new Subject<void>();

  // Estados del componente
  loading = false;
  error: string | undefined;
  citiesLoading = false;

  // ✅ AÑADIDO: Propiedades para grupos de edad
  tourAgeGroups: IAgeGroupResponse[] = [];
  allowedPassengerTypes = {
    adults: true,
    children: true,
    babies: true
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
    tripTypeName: ''
  };

  // Ciudades desde el servicio
  cities: City[] = [];
  filteredCities: City[] = [];
  selectedCity: City | null = null;

  // Pasajeros
  travelers: Travelers = {
    adults: 1,
    children: 0,
    babies: 0
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
      console.warn('⚠️ No se proporcionó tourId para tour-departures-v2');
      this.error = 'ID del tour no proporcionado';
      return;
    }
    
    this.loadCities();
    this.loadAgeGroups(); // ✅ AÑADIDO: Cargar grupos de edad
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDepartureEvent'] && changes['selectedDepartureEvent'].currentValue) {
      const departureEvent = changes['selectedDepartureEvent'].currentValue;
      this.handleDepartureSelection(departureEvent);
    }
    
    if (changes['tourId'] && changes['tourId'].currentValue && !changes['tourId'].firstChange) {
      this.loadCities();
      this.loadAgeGroups(); // ✅ AÑADIDO: Recargar grupos de edad si cambia el tourId
    }
  }

  private loadCities(): void {
    if (!this.tourId) return;

    this.citiesLoading = true;
    
    this.tourDepartureCitiesService.getAll(this.tourId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (citiesResponse: ITourDepartureCityResponse[]) => {
        // Convertir respuesta del servicio a formato del componente
        const mappedCities = citiesResponse.map(city => ({
          name: city.name,
          code: city.name.toUpperCase().replace(/\s+/g, '_'),
          activityId: city.activityId
        }));
        
        // ✅ ORDENAR: "Sin Vuelos" primero, luego el resto alfabéticamente
        this.cities = mappedCities.sort((a, b) => {
          const aIsSinVuelos = a.name.toLowerCase().includes('sin vuelos') || a.name.toLowerCase().includes('sin vuelo');
          const bIsSinVuelos = b.name.toLowerCase().includes('sin vuelos') || b.name.toLowerCase().includes('sin vuelo');
          
          if (aIsSinVuelos && !bIsSinVuelos) return -1;
          if (!aIsSinVuelos && bIsSinVuelos) return 1;
          return a.name.localeCompare(b.name);
        });
        
        this.filteredCities = [...this.cities];
        
        // Buscar "Sin Vuelos" en la respuesta de la API y establecerlo como seleccionado
        const sinVuelosCity = this.cities.find(city => 
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
        console.log('✅ Ciudades cargadas:', this.cities);
      },
      error: (error) => {
        console.error('❌ Error cargando ciudades:', error);
        // Fallback a lista vacía en caso de error
        this.cities = [];
        this.filteredCities = [];
        this.selectedCity = null;
        this.citiesLoading = false;
        
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No se pudieron cargar las ciudades de origen.',
          life: 5000
        });
      }
    });
  }

  // ✅ AÑADIDO: Método para cargar grupos de edad del tour
  private loadAgeGroups(): void {
    if (!this.tourId) return;

    console.log('🔍 Cargando grupos de edad para el tour:', this.tourId);
    
    this.tourAgeGroupsService.getAll(this.tourId).pipe(
      takeUntil(this.destroy$),
      switchMap((ageGroupIds: number[]) => {
        console.log('✅ IDs DE GRUPOS DE EDAD OBTENIDOS:', ageGroupIds);
        
        if (ageGroupIds.length === 0) {
          console.log('⚠️ Este tour no tiene grupos de edad asignados - Permitiendo todos los tipos de pasajeros');
          this.tourAgeGroups = [];
          this.allowedPassengerTypes = {
            adults: true,
            children: true,
            babies: true
          };
          return of([]);
        }

        // Obtener detalles de cada grupo de edad
        const ageGroupRequests = ageGroupIds.map(id => 
          this.ageGroupService.getById(id).pipe(
            catchError(error => {
              console.error(`❌ Error obteniendo Age Group ${id}:`, error);
              return of(null);
            })
          )
        );

        return forkJoin(ageGroupRequests);
      })
    ).subscribe({
      next: (ageGroups: (IAgeGroupResponse | null)[]) => {
        // Filtrar grupos válidos
        this.tourAgeGroups = ageGroups.filter(group => group !== null) as IAgeGroupResponse[];
        
        console.log('✅ DETALLES DE GRUPOS DE EDAD OBTENIDOS:');
        console.log('📊 Tour ID:', this.tourId);
        console.log('🔢 Cantidad de grupos:', this.tourAgeGroups.length);
        
        if (this.tourAgeGroups.length > 0) {
          console.log('📋 DETALLES COMPLETOS:');
          this.tourAgeGroups.forEach((group, index) => {
            console.log(`  ${index + 1}. ${group.name} (${group.code})`);
            console.log(`     📅 Edades: ${group.lowerLimitAge} - ${group.upperLimitAge} años`);
            console.log(`     📝 Descripción: ${group.description}`);
            console.log(`     🆔 ID: ${group.id}`);
            console.log(`     🎫 TK ID: ${group.tkId}`);
            console.log(`     📊 Orden: ${group.displayOrder}`);
            console.log('     ---');
          });

          // ✅ DETERMINAR QUÉ TIPOS DE PASAJEROS ESTÁN PERMITIDOS
          this.determineAllowedPassengerTypes();
        }

        // Obtener información adicional
        this.getAdditionalAgeGroupInfo();
      },
      error: (error) => {
        console.error('❌ Error cargando grupos de edad:', error);
        console.error('📋 Detalles del error:', {
          status: error.status,
          message: error.message,
          url: error.url
        });
        
        // En caso de error, permitir todos los tipos
        this.allowedPassengerTypes = {
          adults: true,
          children: true,
          babies: true
        };
      }
    });
  }

  // ✅ AÑADIDO: Método para determinar qué tipos de pasajeros están permitidos
  private determineAllowedPassengerTypes(): void {
    console.log('🔍 DETERMINANDO TIPOS DE PASAJEROS PERMITIDOS...');
    
    // Inicializar como no permitidos
    this.allowedPassengerTypes = {
      adults: false,
      children: false,
      babies: false
    };

    // Revisar cada grupo de edad para determinar qué categorías están permitidas
    this.tourAgeGroups.forEach(group => {
      console.log(`📊 Analizando grupo: ${group.name} (${group.lowerLimitAge}-${group.upperLimitAge} años)`);
      
      // Adultos: típicamente 18+ años (ajustar según necesidades)
      if (group.upperLimitAge >= 18) {
        this.allowedPassengerTypes.adults = true;
        console.log('  ✅ Permite ADULTOS');
      }
      
      // Niños: típicamente 2-17 años (ajustar según necesidades)
      if (group.lowerLimitAge <= 17 && group.upperLimitAge >= 2) {
        this.allowedPassengerTypes.children = true;
        console.log('  ✅ Permite NIÑOS');
      }
      
      // Bebés: típicamente 0-1 años (ajustar según necesidades)
      if (group.lowerLimitAge <= 1) {
        this.allowedPassengerTypes.babies = true;
        console.log('  ✅ Permite BEBÉS');
      }
    });

    console.log('🎯 RESULTADO FINAL DE TIPOS PERMITIDOS:');
    console.log('  👨‍💼 Adultos:', this.allowedPassengerTypes.adults ? '✅ SÍ' : '❌ NO');
    console.log('  👶 Niños:', this.allowedPassengerTypes.children ? '✅ SÍ' : '❌ NO');
    console.log('  🍼 Bebés:', this.allowedPassengerTypes.babies ? '✅ SÍ' : '❌ NO');

    // Si ningún tipo está permitido, permitir adultos por defecto
    if (!this.allowedPassengerTypes.adults && !this.allowedPassengerTypes.children && !this.allowedPassengerTypes.babies) {
      console.log('⚠️ NINGÚN TIPO DETECTADO - Permitiendo adultos por defecto');
      this.allowedPassengerTypes.adults = true;
    }

    // ✅ RESETEAR PASAJEROS SI ALGUNOS TIPOS NO ESTÁN PERMITIDOS
    this.resetDisallowedPassengers();
  }

  // ✅ AÑADIDO: Método para resetear pasajeros no permitidos
  private resetDisallowedPassengers(): void {
    let changed = false;

    if (!this.allowedPassengerTypes.children && this.travelers.children > 0) {
      console.log('🔄 Reseteando niños (no permitidos por grupos de edad)');
      this.travelers.children = 0;
      changed = true;
    }

    if (!this.allowedPassengerTypes.babies && this.travelers.babies > 0) {
      console.log('🔄 Reseteando bebés (no permitidos por grupos de edad)');
      this.travelers.babies = 0;
      changed = true;
    }

    // Asegurar que siempre haya al menos 1 adulto si están permitidos
    if (this.allowedPassengerTypes.adults && this.travelers.adults < 1) {
      console.log('🔄 Asegurando al menos 1 adulto');
      this.travelers.adults = 1;
      changed = true;
    }

    if (changed) {
      this.updatePassengerText();
      this.emitPassengersUpdate();
    }
  }

  // ✅ AÑADIDO: Método para obtener información adicional de los grupos de edad
  private getAdditionalAgeGroupInfo(): void {
    if (!this.tourId) return;

    // Obtener el conteo
    this.tourAgeGroupsService.getCount(this.tourId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (count) => {
        console.log('🔢 CONTEO DE GRUPOS DE EDAD:', count);
      },
      error: (error) => {
        console.error('❌ Error obteniendo conteo:', error);
      }
    });

    // Verificar si tiene grupos de edad
    this.tourAgeGroupsService.hasAgeGroups(this.tourId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (hasAgeGroups) => {
        console.log('❓ ¿TIENE GRUPOS DE EDAD?:', hasAgeGroups);
      },
      error: (error) => {
        console.error('❌ Error verificando grupos de edad:', error);
      }
    });
  }

  private handleDepartureSelection(event: SelectedDepartureEvent): void {
    this.selectedDeparture = event;
    this.selectedDepartureId = null; // Reset selection cuando cambia departure
    this.loadDepartureDetails(event.departure.id);
  }

  private loadDepartureDetails(departureId: number): void {
    this.loading = true;
    this.error = undefined;

    this.departureService.getById(departureId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (departure) => {
        this.departureDetails = departure;
        this.updateDepartureInfo();
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error cargando detalles del departure:', error);
        this.error = 'Error al cargar los detalles del departure';
        this.loading = false;
      }
    });
  }

  private updateDepartureInfo(): void {
    if (!this.selectedDeparture || !this.departureDetails) return;

    this.departureInfo = {
      departureDate: this.departureDetails.departureDate,
      formattedDepartureDate: this.formatDate(this.departureDetails.departureDate),
      arrivalDate: this.departureDetails.arrivalDate,
      formattedArrivalDate: this.formatDate(this.departureDetails.arrivalDate),
      itineraryId: this.departureDetails.itineraryId,
      itineraryName: this.selectedDeparture.itineraryName,
      departureId: this.departureDetails.id,
      departureName: this.selectedDeparture.departure.name || 'Sin nombre',
      tripTypeName: this.selectedDeparture.tripType?.name || 'Sin tipo'
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

    // Mantener funcionalidad original: añadir automáticamente el primer departure
    setTimeout(() => {
      if (this.filteredDepartures.length > 0) {
        this.addToCart(this.filteredDepartures[0]);
        this.emitCityUpdate();
      }
    }, 0);
  }

  private formatDate(dateString: string): string {
    if (!dateString) return 'Fecha no disponible';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  get tripDuration(): number {
    if (!this.departureDetails) return 0;
    
    try {
      const departureDate = new Date(this.departureDetails.departureDate);
      const arrivalDate = new Date(this.departureDetails.arrivalDate);
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
      d => d.id === this.selectedDepartureId
    );

    if (!selectedDeparture) {
      return false;
    }

    // Si el precio es 0 o el tipo de viaje es 'single', bloqueamos
    const isSingleTrip = selectedDeparture.group?.toLowerCase().includes('single') ||
                          this.getTripTypeInfo(selectedDeparture.group)?.class === 'single';

    return isSingleTrip || selectedDeparture.price === 0;
  }

  showBlockedPassengersToast(): void {
    const selectedDeparture = this.filteredDepartures.find(
      d => d.id === this.selectedDepartureId
    );
    
    const isSingleTrip = selectedDeparture?.group?.toLowerCase().includes('single') || 
                          this.getTripTypeInfo(selectedDeparture?.group)?.class === 'single';
    
    let message = '';
    if (isSingleTrip) {
      message = 'Este viaje es para Singles y solo permite pasajeros adultos';
    } else if (selectedDeparture?.price === 0) {
      message = 'Este viaje con precio 0€ no permite añadir niños o bebés';
    } else {
      message = 'No se pueden añadir niños o bebés a este viaje';
    }
    
    this.messageService.add({
      severity: 'warn',
      summary: 'Pasajeros no permitidos',
      detail: message,
      life: 3000
    });
  }

  // Convertir el departure actual en formato para la tabla
  get filteredDepartures(): any[] {
    if (!this.departureDetails) return [];
    
    const departure = {
      id: this.departureDetails.id,
      departureDate: this.departureDetails.departureDate,
      returnDate: this.departureDetails.arrivalDate,
      price: 1495.00, // Precio del ejemplo 
      status: 'available',
      waitingList: false,
      group: this.selectedDeparture?.tripType?.name || 'group'
    };

    return [departure];
  }

  // Métodos para ciudades
  filterCities(event: any): void {
    const query = event.query;
    this.filteredCities = this.cities.filter(city => 
      city.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  onCityChange(event: any): void {
    this.selectedCity = event;
    this.emitCityUpdate();
  }

  private emitCityUpdate(): void {
    if (!this.selectedCity) {
      this.cityUpdate.emit('');
      return;
    }
    
    // ✅ FORMATO CONDICIONAL: Solo mostrar "Sin Vuelos" o "Vuelo desde [ciudad]"
    const isSinVuelos = this.selectedCity.name.toLowerCase().includes('sin vuelos') || 
                        this.selectedCity.name.toLowerCase().includes('sin vuelo');
    
    const cityText = isSinVuelos ? 'Sin Vuelos' : `Vuelo desde ${this.selectedCity.name}`;
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
      // ✅ VERIFICAR SI LOS ADULTOS ESTÁN PERMITIDOS
      if (!this.allowedPassengerTypes.adults && change > 0) {
        this.showPassengerTypeNotAllowedToast('adultos');
        return;
      }
      this.travelers.adults = Math.max(1, this.travelers.adults + change);
    } else if (type === 'children') {
      // ✅ VERIFICAR SI LOS NIÑOS ESTÁN PERMITIDOS
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
      // ✅ VERIFICAR SI LOS BEBÉS ESTÁN PERMITIDOS
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

  // ✅ AÑADIDO: Método para mostrar toast cuando un tipo de pasajero no está permitido
  private showPassengerTypeNotAllowedToast(passengerType: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Tipo de pasajero no permitido',
      detail: `Este tour no permite ${passengerType} según los grupos de edad configurados.`,
      life: 4000
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
      total: this.travelers.adults + this.travelers.children + this.travelers.babies
    });
  }

  getTripTypeInfo(group: string): any {
    if (!group) return undefined;

    const type = group.toLowerCase();

    if (type.includes('single') || type.includes('singles')) {
      return { title: 'Single', description: 'Viaje individual', class: 'single' };
    }

    if (type.includes('group') || type.includes('grupo')) {
      return { title: 'Group', description: 'Viaje en grupo', class: 'group' };
    }

    if (type.includes('private') || type.includes('privado')) {
      return { title: 'Private', description: 'Viaje privado', class: 'private' };
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
      d => d.id === this.selectedDepartureId
    );

    if (!selectedDeparture) return;

    // Calcular precio total: adultos + niños (bebés gratis)
    const basePrice = selectedDeparture.price;
    const totalPassengers = this.travelers.adults + this.travelers.children;
    const totalPrice = basePrice * totalPassengers;

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
}