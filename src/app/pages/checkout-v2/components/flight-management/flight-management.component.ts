import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import {
  DepartureService,
  IDepartureResponse,
} from '../../../../core/services/departure/departure.service';
import {
  Tour,
  TourService,
} from '../../../../core/services/tour/tour.service';
import { forkJoin, Subscription } from 'rxjs';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { IFlightPackDTO } from '../../services/flightsNet.service';
import { DefaultFlightsComponent } from './default-flights/default-flights.component';
import { FlightSelectionState } from '../../types/flight-selection-state';

@Component({
  selector: 'app-flight-management',
  standalone: false,

  templateUrl: './flight-management.component.html',
  styleUrls: ['./flight-management.component.scss'],
})
export class FlightManagementComponent implements OnInit, OnChanges, OnDestroy {
  @Input() departureId: number = 0;
  @Input() reservationId: number = 0;
  @Input() tourId: number = 0;
  @Input() selectedFlight: IFlightPackDTO | null = null;
  @Input() departureActivityPackId: number | null = null; // ✅ NUEVO: ID del paquete del departure
  @Input() isStandaloneMode: boolean = false; // ✅ NUEVO: Modo standalone
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

  private dataSubscription: Subscription | null = null;

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
      this._cachedTransformedFlight = this.convertFlightsNetToFlightSearch(this.selectedFlight);
      this._lastSelectedFlightId = this.selectedFlight.id;
    }
    return this._cachedTransformedFlight;
  }

  constructor(
    private departureService: DepartureService,
    private tourService: TourService,
    private authService: AuthenticateService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadTourAndDepartureData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // NUEVO: Manejar cambio en departureActivityPackId
    if (
      changes['departureActivityPackId'] &&
      changes['departureActivityPackId'].currentValue !==
      changes['departureActivityPackId'].previousValue
    ) {
      // Logic for departureActivityPackId change if needed
    }

    // Verificar si departureId o tourId han cambiado
    if (
      (changes['departureId'] &&
        changes['departureId'].currentValue !==
        changes['departureId'].previousValue) ||
      (changes['tourId'] &&
        changes['tourId'].currentValue !== changes['tourId'].previousValue)
    ) {
      this.loadTourAndDepartureData();
    }

    // Limpiar cache si selectedFlight cambió
    if (changes['selectedFlight']) {
      this.clearFlightCache();
    }
  }

  // Método para limpiar el cache de vuelos
  private clearFlightCache(): void {
    this._cachedTransformedFlight = null;
    this._lastSelectedFlightId = null;
  }

  private loadTourAndDepartureData(): void {
    console.log('🔍 [FlightManagement] loadTourAndDepartureData called', {
      tourId: this.tourId,
      departureId: this.departureId,
      timestamp: new Date().toISOString()
    });

    // Cancelar suscripción anterior si existe
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    // Si no hay IDs válidos, resetear y salir
    if (!this.tourId || !this.departureId) {
      console.log('⚠️ [FlightManagement] Missing tourId or departureId');
      this.isConsolidadorVuelosActive = false;
      return;
    }

    // Usar forkJoin para esperar ambas respuestas
    this.dataSubscription = forkJoin({
      tour: this.tourService.getTourById(this.tourId),
      departure: this.departureService.getById(this.departureId)
    }).subscribe({
      next: (results) => {
        const tourActive = !!results.tour.isConsolidadorVuelosActive;
        const departureActive = !!results.departure.isConsolidadorVuelosActive;

        this.isConsolidadorVuelosActive = tourActive && departureActive;

        console.log('✅ [FlightManagement] isConsolidadorVuelosActive calculated:', {
          result: this.isConsolidadorVuelosActive,
          tourActive,
          departureActive
        });

        // Forzar detección de cambios
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ [FlightManagement] Error loading data:', error);
        this.isConsolidadorVuelosActive = false;
        this.cdr.markForCheck();
      }
    });
  }

  private loadTourData(): void {
    // Este método ya no se usa con la nueva lógica AND
  }

  // Métodos para autenticación
  checkAuthAndShowSpecificSearch(): void {
    // NUEVO: En modo standalone, mostrar directamente la búsqueda específica
    if (this.isStandaloneMode) {
      this.specificSearchVisible = true;
      return;
    }

    // Lógica normal para modo no-standalone
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

  async onFlightSelectionChange(flightData: {
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }): Promise<void> {

    // NUEVO: Log específico para "Sin Vuelos"
    if (!flightData.selectedFlight) {
    }

    // NUEVO: Actualizar el vuelo seleccionado internamente
    this.selectedFlight = flightData.selectedFlight;

    // Intentar guardar en la base de datos antes de emitir el evento
    if (this.defaultFlightsComponent) {
      try {
        await this.defaultFlightsComponent.saveFlightAssignments();
      } catch (error) {
        console.error('Error al guardar las asignaciones de vuelos en la base de datos:', error);
      }
    }

    // Siempre emitir el evento después del intento de guardado
    this.flightSelectionChange.emit(flightData);
  }

  // Método para manejar la selección de vuelos desde specific-search
  onSpecificSearchFlightSelection(flightData: FlightSelectionState): void {

    // Convertir el tipo del FlightSearchService al tipo de FlightsNetService
    const convertedFlight = flightData.selectedFlight ? this.convertFlightSearchToFlightsNet(flightData.selectedFlight) : null;

    this.flightSelectionChange.emit({
      selectedFlight: convertedFlight,
      totalPrice: flightData.totalPrice
    });
  }

  // NUEVO: Método para manejar la selección de vuelos desde default-flights
  async onDefaultFlightSelected(flightData: {
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }): Promise<void> {

    // Actualizar el vuelo seleccionado
    this.selectedFlight = flightData.selectedFlight;

    // NUEVO: Deseleccionar vuelos en specific-search SOLO si isConsolidadorVuelosActive es true
    if (this.isConsolidadorVuelosActive && this.specificSearchComponent && this.reservationId) {
      // Llamar al método unselectAllFlights del servicio
      this.specificSearchComponent.flightSearchService.unselectAllFlights(this.reservationId).subscribe({
        next: () => {
        },
        error: (error: any) => {
          console.error('Error al deseleccionar vuelos de specific-search desde flight-management:', error);
        }
      });
    }

    // Intentar guardar en la base de datos antes de emitir el evento
    if (this.defaultFlightsComponent) {
      try {
        await this.defaultFlightsComponent.saveFlightAssignments();
      } catch (error) {
        console.error('Error al guardar las asignaciones de vuelos en la base de datos:', error);
      }
    }

    // Siempre emitir el evento después del intento de guardado
    this.flightSelectionChange.emit(flightData);
  }

  // NUEVO: Método para manejar la selección de vuelos desde specific-search
  async onSpecificFlightSelected(flightData: {
    selectedFlight: any | null; // Usar any para evitar conflictos de tipos
    totalPrice: number;
    shouldAssignNoFlight?: boolean; // NUEVO: Indicar si se debe asignar "sin vuelos"
  }): Promise<void> {

    // Convertir el vuelo al formato de FlightsNetService si existe
    const convertedFlight = flightData.selectedFlight ? this.convertFlightSearchToFlightsNet(flightData.selectedFlight) : null;

    // Actualizar el vuelo seleccionado
    this.selectedFlight = convertedFlight;

    // NUEVO: Si shouldAssignNoFlight es true, asignar "sin vuelos" a todos los viajeros
    if (flightData.shouldAssignNoFlight && this.defaultFlightsComponent && this.reservationId) {
      // CORRECCIÓN: No deseleccionar vuelos de specific-search cuando asignamos "sin vuelos"
      // porque acabamos de hacer la selección
      try {
        await this.defaultFlightsComponent.saveFlightAssignmentsForAllTravelers(0, false);
      } catch (error) {
        console.error('Error al asignar "sin vuelos" a todos los viajeros:', error);
      }
    }

    // MODIFICADO: NO marcar "Sin Vuelos" automáticamente, solo deseleccionar el vuelo del departure
    if (this.isConsolidadorVuelosActive && this.defaultFlightsComponent && this.reservationId) {

      // Usar el nuevo método que deselecciona y guarda en BD
      try {
        await this.defaultFlightsComponent.deselectDepartureFlightWithoutSaving();
      } catch (error) {
        console.error('Error al deseleccionar el vuelo del departure:', error);
      }
    }

    // Intentar guardar en la base de datos antes de emitir el evento
    if (this.specificSearchComponent) {
      try {
        await this.specificSearchComponent.saveFlightAssignments();
      } catch (error) {
        console.error('Error al guardar las asignaciones de vuelos en la base de datos:', error);
      }
    }

    // Siempre emitir el evento después del intento de guardado
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

  async saveFlightAssignments(): Promise<boolean> {
    if (this.defaultFlightsComponent) {
      return await this.defaultFlightsComponent.saveFlightAssignments();
    }
    return false;
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }
}
