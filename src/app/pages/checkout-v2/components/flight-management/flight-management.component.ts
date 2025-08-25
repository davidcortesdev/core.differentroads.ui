import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  DepartureService,
  IDepartureResponse,
} from '../../../../core/services/departure/departure.service';
import {
  Tour,
  TourNetService,
} from '../../../../core/services/tourNet.service';
import { AuthenticateService } from '../../../../core/services/auth-service.service';
import { IFlightPackDTO } from '../../services/flightsNet.service';
import { DefaultFlightsComponent } from './default-flights/default-flights.component';
import { FlightSelectionState } from '../../types/flight-selection-state';

@Component({
  selector: 'app-flight-management',
  standalone: false,

  templateUrl: './flight-management.component.html',
  styleUrls: ['./flight-management.component.scss'],
})
export class FlightManagementComponent implements OnInit, OnChanges {
  @Input() departureId: number = 0;
  @Input() reservationId: number = 0;
  @Input() tourId: number = 0;
  @Input() selectedFlight: IFlightPackDTO | null = null;
  @Input() departureActivityPackId: number | null = null; // ✅ NUEVO: ID del paquete del departure
  @Output() flightSelectionChange = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }>();

  @ViewChild(DefaultFlightsComponent)
  defaultFlightsComponent!: DefaultFlightsComponent;

  @ViewChild('specificSearch')
  specificSearchComponent!: any;

  isConsolidadorVuelosActive: boolean = false;
  loginDialogVisible: boolean = false;
  specificSearchVisible: boolean = false;

  // Propiedad privada para cachear la transformación
  private _cachedTransformedFlight: any = null;
  private _lastSelectedFlightId: number | null = null;

  // Getter que solo transforma cuando es necesario
  get transformedSelectedFlight(): any {
    if (!this.selectedFlight) {
      this._cachedTransformedFlight = null;
      this._lastSelectedFlightId = null;
      return null;
    }

    // Solo transformar si el vuelo ha cambiado
    if (this._lastSelectedFlightId !== this.selectedFlight.id) {
      console.log('🔄 Transformando vuelo - ID anterior:', this._lastSelectedFlightId, 'ID actual:', this.selectedFlight.id);
      this._cachedTransformedFlight = this.convertFlightsNetToFlightSearch(this.selectedFlight);
      this._lastSelectedFlightId = this.selectedFlight.id;
      console.log('✅ Vuelo transformado y cacheado');
    } else {
      console.log('📋 Usando vuelo cacheado - ID:', this._lastSelectedFlightId);
    }

    return this._cachedTransformedFlight;
  }

  constructor(
    private departureService: DepartureService,
    private tourNetService: TourNetService,
    private authService: AuthenticateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTourAndDepartureData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 flight-management: ngOnChanges llamado con:', changes);

    // ✅ NUEVO: Manejar cambio en departureActivityPackId
    if (
      changes['departureActivityPackId'] &&
      changes['departureActivityPackId'].currentValue !==
        changes['departureActivityPackId'].previousValue
    ) {
      console.log(
        '🔄 departureActivityPackId cambió en flight-management:',
        changes['departureActivityPackId'].currentValue
      );
    }

    // Verificar si departureId o tourId han cambiado
    if (
      (changes['departureId'] &&
        changes['departureId'].currentValue !==
          changes['departureId'].previousValue) ||
      (changes['tourId'] &&
        changes['tourId'].currentValue !== changes['tourId'].previousValue)
    ) {
      console.log('🔄 departureId o tourId cambió, recargando datos...');
      this.loadTourAndDepartureData();
    }

    // Limpiar cache si selectedFlight cambió
    if (changes['selectedFlight']) {
      this.clearFlightCache();
    }
  }

  // Método para limpiar el cache de vuelos
  private clearFlightCache(): void {
    console.log('🧹 Limpiando cache de vuelos');
    this._cachedTransformedFlight = null;
    this._lastSelectedFlightId = null;
  }

  private loadTourAndDepartureData(): void {
    let tourConsolidadorActive: boolean | null = null;
    let departureConsolidadorActive: boolean | null = null;

    console.log(
      '🔄 Iniciando carga de datos - tourId:',
      this.tourId,
      'departureId:',
      this.departureId
    );

    // Función para verificar si ambas respuestas han llegado
    const checkBothResponses = () => {
      console.log(
        '📊 Verificando respuestas - tour:',
        tourConsolidadorActive,
        'departure:',
        departureConsolidadorActive
      );

      if (
        tourConsolidadorActive !== null &&
        departureConsolidadorActive !== null
      ) {
        // Condición AND: ambas deben ser true
        this.isConsolidadorVuelosActive =
          tourConsolidadorActive && departureConsolidadorActive;
        console.log(
          '✅ Resultado final isConsolidadorVuelosActive:',
          this.isConsolidadorVuelosActive
        );
      } else {
        console.log('⏳ Esperando más respuestas...');
      }
    };

    // Cargar datos del tour
    if (this.tourId) {
      console.log('🛫 Cargando datos del tour...');
      this.tourNetService.getTourById(this.tourId).subscribe({
        next: (tour: Tour) => {
          tourConsolidadorActive = !!tour.isConsolidadorVuelosActive;
          console.log(
            '🎯 Tour cargado - isConsolidadorVuelosActive:',
            tour.isConsolidadorVuelosActive,
            '-> procesado:',
            tourConsolidadorActive
          );
          checkBothResponses();
        },
        error: (error) => {
          tourConsolidadorActive = false;
          console.log('❌ Error cargando tour:', error);
          checkBothResponses();
        },
      });
    } else {
      // Si no hay tourId, asumimos false
      tourConsolidadorActive = false;
      console.log('🚫 No hay tourId, asumiendo false');
      checkBothResponses();
    }

    // Cargar datos del departure
    if (this.departureId) {
      console.log('✈️ Cargando datos del departure...');
      this.departureService.getById(this.departureId).subscribe({
        next: (departure: IDepartureResponse) => {
          departureConsolidadorActive = !!departure.isConsolidadorVuelosActive;
          console.log(
            '🎯 Departure cargado - isConsolidadorVuelosActive:',
            departure.isConsolidadorVuelosActive,
            '-> procesado:',
            departureConsolidadorActive
          );
          checkBothResponses();
        },
        error: (error) => {
          departureConsolidadorActive = false;
          console.log('❌ Error cargando departure:', error);
          checkBothResponses();
        },
      });
    } else {
      // Si no hay departureId, asumimos false
      departureConsolidadorActive = false;
      console.log('🚫 No hay departureId, asumiendo false');
      checkBothResponses();
    }
  }

  private loadTourData(): void {
    // Este método ya no se usa con la nueva lógica AND
  }

  // Métodos para autenticación
  checkAuthAndShowSpecificSearch(): void {
    this.authService.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        // Usuario está logueado, mostrar sección específica
        this.specificSearchVisible = true;
      } else {
        // Usuario no está logueado, mostrar modal
        // Guardar la URL actual con el step en sessionStorage (step 1 = vuelos)
        const currentUrl = window.location.pathname;
        const redirectUrl = `${currentUrl}?step=1`;
        sessionStorage.setItem('redirectUrl', redirectUrl);
        this.loginDialogVisible = true;
      }
    });
  }

  closeLoginModal(): void {
    this.loginDialogVisible = false;
  }

  navigateToLogin(): void {
    this.closeLoginModal();
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.closeLoginModal();
    this.router.navigate(['/sign-up']);
  }

  onFlightSelectionChange(flightData: {
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }): void {
    console.log(
      '🔄 flight-management: onFlightSelectionChange llamado con:',
      flightData
    );
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('📊 selectedFlight:', flightData.selectedFlight);
    console.log('💰 totalPrice:', flightData.totalPrice);

    // ✅ NUEVO: Log específico para "Sin Vuelos"
    if (!flightData.selectedFlight) {
      console.log(
        '🚫 flight-management: CASO ESPECIAL - Sin Vuelos seleccionado'
      );
    }

    // ✅ NUEVO: Actualizar el vuelo seleccionado internamente
    this.selectedFlight = flightData.selectedFlight;

    this.flightSelectionChange.emit(flightData);
    console.log('✅ flight-management: Evento emitido al componente padre');
  }

  // Método para manejar la selección de vuelos desde specific-search
  onSpecificSearchFlightSelection(flightData: FlightSelectionState): void {
    console.log('🔄 Selección de vuelo desde specific-search:', flightData);
    console.log('📍 Origen:', flightData.source);
    console.log('🆔 Pack ID:', flightData.packId);
    
    // Convertir el tipo del FlightSearchService al tipo de FlightsNetService
    const convertedFlight = flightData.selectedFlight ? this.convertFlightSearchToFlightsNet(flightData.selectedFlight) : null;
    
    this.flightSelectionChange.emit({
      selectedFlight: convertedFlight,
      totalPrice: flightData.totalPrice
    });
  }

    // ✅ NUEVO: Método para manejar la selección de vuelos desde default-flights
  onDefaultFlightSelected(flightData: {
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }): void {
    console.log('🔄 Vuelo seleccionado desde default-flights:', flightData);
    console.log('📍 Origen: default-flights');
    
    // Actualizar el vuelo seleccionado
    this.selectedFlight = flightData.selectedFlight;
    
    // ✅ NUEVO: Deseleccionar vuelos en specific-search SOLO si isConsolidadorVuelosActive es true
    if (this.isConsolidadorVuelosActive && this.specificSearchComponent && this.reservationId) {
      console.log('🔄 isConsolidadorVuelosActive es true - deseleccionando vuelos en specific-search');
      // Llamar al método unselectAllFlights del servicio
      this.specificSearchComponent.flightSearchService.unselectAllFlights(this.reservationId).subscribe({
        next: () => {
          console.log('✅ Vuelos de specific-search deseleccionados desde flight-management');
        },
        error: (error: any) => {
          console.error('❌ Error al deseleccionar vuelos de specific-search desde flight-management:', error);
        }
      });
    } else {
      console.log('ℹ️ isConsolidadorVuelosActive es false - no se deseleccionan vuelos en specific-search');
    }
    
    // Emitir el cambio al componente padre
    this.flightSelectionChange.emit(flightData);
  }

  // ✅ NUEVO: Método para manejar la selección de vuelos desde specific-search
  onSpecificFlightSelected(flightData: {
    selectedFlight: any | null; // Usar any para evitar conflictos de tipos
    totalPrice: number;
  }): void {
    console.log('🔄 Vuelo seleccionado desde specific-search:', flightData);
    console.log('📍 Origen: specific-search');
    
    // Convertir el vuelo al formato de FlightsNetService si existe
    const convertedFlight = flightData.selectedFlight ? this.convertFlightSearchToFlightsNet(flightData.selectedFlight) : null;
    
    // Actualizar el vuelo seleccionado
    this.selectedFlight = convertedFlight;
    
    // ✅ MODIFICADO: NO marcar "Sin Vuelos" automáticamente, solo deseleccionar el vuelo del departure
    if (this.isConsolidadorVuelosActive && this.defaultFlightsComponent && this.reservationId) {
      console.log('🔄 isConsolidadorVuelosActive es true - deseleccionando vuelo del departure en default-flights');
      
      // Usar el nuevo método que deselecciona sin guardar en BD
      this.defaultFlightsComponent.deselectDepartureFlightWithoutSaving();
      
      console.log('✅ Vuelo del departure deseleccionado en default-flights, opción "Sin Vuelos" sigue visible');
    } else {
      console.log('ℹ️ isConsolidadorVuelosActive es false - no se deselecciona vuelo del departure en default-flights');
    }
    
    // Emitir el cambio al componente padre con el vuelo convertido
    this.flightSelectionChange.emit({
      selectedFlight: convertedFlight,
      totalPrice: flightData.totalPrice
    });
  }

  // Método para convertir IFlightPackDTO del FlightSearchService al formato de FlightsNetService
  private convertFlightSearchToFlightsNet(flightSearchFlight: any): IFlightPackDTO {
    return {
      id: flightSearchFlight.id,
      code: flightSearchFlight.code || '',
      name: flightSearchFlight.name || '',
      description: flightSearchFlight.description || '',
      tkId: typeof flightSearchFlight.tkId === 'string' ? parseInt(flightSearchFlight.tkId) || 0 : (flightSearchFlight.tkId || 0),
      itineraryId: flightSearchFlight.itineraryId,
      isOptional: flightSearchFlight.isOptional,
      imageUrl: flightSearchFlight.imageUrl || '',
      imageAlt: flightSearchFlight.imageAlt || '',
      isVisibleOnWeb: flightSearchFlight.isVisibleOnWeb,
      ageGroupPrices: flightSearchFlight.ageGroupPrices?.map((price: any) => ({
        price: price.price || 0,
        ageGroupId: price.ageGroupId || 0,
        ageGroupName: price.ageGroupName || 'Adultos'
      })) || [],
      flights: flightSearchFlight.flights?.map((flight: any) => ({
        id: flight.id,
        tkId: flight.tkId || '',
        name: flight.name || '',
        activityId: flight.activityId,
        departureId: flight.departureId,
        tkActivityPeriodId: flight.tkActivityPeriodId || '',
        tkServiceCombinationId: flight.tkServiceCombinationId || '',
        date: flight.date || '',
        tkServiceId: flight.tkServiceId || '',
        tkJourneyId: flight.tkJourneyId || '',
        flightTypeId: flight.flightTypeId,
        departureIATACode: flight.departureIATACode || '',
        arrivalIATACode: flight.arrivalIATACode || '',
        departureDate: flight.departureDate || '',
        departureTime: flight.departureTime || '',
        arrivalDate: flight.arrivalDate || '',
        arrivalTime: flight.arrivalTime || '',
        departureCity: flight.departureCity || '',
        arrivalCity: flight.arrivalCity || ''
      })) || []
    };
  }

  // Método para convertir IFlightPackDTO del FlightsNetService al formato de FlightSearchService
  convertFlightsNetToFlightSearch(flightsNetFlight: IFlightPackDTO): any {
    // Crear el objeto base una sola vez
    const baseObject = {
      id: flightsNetFlight.id,
      code: flightsNetFlight.code,
      name: flightsNetFlight.name,
      description: flightsNetFlight.description,
      tkId: flightsNetFlight.tkId.toString(),
      itineraryId: flightsNetFlight.itineraryId,
      isOptional: flightsNetFlight.isOptional,
      imageUrl: flightsNetFlight.imageUrl,
      imageAlt: flightsNetFlight.imageAlt,
      isVisibleOnWeb: flightsNetFlight.isVisibleOnWeb,
      ageGroupPrices: flightsNetFlight.ageGroupPrices?.map((price) => ({
        price: price.price,
        ageGroupId: price.ageGroupId,
        ageGroupName: price.ageGroupName
      })) || [],
      flights: flightsNetFlight.flights?.map((flight) => ({
        id: flight.id,
        tkId: flight.tkId,
        name: flight.name,
        activityId: flight.activityId,
        departureId: flight.departureId,
        tkActivityPeriodId: flight.tkActivityPeriodId,
        tkServiceCombinationId: flight.tkServiceCombinationId,
        date: flight.date,
        tkServiceId: flight.tkServiceId,
        tkJourneyId: flight.tkJourneyId,
        flightTypeId: flight.flightTypeId,
        departureIATACode: flight.departureIATACode,
        arrivalIATACode: flight.arrivalIATACode,
        departureDate: flight.departureDate,
        departureTime: flight.departureTime,
        arrivalDate: flight.arrivalDate,
        arrivalTime: flight.arrivalTime,
        departureCity: flight.departureCity,
        arrivalCity: flight.arrivalCity
      })) || []
    };

    return baseObject;
  }

  saveFlightAssignments(): void {
    this.defaultFlightsComponent.saveFlightAssignments();
  }
}
