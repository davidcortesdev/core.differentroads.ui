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
  FlightsNetService,
  IFlightDetailDTO,
  IFlightPackDTO,
} from '../../../services/flightsNet.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerActivityPackService,
  IReservationTravelerActivityPackResponse,
} from '../../../../../core/services/reservation/reservation-traveler-activity-pack.service';
import { FlightSearchService } from '../../../../../core/services/flight-search.service';

@Component({
  selector: 'app-default-flights',
  standalone: false,
  templateUrl: './default-flights.component.html',
  styleUrl: './default-flights.component.scss',
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

  // Contador estático para rastrear llamadas a saveFlightAssignments
  private static saveFlightAssignmentsCallCount = 0;

  // Bandera para evitar llamadas duplicadas a saveFlightAssignments
  private isInternalSelection: boolean = false;

  selectedFlight: IFlightPackDTO | null = null;
  flightPacks: IFlightPackDTO[] = [];
  loginDialogVisible: boolean = false;
  flightDetails: Map<number, IFlightDetailDTO> = new Map();
  travelers: IReservationTravelerResponse[] = [];

  constructor(
    private router: Router,
    private flightsNetService: FlightsNetService,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private flightSearchService: FlightSearchService
  ) {}

  ngOnInit(): void {
    this.getFlights();
    this.getTravelers();

    // ✅ NUEVO: Cargar datos existentes del servicio para mostrar como seleccionado
    if (this.reservationId) {
      this.loadExistingFlightAssignments();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 ngOnChanges ejecutado');
    console.log('📊 Cambios detectados:', Object.keys(changes));
    console.log('🕐 Timestamp:', new Date().toISOString());

    if (
      changes['departureId'] &&
      changes['departureId'].currentValue &&
      changes['departureId'].currentValue !==
        changes['departureId'].previousValue
    ) {
      console.log(
        '🔄 departureId cambió:',
        changes['departureId'].currentValue
      );
      this.getFlights();
    }

    if (
      changes['reservationId'] &&
      changes['reservationId'].currentValue &&
      changes['reservationId'].currentValue !==
        changes['reservationId'].previousValue
    ) {
      console.log(
        '🔄 reservationId cambió:',
        changes['reservationId'].currentValue
      );
      this.getTravelers();

      // ✅ NUEVO: Cargar vuelo existente cuando cambie el reservationId
      if (this.flightPacks && this.flightPacks.length > 0) {
        this.loadAndSelectExistingFlight();
      }
    }

    // ✅ NUEVO: Manejar cambio en departureActivityPackId
    if (
      changes['departureActivityPackId'] &&
      changes['departureActivityPackId'].currentValue !==
        changes['departureActivityPackId'].previousValue
    ) {
      console.log('🔄 departureActivityPackId cambió');
      console.log(
        '📦 ID del departure:',
        changes['departureActivityPackId'].currentValue
      );

      // ✅ NUEVO: Cargar asignaciones existentes cuando cambie el departure
      if (this.reservationId) {
        this.loadExistingFlightAssignments();
      }

      // Seleccionar automáticamente el vuelo del departure si existe
      this.selectFlightFromDeparture(
        changes['departureActivityPackId'].currentValue
      );
    }

    // Nuevo: Actualizar selectedFlight cuando cambie desde el padre
    if (
      changes['selectedFlightFromParent'] &&
      changes['selectedFlightFromParent'].currentValue !==
        changes['selectedFlightFromParent'].previousValue
    ) {
      console.log('🔄 selectedFlightFromParent cambió');
      console.log(
        '📊 Valor anterior:',
        changes['selectedFlightFromParent'].previousValue
      );
      console.log(
        '📊 Valor actual:',
        changes['selectedFlightFromParent'].currentValue
      );
      console.log('🔄 Actualizando selectedFlight interno...');

      this.selectedFlight = changes['selectedFlightFromParent'].currentValue;

      // Solo guardar asignaciones si NO es una selección interna
      if (
        !this.isInternalSelection &&
        this.selectedFlight &&
        this.reservationId
      ) {
        console.log(
          '💾 Guardando asignaciones para vuelo seleccionado desde padre...'
        );
        console.log('🎯 Vuelo seleccionado:', this.selectedFlight);
        console.log('🆔 reservationId:', this.reservationId);

        this.saveFlightAssignments()
          .then((success) => {
            if (success) {
              console.log('✅ Asignaciones guardadas exitosamente desde padre');
            } else {
              console.error('❌ Error al guardar asignaciones desde padre');
            }
          })
          .catch((error) => {
            console.error(
              '💥 Error al guardar asignaciones desde padre:',
              error
            );
          });
      } else {
        if (this.isInternalSelection) {
          console.log(
            '⚠️ No se guardan asignaciones - es una selección interna'
          );
        } else {
          console.log(
            '⚠️ No se puede guardar - selectedFlight o reservationId faltan'
          );
          console.log('📊 selectedFlight:', this.selectedFlight);
          console.log('🆔 reservationId:', this.reservationId);
        }
      }

      // Resetear la bandera después de procesar el cambio
      this.isInternalSelection = false;
    }
  }

  getFlights(): void {
    if (!this.departureId) {
      return;
    }
    this.flightsNetService.getFlights(this.departureId).subscribe((flights) => {
      this.flightPacks = flights;
      this.flightPacks.forEach((pack) => {
        pack.flights.forEach((flight) => {
          this.getFlightDetail(flight.id);
        });
      });

      // ✅ MODIFICADO: Ejecutar en orden correcto para asegurar actualización
      if (this.reservationId && this.departureActivityPackId) {
        // 1. Primero cargar asignaciones existentes
        this.loadExistingFlightAssignments().then(() => {
          // 2. Luego seleccionar vuelo del departure si existe
          if (
            this.departureActivityPackId &&
            this.departureActivityPackId > 0
          ) {
            this.selectFlightFromDeparture(this.departureActivityPackId);
          }

          // 3. Finalmente cargar vuelo existente de la BD
          this.loadAndSelectExistingFlight();
        });
      } else {
        // ✅ SELECCIONAR AUTOMÁTICAMENTE el vuelo del departure si existe
        if (this.departureActivityPackId && this.departureActivityPackId > 0) {
          this.selectFlightFromDeparture(this.departureActivityPackId);
        }

        // ✅ NUEVO: Cargar vuelo existente de la BD y mostrarlo como seleccionado
        if (this.reservationId) {
          this.loadAndSelectExistingFlight();
        }
      }
    });
  }

  // ✅ MÉTODO NUEVO: Cargar y mostrar como seleccionado el vuelo que ya existe en la BD
  private async loadAndSelectExistingFlight(): Promise<void> {
    console.log('🔄 loadAndSelectExistingFlight iniciado');
    console.log('🆔 reservationId:', this.reservationId);
    console.log('📋 Vuelos disponibles:', this.flightPacks);

    if (
      !this.reservationId ||
      !this.flightPacks ||
      this.flightPacks.length === 0
    ) {
      console.log(
        '⚠️ No se puede cargar vuelo existente - faltan datos necesarios'
      );
      return;
    }

    try {
      // Obtener viajeros
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => resolve(travelers),
              error: (error) => reject(error),
            });
        }
      );

      if (travelers.length === 0) {
        console.log('⚠️ No hay viajeros para verificar vuelos existentes');
        return;
      }

      // Verificar si algún viajero tiene asignaciones de vuelos
      const firstTraveler = travelers[0];
      const existingAssignments = await new Promise<
        IReservationTravelerActivityPackResponse[]
      >((resolve, reject) => {
        this.reservationTravelerActivityPackService
          .getByReservationTraveler(firstTraveler.id)
          .subscribe({
            next: (assignments) => resolve(assignments),
            error: (error) => reject(error),
          });
      });

      // Buscar asignaciones de vuelos (activityPackId > 0)
      const flightAssignments = existingAssignments.filter(
        (a) => a.activityPackId > 0
      );

      if (flightAssignments.length > 0) {
        // Ordenar por ID descendente para obtener el más reciente
        const mostRecentFlight = flightAssignments.sort(
          (a, b) => b.id - a.id
        )[0];
        const flightId = mostRecentFlight.activityPackId;

        console.log('🎯 Vuelo existente encontrado en BD:', flightId);

        // Buscar si este vuelo está disponible en la lista actual
        const matchingFlight = this.flightPacks.find((f) => f.id === flightId);

        if (matchingFlight) {
          console.log(
            '✅ Vuelo existente encontrado en lista de vuelos disponibles:',
            matchingFlight
          );

          // Seleccionar el vuelo existente
          this.isInternalSelection = true;
          this.selectedFlight = matchingFlight;

          // Calcular precio
          const basePrice =
            matchingFlight.ageGroupPrices.find(
              (price) => price.ageGroupId === travelers[0]?.ageGroupId
            )?.price || 0;

          this.flightSelectionChange.emit({
            selectedFlight: matchingFlight,
            totalPrice: basePrice,
          });

          console.log(
            '✅ Vuelo existente de la BD seleccionado automáticamente'
          );
        } else {
          console.log(
            '⚠️ Vuelo existente en BD no está disponible en la lista actual:',
            flightId
          );
        }
      } else {
        console.log(
          'ℹ️ No se encontraron asignaciones de vuelos existentes en la BD'
        );
      }
    } catch (error) {
      console.error('💥 Error al cargar vuelo existente:', error);
    }
  }

  // ✅ MÉTODO NUEVO: Seleccionar vuelo basado en el departure
  private selectFlightFromDeparture(departureActivityPackId: number): void {
    console.log('🎯 selectFlightFromDeparture llamado');
    console.log('📦 ID del departure:', departureActivityPackId);
    console.log('📋 Vuelos disponibles:', this.flightPacks);

    if (!this.flightPacks || this.flightPacks.length === 0) {
      console.log(
        '⚠️ No hay vuelos disponibles aún, se seleccionará cuando se carguen'
      );
      return;
    }

    // Buscar el vuelo que coincida con el ID del departure
    const matchingFlight = this.flightPacks.find(
      (flightPack) => flightPack.id === departureActivityPackId
    );

    if (matchingFlight) {
      console.log('✅ Vuelo del departure encontrado:', matchingFlight);

      // Seleccionar el vuelo sin emitir cambios (es interno)
      this.isInternalSelection = true;
      this.selectedFlight = matchingFlight;

      // Calcular precio
      const basePrice =
        matchingFlight.ageGroupPrices.find(
          (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
        )?.price || 0;

      this.flightSelectionChange.emit({
        selectedFlight: matchingFlight,
        totalPrice: basePrice,
      });

      console.log('✅ Vuelo del departure seleccionado automáticamente');
    } else {
      console.log(
        '⚠️ No se encontró vuelo que coincida con el departure ID:',
        departureActivityPackId
      );
      console.log(
        '📋 IDs de vuelos disponibles:',
        this.flightPacks.map((f) => f.id)
      );
    }
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
    if (!this.reservationId) {
      return {
        hasExistingFlights: false,
        flightIds: [],
        message: 'No hay reservationId disponible',
      };
    }

    try {
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => resolve(travelers),
              error: (error) => reject(error),
            });
        }
      );

      if (travelers.length === 0) {
        return {
          hasExistingFlights: false,
          flightIds: [],
          message: 'No hay viajeros para verificar',
        };
      }

      const firstTraveler = travelers[0];
      const existingAssignments = await new Promise<
        IReservationTravelerActivityPackResponse[]
      >((resolve, reject) => {
        this.reservationTravelerActivityPackService
          .getByReservationTraveler(firstTraveler.id)
          .subscribe({
            next: (assignments) => resolve(assignments),
            error: (error) => reject(error),
          });
      });

      const flightAssignments = existingAssignments.filter(
        (a) => a.activityPackId > 0
      );
      const flightIds = flightAssignments.map((a) => a.activityPackId);

      return {
        hasExistingFlights: flightIds.length > 0,
        flightIds: flightIds,
        message:
          flightIds.length > 0
            ? `Se encontraron ${
                flightIds.length
              } vuelo(s) existente(s): ${flightIds.join(', ')}`
            : 'No se encontraron vuelos existentes',
      };
    } catch (error) {
      console.error('💥 Error al verificar vuelos existentes:', error);
      return {
        hasExistingFlights: false,
        flightIds: [],
        message: `Error al verificar: ${error}`,
      };
    }
  }

  // ✅ MÉTODO NUEVO: Forzar actualización de datos del departure
  async forceUpdateDepartureData(): Promise<void> {
    console.log('🔄 forceUpdateDepartureData iniciado');
    console.log('📦 departureActivityPackId:', this.departureActivityPackId);
    console.log('🆔 reservationId:', this.reservationId);

    if (!this.departureActivityPackId || !this.reservationId) {
      console.log(
        '⚠️ No se puede forzar actualización - faltan datos necesarios'
      );
      return;
    }

    try {
      // 1. Cargar asignaciones existentes
      await this.loadExistingFlightAssignments();

      // 2. Seleccionar vuelo del departure si existe
      if (this.flightPacks && this.flightPacks.length > 0) {
        this.selectFlightFromDeparture(this.departureActivityPackId);
      }

      // 3. Cargar vuelo existente de la BD
      if (this.flightPacks && this.flightPacks.length > 0) {
        await this.loadAndSelectExistingFlight();
      }

      console.log('✅ Actualización forzada del departure completada');
    } catch (error) {
      console.error('💥 Error en forceUpdateDepartureData:', error);
    }
  }

  // ✅ MÉTODO NUEVO: Deseleccionar vuelo del departure sin guardar en BD (para sincronización con specific-search)
  deselectDepartureFlightWithoutSaving(): void {
    console.log('🔄 deselectDepartureFlightWithoutSaving llamado');
    console.log('📦 departureActivityPackId:', this.departureActivityPackId);
    console.log('🔄 selectedFlight actual:', this.selectedFlight);
    
    if (this.selectedFlight && this.selectedFlight.id === this.departureActivityPackId) {
      console.log('✅ Deseleccionando vuelo del departure sin guardar en BD');
      
      // Marcar como selección interna para evitar guardar automáticamente
      this.isInternalSelection = true;
      
      // Deseleccionar el vuelo
      this.selectedFlight = null;
      
      // Emitir el cambio
      this.flightSelectionChange.emit({ selectedFlight: null, totalPrice: 0 });
      
      console.log('✅ Vuelo del departure deseleccionado, opción "Sin Vuelos" visible pero no seleccionada');
    } else {
      console.log('ℹ️ No hay vuelo del departure seleccionado para deseleccionar');
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

  selectFlight(flightPack: IFlightPackDTO): void {
    console.log('🎯 selectFlight llamado');
    console.log('📦 flightPack:', flightPack);
    console.log('🔄 selectedFlight actual:', this.selectedFlight);
    console.log('🕐 Timestamp:', new Date().toISOString());

    if (this.selectedFlight === flightPack) {
      // Deseleccionar vuelo
      console.log('🔄 Deseleccionando vuelo actual');
      this.selectedFlight = null;

      // Emitir "Sin Vuelos" con precio 0
      this.flightSelectionChange.emit({ selectedFlight: null, totalPrice: 0 });

      // Guardar estado "sin vuelo" para todos los viajeros
      console.log('💾 Guardando estado "sin vuelo" para todos los viajeros...');
      this.saveFlightAssignmentsForAllTravelers(0, true); // 0 = sin vuelos, true = deseleccionar specific-search
    } else {
      // Seleccionar nuevo vuelo
      console.log('✅ Seleccionando nuevo vuelo');
      this.selectedFlight = flightPack;
      
      const basePrice =
        flightPack.ageGroupPrices.find(
          (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
        )?.price || 0;

      console.log('💰 Precio base:', basePrice);
      console.log('👥 Total de viajeros:', this.travelers.length);

      // Emitir eventos
      this.defaultFlightSelected.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
      });

      this.flightSelectionChange.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
      });

      // Guardar asignaciones del vuelo seleccionado para todos los viajeros
      console.log('💾 Guardando asignaciones del vuelo seleccionado...');
      this.saveFlightAssignmentsForAllTravelers(flightPack.id, true); // flightPack.id, true = deseleccionar specific-search
    }
  }

  // ✅ MÉTODO NUEVO: Obtener texto del vuelo seleccionado para el summary
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
    console.log('🔍 saveFlightAssignmentsForAllTravelers llamado');
    console.log('🎯 targetFlightPackId:', targetFlightPackId);
    console.log('🆔 reservationId:', this.reservationId);
    console.log('🔄 shouldUnselectSpecificSearch:', shouldUnselectSpecificSearch);

    if (!this.reservationId) {
      console.log('❌ No se puede guardar - reservationId faltante');
      return false;
    }

    // ✅ CORRECCIÓN: Si targetFlightPackId es 0, buscar automáticamente el flightPack "sin vuelos"
    let finalFlightPackId = targetFlightPackId;
    if (targetFlightPackId === 0) {
      console.log('🔍 Buscando automáticamente flightPack "sin vuelos"...');
      const noFlightPack = this.flightPacks?.find((pack) => {
        const name = pack.name?.toLowerCase() || '';
        const description = pack.description?.toLowerCase() || '';
        return (
          name.includes('sin vuelos') ||
          description.includes('sin vuelos') ||
          name.includes('pack sin vuelos') ||
          description.includes('pack sin vuelos')
        );
      });

      if (noFlightPack) {
        finalFlightPackId = noFlightPack.id;
        console.log('✅ FlightPack "sin vuelos" encontrado automáticamente:', finalFlightPackId);
      } else {
        console.log('⚠️ No se encontró flightPack "sin vuelos", usando 0 como fallback');
        finalFlightPackId = 0;
      }
    }

    try {
      // 1. Obtener todos los viajeros de la reserva
      console.log('👥 Obteniendo viajeros...');
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => {
                console.log('✅ Viajeros obtenidos:', travelers);
                resolve(travelers);
              },
              error: (error) => {
                console.error('❌ Error al obtener viajeros:', error);
                reject(error);
              },
            });
        }
      );

      if (travelers.length === 0) {
        console.log('⚠️ No hay viajeros para asignar');
        return true;
      }

      // 2. Para cada viajero, buscar y actualizar/crear asignaciones
      const updatePromises = travelers.map((traveler) => {
        return new Promise<boolean>((resolve, reject) => {
          this.reservationTravelerActivityPackService
            .getByReservationTraveler(traveler.id)
            .subscribe({
              next: (assignments) => {
                // Filtrar por flightPacks (activityPackId > 0)
                const flightPackAssignments = assignments.filter(
                  (a) => a.activityPackId > 0
                );

                if (flightPackAssignments.length > 0) {
                  // Actualizar la asignación más reciente
                  const mostRecentAssignment = flightPackAssignments.sort(
                    (a, b) => b.id - a.id
                  )[0];

                  console.log(
                    `🔄 Actualizando asignación ${mostRecentAssignment.id} para viajero ${traveler.id}`
                  );
                  console.log(
                    `🔄 Cambio: ${mostRecentAssignment.activityPackId} -> ${finalFlightPackId}`
                  );

                  const updateData = {
                    id: mostRecentAssignment.id,
                    reservationTravelerId: traveler.id,
                    activityPackId: finalFlightPackId,
                    updatedAt: new Date().toISOString(),
                  };

                  this.reservationTravelerActivityPackService
                    .update(mostRecentAssignment.id, updateData)
                    .subscribe({
                      next: (updated) => {
                        if (updated) {
                          console.log(
                            `✅ Asignación actualizada para viajero ${traveler.id}`
                          );
                          resolve(true);
                        } else {
                          console.error(
                            `❌ Error al actualizar asignación para viajero ${traveler.id}`
                          );
                          resolve(false);
                        }
                      },
                      error: (error) => {
                        console.error(
                          `❌ Error al actualizar asignación para viajero ${traveler.id}:`,
                          error
                        );
                        reject(error);
                      },
                    });
                } else {
                  // Crear nueva asignación si no existe
                  console.log(
                    `➕ Creando nueva asignación para viajero ${traveler.id}`
                  );

                  const newAssignment = {
                    id: 0,
                    reservationTravelerId: traveler.id,
                    activityPackId: finalFlightPackId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };

                  this.reservationTravelerActivityPackService
                    .create(newAssignment)
                    .subscribe({
                      next: (created) => {
                        if (created) {
                          console.log(
                            `✅ Nueva asignación creada para viajero ${traveler.id}`
                          );
                          resolve(true);
                        } else {
                          console.error(
                            `❌ Error al crear asignación para viajero ${traveler.id}`
                          );
                          resolve(false);
                        }
                      },
                      error: (error) => {
                        console.error(
                          `❌ Error al crear asignación para viajero ${traveler.id}:`,
                          error
                        );
                        reject(error);
                      },
                    });
                }
              },
              error: (error) => {
                console.error(
                  `❌ Error al obtener asignaciones para viajero ${traveler.id}:`,
                  error
                );
                reject(error);
              },
            });
        });
      });

      // 3. Esperar a que se completen todas las actualizaciones
      await Promise.all(updatePromises);
      console.log('✅ Todas las asignaciones procesadas exitosamente');

      // 4. Deseleccionar vuelos de specific-search si es necesario
      if (shouldUnselectSpecificSearch && this.reservationId) {
        console.log('🔄 Deseleccionando vuelos de specific-search...');
        this.flightSearchService.unselectAllFlights(this.reservationId).subscribe({
          next: () => {
            console.log('✅ Vuelos de specific-search deseleccionados exitosamente');
          },
          error: (error) => {
            console.error('❌ Error al deseleccionar vuelos de specific-search:', error);
          },
        });
      }

      return true;
    } catch (error) {
      console.error('💥 Error en saveFlightAssignmentsForAllTravelers:', error);
      return false;
    }
  }

  async saveFlightAssignments(): Promise<boolean> {
    // Incrementar contador estático
    DefaultFlightsComponent.saveFlightAssignmentsCallCount++;

    console.log('🔍 saveFlightAssignments llamado');
    console.log(
      '🔢 Número de llamada:',
      DefaultFlightsComponent.saveFlightAssignmentsCallCount
    );
    console.log('📊 selectedFlight:', this.selectedFlight);
    console.log('🆔 reservationId:', this.reservationId);
    console.log('📦 departureActivityPackId:', this.departureActivityPackId);
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('📍 Stack trace:', new Error().stack);

    if (!this.selectedFlight || !this.reservationId) {
      console.log(
        '❌ No se puede guardar - selectedFlight o reservationId faltan'
      );
      return true;
    }

    try {
      console.log('👥 Obteniendo viajeros...');
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => {
                console.log('✅ Viajeros obtenidos:', travelers);
                console.log('👥 Cantidad de viajeros:', travelers.length);
                resolve(travelers);
              },
              error: (error) => {
                console.error('❌ Error al obtener viajeros:', error);
                reject(error);
              },
            });
        }
      );

      if (travelers.length === 0) {
        console.log('⚠️ No hay viajeros para asignar');
        return true;
      }

      // ✅ MODIFICADO: Solo actualizar registros del departure existentes, NUNCA crear nuevos
      if (!this.selectedFlight) {
        console.log(
          '🔄 No hay vuelo seleccionado, actualizando registros del departure con activityPackId = 0...'
        );

        const updatePromises = travelers.map((traveler) => {
          return new Promise<boolean>((resolve, reject) => {
            this.reservationTravelerActivityPackService
              .getByReservationTraveler(traveler.id)
              .subscribe({
                next: (assignments) => {
                  // ✅ SOLO buscar asignaciones del departure (por departureActivityPackId)
                  const departureAssignments = assignments.filter(
                    (a) => a.activityPackId === this.departureActivityPackId
                  );

                  if (departureAssignments.length === 0) {
                    console.log(
                      `ℹ️ Viajero ${traveler.id} no tiene asignaciones del departure para actualizar`
                    );
                    resolve(true);
                    return;
                  }

                  // Ordenar por ID descendente para obtener el más reciente
                  const sortedAssignments = departureAssignments.sort(
                    (a, b) => b.id - a.id
                  );
                  const mostRecentAssignment = sortedAssignments[0];

                  console.log(
                    `🔄 Actualizando asignación del departure ${mostRecentAssignment.id} para viajero ${traveler.id}`
                  );
                  console.log(
                    `🔄 Cambio: departure ${mostRecentAssignment.activityPackId} -> sin vuelo (0)`
                  );

                  const updateData = {
                    id: mostRecentAssignment.id,
                    reservationTravelerId: traveler.id,
                    activityPackId: 0, // 0 significa sin vuelo
                    updatedAt: new Date().toISOString(),
                  };

                  this.reservationTravelerActivityPackService
                    .update(mostRecentAssignment.id, updateData)
                    .subscribe({
                      next: (updated: boolean) => {
                        if (updated) {
                          console.log(
                            `✅ Asignación del departure ${mostRecentAssignment.id} actualizada para viajero ${traveler.id} (sin vuelo)`
                          );
                        } else {
                          console.error(
                            `❌ Error al actualizar asignación del departure ${mostRecentAssignment.id} para viajero ${traveler.id}`
                          );
                        }
                        resolve(updated);
                      },
                      error: (error: any) => {
                        console.error(
                          `❌ Error al actualizar asignación del departure para viajero ${traveler.id}:`,
                          error
                        );
                        reject(error);
                      },
                    });
                },
                error: (error: any) => {
                  console.error(
                    `❌ Error al obtener asignaciones para viajero ${traveler.id}:`,
                    error
                  );
                  reject(error);
                },
              });
          });
        });

        await Promise.all(updatePromises);
        console.log(
          '✅ Todas las asignaciones del departure actualizadas exitosamente (sin vuelo)'
        );
        return true;
      }

      const activityPackId = this.selectedFlight.id;
      console.log('🎯 ID del paquete de actividad a asignar:', activityPackId);

      console.log(
        '📝 Procesando asignaciones del departure para',
        travelers.length,
        'viajeros...'
      );

      // ✅ MODIFICADO: SOLO actualizar registros existentes del departure, NUNCA crear nuevos
      console.log('🔍 Verificando asignaciones existentes del departure...');
      const existingAssignmentsPromises = travelers.map((traveler) => {
        return new Promise<{
          traveler: IReservationTravelerResponse;
          existingAssignments: IReservationTravelerActivityPackResponse[];
        }>((resolve, reject) => {
          this.reservationTravelerActivityPackService
            .getByReservationTraveler(traveler.id)
            .subscribe({
              next: (assignments) => {
                // ✅ SOLO buscar asignaciones del departure
                const departureAssignments = assignments.filter(
                  (a) => a.activityPackId === this.departureActivityPackId
                );

                // Ordenar por ID descendente para obtener el más reciente
                const sortedAssignments = departureAssignments.sort(
                  (a, b) => b.id - a.id
                );

                console.log(
                  `🔍 Viajero ${traveler.id}: ${departureAssignments.length} asignaciones del departure encontradas`
                );
                console.log(
                  `🔍 IDs de asignaciones del departure: ${departureAssignments
                    .map((a) => a.id)
                    .join(', ')}`
                );

                resolve({
                  traveler,
                  existingAssignments: sortedAssignments,
                });
              },
              error: (error) => {
                console.error(
                  `❌ Error al obtener asignaciones para viajero ${traveler.id}:`,
                  error
                );
                reject(error);
              },
            });
        });
      });

      const existingAssignmentsResults = await Promise.all(
        existingAssignmentsPromises
      );

      // ✅ MODIFICADO: SOLO actualizar registros existentes, NUNCA crear nuevos
      const hasExistingDepartureAssignments = existingAssignmentsResults.some(
        (result) => result.existingAssignments.length > 0
      );

      if (hasExistingDepartureAssignments) {
        console.log(
          '🔄 Se encontraron asignaciones del departure existentes, actualizando el más reciente...'
        );

        const updatePromises = existingAssignmentsResults.map((result) => {
          return new Promise<boolean>((resolve, reject) => {
            const { traveler, existingAssignments } = result;

            if (existingAssignments.length > 0) {
              // Siempre usar la primera asignación (la más reciente por ID)
              const mostRecentAssignment = existingAssignments[0];
              console.log(
                `🔄 Actualizando asignación del departure más reciente ${mostRecentAssignment.id} para viajero ${traveler.id}`
              );
              console.log(
                `🔄 ID anterior: ${mostRecentAssignment.activityPackId} -> Nuevo ID: ${activityPackId}`
              );

              const updateData = {
                id: mostRecentAssignment.id,
                reservationTravelerId: traveler.id,
                activityPackId: activityPackId,
                updatedAt: new Date().toISOString(),
              };

              this.reservationTravelerActivityPackService
                .update(mostRecentAssignment.id, updateData)
                .subscribe({
                  next: (updated: boolean) => {
                    if (updated) {
                      console.log(
                        `✅ Asignación del departure ${mostRecentAssignment.id} actualizada para viajero ${traveler.id}`
                      );
                      console.log(
                        `✅ Cambio: departure ${mostRecentAssignment.activityPackId} -> vuelo ${activityPackId}`
                      );
                    } else {
                      console.error(
                        `❌ Error al actualizar asignación del departure ${mostRecentAssignment.id} para viajero ${traveler.id}`
                      );
                    }
                    resolve(updated);
                  },
                  error: (error: any) => {
                    console.error(
                      `❌ Error al actualizar asignación del departure para viajero ${traveler.id}:`,
                      error
                    );
                    reject(error);
                  },
                });
            } else {
              // ✅ MODIFICADO: NO crear nuevas asignaciones, solo log
              console.log(
                `⚠️ Viajero ${traveler.id} no tiene asignaciones del departure existentes. NO se creará nueva asignación.`
              );
              resolve(true); // Resolver como éxito sin crear nada
            }
          });
        });

              await Promise.all(updatePromises);
      console.log(
        '✅ Todas las asignaciones del departure actualizadas exitosamente'
      );
      
      // ✅ NUEVO: Deseleccionar todos los vuelos en specific-search después de guardar
      if (this.reservationId) {
        this.flightSearchService.unselectAllFlights(this.reservationId).subscribe({
          next: () => {
            console.log('✅ Vuelos de specific-search deseleccionados exitosamente después de guardar');
          },
          error: (error) => {
            console.error('❌ Error al deseleccionar vuelos de specific-search después de guardar:', error);
          }
        });
      }
    } else {
      // ✅ MODIFICADO: NO crear nuevas asignaciones si no existen
      console.log(
        '⚠️ No se encontraron asignaciones del departure existentes. NO se crearán nuevas asignaciones.'
      );
      console.log(
        'ℹ️ Las asignaciones deben existir previamente en la BD para ser actualizadas.'
      );
    }

      // ✅ MODIFICADO: Verificar solo las asignaciones del departure
      console.log(
        '🔍 Verificando estado final de asignaciones del departure...'
      );
      for (const traveler of travelers) {
        this.reservationTravelerActivityPackService
          .getByReservationTraveler(traveler.id)
          .subscribe({
            next: (finalAssignments) => {
              // ✅ SOLO verificar asignaciones del departure
              const departureAssignments = finalAssignments.filter(
                (a) => a.activityPackId === this.selectedFlight!.id
              );

              console.log(
                `🔍 Estado final del departure para viajero ${traveler.id}:`,
                departureAssignments
              );
              console.log(
                `🔍 Cantidad final de asignaciones del departure:`,
                departureAssignments.length
              );

              if (departureAssignments.length === 1) {
                console.log(
                  `✅ Estado final correcto para viajero ${
                    traveler.id
                  }: 1 asignación del departure para vuelo ${
                    this.selectedFlight!.id
                  }`
                );
              } else if (departureAssignments.length > 1) {
                console.log(
                  `⚠️ Estado final inesperado para viajero ${traveler.id}: ${
                    departureAssignments.length
                  } asignaciones del departure para vuelo ${
                    this.selectedFlight!.id
                  }`
                );
              } else {
                console.warn(
                  `⚠️ Estado final inesperado para viajero ${
                    traveler.id
                  }: 0 asignaciones del departure para vuelo ${
                    this.selectedFlight!.id
                  }`
                );
              }
            },
            error: (error) => {
              console.error(
                `❌ Error al verificar estado final del departure para viajero ${traveler.id}:`,
                error
              );
            },
          });
      }

      return true;
    } catch (error) {
      console.error('💥 Error en saveFlightAssignments:', error);
      return false;
    }
  }

  private async loadExistingFlightAssignments(): Promise<void> {
    console.log('🔄 loadExistingFlightAssignments iniciado');
    console.log('🆔 reservationId:', this.reservationId);
    console.log('📦 departureActivityPackId:', this.departureActivityPackId);

    if (!this.reservationId) {
      console.log(
        '❌ No se puede cargar asignaciones - reservationId faltante'
      );
      return;
    }

    try {
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => {
                console.log(
                  '✅ Viajeros obtenidos para carga de asignaciones:',
                  travelers
                );
                resolve(travelers);
              },
              error: (error) => {
                console.error(
                  '❌ Error al obtener viajeros para carga de asignaciones:',
                  error
                );
                reject(error);
              },
            });
        }
      );

      if (travelers.length === 0) {
        console.log('⚠️ No hay viajeros para cargar asignaciones');
        return;
      }

      // ✅ MODIFICADO: Usar departureActivityPackId en lugar de selectedFlightFromParent?.id
      const activityPackId = this.departureActivityPackId;
      if (!activityPackId || activityPackId <= 0) {
        console.log(
          '❌ No se puede cargar asignaciones - departureActivityPackId faltante o inválido'
        );
        return;
      }

      console.log('🎯 ID del paquete de actividad a cargar:', activityPackId);

      const updatePromises = travelers.map((traveler) => {
        return new Promise<boolean>((resolve, reject) => {
          this.reservationTravelerActivityPackService
            .getByReservationTraveler(traveler.id)
            .subscribe({
              next: (assignments) => {
                // ✅ MODIFICADO: Buscar asignaciones del departure específico
                const departureAssignments = assignments.filter(
                  (a) => a.activityPackId === activityPackId
                );

                if (departureAssignments.length > 0) {
                  const mostRecentAssignment = departureAssignments.sort(
                    (a, b) => b.id - a.id
                  )[0];
                  console.log(
                    `🔄 Asignación del departure ${mostRecentAssignment.id} para viajero ${traveler.id} encontrada y actualizada`
                  );
                  console.log(
                    `🔄 Cambio: departure ${mostRecentAssignment.activityPackId} -> vuelo ${activityPackId}`
                  );

                  const updateData = {
                    id: mostRecentAssignment.id,
                    reservationTravelerId: traveler.id,
                    activityPackId: activityPackId,
                    updatedAt: new Date().toISOString(),
                  };

                  this.reservationTravelerActivityPackService
                    .update(mostRecentAssignment.id, updateData)
                    .subscribe({
                      next: (updated: boolean) => {
                        if (updated) {
                          console.log(
                            `✅ Asignación del departure ${mostRecentAssignment.id} actualizada para viajero ${traveler.id}`
                          );
                        } else {
                          console.error(
                            `❌ Error al actualizar asignación del departure ${mostRecentAssignment.id} para viajero ${traveler.id}`
                          );
                        }
                        resolve(updated);
                      },
                      error: (error: any) => {
                        console.error(
                          `❌ Error al actualizar asignación del departure para viajero ${traveler.id}:`,
                          error
                        );
                        reject(error);
                      },
                    });
                } else {
                  console.log(
                    `ℹ️ No hay asignaciones del departure para viajero ${traveler.id}. No se creará una nueva asignación automáticamente.`
                  );
                  // No creamos asignaciones automáticamente durante la carga
                  // Solo resolvemos como true para continuar el proceso
                  resolve(true);
                }
              },
              error: (error: any) => {
                console.error(
                  `❌ Error al obtener asignaciones para viajero ${traveler.id}:`,
                  error
                );
                reject(error);
              },
            });
        });
      });

      await Promise.all(updatePromises);
      console.log(
        '✅ Todas las asignaciones del departure cargadas exitosamente'
      );
    } catch (error) {
      console.error('💥 Error en loadExistingFlightAssignments:', error);
    }
  }

  private async clearExistingFlightAssignments(
    travelers: IReservationTravelerResponse[]
  ): Promise<void> {
    console.log('🧹 clearExistingFlightAssignments iniciado');
    console.log('🎯 ID del vuelo seleccionado:', this.selectedFlight?.id);
    console.log('📦 ID del departure:', this.departureActivityPackId);
    console.log('👥 Cantidad de viajeros a procesar:', travelers.length);

    const clearPromises = travelers.map((traveler) => {
      return new Promise<void>((resolve, reject) => {
        console.log(
          `🧹 Procesando limpieza del departure para viajero ${traveler.id} (Viajero #${traveler.travelerNumber})`
        );

        this.reservationTravelerActivityPackService
          .getByReservationTraveler(traveler.id)
          .subscribe({
            next: (
              existingAssignments: IReservationTravelerActivityPackResponse[]
            ) => {
              console.log(
                `🧹 Asignaciones existentes para viajero ${traveler.id}:`,
                existingAssignments
              );
              console.log(
                `🧹 Cantidad de asignaciones existentes:`,
                existingAssignments.length
              );

              // ✅ MODIFICADO: Solo filtrar asignaciones del departure
              const departureAssignments = existingAssignments.filter(
                (assignment) =>
                  assignment.activityPackId === this.departureActivityPackId
              );

              // Filtrar asignaciones que NO son del departure actual
              const otherDepartureAssignments = departureAssignments.filter(
                (assignment) => {
                  const isCurrentDeparture =
                    assignment.activityPackId === this.departureActivityPackId;
                  console.log(
                    `🧹 Evaluando asignación del departure ${assignment.id}: activityPackId=${assignment.activityPackId}, departure actual=${this.departureActivityPackId}, es del departure actual=${isCurrentDeparture}`
                  );
                  // No eliminar asignaciones del departure actual, solo las de otros departures
                  return !isCurrentDeparture;
                }
              );

              console.log(
                `🧹 Asignaciones del departure totales:`,
                departureAssignments
              );
              console.log(
                `🧹 ID del departure actual:`,
                this.departureActivityPackId
              );
              console.log(
                `🧹 Asignaciones a eliminar (diferentes del departure actual):`,
                otherDepartureAssignments
              );
              console.log(
                `🧹 Cantidad de asignaciones a eliminar:`,
                otherDepartureAssignments.length
              );

              // Verificar si hay asignaciones para el departure actual
              const currentDepartureAssignments = departureAssignments.filter(
                (assignment) =>
                  assignment.activityPackId === this.departureActivityPackId
              );
              if (currentDepartureAssignments.length > 0) {
                console.log(
                  `ℹ️ Viajero ${traveler.id} tiene ${currentDepartureAssignments.length} asignaciones para el departure actual ${this.departureActivityPackId} (se mantendrán)`
                );
                console.log(
                  `ℹ️ Asignaciones del departure actual:`,
                  currentDepartureAssignments
                );
              }

              if (otherDepartureAssignments.length === 0) {
                console.log(
                  `🧹 No hay asignaciones del departure a eliminar para viajero ${traveler.id}`
                );
                resolve();
                return;
              }

              const deletePromises = otherDepartureAssignments.map(
                (assignment: IReservationTravelerActivityPackResponse) => {
                  return new Promise<void>((resolveDelete, rejectDelete) => {
                    console.log(
                      `🗑️ Eliminando asignación del departure ${assignment.id} para viajero ${traveler.id}`
                    );

                    this.reservationTravelerActivityPackService
                      .delete(assignment.id)
                      .subscribe({
                        next: (deleted: boolean) => {
                          if (deleted) {
                            console.log(
                              `✅ Asignación del departure ${assignment.id} eliminada exitosamente para viajero ${traveler.id}`
                            );

                            // Verificar inmediatamente si se eliminó correctamente
                            this.reservationTravelerActivityPackService
                              .getByReservationTraveler(traveler.id)
                              .subscribe({
                                next: (verificationAssignments) => {
                                  const remainingAssignments =
                                    verificationAssignments.filter(
                                      (a) => a.id !== assignment.id
                                    );
                                  console.log(
                                    `🔍 Verificación después de eliminación del departure para viajero ${traveler.id}:`,
                                    remainingAssignments
                                  );
                                  console.log(
                                    `🔍 Cantidad de asignaciones del departure restantes:`,
                                    remainingAssignments.length
                                  );
                                },
                                error: (error) => {
                                  console.error(
                                    `❌ Error en verificación después de eliminación del departure para viajero ${traveler.id}:`,
                                    error
                                  );
                                },
                              });
                          } else {
                            console.log(
                              `⚠️ Asignación del departure ${assignment.id} no se pudo eliminar para viajero ${traveler.id}`
                            );
                          }
                          resolveDelete();
                        },
                        error: (error: any) => {
                          console.error(
                            `❌ Error al eliminar asignación del departure ${assignment.id} para viajero ${traveler.id}:`,
                            error
                          );
                          resolveDelete();
                        },
                      });
                  });
                }
              );

              Promise.all(deletePromises)
                .then(() => {
                  console.log(
                    `✅ Limpieza del departure completada para viajero ${traveler.id}`
                  );
                  resolve();
                })
                .catch((error) => {
                  console.error(
                    `❌ Error en limpieza del departure para viajero ${traveler.id}:`,
                    error
                  );
                  resolve();
                });
            },
            error: (error: any) => {
              console.error(
                `❌ Error al obtener asignaciones del departure para limpieza del viajero ${traveler.id}:`,
                error
              );
              resolve();
            },
          });
      });
    });

    console.log(
      '⏳ Esperando que se completen todas las limpiezas del departure...'
    );
    await Promise.all(clearPromises);
    console.log(
      '✅ Todas las limpiezas del departure completadas exitosamente'
    );
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
