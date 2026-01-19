import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  FlightsNetService,
  IFlightDetailDTO,
  IFlightPackDTO,
} from '../../../services/flightsNet.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../../core/services/reservation/reservation-traveler.service';
import {
  ActivityPackAvailabilityService,
  IActivityPackAvailabilityResponse,
} from '../../../../../core/services/activity/activity-pack-availability.service';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface FlightPackWithAvailability extends IFlightPackDTO {
  availablePlaces?: number;
}

@Component({
  selector: 'app-default-flights',
  standalone: false,
  templateUrl: './default-flights.component.html',
  styleUrls: ['./default-flights.component.scss'],
})
export class DefaultFlightsComponent implements OnInit, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() selectedFlightFromParent: IFlightPackDTO | null = null; // Nuevo input
  @Input() departureActivityPackId: number | null = null; // ✅ NUEVO: ID del paquete del departure
  @Output() flightSelectionChange = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }>();
  @Output() defaultFlightSelected = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }>();

  // Bandera para evitar llamadas duplicadas a saveFlightAssignments
  private isInternalSelection: boolean = false;

  selectedFlight: IFlightPackDTO | null = null;
  flightPacks: FlightPackWithAvailability[] = [];
  private allFlightPacks: IFlightPackDTO[] = [];
  private sinVuelosPack: IFlightPackDTO | null = null; // Pack "sin vuelos" obtenido del endpoint
  loginDialogVisible: boolean = false;
  flightDetails: Map<number, IFlightDetailDTO> = new Map();
  travelers: IReservationTravelerResponse[] = [];
  private isProcessing: boolean = false;

  constructor(
    private router: Router,
    private flightsNetService: FlightsNetService,
    private reservationTravelerService: ReservationTravelerService,
    private activityPackAvailabilityService: ActivityPackAvailabilityService
  ) {}

  ngOnInit(): void {
    this.getFlights();
    this.getTravelers();
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (
      changes['departureId'] &&
      changes['departureId'].currentValue &&
      changes['departureId'].currentValue !==
        changes['departureId'].previousValue
    ) {
      // Resetear estado cuando cambia el departureId
      this.flightPacks = [];
      this.allFlightPacks = [];
      this.sinVuelosPack = null;
      this.selectedFlight = null;
      this.flightDetails.clear();
      this.getFlights();
    }

    if (
      changes['reservationId'] &&
      changes['reservationId'].currentValue &&
      changes['reservationId'].currentValue !==
        changes['reservationId'].previousValue
    ) {
      this.getTravelers();
    }

    // NUEVO: Manejar cambio en departureActivityPackId
    if (
      changes['departureActivityPackId'] &&
      changes['departureActivityPackId'].currentValue !==
        changes['departureActivityPackId'].previousValue
    ) {
      // Actualmente no realizamos lógica especial cuando cambia departureActivityPackId.
    }

    // Nuevo: Actualizar selectedFlight cuando cambie desde el padre
    if (
      changes['selectedFlightFromParent'] &&
      changes['selectedFlightFromParent'].currentValue !==
        changes['selectedFlightFromParent'].previousValue
    ) {
      this.selectedFlight = changes['selectedFlightFromParent'].currentValue;
      // Resetear la bandera después de procesar el cambio
      this.isInternalSelection = false;
    }
  }

  getFlights(): void {
    if (!this.departureId) {
      this.flightPacks = [];
      this.allFlightPacks = [];
      this.sinVuelosPack = null;
      this.selectedFlight = null;
      return;
    }
    
    this.flightPacks = [];
    this.allFlightPacks = [];
    this.sinVuelosPack = null;
    this.selectedFlight = null;
    this.flightDetails.clear();
    
    // Obtener el pack "sin vuelos" desde el endpoint del backend
    this.flightsNetService.getPackSinVuelos(this.departureId).subscribe({
      next: (sinVuelosPack) => {
        this.sinVuelosPack = sinVuelosPack;
        this.loadAllFlights();
      },
      error: (error) => {
        // Si no hay pack "sin vuelos", continuar sin él
        this.sinVuelosPack = null;
        this.loadAllFlights();
      }
    });
  }

  private loadAllFlights(): void {
    if (!this.departureId) {
      return;
    }

    this.flightsNetService.getFlights(this.departureId).subscribe((flights) => {
      this.allFlightPacks = flights.map((pack) => ({
        ...pack,
        availablePlaces: undefined,
      }));

      // Filtrar el pack "sin vuelos" usando el ID obtenido del endpoint
      const sinVuelosPackId = this.sinVuelosPack?.id;
      const filteredFlights = flights.filter((pack) => {
        // Excluir el pack "sin vuelos" si existe, matcheando por ID
        return sinVuelosPackId ? pack.id !== sinVuelosPackId : true;
      });

      this.flightPacks = filteredFlights.map((pack) => ({
        ...pack,
        availablePlaces: undefined,
      }));

      this.flightPacks.forEach((pack, index) => {
        pack.flights.forEach((flight) => {
          this.getFlightDetail(flight.id);
        });
        this.loadAvailabilityForFlightPack(pack, index);
      });

      // Nota: ya no reconstruimos selección desde asignaciones; el backend es la fuente de verdad.
    });
  }

  private loadAvailabilityForFlightPack(
    pack: FlightPackWithAvailability,
    index: number
  ): void {
    if (!this.departureId) return;

    this.activityPackAvailabilityService
      .getByActivityPackAndDeparture(pack.id, this.departureId)
      .pipe(
        map((availabilities) =>
          availabilities.length > 0 ? availabilities : []
        ),
        catchError((error) => {
          return of([]);
        })
      )
      .subscribe((availabilities: IActivityPackAvailabilityResponse[]) => {
        const availablePlaces =
          availabilities.length > 0
            ? availabilities[0].bookableAvailability
            : 0;

        this.flightPacks[index] = {
          ...this.flightPacks[index],
          availablePlaces,
        };
      });
    }

  // ✅ HELPER: Verificar si un ID pertenece a un flight pack real
  private isFlightPackId(id: number): boolean {
    return Array.isArray(this.allFlightPacks) && this.allFlightPacks.some(p => p.id === id);
  }

  // ✅ HELPER: Verificar si un pack es el pack "sin vuelos" comparando por ID
  private isSinVuelosPack(flightPack: IFlightPackDTO): boolean {
    return this.sinVuelosPack !== null && flightPack.id === this.sinVuelosPack.id;
  }

  // ✅ MÉTODO NUEVO: Verificar si el vuelo seleccionado es el del departure
  private isSelectedFlightFromDeparture(): boolean {
    if (!this.selectedFlight || !this.departureActivityPackId) {
      return false;
    }
    return this.selectedFlight.id === this.departureActivityPackId;
  }

  // ✅ MÉTODO NUEVO: Obtener información del departure
  getDepartureInfo(): { isFromDeparture: boolean; departureId: number | null } {
    return {
      isFromDeparture: this.isSelectedFlightFromDeparture(),
      departureId: this.departureActivityPackId,
    };
  }

  // ✅ MÉTODO NUEVO: Verificar si hay vuelos existentes en la BD
  async checkExistingFlights(): Promise<{
    hasExistingFlights: boolean;
    flightIds: number[];
    message: string;
  }> {
    return {
      hasExistingFlights: false,
      flightIds: [],
      message: 'Lógica obsoleta: el backend gestiona ahora el estado de vuelos.',
    };
  }

  // ✅ MÉTODO NUEVO: Forzar actualización de datos del departure
  async forceUpdateDepartureData(): Promise<void> {

    if (!this.departureActivityPackId || !this.reservationId) {
      return;
    }
  }

  // ✅ MÉTODO NUEVO: Deseleccionar vuelo del departure sin guardar en BD (para sincronización con specific-search)
  async deselectDepartureFlightWithoutSaving(): Promise<void> {

    if (this.selectedFlight && this.selectedFlight.id === this.departureActivityPackId) {
      this.isInternalSelection = true;
      this.selectedFlight = null;
      this.flightSelectionChange.emit({ selectedFlight: null, totalPrice: 0 });
    }
  }

  getTravelers(): void {
    if (!this.reservationId) {
      return;
    }

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          this.travelers = travelers;
          this.recalculateFlightPrice();
        },
        error: (error) => {
          // Handle error silently or add proper error handling
        },
      });
  }

  private recalculateFlightPrice(): void {
    if (!this.selectedFlight) {
      // ✅ CASO: Sin vuelo seleccionado - emitir precio 0
      this.flightSelectionChange.emit({
        selectedFlight: null,
        totalPrice: 0,
      });
      return;
    }

    const basePrice =
      this.selectedFlight.ageGroupPrices.find(
        (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
      )?.price || 0; //TODO: Añadir al summary los precios segun el ageGroup de los diferentes viajeros , no solo el del leadTraveler
    const totalTravelers = this.travelers.length;
    const totalPrice = totalTravelers > 0 ? basePrice * totalTravelers : 0;

    this.flightSelectionChange.emit({
      selectedFlight: this.selectedFlight,
      totalPrice: basePrice,
    });
  }

  getTravelerInfo(): void {
    if (!this.reservationId) return;

    this.reservationTravelerService
      .getTravelerCount(this.reservationId)
      .subscribe((count) => {
        // Handle count if needed
      });

    this.reservationTravelerService
      .hasLeadTraveler(this.reservationId)
      .subscribe((hasLead) => {
        // Handle hasLead if needed
      });

    this.reservationTravelerService
      .getLeadTraveler(this.reservationId)
      .subscribe((leadTraveler) => {
        if (leadTraveler) {
          // Handle leadTraveler if needed
        }
      });
  }

  async selectFlight(flightPack: IFlightPackDTO): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    // Prevenir selección directa del pack "sin vuelos" (debe usarse selectSinVuelos())
    if (this.isSinVuelosPack(flightPack) && !this.isInternalSelection) {
      this.isProcessing = false;
      return;
    }

    if (this.selectedFlight === flightPack) {
      // Deseleccionar vuelo (solo estado local/UI)
      this.selectedFlight = null;
      this.flightSelectionChange.emit({ selectedFlight: null, totalPrice: 0 });
    } else {
      // Seleccionar nuevo vuelo
      this.selectedFlight = flightPack;
      
      const basePrice =
        flightPack.ageGroupPrices.find(
          (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
        )?.price || 0;

      this.defaultFlightSelected.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
      });

      this.flightSelectionChange.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
      });
    }
    this.isProcessing = false;
  }

  async selectSinVuelos(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    // Usar el pack "sin vuelos" obtenido del endpoint
    if (this.sinVuelosPack) {
      this.isInternalSelection = true;
      this.selectedFlight = this.sinVuelosPack;

      const basePrice = 0;

      this.flightSelectionChange.emit({
        selectedFlight: this.sinVuelosPack,
        totalPrice: basePrice,
      });

      this.defaultFlightSelected.emit({
        selectedFlight: this.sinVuelosPack,
        totalPrice: basePrice,
      });

      this.isInternalSelection = false;
    }
    this.isProcessing = false;
  }

  getSelectedFlightText(): string {
    if (!this.selectedFlight) {
      return 'Sin Vuelos';
    }

    // Si es del departure, mostrar texto especial
    if (this.selectedFlight.id === this.departureActivityPackId) {
      return 'Vuelo del Departure';
    }

    // Para otros vuelos, mostrar información básica
    return `Vuelo ${this.selectedFlight.id}`;
  }

  // ✅ MÉTODO NUEVO: Obtener precio del vuelo seleccionado para el summary
  getSelectedFlightPrice(): number {
    if (!this.selectedFlight) {
      return 0;
    }

    const basePrice =
      this.selectedFlight.ageGroupPrices.find(
        (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
      )?.price || 0;

    return basePrice;
  }

  // ✅ MÉTODO NUEVO: Verificar si hay vuelo seleccionado
  hasSelectedFlight(): boolean {
    return this.selectedFlight !== null;
  }

  // ✅ MÉTODO NUEVO: Obtener información completa del vuelo para el summary
  getFlightSummaryInfo(): {
    hasFlight: boolean;
    flightText: string;
    price: number;
    isFromDeparture: boolean;
  } {
    const hasFlight = this.hasSelectedFlight();
    const flightText = this.getSelectedFlightText();
    const price = this.getSelectedFlightPrice();
    const isFromDeparture = this.isSelectedFlightFromDeparture();

    return {
      hasFlight,
      flightText,
      price,
      isFromDeparture,
    };
  }

  getFlightDetail(flightId: number): void {
    this.flightsNetService.getFlightDetail(flightId).subscribe((detail) => {
      this.flightDetails.set(flightId, detail);
    });
  }

  refreshData(): void {
    this.getFlights();
    this.getTravelers();
  }

  logTravelerIds(): void {
    const ids = this.travelers.map((t) => t.id);
    // Handle ids if needed
  }

  logLeadTravelerId(): void {
    const leadTraveler = this.travelers.find((t) => t.isLeadTraveler);
    if (leadTraveler) {
      // Handle leadTraveler.id if needed
    }
  }

  closeLoginModal(): void {
    this.loginDialogVisible = false;
  }

  /**
   * ✅ MÉTODO SIMPLIFICADO: Guardar asignaciones de vuelos para todos los viajeros
   * @param targetFlightPackId ID del flightPack a asignar (0 para buscar automáticamente "sin vuelos")
   * @param shouldUnselectSpecificSearch Si debe deseleccionar vuelos de specific-search
   */
  async saveFlightAssignmentsForAllTravelers(
    targetFlightPackId: number,
    shouldUnselectSpecificSearch: boolean = false
  ): Promise<boolean> {

    // Lógica de asignación en BD delegada al backend mediante changeReservationFlight.
    // Este método se mantiene por compatibilidad pero no realiza operaciones.
    return true;
  }

  async saveFlightAssignments(): Promise<boolean> {
    // Método de guardado antiguo; ya no realiza operaciones porque el backend
    // es el encargado de cambiar el vuelo mediante changeReservationFlight.
    return true;
  }

  private async loadExistingFlightAssignments(): Promise<void> {

    // Lógica antigua de normalización de asignaciones; mantenido como no-op.
    if (!this.reservationId) {
      return;
    }
  }

  private async clearExistingFlightAssignments(
    travelers: IReservationTravelerResponse[]
  ): Promise<void> {

    // Lógica antigua de limpieza; se deja como no-op.
    return;
  }

  navigateToLogin(): void {
    this.closeLoginModal();
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.closeLoginModal();
    this.router.navigate(['/sign-up']);
  }
}
