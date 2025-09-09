import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  AfterViewInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { TourNetService } from '../../core/services/tourNet.service';
import { ReservationService } from '../../core/services/reservation/reservation.service';
import {
  DepartureService,
  IDepartureResponse,
} from '../../core/services/departure/departure.service';
import {
  DeparturePriceSupplementService,
  IDeparturePriceSupplementResponse,
} from '../../core/services/departure/departure-price-supplement.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../core/services/agegroup/age-group.service';
import { ReservationTravelerActivityService } from '../../core/services/reservation/reservation-traveler-activity.service';
import { ReservationTravelerActivityPackService } from '../../core/services/reservation/reservation-traveler-activity-pack.service';
import {
  ItineraryService,
  IItineraryResponse,
  ItineraryFilters,
} from '../../core/services/itinerary/itinerary.service';
import { SelectorRoomComponent } from './components/selector-room/selector-room.component';
import { SelectorTravelerComponent } from './components/selector-traveler/selector-traveler.component';
import { InsuranceComponent } from './components/insurance/insurance.component';
import { InfoTravelersComponent } from './components/info-travelers/info-travelers.component';
import { forkJoin } from 'rxjs';
import { PaymentsNetService } from './services/paymentsNet.service';
import { AuthenticateService } from '../../core/services/auth-service.service';
import { UsersNetService } from '../../core/services/usersNet.service';
import { IFlightPackDTO } from './services/flightsNet.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../core/services/reservation/reservation-traveler.service';
import { PriceCheckService } from './services/price-check.service';
import {
  IPriceCheckResponse,
  IJobStatusResponse,
} from './services/price-check.service';
import { environment } from '../../../environments/environment';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { ReservationStatusService } from '../../core/services/reservation/reservation-status.service';

@Component({
  selector: 'app-checkout-v2',
  standalone: false,
  templateUrl: './checkout-v2.component.html',
  styleUrl: './checkout-v2.component.scss',
})
export class CheckoutV2Component implements OnInit, OnDestroy, AfterViewInit {
  // Referencias a componentes hijos
  @ViewChild('roomSelector') roomSelector!: SelectorRoomComponent;
  @ViewChild('travelerSelector') travelerSelector!: SelectorTravelerComponent;
  @ViewChild('insuranceSelector') insuranceSelector!: InsuranceComponent;
  @ViewChild('infoTravelers') infoTravelers!: InfoTravelersComponent;
  @ViewChild('flightManagement') flightManagement!: any; // Referencia al componente de gestión de vuelos

  // Datos del tour
  tourName: string = '';
  departureDate: string = '';
  returnDate: string = '';
  departureId: number | null = null;
  reservationId: number | null = null;
  totalAmount: number = 0;
  loading: boolean = false;
  error: string | null = null;

  // Variables adicionales para mostrar información completa
  tourId: number | null = null;
  itineraryId: number | null = null; // Se obtiene del tour usando el servicio
  totalPassengers: number = 0;

  // Variable para datos del itinerario
  itineraryData: IItineraryResponse | null = null;
  departureData: IDepartureResponse | null = null; // Nuevo: para almacenar datos del departure

  // Variables para actividades
  selectedActivities: any[] = [];
  activitiesTotalPrice: number = 0;

  // Variables para actividades por viajero
  travelerActivities: {
    [travelerId: number]: { [activityId: number]: boolean };
  } = {};
  activitiesByTraveler: {
    [activityId: number]: { count: number; price: number; name: string };
  } = {};

  // Variables para el resumen del pedido
  summary: Array<{
    qty: number;
    value: number;
    description: string;
  }> = [];
  subtotal: number = 0;
  totalAmountCalculated: number = 0;

  // Datos de precios por grupo de edad
  departurePriceSupplements: IDeparturePriceSupplementResponse[] = [];
  ageGroups: IAgeGroupResponse[] = [];
  pricesByAgeGroup: { [ageGroupName: string]: number } = {};
  reservationData: any = null;

  // Propiedades para seguros
  selectedInsurance: any = null;
  insurancePrice: number = 0;

  // Propiedades para vuelos
  selectedFlight: IFlightPackDTO | null = null;
  flightPrice: number = 0;
  hasAvailableFlights: boolean = false; // Nueva propiedad para controlar la visibilidad del botón
  availableFlights: IFlightPackDTO[] = []; // Nueva propiedad para almacenar los vuelos disponibles
  departureActivityPackId: number | null = null; // ✅ NUEVO: ID del paquete de actividad del departure

  // Steps configuration
  items: MenuItem[] = [];
  activeIndex: number = 0;

  // Tour slug para navegación
  tourSlug: string = '';

  // Propiedades para autenticación
  loginDialogVisible: boolean = false;

  // Propiedades para monitoreo de jobs de sincronización
  currentJobId: string | null = null;
  jobMonitoringSubscription: Subscription | null = null;
  isSyncInProgress: boolean = false;
  isAuthenticated: boolean = false;

  // ✅ NUEVO: Propiedades para controlar el estado de carga del botón "Sin Vuelos"
  isFlightlessProcessing: boolean = false;
  flightlessProcessingMessage: string = '';

  // Propiedades para controlar la verificación de precios
  priceCheckExecuted: boolean = false;
  lastPriceCheckParams: {
    retailerID: number;
    departureID: number;
    numPasajeros: number;
  } | null = null;

  // ✅ NUEVO: Propiedad para detectar modo standalone
  isStandaloneMode: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tourNetService: TourNetService,
    private reservationService: ReservationService,
    private departureService: DepartureService,
    private departurePriceSupplementService: DeparturePriceSupplementService,
    private ageGroupService: AgeGroupService,
    private reservationTravelerActivityService: ReservationTravelerActivityService,
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private itineraryService: ItineraryService,
    private messageService: MessageService,
    private paymentsService: PaymentsNetService,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService,
    private reservationTravelerService: ReservationTravelerService,
    private cdr: ChangeDetectorRef,
    private priceCheckService: PriceCheckService,
    private reservationStatusService: ReservationStatusService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    console.log('🔄 CheckoutV2Component ngOnInit iniciado');

    // ✅ NUEVO: Detectar si estamos en modo standalone
    this.detectStandaloneMode();

    // Configurar los steps
    this.initializeSteps();

    // Verificar estado de autenticación inicial (solo si NO es modo standalone)
    if (!this.isStandaloneMode) {
      console.log('🔒 Modo normal - verificando autenticación');
      this.authService.isLoggedIn().subscribe((isLoggedIn) => {
        this.isAuthenticated = isLoggedIn;
        console.log('🔍 Estado de autenticación:', isLoggedIn);
      });
    } else {
      // En modo standalone, asumir que no necesitamos autenticación
      this.isAuthenticated = false;
      console.log(
        '🔓 Modo standalone detectado - omitiendo validación de autenticación'
      );
      console.log('🔓 isAuthenticated establecido a:', this.isAuthenticated);
      console.log('🔓 isStandaloneMode establecido a:', this.isStandaloneMode);
    }

    // Leer step de URL si está presente (para redirección después del login)
    this.route.queryParams.subscribe((params) => {
      if (params['step']) {
        const stepParam = parseInt(params['step']);
        if (!isNaN(stepParam) && stepParam >= 0 && stepParam <= 3) {
          this.activeIndex = stepParam;
          console.log('📍 Step activo desde URL:', this.activeIndex);
        }
      }
    });

    // Obtener el reservationId de la URL
    this.route.paramMap.subscribe((params) => {
      const reservationIdParam = params.get('reservationId');
      if (reservationIdParam) {
        this.reservationId = +reservationIdParam;

        // ✅ NUEVO: Restaurar resumen desde localStorage antes de cargar datos
        this.restoreSummaryFromLocalStorage();

        // Cargar datos de la reservación desde el backend
        this.loadReservationData(this.reservationId);
        this.cleanScalapayPendingPayments();
      } else {
        this.error = 'No se proporcionó un ID de reservación válido';
      }
    });

    // La verificación de precios se ejecutará cuando se carguen los datos de la reservación
    // No se ejecuta aquí para evitar llamadas duplicadas
  }

  /**
   * ✅ NUEVO: Detectar si estamos en modo standalone basándose en la URL
   */
  private detectStandaloneMode(): void {
    // Verificar tanto la URL del router como la URL del navegador
    const routerUrl = this.router.url;
    const windowUrl = window.location.pathname;

    this.isStandaloneMode =
      routerUrl.includes('/standalone/') || windowUrl.includes('/standalone/');

    console.log('🔍 Router URL:', routerUrl);
    console.log('🔍 Window URL:', windowUrl);
    console.log('🔍 ¿Modo standalone?', this.isStandaloneMode);

    if (this.isStandaloneMode) {
      console.log(
        '🔓 Modo standalone activado - las validaciones de autenticación serán omitidas'
      );
    } else {
      console.log(
        '🔒 Modo normal - las validaciones de autenticación están activas'
      );
    }
  }

  ngAfterViewInit(): void {
    // Las referencias a los componentes hijos ya están disponibles
    console.log('✅ Componentes hijos inicializados:', {
      travelerSelector: !!this.travelerSelector,
      roomSelector: !!this.roomSelector,
      insuranceSelector: !!this.insuranceSelector,
      infoTravelers: !!this.infoTravelers,
    });

    // Si hay un step activo en la URL, inicializar el componente correspondiente
    if (this.activeIndex >= 0) {
      this.initializeComponentForStep(this.activeIndex);
    }
  }

  /**
   * Ejecuta la verificación de precios cuando se tienen los datos necesarios
   * Evita llamadas duplicadas verificando si ya se ejecutó con los mismos parámetros
   */
  private executePriceCheck(): void {
    // Verificar que tengamos los datos mínimos necesarios
    if (!this.departureId || !this.reservationId) {
      return;
    }

    // Usar el número de pasajeros de la reservación si no tenemos uno específico
    const numPasajeros = this.totalPassengers > 0 ? this.totalPassengers : 1;

    // Obtener el retailer ID del departure o usar el valor por defecto
    let retailerID = environment.retaileriddefault;

    // Si tenemos datos del departure, intentar obtener el retailer ID
    if (this.departureData && this.departureData.retailerId) {
      retailerID = this.departureData.retailerId;
    }

    // Crear parámetros actuales para comparar
    const currentParams = {
      retailerID,
      departureID: this.departureId!,
      numPasajeros,
    };

    // Verificar si ya se ejecutó con los mismos parámetros
    if (
      this.priceCheckExecuted &&
      this.lastPriceCheckParams &&
      JSON.stringify(this.lastPriceCheckParams) ===
        JSON.stringify(currentParams)
    ) {
      return;
    }

    // Actualizar parámetros de la última ejecución
    this.lastPriceCheckParams = currentParams;
    this.priceCheckExecuted = true;

    this.priceCheckService
      .checkPrices(retailerID, this.departureId!, numPasajeros)
      .subscribe({
        next: (response: IPriceCheckResponse) => {
          if (response.needsUpdate) {
            if (response.jobStatus === 'ENQUEUED' && response.jobId) {
              // Iniciar el monitoreo del job
              this.startJobMonitoring(response.jobId);

              // Mostrar mensaje al usuario sobre la actualización en curso
              this.messageService.add({
                severity: 'info',
                summary: 'Actualización de precios',
                detail:
                  'Los precios se están actualizando en segundo plano. Te notificaremos cuando termine.',
              });
            } else if (response.jobStatus === 'EXISTING') {
              this.messageService.add({
                severity: 'info',
                summary: 'Sincronización en curso',
                detail:
                  'Ya hay una actualización de precios en curso para este tour.',
              });
            }
          } else {
            // Los precios están actualizados
          }
        },
        error: (error) => {
          console.error('Error al verificar precios:', error);
          // No mostramos error al usuario ya que esto es una verificación en segundo plano
        },
      });
  }

  /**
   * Inicia el monitoreo de un job de Hangfire
   */
  private startJobMonitoring(jobId: string): void {
    this.currentJobId = jobId;
    this.isSyncInProgress = true;

    // Cancelar cualquier monitoreo anterior
    if (this.jobMonitoringSubscription) {
      this.jobMonitoringSubscription.unsubscribe();
    }

    // Verificar el estado del job cada 5 segundos
    this.jobMonitoringSubscription = interval(5000)
      .pipe(
        takeWhile(() => this.isSyncInProgress, true) // Incluir la última emisión cuando se complete
      )
      .subscribe(() => {
        if (this.currentJobId) {
          this.checkJobStatus(this.currentJobId);
        }
      });
  }

  /**
   * Verifica el estado de un job específico
   */
  private checkJobStatus(jobId: string): void {
    this.priceCheckService.checkJobStatus(jobId).subscribe({
      next: (jobStatus: IJobStatusResponse) => {
        // Estados de Hangfire: Enqueued, Processing, Succeeded, Failed, Deleted, Scheduled
        switch (jobStatus.state) {
          case 'Succeeded':
            this.onJobCompleted(true);
            break;
          case 'Failed':
          case 'Deleted':
            this.onJobCompleted(false);
            break;
          case 'Processing':
            // Job en proceso
            break;
          case 'Enqueued':
          case 'Scheduled':
            // Job en cola
            break;
          default:
            // Estado desconocido del job
            break;
        }
      },
      error: (error) => {
        console.error('Error al verificar estado del job:', error);
        // Si hay error al verificar el job, asumir que terminó (podría haberse eliminado)
        this.onJobCompleted(false);
      },
    });
  }

  /**
   * Se ejecuta cuando un job se completa (exitoso o fallido)
   */
  private onJobCompleted(wasSuccessful: boolean): void {
    this.isSyncInProgress = false;
    this.currentJobId = null;

    // Cancelar el monitoreo
    if (this.jobMonitoringSubscription) {
      this.jobMonitoringSubscription.unsubscribe();
      this.jobMonitoringSubscription = null;
    }

    if (wasSuccessful) {
      // Mostrar mensaje de éxito
      this.messageService.add({
        severity: 'success',
        summary: 'Sincronización completada',
        detail:
          'Los precios han sido actualizados correctamente. Recargando información...',
      });

      // Recargar todos los datos del componente
      this.reloadComponentData();
    } else {
      // Mostrar mensaje de error
      this.messageService.add({
        severity: 'warn',
        summary: 'Sincronización finalizada',
        detail:
          'La sincronización de precios ha finalizado. Puedes continuar con tu reserva.',
      });
    }
  }

  /**
   * Recarga todos los datos del componente
   */
  private reloadComponentData(): void {
    if (this.reservationId) {
      // Resetear el estado de verificación de precios para permitir nueva verificación
      this.resetPriceCheckState();

      // Recargar datos de la reservación
      this.loadReservationData(this.reservationId);

      // Forzar actualización de todos los componentes hijos
      setTimeout(() => {
        // Los componentes hijos se recargarán automáticamente cuando cambie departureId/reservationId
        // a través de sus métodos ngOnChanges

        // Recargar datos de habitaciones si está disponible
        if (this.roomSelector) {
          this.roomSelector.initializeComponent();
        }

        // Recargar datos de seguros si está disponible
        if (this.insuranceSelector) {
          this.insuranceSelector.loadInsurances();
        }

        // Forzar actualización del resumen
        this.forceSummaryUpdate();
      }, 1000);
    }
  }

  /**
   * Resetea el estado de verificación de precios (útil después de recargar datos)
   */
  private resetPriceCheckState(): void {
    this.priceCheckExecuted = false;
    this.lastPriceCheckParams = null;
  }

  /**
   * Se ejecuta cuando el componente se destruye
   */
  ngOnDestroy(): void {
    // Cancelar el monitoreo de jobs al destruir el componente
    if (this.jobMonitoringSubscription) {
      this.jobMonitoringSubscription.unsubscribe();
    }

    // ✅ NUEVO: Limpiar el resumen del localStorage al destruir el componente
    this.clearSummaryFromLocalStorage();
  }

  // Inicializar los pasos del checkout
  private initializeSteps(): void {
    this.items = [
      {
        label: 'Personalizar viaje',
        command: () => this.onActiveIndexChange(0),
      },
      {
        label: 'Vuelos',
        command: () => this.onActiveIndexChange(1),
      },
      {
        label: 'Viajeros',
        command: () => this.onActiveIndexChange(2),
      },
      {
        label: 'Pago',
        command: () => this.onActiveIndexChange(3),
      },
    ];
  }
  // Método para cargar datos de la reservación
  private loadReservationData(reservationId: number): void {
    this.loading = true;
    this.error = null;

    this.reservationService.getById(reservationId).subscribe({
      next: (reservation) => {
        // Extraer datos de la reservación
        this.departureId = reservation.departureId;
        this.totalAmount = reservation.totalAmount;
        this.tourId = reservation.tourId;
        this.totalPassengers = reservation.totalPassengers;
        this.reservationData = reservation; // Guardar datos completos de la reserva

        // Verificar si el userId está vacío y el usuario está logueado
        this.checkAndUpdateUserId(reservation);

        // Cargar datos del tour usando reservation.tourId
        this.loadTourData(reservation.tourId);

        // Cargar datos del departure usando reservation.departureId
        this.loadDepartureData(reservation.departureId);

        // Cargar precios del departure y ejecutar verificación de precios inmediatamente
        this.loadDeparturePrices(reservation.departureId);

        // Verificar si hay vuelos disponibles
        this.checkFlightsAvailability(reservation.departureId);

        // Ejecutar verificación de precios inmediatamente cuando tengamos los datos básicos
        this.executePriceCheck();

        // Si hay un step activo, inicializar el componente correspondiente
        if (this.activeIndex >= 0) {
          // Usar setTimeout para asegurar que los datos estén completamente cargados
          setTimeout(() => {
            this.initializeComponentForStep(this.activeIndex);
          }, 500);
        }
      },
      error: (error) => {
        this.error =
          'Error al cargar los datos de la reservación. Por favor, inténtalo de nuevo más tarde.';
        this.loading = false;
      },
    });
  }

  onActivitiesSelectionChange(activitiesData: {
    selectedActivities: any[];
    totalPrice: number;
  }): void {
    this.selectedActivities = activitiesData.selectedActivities;
    this.activitiesTotalPrice = activitiesData.totalPrice;

    if (
      this.travelerSelector &&
      Object.keys(this.pricesByAgeGroup).length > 0
    ) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    }
  }

  /**
   * 🔥 NUEVO: Maneja el evento de guardado completado desde actividades opcionales
   */
  onSaveCompleted(event: {
    component: string;
    success: boolean;
    error?: string;
  }): void {
    if (event.success) {
      console.log(`✅ Guardado exitoso en ${event.component}`);
      // El padre se encarga de obtener la información por su cuenta
      if (this.travelerSelector && this.travelerSelector.travelersNumbers) {
        this.updateOrderSummary(this.travelerSelector.travelersNumbers);
      }
    } else {
      console.error(`❌ Error en guardado de ${event.component}:`, event.error);
      // Mostrar error al usuario si es necesario
      this.showErrorToast(
        `Error al guardar ${event.component}: ${event.error}`
      );
    }
  }

  /**
   * 🔥 NUEVO: Muestra un toast de error
   */
  private showErrorToast(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000,
    });
  }

  /**
   * Maneja los cambios de asignación de actividades por viajero
   */
  onActivitiesAssignmentChange(event: {
    travelerId: number;
    activityId: number;
    isAssigned: boolean;
    activityName: string;
    activityPrice: number;
  }): void {
    // Inicializar el objeto para el viajero si no existe
    if (!this.travelerActivities[event.travelerId]) {
      this.travelerActivities[event.travelerId] = {};
    }

    // Actualizar el estado de la actividad para el viajero
    this.travelerActivities[event.travelerId][event.activityId] =
      event.isAssigned;

    // Actualizar el conteo de actividades por actividad
    this.updateActivitiesByTraveler(
      event.activityId,
      event.activityName,
      event.activityPrice
    );

    // Recalcular el resumen del pedido
    if (
      this.travelerSelector &&
      this.travelerSelector.travelersNumbers &&
      Object.keys(this.pricesByAgeGroup).length > 0
    ) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    } else {
      // Intentar recalcular solo las actividades si no tenemos travelerSelector
      this.updateActivitiesOnly();
    }

    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  /**
   * Actualiza el conteo de actividades por actividad
   */
  private updateActivitiesByTraveler(
    activityId: number,
    activityName: string,
    activityPrice: number
  ): void {
    // Contar cuántos viajeros tienen esta actividad asignada
    let count = 0;
    Object.values(this.travelerActivities).forEach((travelerActivities) => {
      if (travelerActivities[activityId]) {
        count++;
      }
    });

    // Actualizar o crear el registro de la actividad
    this.activitiesByTraveler[activityId] = {
      count: count,
      price: activityPrice,
      name: activityName,
    };
  }

  /**
   * Actualiza solo la sección de actividades en el resumen
   */
  private updateActivitiesOnly(): void {
    // Limpiar actividades existentes del summary
    this.summary = this.summary.filter(
      (item) =>
        !item.description ||
        !Object.values(this.activitiesByTraveler).some(
          (activity) => activity.name === item.description
        )
    );

    // Agregar actividades actualizadas
    Object.values(this.activitiesByTraveler).forEach((activityData) => {
      if (activityData.count > 0 && activityData.price > 0) {
        const summaryItem = {
          qty: activityData.count,
          value: activityData.price,
          description: `${activityData.name}`,
        };
        this.summary.push(summaryItem);
      } else {
      }
    });

    // Recalcular totales
    this.calculateTotals();

    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  // Método para cargar datos del tour y obtener el itinerario
  private loadTourData(tourId: number): void {
    this.tourNetService.getTourById(tourId).subscribe({
      next: (tour) => {
        this.tourName = tour.name || '';
        this.tourSlug = tour.slug || '';

        // Cargar itinerario basado en el tourId
        this.loadItineraryByTourId(tourId);

        this.loading = false;
      },
      error: (error) => {
        this.error =
          'Error al cargar los datos del tour. Por favor, inténtalo de nuevo más tarde.';
        this.loading = false;
      },
    });
  }

  /**
   * Cargar itinerario basado en el tourId
   */
  private loadItineraryByTourId(tourId: number): void {
    const filters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    this.itineraryService.getAll(filters).subscribe({
      next: (itineraries) => {
        if (itineraries && itineraries.length > 0) {
          // Tomar el primer itinerario que coincida con los filtros
          this.itineraryData = itineraries[0];
          this.itineraryId = this.itineraryData.id;
        } else {
          console.warn('No se encontraron itinerarios para el tourId:', tourId);
          this.itineraryId = null;
        }
      },
      error: (error) => {
        console.error('Error al cargar itinerario por tourId:', error);
        this.itineraryId = null;
      },
    });
  }

  // Método para cargar datos del departure - manteniendo como respaldo
  private loadDepartureData(departureId: number): void {
    this.departureService.getById(departureId).subscribe({
      next: (departure) => {
        this.departureDate = departure.departureDate ?? '';
        this.returnDate = departure.arrivalDate ?? '';
        this.departureData = departure; // Almacenar datos del departure

        // ✅ NUEVO: Obtener el departureActivityPackId desde el departure
        // Por ahora, vamos a usar un valor por defecto o buscar en la BD
        this.loadDepartureActivityPackId(departureId);

        // Solo asignar si no se ha obtenido desde el tour (como respaldo)
        if (!this.itineraryId && departure.itineraryId) {
          this.itineraryId = departure.itineraryId;
        }
      },
      error: (error) => {
        // Error al cargar los datos del departure - continuando sin fechas
      },
    });
  }

  // ✅ NUEVO: Método para cargar el departureActivityPackId
  private loadDepartureActivityPackId(departureId: number): void {
    // ✅ SIMPLIFICADO: No hacer nada especial, solo mantener el departureId como referencia
    this.departureActivityPackId = departureId;

    console.log(
      '🔄 departureActivityPackId cargado:',
      this.departureActivityPackId
    );

    // ✅ ELIMINADO: No forzar actualización del summary automáticamente
  }

  // Método para cargar precios del departure
  private loadDeparturePrices(departureId: number): void {
    this.departurePriceSupplementService.getByDeparture(departureId).subscribe({
      next: (supplements) => {
        this.departurePriceSupplements = supplements;
        this.loadAgeGroups();
      },
      error: (error) => {
        // Error al cargar price supplements
      },
    });
  }

  // Método para cargar grupos de edad
  private loadAgeGroups(): void {
    if (
      !this.departurePriceSupplements ||
      this.departurePriceSupplements.length === 0
    ) {
      return;
    }

    // Obtener IDs únicos de grupos de edad
    const uniqueAgeGroupIds = [
      ...new Set(this.departurePriceSupplements.map((s) => s.ageGroupId)),
    ];

    const ageGroupRequests = uniqueAgeGroupIds.map((id) =>
      this.ageGroupService.getById(id)
    );

    forkJoin(ageGroupRequests).subscribe({
      next: (ageGroups) => {
        this.ageGroups = ageGroups;
        this.mapPricesByAgeGroup();
      },
      error: (error) => {
        // Error al cargar grupos de edad
      },
    });
  }

  // OPTIMIZADO: Método para mapear precios por grupo de edad
  private mapPricesByAgeGroup(): void {
    this.pricesByAgeGroup = {};

    this.departurePriceSupplements.forEach((supplement) => {
      const ageGroup = this.ageGroups.find(
        (ag) => ag.id === supplement.ageGroupId
      );
      if (ageGroup) {
        const ageGroupName = this.normalizeAgeGroupName(ageGroup.name);
        this.pricesByAgeGroup[ageGroupName] = supplement.basePeriodPrice;
      }
    });

    // ✅ MEJORADO: Verificar si hay un resumen persistido en localStorage
    if (this.reservationId && this.summary.length === 0) {
      console.log(
        '🔄 Verificando si hay resumen persistido en localStorage...'
      );
      this.restoreSummaryFromLocalStorage();
    }

    // ✅ MEJORADO: Solo inicializar el resumen si no hay uno persistido
    if (this.summary.length === 0) {
      console.log(
        '🔄 No hay resumen persistido, inicializando resumen automáticamente...'
      );
      this.initializeOrderSummary();
    } else {
      console.log(
        '✅ Resumen restaurado desde localStorage, no se necesita inicialización'
      );
      // ✅ NUEVO: Recalcular totales del resumen restaurado
      this.calculateTotals();
      this.updateReservationTotalAmount();
    }

    // ✅ NUEVO: Forzar actualización adicional después de un delay para asegurar que los componentes estén listos
    setTimeout(() => {
      if (this.summary.length === 0) {
        console.log(
          '⚠️ Resumen aún vacío después del delay, forzando actualización...'
        );
        this.forceSummaryUpdate();
      } else {
        console.log(
          '✅ Resumen ya tiene contenido, no se necesita actualización forzada'
        );
      }
    }, 500);
  }

  // Método para inicializar el resumen automáticamente
  private initializeOrderSummary(): void {
    // ✅ SIMPLIFICADO: Solo verificar una vez cuando se cargan los precios
    this.checkAndInitializeSummary();

    // ✅ ELIMINADO: No llamar múltiples veces con delays que sobrescriben el summary
    // Solo verificar una vez más después de un delay si el summary está vacío
    setTimeout(() => {
      if (this.summary.length === 0) {
        console.log(
          '🔄 Summary vacío después del delay, verificando nuevamente...'
        );
        this.checkAndInitializeSummary();
      }
    }, 2000);
  }

  // Método para normalizar nombres de grupos de edad
  private normalizeAgeGroupName(ageGroupName: string): string {
    const name = ageGroupName.toLowerCase();

    if (name.includes('adult') || name.includes('adulto')) {
      return 'Adultos';
    } else if (
      name.includes('child') ||
      name.includes('niño') ||
      name.includes('menor')
    ) {
      return 'Niños';
    } else if (
      name.includes('baby') ||
      name.includes('bebé') ||
      name.includes('infant')
    ) {
      return 'Bebés';
    }

    return ageGroupName; // Devolver original si no se puede mapear
  }

  /**
   * Método llamado cuando cambian los números de viajeros en el selector de travelers
   * Este método actualiza el componente de habitaciones con los nuevos números
   */
  onTravelersNumbersChange(travelersNumbers: {
    adults: number;
    childs: number;
    babies: number;
  }): void {
    // Actualizar el total de pasajeros
    this.totalPassengers =
      travelersNumbers.adults +
      travelersNumbers.childs +
      travelersNumbers.babies;

    // Comunicar el cambio al componente de habitaciones
    if (this.roomSelector) {
      this.roomSelector.updateTravelersNumbers(travelersNumbers);
    }

    // Actualizar el resumen del pedido (solo si ya tenemos precios cargados)
    if (Object.keys(this.pricesByAgeGroup).length > 0) {
      this.updateOrderSummary(travelersNumbers);
    }
    // Ejecutar verificación de precios solo si el número de pasajeros cambió significativamente
    // (evita llamadas innecesarias por cambios menores)
    const newTotalPassengers =
      travelersNumbers.adults +
      travelersNumbers.childs +
      travelersNumbers.babies;
    if (newTotalPassengers !== this.totalPassengers && newTotalPassengers > 0) {
      this.executePriceCheck();
    }
  }

  /**
   * Método llamado cuando cambia el estado de guardado en el selector de travelers
   * @param event - Evento con información del estado de guardado
   */
  onTravelerSelectorSaveStatusChange(event: {
    saving: boolean;
    success?: boolean;
    error?: string;
  }): void {
    if (event.saving) {
      console.log('💾 Guardando información de viajeros...');
      // Aquí podrías mostrar un indicador de carga si es necesario
    } else if (event.success !== undefined) {
      if (event.success) {
        console.log('✅ Guardado exitoso de información de viajeros');
        // Aquí podrías mostrar un mensaje de éxito si es necesario
      } else {
        console.error(
          '❌ Error al guardar información de viajeros:',
          event.error
        );
        // Aquí podrías mostrar un mensaje de error si es necesario
      }
    }
  }

  /**
   * Método llamado cuando se completa un guardado exitoso en el selector de travelers
   * @param event - Evento con información del guardado completado
   */
  onTravelerSelectorSaveCompleted(event: {
    component: string;
    success: boolean;
    data?: any;
    error?: string;
  }): void {
    if (event.success) {
      console.log(`✅ Guardado exitoso en ${event.component}:`, event.data);
      // Actualizar resumen del pedido si es necesario
      if (this.travelerSelector && this.travelerSelector.travelersNumbers) {
        this.updateOrderSummary(this.travelerSelector.travelersNumbers);
      }
    } else {
      console.error(`❌ Error en guardado de ${event.component}:`, event.error);
      // Mostrar error al usuario si es necesario
    }
  }

  /**
   * OPTIMIZADO: Método llamado cuando cambian las habitaciones seleccionadas
   */
  onRoomsSelectionChange(selectedRooms: { [tkId: string]: number }): void {
    // NUEVO: Forzar actualización del summary cuando cambian las habitaciones
    this.forceSummaryUpdate();
  }

  /**
   * Método llamado cuando cambia la selección de seguro
   */
  onInsuranceSelectionChange(insuranceData: {
    selectedInsurance: any;
    price: number;
  }): void {
    this.selectedInsurance = insuranceData.selectedInsurance;
    this.insurancePrice = insuranceData.price;

    // Recalcular el resumen del pedido
    if (
      this.travelerSelector &&
      Object.keys(this.pricesByAgeGroup).length > 0
    ) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    } else {
      // Forzar actualización con datos básicos si no tenemos travelerSelector
      const basicTravelers = {
        adults: Math.max(1, this.totalPassengers),
        childs: 0,
        babies: 0,
      };
      this.updateOrderSummary(basicTravelers);
    }
  }

  /**
   * Método llamado cuando cambia la selección de vuelos
   */
  onFlightSelectionChange(flightData: {
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }): void {
    console.log(
      '🔄 checkout-v2: onFlightSelectionChange llamado con:',
      flightData
    );
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('📊 selectedFlight anterior:', this.selectedFlight);
    console.log('💰 flightPrice anterior:', this.flightPrice);

    this.selectedFlight = flightData.selectedFlight;
    this.flightPrice = flightData.totalPrice; // Ahora es el precio por persona

    console.log('✅ Vuelo seleccionado actualizado:', this.selectedFlight);
    console.log('💰 Precio del vuelo actualizado:', this.flightPrice);

    // ✅ MEJORADO: Verificar si es una opción "Sin Vuelos"
    if (this.selectedFlight && this.isNoFlightOption(this.selectedFlight)) {
      console.log('🚫 CASO ESPECIAL: "Sin Vuelos" seleccionado');
      console.log('🚫 selectedFlight es una opción sin vuelos');
      console.log('🚫 flightPrice es:', this.flightPrice);

      // ✅ NUEVO: Forzar precio 0 para opciones "Sin Vuelos"
      this.flightPrice = 0;
      console.log('🚫 Precio forzado a 0 para "Sin Vuelos"');
    }

    // ✅ MEJORADO: Verificar si no hay vuelo seleccionado
    if (!this.selectedFlight) {
      console.log('🚫 CASO ESPECIAL: No hay vuelo seleccionado');
      console.log('🚫 selectedFlight es null');
      console.log('🚫 flightPrice es:', this.flightPrice);

      // ✅ NUEVO: Forzar precio 0 cuando no hay vuelo
      this.flightPrice = 0;
      console.log('🚫 Precio forzado a 0 para estado sin vuelo');
    }

    // Determinar si hay vuelos disponibles
    this.hasAvailableFlights = this.checkIfFlightsAvailable();
    console.log(
      '🛫 hasAvailableFlights actualizado:',
      this.hasAvailableFlights
    );

    // ✅ MEJORADO: Actualizar el resumen siempre que tengamos datos de precios
    if (Object.keys(this.pricesByAgeGroup).length > 0) {
      let travelersToUse;

      if (this.travelerSelector && this.travelerSelector.travelersNumbers) {
        travelersToUse = this.travelerSelector.travelersNumbers;
        console.log(
          '📊 Actualizando resumen con datos de viajeros existentes:',
          travelersToUse
        );
      } else {
        travelersToUse = {
          adults: Math.max(1, this.totalPassengers),
          childs: 0,
          babies: 0,
        };
        console.log(
          '📊 Actualizando resumen con datos básicos de viajeros:',
          travelersToUse
        );
      }

      // ✅ NUEVO: Forzar actualización inmediata del summary
      this.updateOrderSummary(travelersToUse);
      console.log(
        '✅ Resumen actualizado inmediatamente después del cambio de vuelo'
      );
    } else {
      console.log(
        '⚠️ No hay precios por grupo de edad disponibles, no se puede actualizar el resumen'
      );
    }

    // ✅ NUEVO: Limpiar resumen anterior del localStorage antes de persistir el nuevo
    if (this.reservationId) {
      localStorage.removeItem(`checkout_summary_${this.reservationId}`);
      console.log('🗑️ Resumen anterior del localStorage eliminado');
    }
  }

  /**
   * Método para verificar si hay vuelos disponibles
   * ✅ MODIFICADO: Ahora verifica si hay flightPacks disponibles en default-flights
   * para determinar si mostrar la opción "Sin Vuelos"
   */
  private checkIfFlightsAvailable(): boolean {
    // ✅ NUEVA LÓGICA: Mostrar la opción "Sin Vuelos" solo cuando hay flightPacks disponibles
    // Esto asegura que la opción esté disponible cuando realmente hay vuelos en el sistema

    // Verificar si hay flightPacks disponibles
    if (this.availableFlights && this.availableFlights.length > 0) {
      console.log(
        '✅ Hay flightPacks disponibles - mostrando opción "Sin Vuelos"'
      );
      return true;
    }

    console.log(
      '❌ No hay flightPacks disponibles - ocultando opción "Sin Vuelos"'
    );
    return false;
  }

  /**
   * Método para verificar la disponibilidad de vuelos en el sistema
   */
  private checkFlightsAvailability(departureId: number): void {
    // Importar el servicio de vuelos
    import('./services/flightsNet.service').then(({ FlightsNetService }) => {
      const flightsService = new FlightsNetService(this.http);

      flightsService.getFlights(departureId).subscribe({
        next: (flights) => {
          // Almacenar los vuelos disponibles
          this.availableFlights = flights || [];

          // Verificar si hay vuelos disponibles basándose en name y description
          this.hasAvailableFlights =
            flights &&
            flights.length > 0 &&
            flights.some((pack) => {
              const name = pack.name?.toLowerCase() || '';
              const description = pack.description?.toLowerCase() || '';

              // Verificar que SÍ sea una opción sin vuelos
              const isFlightlessOption =
                name.includes('sin vuelos') ||
                description.includes('sin vuelos') ||
                name.includes('pack sin vuelos') ||
                description.includes('pack sin vuelos');

              return isFlightlessOption;
            });

          console.log(
            'Vuelos disponibles en el sistema:',
            this.hasAvailableFlights
          );
        },
        error: (error) => {
          console.error('Error al verificar disponibilidad de vuelos:', error);
          this.hasAvailableFlights = false;
          this.availableFlights = [];
        },
      });
    });
  }

  // OPTIMIZADO: Método para verificar si podemos inicializar el resumen
  private checkAndInitializeSummary(): void {
    // ✅ NUEVO: No sobrescribir el summary si ya tiene contenido
    if (this.summary.length > 0) {
      console.log(
        '🔄 Summary ya tiene contenido, no sobrescribiendo:',
        this.summary.length,
        'elementos'
      );
      return;
    }

    // Verificar si tenemos todo lo necesario para inicializar
    const hasPrices = Object.keys(this.pricesByAgeGroup).length > 0;
    const hasTravelers =
      this.travelerSelector && this.travelerSelector.travelersNumbers;

    console.log('🔄 checkAndInitializeSummary - Estado:', {
      hasPrices,
      hasTravelers: !!hasTravelers,
      summaryLength: this.summary.length,
    });

    if (hasPrices && hasTravelers) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    } else if (hasPrices && this.totalPassengers > 0) {
      // Si no tenemos travelers específicos, usar los de la reserva
      const fallbackTravelers = {
        adults: Math.max(1, this.totalPassengers),
        childs: 0,
        babies: 0,
      };
      this.updateOrderSummary(fallbackTravelers);
    }
  }

  // NUEVO: Método para forzar la actualización del summary cuando se cargan datos de habitaciones
  private forceSummaryUpdate(): void {
    // ✅ NUEVO: No sobrescribir el summary si ya tiene contenido
    if (this.summary.length > 0) {
      console.log(
        '🔄 forceSummaryUpdate: Summary ya tiene contenido, no sobrescribiendo:',
        this.summary.length,
        'elementos'
      );
      return;
    }

    if (Object.keys(this.pricesByAgeGroup).length > 0) {
      const currentTravelers = this.travelerSelector?.travelersNumbers || {
        adults: Math.max(1, this.totalPassengers),
        childs: 0,
        babies: 0,
      };

      // ✅ SIMPLIFICADO: Solo actualizar el summary sin lógica adicional
      this.updateOrderSummary(currentTravelers);
    }
  }
  // Método para actualizar el resumen del pedido
  updateOrderSummary(travelersNumbers: {
    adults: number;
    childs: number;
    babies: number;
  }): void {
    console.log(
      '🔄 updateOrderSummary llamado con travelersNumbers:',
      travelersNumbers
    );
    console.log('📊 selectedFlight actual:', this.selectedFlight);
    console.log('💰 flightPrice actual:', this.flightPrice);

    this.summary = [];

    // Plan básico - Adultos
    if (travelersNumbers.adults > 0) {
      const adultPrice = this.pricesByAgeGroup['Adultos'] || 0;
      if (adultPrice > 0) {
        this.summary.push({
          qty: travelersNumbers.adults,
          value: adultPrice,
          description: 'Plan básico adultos',
        });
      }
    }

    // Plan básico - Niños
    if (travelersNumbers.childs > 0) {
      const childPrice = this.pricesByAgeGroup['Niños'] || 0;
      if (childPrice > 0) {
        this.summary.push({
          qty: travelersNumbers.childs,
          value: childPrice,
          description: 'Plan básico niños',
        });
      }
    }

    // Plan básico - Bebés
    if (travelersNumbers.babies > 0) {
      const babyPrice = this.pricesByAgeGroup['Bebés'] || 0;
      if (babyPrice > 0) {
        this.summary.push({
          qty: travelersNumbers.babies,
          value: babyPrice,
          description: 'Plan básico bebés',
        });
      }
    }

    // ✅ CORREGIDO: Manejo mejorado de vuelos
    if (this.selectedFlight) {
      // Verificar si es una opción "Sin Vuelos"
      const isNoFlightOption = this.isNoFlightOption(this.selectedFlight);

      if (isNoFlightOption) {
        // ✅ CASO "Sin Vuelos": Agregar al resumen con precio 0 y texto "incluido"
        const totalTravelers =
          travelersNumbers.adults +
          travelersNumbers.childs +
          travelersNumbers.babies;

        const noFlightItem = {
          qty: totalTravelers,
          value: 0, // Precio 0 para "Sin Vuelos"
          description: 'Sin Vuelos',
        };
        this.summary.push(noFlightItem);

        console.log(
          '🚫 Agregando "Sin Vuelos" al resumen con precio 0 (incluido)'
        );
      } else if (this.flightPrice > 0) {
        // Vuelo con precio: agregar normalmente
        const totalTravelers =
          travelersNumbers.adults +
          travelersNumbers.childs +
          travelersNumbers.babies;

        const flightItem = {
          qty: totalTravelers,
          value: this.flightPrice, // Precio por persona
          description: `Vuelo ${
            this.selectedFlight.flights[0]?.departureCity || ''
          } - ${this.selectedFlight.flights[0]?.arrivalCity || ''}`,
        };
        this.summary.push(flightItem);

        console.log(
          '✈️ Agregando vuelo al resumen con precio:',
          this.flightPrice
        );
      }
    } else {
      // ✅ CASO: No hay vuelo seleccionado (estado inicial o después de recarga)
      const totalTravelers =
        travelersNumbers.adults +
        travelersNumbers.childs +
        travelersNumbers.babies;

      const noFlightItem = {
        qty: totalTravelers,
        value: 0, // Precio 0 para "Sin Vuelos"
        description: 'Sin Vuelos',
      };
      this.summary.push(noFlightItem);

      console.log(
        '🚫 No hay vuelo seleccionado - agregando "Sin Vuelos" al resumen'
      );
    }

    // Habitaciones seleccionadas
    if (this.roomSelector && this.roomSelector.selectedRooms) {
      Object.entries(this.roomSelector.selectedRooms).forEach(([tkId, qty]) => {
        if (qty > 0) {
          const room = this.roomSelector.allRoomsAvailability.find(
            (r) => r.tkId === tkId
          );
          if (room) {
            const roomPrice = room.basePrice || 0;
            if (roomPrice !== 0) {
              this.summary.push({
                qty: qty,
                value: roomPrice,
                description: `Suplemento hab. ${room.name}`,
              });
            }
          }
        }
      });
    }

    // Actividades por viajero (nueva lógica)
    Object.values(this.activitiesByTraveler).forEach((activityData) => {
      if (activityData.count > 0 && activityData.price > 0) {
        const summaryItem = {
          qty: activityData.count,
          value: activityData.price,
          description: `${activityData.name}`,
        };
        this.summary.push(summaryItem);
      }
    });

    // Actividades seleccionadas (mantener como respaldo para compatibilidad)
    if (
      this.selectedActivities &&
      this.selectedActivities.length > 0 &&
      Object.keys(this.activitiesByTraveler).length === 0
    ) {
      const totalTravelers =
        travelersNumbers.adults +
        travelersNumbers.childs +
        travelersNumbers.babies;

      this.selectedActivities.forEach((activity) => {
        const activityPrice =
          activity.priceData?.find(
            (price: any) => price.age_group_name === 'Adultos'
          )?.value || 0;

        if (activityPrice > 0) {
          this.summary.push({
            qty: totalTravelers,
            value: activityPrice,
            description: `${activity.name}`,
          });
        }
      });
    }

    // ✅ SEGURO SELECCIONADO (solo desde BD)
    if (this.selectedInsurance) {
      const totalTravelers =
        travelersNumbers.adults +
        travelersNumbers.childs +
        travelersNumbers.babies;

      if (this.insurancePrice === 0) {
        // Seguro básico incluido (precio 0)
        this.summary.push({
          qty: totalTravelers,
          value: 0,
          description: `${this.selectedInsurance.name}`,
        });
      } else {
        // Seguro con precio
        this.summary.push({
          qty: totalTravelers,
          value: this.insurancePrice,
          description: `Seguro ${this.selectedInsurance.name}`,
        });
      }
    }

    // Calcular totales
    this.calculateTotals();

    // Actualizar totales en la reserva (solo localmente, no en BD)
    this.updateReservationTotalAmount();

    // ✅ NUEVO: Log del resumen final para debugging
    console.log('📋 Resumen final del pedido:', this.summary);
    console.log('📊 Cantidad de elementos en el resumen:', this.summary.length);
    console.log('💰 Subtotal calculado:', this.subtotal);
    console.log('💰 Total calculado:', this.totalAmountCalculated);

    // ✅ NUEVO: Log específico para verificar "Sin Vuelos"
    const hasNoFlight = this.summary.some(
      (item) => item.description === 'Sin Vuelos'
    );
    console.log('🚫 ¿Tiene "Sin Vuelos" en el resumen?', hasNoFlight);

    // ✅ NUEVO: Persistir el resumen en localStorage para mantener consistencia
    this.persistSummaryToLocalStorage();

    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  // ✅ NUEVO: Método para verificar si un vuelo es la opción "Sin Vuelos"
  private isNoFlightOption(flight: IFlightPackDTO): boolean {
    if (!flight) return false;

    const name = flight.name?.toLowerCase() || '';
    const description = flight.description?.toLowerCase() || '';
    const code = flight.code?.toLowerCase() || '';

    return (
      name.includes('sin vuelos') ||
      description.includes('sin vuelos') ||
      name.includes('pack sin vuelos') ||
      description.includes('pack sin vuelos') ||
      code === 'no_flight' ||
      code === 'sin_vuelos'
    );
  }

  // ✅ NUEVO: Método para persistir el resumen en localStorage
  private persistSummaryToLocalStorage(): void {
    if (this.reservationId) {
      const summaryData = {
        reservationId: this.reservationId,
        summary: this.summary,
        subtotal: this.subtotal,
        total: this.totalAmountCalculated,
        timestamp: new Date().toISOString(),
      };

      try {
        localStorage.setItem(
          `checkout_summary_${this.reservationId}`,
          JSON.stringify(summaryData)
        );
        console.log('💾 Resumen persistido en localStorage:', summaryData);
      } catch (error) {
        console.warn(
          '⚠️ No se pudo persistir el resumen en localStorage:',
          error
        );
      }
    }
  }

  // ✅ NUEVO: Método para recuperar el resumen desde localStorage
  private restoreSummaryFromLocalStorage(): void {
    if (this.reservationId) {
      try {
        const storedData = localStorage.getItem(
          `checkout_summary_${this.reservationId}`
        );
        if (storedData) {
          const summaryData = JSON.parse(storedData);
          const storedTimestamp = new Date(summaryData.timestamp);
          const now = new Date();

          // Solo restaurar si los datos tienen menos de 1 hora
          const oneHour = 60 * 60 * 1000;
          if (now.getTime() - storedTimestamp.getTime() < oneHour) {
            this.summary = summaryData.summary || [];
            this.subtotal = summaryData.subtotal || 0;
            this.totalAmountCalculated = summaryData.total || 0;

            console.log(
              '🔄 Resumen restaurado desde localStorage:',
              summaryData
            );
            this.cdr.detectChanges();
          } else {
            console.log('⏰ Datos del resumen expirados, no se restauran');
            localStorage.removeItem(`checkout_summary_${this.reservationId}`);
          }
        }
      } catch (error) {
        console.warn(
          '⚠️ Error al restaurar resumen desde localStorage:',
          error
        );
        localStorage.removeItem(`checkout_summary_${this.reservationId}`);
      }
    }
  }

  // Método para calcular totales
  calculateTotals(): void {
    // Calcular subtotal (solo valores positivos)
    this.subtotal = this.summary.reduce((acc, item) => {
      const itemTotal = item.value * item.qty;
      if (item.value >= 0) {
        return acc + itemTotal;
      }
      return acc;
    }, 0);

    // Calcular total (todos los valores, incluyendo negativos)
    this.totalAmountCalculated = this.summary.reduce((acc, item) => {
      const itemTotal = item.value * item.qty;
      return acc + itemTotal;
    }, 0);
  }

  // Método para actualizar totalAmount en la reserva
  private updateReservationTotalAmount(): void {
    if (!this.reservationId || !this.reservationData) {
      return;
    }

    // Solo actualizar si el monto ha cambiado
    if (this.totalAmountCalculated !== this.reservationData.totalAmount) {
      // Actualizar las variables locales inmediatamente para evitar conflictos
      this.reservationData.totalAmount = this.totalAmountCalculated;
      this.totalAmount = this.totalAmountCalculated;
    }
  }

  // Método para guardar actividades seleccionadas (CON SOPORTE COMPLETO PARA PACKS)
  async saveActivitiesAssignments(): Promise<boolean> {
    console.log('=== INICIO saveActivitiesAssignments ===');

    if (
      !this.reservationId ||
      !this.selectedActivities ||
      this.selectedActivities.length === 0
    ) {
      console.log('No hay actividades para guardar, retornando true');
      console.log('reservationId:', this.reservationId);
      console.log('selectedActivities:', this.selectedActivities);
      console.log(
        'selectedActivities.length:',
        this.selectedActivities?.length
      );
      return true; // Si no hay actividades seleccionadas, consideramos exitoso
    }

    try {
      // Verificar que tenemos el componente travelerSelector con datos
      if (!this.travelerSelector) {
        console.error('No se encontró el componente travelerSelector');
        throw new Error('No se encontró información de viajeros');
      }

      // Obtener los travelers desde el componente travelerSelector
      const existingTravelers = this.travelerSelector.existingTravelers || [];

      if (existingTravelers.length === 0) {
        console.error('No se encontraron viajeros para esta reserva');
        console.log(
          'travelerSelector.existingTravelers:',
          this.travelerSelector.existingTravelers
        );
        throw new Error('No se encontraron viajeros para esta reserva');
      }

      console.log(
        `Guardando actividades para ${existingTravelers.length} viajeros`
      );
      console.log(
        'Viajeros encontrados:',
        existingTravelers.map((t) => ({
          id: t.id,
          name: (t as any).name || 'Sin nombre',
        }))
      );

      // Limpiar actividades y packs existentes para esta reserva
      console.log('Limpiando actividades existentes...');
      await this.clearExistingActivitiesAndPacks(existingTravelers);
      console.log('Actividades existentes limpiadas');

      // Separar actividades individuales y packs
      const individualActivities = this.selectedActivities.filter(
        (activity) => activity.type === 'act'
      );
      const activityPacks = this.selectedActivities.filter(
        (activity) => activity.type === 'pack'
      );

      console.log(
        `Actividades individuales: ${individualActivities.length}, Packs: ${activityPacks.length}`
      );
      console.log('Actividades individuales:', individualActivities);
      console.log('Packs de actividades:', activityPacks);

      const createPromises: Promise<any>[] = [];

      // Crear asignaciones para actividades individuales
      individualActivities.forEach((activity) => {
        existingTravelers.forEach((traveler: any) => {
          const activityAssignment = {
            id: 0,
            reservationTravelerId: traveler.id,
            activityId: activity.id,
          };

          console.log(
            `Creando asignación de actividad ${activity.id} para viajero ${traveler.id}:`,
            activityAssignment
          );

          const createPromise = new Promise((resolve, reject) => {
            this.reservationTravelerActivityService
              .create(activityAssignment)
              .subscribe({
                next: (result) => {
                  console.log(
                    `Actividad ${activity.id} asignada al viajero ${traveler.id} exitosamente:`,
                    result
                  );
                  resolve(result);
                },
                error: (error) => {
                  console.error(
                    `Error al asignar actividad ${activity.id} al viajero ${traveler.id}:`,
                    error
                  );
                  console.error('Detalles del error:', {
                    status: error?.status,
                    message: error?.message,
                    error: error?.error,
                    stack: error?.stack,
                  });
                  reject(error);
                },
              });
          });

          createPromises.push(createPromise);
        });
      });

      // Crear asignaciones para packs de actividades
      activityPacks.forEach((pack) => {
        existingTravelers.forEach((traveler: any) => {
          const packAssignment = {
            id: 0,
            reservationTravelerId: traveler.id,
            activityPackId: pack.id,
          };

          console.log(
            `Creando asignación de pack ${pack.id} para viajero ${traveler.id}:`,
            packAssignment
          );

          const createPromise = new Promise((resolve, reject) => {
            this.reservationTravelerActivityPackService
              .create(packAssignment)
              .subscribe({
                next: (result) => {
                  console.log(
                    `Pack ${pack.id} asignado al viajero ${traveler.id} exitosamente:`,
                    result
                  );
                  resolve(result);
                },
                error: (error) => {
                  console.error(
                    `Error al asignar pack ${pack.id} al viajero ${traveler.id}:`,
                    error
                  );
                  console.error('Detalles del error:', {
                    status: error?.status,
                    message: error?.message,
                    error: error?.error,
                    stack: error?.stack,
                  });
                  reject(error);
                },
              });
          });

          createPromises.push(createPromise);
        });
      });

      // Ejecutar todas las operaciones de creación
      if (createPromises.length > 0) {
        console.log(
          `Ejecutando ${createPromises.length} operaciones de creación...`
        );
        try {
          // Usar Promise.allSettled para manejar mejor los errores y asegurar que todas las operaciones se completen
          const results = await Promise.allSettled(createPromises);

          // Verificar el estado de cada operación
          const successful = results.filter(
            (result) => result.status === 'fulfilled'
          );
          const failed = results.filter(
            (result) => result.status === 'rejected'
          );

          console.log(
            `Operaciones completadas: ${successful.length} exitosas, ${failed.length} fallidas`
          );

          // Si hay operaciones fallidas, mostrar detalles y fallar
          if (failed.length > 0) {
            console.error('Operaciones fallidas:', failed);
            const errorMessages = failed.map((result, index) => {
              const reason =
                result.status === 'rejected'
                  ? result.reason
                  : 'Error desconocido';
              return `Operación ${index + 1}: ${
                (reason as any)?.message || reason
              }`;
            });

            throw new Error(
              `Fallaron ${failed.length} operaciones:\n${errorMessages.join(
                '\n'
              )}`
            );
          }

          // Verificar que todas las operaciones fueron exitosas
          if (successful.length !== createPromises.length) {
            throw new Error(
              `Se esperaban ${createPromises.length} operaciones exitosas, pero solo se completaron ${successful.length}`
            );
          }

          console.log('Todas las actividades se guardaron exitosamente');
        } catch (error) {
          console.error(
            'Error durante la ejecución de operaciones de creación:',
            error
          );
          throw error; // Re-lanzar el error para que sea capturado por el catch externo
        }
      } else {
        console.log('No hay actividades para crear');
      }

      console.log('=== FIN saveActivitiesAssignments (EXITOSO) ===');
      return true;
    } catch (error) {
      console.log('=== ERROR en saveActivitiesAssignments ===');
      console.error('Error completo:', error);
      console.error('Stack trace:', (error as any)?.stack);
      console.error('Mensaje del error:', (error as any)?.message);

      this.messageService.add({
        severity: 'error',
        summary: 'Error al guardar actividades',
        detail:
          'Hubo un error al guardar las actividades seleccionadas. Por favor, inténtalo de nuevo.',
        life: 5000,
      });
      return false;
    }
  }

  // Método para limpiar actividades y packs existentes
  private async clearExistingActivitiesAndPacks(
    existingTravelers: any[]
  ): Promise<void> {
    console.log(`=== INICIO clearExistingActivitiesAndPacks ===`);
    console.log(
      `Limpiando actividades existentes para ${existingTravelers.length} viajeros`
    );

    const deletePromises: Promise<any>[] = [];
    let totalActivitiesFound = 0;
    let totalPacksFound = 0;
    let totalActivitiesDeleted = 0;
    let totalPacksDeleted = 0;

    for (const traveler of existingTravelers) {
      try {
        console.log(`Procesando viajero ${traveler.id}...`);

        // Obtener y eliminar actividades individuales existentes
        const existingActivities = await new Promise<any[]>(
          (resolve, reject) => {
            this.reservationTravelerActivityService
              .getByReservationTraveler(traveler.id)
              .subscribe({
                next: (activities) => {
                  console.log(
                    `Viajero ${traveler.id} tiene ${activities.length} actividades individuales`
                  );
                  totalActivitiesFound += activities.length;
                  resolve(activities);
                },
                error: (error) => {
                  console.warn(
                    `Error al obtener actividades para viajero ${traveler.id}:`,
                    error
                  );
                  console.warn('Detalles del error:', {
                    status: (error as any)?.status,
                    message: (error as any)?.message,
                    error: (error as any)?.error,
                  });
                  resolve([]); // Continuar con lista vacía
                },
              });
          }
        );

        existingActivities.forEach((activity) => {
          const deletePromise = new Promise((resolve, reject) => {
            console.log(
              `Eliminando actividad ${activity.id} del viajero ${traveler.id}...`
            );
            this.reservationTravelerActivityService
              .delete(activity.id)
              .subscribe({
                next: (result) => {
                  console.log(
                    `Actividad ${activity.id} eliminada del viajero ${traveler.id} exitosamente:`,
                    result
                  );
                  totalActivitiesDeleted++;
                  resolve(result);
                },
                error: (error) => {
                  console.warn(
                    `Error al eliminar actividad ${activity.id} del viajero ${traveler.id}:`,
                    error
                  );
                  console.warn('Detalles del error:', {
                    status: (error as any)?.status,
                    message: (error as any)?.message,
                    error: (error as any)?.error,
                  });
                  resolve(false); // Continuar aunque falle la eliminación
                },
              });
          });
          deletePromises.push(deletePromise);
        });

        // Obtener y eliminar packs de actividades existentes
        const existingPacks = await new Promise<any[]>((resolve, reject) => {
          this.reservationTravelerActivityPackService
            .getByReservationTraveler(traveler.id)
            .subscribe({
              next: (packs) => {
                console.log(
                  `Viajero ${traveler.id} tiene ${packs.length} packs de actividades`
                );
                totalPacksFound += packs.length;
                resolve(packs);
              },
              error: (error) => {
                console.warn(
                  `Error al obtener packs para viajero ${traveler.id}:`,
                  error
                );
                console.warn('Detalles del error:', {
                  status: (error as any)?.status,
                  message: (error as any)?.message,
                  error: (error as any)?.error,
                });
                resolve([]); // Continuar con lista vacía
              },
            });
        });

        existingPacks.forEach((pack) => {
          const deletePromise = new Promise((resolve, reject) => {
            console.log(
              `Eliminando pack ${pack.id} del viajero ${traveler.id}...`
            );
            this.reservationTravelerActivityPackService
              .delete(pack.id)
              .subscribe({
                next: (result) => {
                  console.log(
                    `Pack ${pack.id} eliminado del viajero ${traveler.id} exitosamente:`,
                    result
                  );
                  totalPacksDeleted++;
                  resolve(result);
                },
                error: (error) => {
                  console.warn(
                    `Error al eliminar pack ${pack.id} del viajero ${traveler.id}:`,
                    error
                  );
                  console.warn('Detalles del error:', {
                    status: (error as any)?.status,
                    message: (error as any)?.message,
                    error: (error as any)?.error,
                  });
                  resolve(false); // Continuar aunque falle la eliminación
                },
              });
          });
          deletePromises.push(deletePromise);
        });
      } catch (error) {
        console.warn(`Error al procesar viajero ${traveler.id}:`, error);
        // Continuar con el siguiente viajero
      }
    }

    // Esperar a que se completen todas las eliminaciones
    if (deletePromises.length > 0) {
      console.log(
        `Esperando a que se completen ${deletePromises.length} eliminaciones...`
      );
      try {
        await Promise.all(deletePromises);
        console.log('Todas las eliminaciones se completaron');
      } catch (error) {
        console.warn(
          'Algunas eliminaciones fallaron, pero continuando:',
          error
        );
      }
    } else {
      console.log('No hay elementos para eliminar');
    }

    console.log(`=== RESUMEN clearExistingActivitiesAndPacks ===`);
    console.log(`Total actividades encontradas: ${totalActivitiesFound}`);
    console.log(`Total packs encontrados: ${totalPacksFound}`);
    console.log(`Total actividades eliminadas: ${totalActivitiesDeleted}`);
    console.log(`Total packs eliminados: ${totalPacksDeleted}`);
    console.log(`=== FIN clearExistingActivitiesAndPacks ===`);
  }

  // Método auxiliar para limpiar actividades existentes
  private async clearExistingActivities(
    existingTravelers: any[]
  ): Promise<void> {
    const deletePromises: Promise<any>[] = [];

    for (const traveler of existingTravelers) {
      try {
        // Obtener actividades existentes para este viajero
        const existingActivities = await new Promise<any[]>(
          (resolve, reject) => {
            this.reservationTravelerActivityService
              .getByReservationTraveler(traveler.id)
              .subscribe({
                next: (activities) => resolve(activities),
                error: (error) => resolve([]), // Si hay error, asumimos que no hay actividades
              });
          }
        );

        // Eliminar cada actividad existente
        existingActivities.forEach((activity) => {
          const deletePromise = new Promise((resolve, reject) => {
            this.reservationTravelerActivityService
              .delete(activity.id)
              .subscribe({
                next: (result) => resolve(result),
                error: (error) => resolve(false), // Continuar aunque falle una eliminación
              });
          });
          deletePromises.push(deletePromise);
        });
      } catch (error) {
        console.warn(
          `Error al obtener actividades para el viajero ${traveler.id}:`,
          error
        );
      }
    }

    // Esperar a que se completen todas las eliminaciones
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
  }

  // Método para formatear la fecha
  formatDate(dateString: string): string {
    if (!dateString) return '';

    try {
      const dateParts = dateString.split('-');

      if (dateParts.length !== 3) return dateString;

      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);

      const date = new Date(year, month, day);

      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  // Generar fechas formateadas para el subtítulo
  get tourDates(): string {
    if (!this.departureDate && !this.returnDate) return '';

    const departure = this.formatDate(this.departureDate);
    const returnFormatted = this.formatDate(this.returnDate);

    if (departure && returnFormatted) {
      return `${departure} - ${returnFormatted}`;
    } else if (departure) {
      return `Salida: ${departure}`;
    } else if (returnFormatted) {
      return `Regreso: ${returnFormatted}`;
    }

    return '';
  }

  // Manejar cambio de paso activo
  onActiveIndexChange(index: number): void {
    this.activeIndex = index;
    this.updateStepInUrl(index);

    // Forzar inicialización de componentes cuando se activan
    this.initializeComponentForStep(index);
  }

  /**
   * Inicializa componentes específicos según el step activo
   */
  private initializeComponentForStep(stepIndex: number): void {
    // Usar setTimeout para asegurar que el DOM se haya actualizado
    setTimeout(() => {
      switch (stepIndex) {
        case 2: // Step de info-travelers
          this.initializeInfoTravelersComponent();
          break;
        case 1: // Step de vuelos
          this.initializeFlightManagementComponent();
          break;
        case 0: // Step de personalización
          this.initializePersonalizationComponents();
          break;
        case 3: // Step de pago
          this.initializePaymentComponent();
          break;
      }
    }, 100); // Pequeño delay para asegurar que el DOM esté listo
  }

  /**
   * Inicializa el componente info-travelers cuando se activa su step
   */
  private initializeInfoTravelersComponent(): void {
    console.log('🔄 Intentando inicializar componente info-travelers...');

    // Verificar que tengamos todos los datos necesarios
    if (!this.infoTravelers) {
      console.log('⚠️ Componente info-travelers no disponible');
      return;
    }

    if (!this.departureId || !this.reservationId) {
      console.log('⚠️ Faltan datos necesarios:', {
        departureId: this.departureId,
        reservationId: this.reservationId,
      });
      return;
    }

    console.log('✅ Datos disponibles, verificando estado del componente...');

    // Verificar si el componente ya tiene datos cargados
    if (
      !this.infoTravelers.travelers ||
      this.infoTravelers.travelers.length === 0
    ) {
      console.log(
        '📋 Componente info-travelers sin datos, forzando recarga...'
      );

      // Usar un pequeño delay para asegurar que el componente esté completamente renderizado
      setTimeout(() => {
        try {
          this.infoTravelers.reloadData();
          console.log('✅ Recarga de datos iniciada');
        } catch (error) {
          console.error('❌ Error al recargar datos:', error);
        }
      }, 200);
    } else {
      console.log('✅ Componente info-travelers ya tiene datos cargados:', {
        travelersCount: this.infoTravelers.travelers.length,
      });
    }
  }

  /**
   * Inicializa componentes de personalización
   */
  private initializePersonalizationComponents(): void {
    // Lógica para componentes de personalización si es necesaria
    console.log('🎨 Inicializando componentes de personalización...');
  }

  /**
   * Inicializa componente de gestión de vuelos
   */
  private initializeFlightManagementComponent(): void {
    // Lógica para componente de vuelos si es necesaria
    console.log('✈️ Inicializando componente de gestión de vuelos...');
  }

  /**
   * Inicializa componente de pago
   */
  private initializePaymentComponent(): void {
    // Lógica para componente de pago si es necesaria
    console.log('💳 Inicializando componente de pago...');
  }

  // Método para actualizar la URL cuando cambia el step
  updateStepInUrl(step: number): void {
    if (typeof step === 'number' && !isNaN(step)) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { step: step },
        queryParamsHandling: 'merge',
      });
    } else {
      console.error('Invalid step value:', step);
    }
  }

  // Método auxiliar para logging detallado
  private logComponentState(): void {
    console.log('=== ESTADO DE COMPONENTES ===');
    console.log('travelerSelector:', {
      available: !!this.travelerSelector,
      hasUnsavedChanges: this.travelerSelector?.hasUnsavedChanges,
      travelersNumbers: this.travelerSelector?.travelersNumbers,
      existingTravelers: this.travelerSelector?.existingTravelers?.length || 0,
    });
    console.log('roomSelector:', {
      available: !!this.roomSelector,
      selectedRooms: this.roomSelector?.selectedRooms,
      allRoomsAvailability:
        this.roomSelector?.allRoomsAvailability?.length || 0,
    });
    console.log('insuranceSelector:', {
      available: !!this.insuranceSelector,
      selectedInsurance: !!this.insuranceSelector?.selectedInsurance,
    });
    console.log('infoTravelers:', {
      available: !!this.infoTravelers,
    });
    console.log('reservationData:', {
      id: this.reservationId,
      totalPassengers: this.totalPassengers,
      totalAmount: this.totalAmount,
      totalAmountCalculated: this.totalAmountCalculated,
    });
    console.log('selectedActivities:', {
      count: this.selectedActivities?.length || 0,
      activities: this.selectedActivities,
    });
    console.log('=============================');
  }

  // Método para guardar todos los datos de los viajeros
  private async saveTravelersData(): Promise<boolean> {
    console.log('=== DEBUG: saveTravelersData iniciado ===');

    if (!this.infoTravelers) {
      console.log('No hay componente infoTravelers, retornando true');
      return true; // Si no hay componente, no hay nada que guardar
    }

    try {
      console.log('Validando campos obligatorios...');
      // Validar que todos los campos obligatorios estén completados
      if (!this.infoTravelers.validateFormAndShowToast()) {
        console.log('Validación falló, retornando false');
        // El toast ya se mostró automáticamente en validateFormAndShowToast()
        return false; // No continuar si hay campos faltantes
      }

      console.log('Validación exitosa, guardando datos...');

      // Llamar al método saveAllTravelersData del componente hijo y esperar a que se complete
      await this.infoTravelers.saveAllTravelersData();
      console.log('Datos guardados exitosamente, retornando true');
      return true;
    } catch (error) {
      console.error('Error en saveTravelersData:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error al guardar',
        detail: 'Error al guardar los datos de los viajeros',
        life: 5000,
      });
      return false;
    }
  }

  async nextStepWithValidation(targetStep: number): Promise<void> {
    console.log(
      '🔄 nextStepWithValidation llamado para targetStep:',
      targetStep
    );
    console.log('🔍 Estado actual - isStandaloneMode:', this.isStandaloneMode);
    console.log('🔍 Estado actual - isAuthenticated:', this.isAuthenticated);

    // ✅ NUEVO: En modo standalone, omitir validación de autenticación
    if (this.isStandaloneMode) {
      console.log(
        '🔓 Modo standalone: omitiendo validación de autenticación para step',
        targetStep
      );
      await this.performStepValidation(targetStep);
      return;
    }

    // Verificar autenticación para pasos que la requieren (solo en modo normal)
    if (targetStep >= 2) {
      console.log('🔒 Modo normal: verificando autenticación para step >= 2');
      return new Promise((resolve) => {
        this.authService.isLoggedIn().subscribe(async (isLoggedIn) => {
          console.log('🔍 Resultado de isLoggedIn():', isLoggedIn);
          if (!isLoggedIn) {
            // Usuario no está logueado, mostrar modal
            console.log('❌ Usuario no logueado - mostrando modal de login');
            sessionStorage.setItem('redirectUrl', window.location.pathname);
            this.loginDialogVisible = true;
            resolve();
            return;
          }
          // Usuario está logueado, actualizar variable local y continuar con la validación normal
          console.log('✅ Usuario logueado - continuando con validación');
          this.isAuthenticated = true;
          await this.performStepValidation(targetStep);
          resolve();
        });
      });
    }

    // Para el paso 0 (personalizar viaje) y paso 1 (vuelos), no se requiere autenticación
    console.log(
      'ℹ️ Step < 2, no requiere autenticación - continuando directamente'
    );
    await this.performStepValidation(targetStep);
  }

  private async performStepValidation(targetStep: number): Promise<void> {
    console.log(
      '=== DEBUG: performStepValidation iniciado para targetStep:',
      targetStep
    );

    // Log del estado inicial de los componentes
    this.logComponentState();

    // Validar que los componentes necesarios estén disponibles
    if (targetStep === 1) {
      if (
        !this.travelerSelector ||
        !this.roomSelector ||
        !this.insuranceSelector
      ) {
        console.error('Componentes requeridos no están disponibles:', {
          travelerSelector: !!this.travelerSelector,
          roomSelector: !!this.roomSelector,
          insuranceSelector: !!this.insuranceSelector,
        });
        this.messageService.add({
          severity: 'error',
          summary: 'Error de inicialización',
          detail:
            'Los componentes necesarios no están disponibles. Por favor, recarga la página.',
          life: 5000,
        });
        return;
      }
    }

    // Guardar cambios de travelers, habitaciones, seguros y actividades antes de continuar
    if (
      targetStep === 1 &&
      this.travelerSelector &&
      this.roomSelector &&
      this.insuranceSelector
    ) {
      console.log('Validando paso 1 (habitaciones, etc.)...');
      try {
        // 1. Guardar cambios de travelers si hay pendientes
        if (this.travelerSelector.hasUnsavedChanges) {
          console.log('Guardando cambios de travelers...');
          this.travelerSelector.saveTravelersChanges();
          // Esperar a que se complete la operación verificando el estado real
          await this.waitForOperation(
            () => !this.travelerSelector.hasUnsavedChanges,
            5000,
            'guardar cambios de travelers'
          );
        }

        // 2. Verificar habitaciones seleccionadas inmediatamente
        const hasSelectedRooms = Object.values(
          this.roomSelector.selectedRooms
        ).some((qty: number) => qty > 0);
        if (!hasSelectedRooms) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Habitación requerida',
            detail:
              'Por favor, selecciona al menos una habitación antes de continuar.',
            life: 5000,
          });
          console.log('No hay habitaciones seleccionadas, retornando');
          return;
        }

        // 3. Validar que las habitaciones seleccionadas puedan acomodar a todos los pasajeros
        const currentTravelers = this.travelerSelector.travelersNumbers;
        const totalPassengers =
          currentTravelers.adults +
          currentTravelers.childs +
          currentTravelers.babies;

        console.log(`Total de pasajeros: ${totalPassengers}`);

        // Calcular la capacidad total de las habitaciones seleccionadas
        let totalCapacity = 0;
        Object.entries(this.roomSelector.selectedRooms).forEach(
          ([tkId, qty]) => {
            if (qty > 0) {
              const room = this.roomSelector.allRoomsAvailability.find(
                (r) => r.tkId === tkId
              );
              if (room) {
                const roomCapacity = room.isShared ? 1 : room.capacity || 1;
                totalCapacity += roomCapacity * qty;
                console.log(
                  `Habitación ${tkId}: capacidad ${roomCapacity}, cantidad ${qty}, subtotal ${
                    roomCapacity * qty
                  }`
                );
              }
            }
          }
        );

        console.log(`Capacidad total de habitaciones: ${totalCapacity}`);

        // Validar que la capacidad sea suficiente
        if (totalCapacity < totalPassengers) {
          this.messageService.add({
            severity: 'error',
            summary: 'Capacidad insuficiente',
            detail: `Las habitaciones seleccionadas tienen capacidad para ${totalCapacity} personas, pero tienes ${totalPassengers} viajeros. Por favor, selecciona más habitaciones o habitaciones de mayor capacidad.`,
            life: 7000,
          });
          return;
        }

        // Validar que la capacidad no sea excesiva (más del 150% necesario)
        if (totalCapacity > totalPassengers * 1.5) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Capacidad excesiva',
            detail: `Las habitaciones seleccionadas tienen capacidad para ${totalCapacity} personas, pero solo tienes ${totalPassengers} viajeros. Esto puede generar costos innecesarios.`,
            life: 6000,
          });
          // No retornamos aquí, solo advertimos pero permitimos continuar
        }

        // 4. Recargar travelers después de guardar cambios
        console.log('Recargando travelers...');
        await this.roomSelector.loadExistingTravelers();
        this.insuranceSelector.loadExistingTravelers();

        // 5. Actualizar el número de pasajeros total y recalcular resumen
        this.totalPassengers = totalPassengers;
        this.updateOrderSummary(currentTravelers);
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Log del estado después de actualizar datos
        console.log('Estado después de actualizar datos:');
        this.logComponentState();

        // 6. Guardar asignaciones de habitaciones, seguros y actividades EN PARALELO con verificación de estado
        console.log('Guardando asignaciones en paralelo...');

        // Ejecutar todas las operaciones con Promise.allSettled para mejor manejo de errores
        const [roomsSaved, insuranceSaved, activitiesSaved] =
          await Promise.allSettled([
            this.roomSelector.saveRoomAssignments(),
            this.insuranceSelector.saveInsuranceAssignments(),
            this.saveActivitiesAssignments(),
          ]);

        console.log('Resultados de las operaciones:', {
          rooms: roomsSaved,
          insurance: insuranceSaved,
          activities: activitiesSaved,
        });

        // Verificar que las operaciones con manejo detallado de errores fueron exitosas
        if (roomsSaved.status === 'rejected') {
          console.error('Error al guardar habitaciones:', roomsSaved.reason);
          this.messageService.add({
            severity: 'error',
            summary: 'Error al guardar habitaciones',
            detail:
              'Hubo un error al guardar las asignaciones de habitaciones. Por favor, inténtalo de nuevo.',
            life: 5000,
          });
          return;
        }

        if (insuranceSaved.status === 'rejected') {
          console.error('Error al guardar seguro:', insuranceSaved.reason);
          this.messageService.add({
            severity: 'error',
            summary: 'Error al guardar seguro',
            detail:
              'Hubo un error al guardar las asignaciones de seguro. Por favor, inténtalo de nuevo.',
            life: 5000,
          });
          return;
        }

        if (activitiesSaved.status === 'rejected') {
          console.error(
            'Error al guardar actividades:',
            activitiesSaved.reason
          );
          this.messageService.add({
            severity: 'error',
            summary: 'Error al guardar actividades',
            detail:
              'Hubo un error al guardar las actividades seleccionadas. Por favor, inténtalo de nuevo.',
            life: 5000,
          });
          return;
        }

        // Verificar que las operaciones fueron exitosas
        if (
          !roomsSaved.value ||
          !insuranceSaved.value ||
          !activitiesSaved.value
        ) {
          const failedOperations = [];
          if (!roomsSaved.value) failedOperations.push('habitaciones');
          if (!insuranceSaved.value) failedOperations.push('seguro');
          if (!activitiesSaved.value) failedOperations.push('actividades');

          this.messageService.add({
            severity: 'error',
            summary: 'Error al guardar',
            detail: `No se pudieron guardar: ${failedOperations.join(
              ', '
            )}. Por favor, inténtalo de nuevo.`,
            life: 5000,
          });
          return;
        }

        // Verificación adicional de que el seguro se guardó correctamente
        if (this.insuranceSelector.selectedInsurance) {
          console.log('Verificando asignaciones de seguro...');
          // Verificar que las asignaciones se guardaron correctamente
          const verificationResult =
            await this.insuranceSelector.verifyInsuranceAssignments();

          if (!verificationResult) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail:
                'El seguro se guardó pero podría no haberse aplicado a todos los viajeros. Verifica en el siguiente paso.',
              life: 5000,
            });
          }
        }

        // 7. Actualizar el totalPassengers en la reserva con verificación de estado
        if (this.reservationId && this.reservationData) {
          console.log('Actualizando datos de la reserva...');
          console.log('Datos a actualizar:', {
            reservationId: this.reservationId,
            currentTotalPassengers: this.reservationData.totalPassengers,
            newTotalPassengers: this.totalPassengers,
            currentTotalAmount: this.reservationData.totalAmount,
            newTotalAmount: this.totalAmountCalculated,
            reservationDataKeys: Object.keys(this.reservationData),
          });

          const reservationUpdateData = {
            ...this.reservationData,
            totalPassengers: this.totalPassengers,
            totalAmount: this.totalAmountCalculated,
            updatedAt: new Date().toISOString(),
          };

          console.log(
            'Datos completos de actualización:',
            reservationUpdateData
          );

          await new Promise((resolve, reject) => {
            console.log('Iniciando llamada al servicio de actualización...');

            this.reservationService
              .update(this.reservationId!, reservationUpdateData)
              .subscribe({
                next: (response) => {
                  console.log(
                    'Respuesta del servicio de actualización:',
                    response
                  );
                  console.log('Tipo de respuesta:', typeof response);
                  console.log('¿Response es truthy?', !!response);

                  // Verificar si la respuesta es exitosa
                  let isSuccess = false;

                  if (typeof response === 'boolean') {
                    isSuccess = response;
                  } else if (
                    typeof response === 'object' &&
                    response !== null
                  ) {
                    // Si es un objeto, verificar propiedades comunes de éxito
                    const responseObj = response as any;
                    isSuccess =
                      responseObj.success !== false &&
                      responseObj.error === undefined &&
                      responseObj.status !== 'error';
                  } else if (response !== null && response !== undefined) {
                    // Para otros tipos, considerar exitoso si no es null/undefined
                    isSuccess = true;
                  }

                  console.log(
                    'Resultado de la verificación de éxito:',
                    isSuccess
                  );

                  if (isSuccess) {
                    console.log(
                      'Actualización exitosa, actualizando datos locales...'
                    );

                    // Actualizar datos locales
                    this.reservationData.totalPassengers = this.totalPassengers;
                    this.reservationData.totalAmount =
                      this.totalAmountCalculated;
                    this.totalAmount = this.totalAmountCalculated;

                    // Mostrar toast de éxito
                    const flightInfo = this.selectedFlight
                      ? ' con vuelo seleccionado'
                      : '';
                    this.messageService.add({
                      severity: 'success',
                      summary: 'Guardado exitoso',
                      detail: `Datos guardados correctamente para ${
                        this.totalPassengers
                      } viajeros con ${
                        this.selectedActivities?.length || 0
                      } actividades${flightInfo}.`,
                      life: 3000,
                    });

                    console.log('Datos locales actualizados:', {
                      totalPassengers: this.totalPassengers,
                      totalAmount: this.totalAmount,
                      totalAmountCalculated: this.totalAmountCalculated,
                    });

                    resolve(response);
                  } else {
                    console.error(
                      'La actualización no fue exitosa. Respuesta:',
                      response
                    );
                    console.error('Tipo de respuesta:', typeof response);
                    console.error('¿Response es null?', response === null);
                    console.error(
                      '¿Response es undefined?',
                      response === undefined
                    );

                    // Crear un error más detallado
                    const errorMessage = `Error al actualizar la reserva. Respuesta del servicio: ${JSON.stringify(
                      response
                    )}`;
                    console.error(errorMessage);

                    reject(new Error(errorMessage));
                  }
                },
                error: (error) => {
                  console.error(
                    'Error en la llamada al servicio de actualización:',
                    error
                  );
                  console.error('Tipo de error:', typeof error);
                  console.error('Stack trace del error:', error?.stack);
                  console.error('Mensaje del error:', error?.message);
                  console.error('Código de estado HTTP:', error?.status);
                  console.error('Respuesta del servidor:', error?.error);

                  // Crear un error más detallado
                  let errorDetail = 'Error desconocido en el servicio';

                  if (error?.status) {
                    errorDetail += ` (HTTP ${error.status})`;
                  }

                  if (error?.message) {
                    errorDetail += `: ${error.message}`;
                  }

                  if (error?.error) {
                    errorDetail += ` - Detalles: ${JSON.stringify(
                      error.error
                    )}`;
                  }

                  console.error('Error detallado:', errorDetail);
                  reject(new Error(errorDetail));
                },
                complete: () => {
                  console.log('Observable de actualización completado');
                },
              });
          });
        }

        // Log del estado final después de guardar todo
        console.log('Estado final después de guardar todo:');
        this.logComponentState();
      } catch (error) {
        console.error('Error en performStepValidation paso 1:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error inesperado',
          detail:
            'Hubo un error al guardar los datos. Por favor, inténtalo de nuevo.',
          life: 5000,
        });
        return;
      }
    }

    // Guardar datos de viajeros antes de continuar al paso de pago (targetStep === 3)
    if (targetStep === 3) {
      console.log('Validando paso 3 (info-travelers)...');

      if (!this.infoTravelers) {
        console.error('Componente infoTravelers no está disponible');
        this.messageService.add({
          severity: 'error',
          summary: 'Error de inicialización',
          detail:
            'El componente de información de viajeros no está disponible. Por favor, recarga la página.',
          life: 5000,
        });
        return;
      }

      const saved = await this.saveTravelersData();
      console.log('Resultado de saveTravelersData:', saved);
      if (!saved) {
        console.log('Validación falló, NO continuando al siguiente paso');
        return; // No continuar si no se pudieron guardar los datos
      }
      console.log('Validación exitosa, continuando al siguiente paso');
    }

    // Navegar al siguiente paso
    console.log('Navegando al siguiente paso:', targetStep);
    this.onActiveIndexChange(targetStep);
  }

  // Método auxiliar para esperar a que una operación se complete
  private async waitForOperation(
    condition: () => boolean,
    maxWaitTime: number,
    operationName: string
  ): Promise<void> {
    const startTime = Date.now();

    while (!condition()) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error(
          `La operación "${operationName}" no se completó en ${maxWaitTime}ms`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 100)); // Esperar 100ms antes de verificar de nuevo
    }
  }

  cleanScalapayPendingPayments(): void {
    if (!this.reservationId) return;

    this.paymentsService
      .cleanScalapayPendingPayments(this.reservationId)
      .subscribe();
  }

  /**
   * Verifica si el userId está vacío y el usuario está logueado, y actualiza la reservación si es necesario
   */
  private checkAndUpdateUserId(reservation: any): void {
    // Verificar si el userId está vacío
    if (!reservation.userId) {
      this.authService.getCognitoId().subscribe({
        next: (cognitoId) => {
          if (cognitoId) {
            // Buscar el usuario por Cognito ID para obtener su ID en la base de datos
            this.usersNetService.getUsersByCognitoId(cognitoId).subscribe({
              next: (users) => {
                if (users && users.length > 0) {
                  const userId = users[0].id;
                  this.isAuthenticated = true;
                  // Actualizar la reservación con el userId correcto
                  this.updateReservationUserId(userId);
                } else {
                }
              },
              error: (error) => {
                console.error(
                  '❌ Error buscando usuario por Cognito ID:',
                  error
                );
              },
            });
          } else {
          }
        },
        error: (error) => {
          console.error('❌ Error obteniendo Cognito ID:', error);
        },
      });
    }
  }

  /**
   * Actualiza el userId de la reservación
   */
  private updateReservationUserId(userId: number): void {
    if (!this.reservationId || !this.reservationData) {
      console.error(
        '❌ No se puede actualizar userId: reservationId o reservationData no disponibles'
      );
      return;
    }

    const updateData = {
      ...this.reservationData,
      userId: userId,
      updatedAt: new Date().toISOString(),
    };

    this.reservationService.update(this.reservationId, updateData).subscribe({
      next: (success) => {
        if (success) {
          // Actualizar los datos locales
          this.reservationData.userId = userId;

          this.messageService.add({
            severity: 'success',
            summary: 'Reservación actualizada',
            detail: 'La reservación ha sido asociada con tu cuenta de usuario.',
            life: 3000,
          });
        } else {
          console.error('❌ Error al actualizar userId en la reservación');
        }
      },
      error: (error) => {
        console.error(
          '❌ Error al actualizar userId en la reservación:',
          error
        );
        this.messageService.add({
          severity: 'error',
          summary: 'Error al actualizar',
          detail: 'No se pudo asociar la reservación con tu cuenta de usuario.',
          life: 5000,
        });
      },
    });
  }

  // Métodos para autenticación
  async checkAuthAndContinue(
    nextStep: number,
    activateCallback: (step: number) => void,
    useFlightless: boolean = false
  ): Promise<void> {
    // ✅ NUEVO: En modo standalone, proceder directamente sin verificar autenticación
    if (this.isStandaloneMode) {
      console.log(
        '🔓 Modo standalone: procediendo sin verificar autenticación'
      );

      if (useFlightless) {
        // Lógica para continuar sin vuelos - guardar como vuelo seleccionado
        await this.handleFlightlessSelection();
        await this.nextStepWithValidation(nextStep);
      } else {
        // Lógica normal
        await this.nextStepWithValidation(nextStep);
      }
      return;
    }

    // Lógica normal para modo no-standalone
    this.authService.isLoggedIn().subscribe(async (isLoggedIn) => {
      if (isLoggedIn) {
        // Usuario está logueado, proceder normalmente
        if (useFlightless) {
          // Lógica para continuar sin vuelos - guardar como vuelo seleccionado
          await this.handleFlightlessSelection();
          await this.nextStepWithValidation(nextStep);
        } else {
          // Lógica normal
          await this.nextStepWithValidation(nextStep);
        }
        // Solo llamar al callback si la validación fue exitosa
        // La validación se maneja dentro de nextStepWithValidation
      } else {
        // Usuario no está logueado, mostrar modal
        // Guardar la URL actual con el step en sessionStorage
        const currentUrl = window.location.pathname;
        const redirectUrl = `${currentUrl}?step=${this.activeIndex}`;
        sessionStorage.setItem('redirectUrl', redirectUrl);
        this.loginDialogVisible = true;
      }
    });
  }

  /**
   * ✅ MÉTODO MEJORADO: Manejar la selección de "sin vuelos" con bloqueo de paso
   */
  private async handleFlightlessSelection(): Promise<void> {
    try {
      // ✅ NUEVO: Activar estado de procesamiento
      this.isFlightlessProcessing = true;
      this.flightlessProcessingMessage = 'Procesando selección sin vuelos...';
      console.log('🚀 Iniciando handleFlightlessSelection...');
      console.log('🕐 Timestamp:', new Date().toISOString());
      console.log(
        '📊 Estado actual - hasAvailableFlights:',
        this.hasAvailableFlights
      );
      console.log('📦 availableFlights:', this.availableFlights);
      console.log(
        '📊 selectedFlight actual antes de la selección:',
        this.selectedFlight
      );

      // Buscar el paquete de vuelos real que corresponde a "sin vuelos"
      if (this.hasAvailableFlights && this.availableFlights) {
        console.log(
          '🔍 Buscando paquete sin vuelos en',
          this.availableFlights.length,
          'paquetes disponibles...'
        );

        const flightlessPack = this.availableFlights.find(
          (pack: IFlightPackDTO) => {
            const name = pack.name?.toLowerCase() || '';
            const description = pack.description?.toLowerCase() || '';
            const isFlightless =
              name.includes('sin vuelos') ||
              description.includes('sin vuelos') ||
              name.includes('pack sin vuelos') ||
              description.includes('pack sin vuelos');

            console.log(
              `🔍 Evaluando paquete ${pack.id} - name: "${name}", description: "${description}", isFlightless: ${isFlightless}`
            );

            return isFlightless;
          }
        );

        if (flightlessPack) {
          console.log('✅ Paquete sin vuelos encontrado:', flightlessPack);
          console.log('🆔 ID del paquete:', flightlessPack.id);
          console.log('📝 Nombre del paquete:', flightlessPack.name);
          console.log(
            '📄 Descripción del paquete:',
            flightlessPack.description
          );

          // ✅ NUEVO: Usar la lógica simplificada del componente default-flights y ESPERAR
          if (this.flightManagement && this.reservationId) {
            console.log(
              '🔄 Usando lógica simplificada del componente default-flights...'
            );

            // ✅ NUEVO: Actualizar mensaje de procesamiento
            this.flightlessProcessingMessage =
              'Guardando asignaciones sin vuelos...';

            // ✅ NUEVO: Llamar al método del componente default-flights para asignar "sin vuelos" y ESPERAR
            await this.flightManagement.defaultFlightsComponent.saveFlightAssignmentsForAllTravelers(
              0,
              true
            );

            console.log('✅ Asignaciones sin vuelos guardadas exitosamente');

            // ✅ NUEVO: Continuar con la selección de "Sin Vuelos" y ESPERAR
            await this.continueWithFlightlessSelection(flightlessPack);
          } else {
            console.log(
              '⚠️ No se puede acceder al componente default-flights, continuando directamente...'
            );
            await this.continueWithFlightlessSelection(flightlessPack);
          }
        } else {
          console.error('❌ No se encontró paquete sin vuelos disponible');
          console.log(
            '🔍 Paquetes revisados:',
            this.availableFlights.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
            }))
          );

          // ✅ NUEVO: Mostrar error y desactivar procesamiento
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se encontró la opción sin vuelos disponible',
            life: 5000,
          });
        }
      } else {
        console.error('❌ No hay vuelos disponibles o no se han cargado');
        console.log('📊 hasAvailableFlights:', this.hasAvailableFlights);
        console.log(
          '📦 availableFlights length:',
          this.availableFlights?.length || 0
        );

        // ✅ NUEVO: Mostrar error y desactivar procesamiento
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No hay vuelos disponibles en el sistema',
          life: 5000,
        });
      }
    } catch (error) {
      console.error('💥 Error al manejar selección sin vuelos:', error);
      console.error(
        '💥 Stack trace:',
        error instanceof Error ? error.stack : 'No stack trace available'
      );

      // ✅ NUEVO: Mostrar error y desactivar procesamiento
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          'Error al procesar la selección sin vuelos. Por favor, inténtalo de nuevo.',
        life: 5000,
      });
    } finally {
      // ✅ NUEVO: Desactivar estado de procesamiento
      this.isFlightlessProcessing = false;
      this.flightlessProcessingMessage = '';
      console.log('✅ Procesamiento de sin vuelos completado');
    }
  }

  /**
   * ✅ MÉTODO MEJORADO: Continuar con la selección de "Sin Vuelos" (sin cambio automático de paso)
   */
  private async continueWithFlightlessSelection(
    flightlessPack: IFlightPackDTO
  ): Promise<void> {
    console.log('🔄 Continuando con selección de "Sin Vuelos"');
    console.log('📦 Paquete sin vuelos:', flightlessPack);

    // ✅ NUEVO: Actualizar mensaje de procesamiento
    this.flightlessProcessingMessage = 'Actualizando resumen y datos...';

    // Actualizar el selectedFlight
    this.selectedFlight = flightlessPack;
    console.log(
      '✅ selectedFlight actualizado con el paquete sin vuelos:',
      this.selectedFlight
    );

    // Llamar a onFlightSelectionChange para actualizar el resumen
    this.onFlightSelectionChange({
      selectedFlight: flightlessPack,
      totalPrice: 0, // precio 0 para opción sin vuelos
    });

    // ✅ NUEVO: Actualizar mensaje de procesamiento
    this.flightlessProcessingMessage = 'Recalculando precios...';

    // Actualizar el resumen
    if (this.travelerSelector && this.travelerSelector.travelersNumbers) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    } else {
      const basicTravelers = {
        adults: Math.max(1, this.totalPassengers),
        childs: 0,
        babies: 0,
      };
      this.updateOrderSummary(basicTravelers);
    }

    // ✅ NUEVO: Mostrar mensaje de éxito
    this.messageService.add({
      severity: 'success',
      summary: 'Sin vuelos seleccionado',
      detail:
        'La opción sin vuelos ha sido seleccionada y guardada correctamente. Ahora puedes continuar al siguiente paso.',
      life: 5000,
    });

    // ✅ NUEVO: NO cambiar automáticamente de paso - el usuario debe hacer clic en "Continuar"
    console.log(
      '✅ Selección sin vuelos completada. El usuario debe hacer clic en "Continuar" para avanzar.'
    );
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

  // TODO: Implementar lógica para guardar el presupuesto
  handleSaveBudget(): void {
    // ✅ NUEVO: En modo standalone, mostrar mensaje informativo en lugar de requerir login
    if (!this.isAuthenticated && !this.isStandaloneMode) {
      this.loginDialogVisible = true;
    } else if (this.isStandaloneMode && !this.isAuthenticated) {
      this.messageService.add({
        severity: 'info',
        summary: 'Función no disponible',
        detail:
          'Para guardar tu presupuesto, debes acceder desde la plataforma principal e iniciar sesión.',
        life: 6000,
      });
    } else {
      this.reservationStatusService.getByCode('BUDGET').subscribe({
        next: (reservationStatus) => {
          if (reservationStatus) {
            this.reservationService
              .updateStatus(this.reservationId!, reservationStatus[0].id)
              .subscribe({
                next: (success) => {
                  if (success) {
                    this.messageService.add({
                      severity: 'success',
                      summary: 'Presupuesto guardado',
                      detail: 'El presupuesto ha sido guardado correctamente',
                      life: 3000,
                    });
                  } else {
                    this.messageService.add({
                      severity: 'error',
                      summary: 'Error al guardar el presupuesto',
                      detail: 'No se pudo guardar el presupuesto',
                      life: 5000,
                    });
                  }
                },
                error: (error) => {
                  console.error(
                    'Error al actualizar el estado de la reservación:',
                    error
                  );
                },
                complete: () => {
                  this.loadReservationData(this.reservationId!);
                },
              });
          } else {
            // No se encontró el id del estado de Budget
          }
        },
        error: (error) => {
          console.error('Error al obtener el estado de la reservación:', error);
        },
      });
    }
  }

  // TODO: Implementar lógica para descargar el presupuesto
  handleDownloadBudget(): void {
    // TODO: Implementar lógica para descargar el presupuesto
  }

  // TODO: Implementar lógica para compartir el presupuesto
  handleShareBudget(): void {
    // TODO: Implementar lógica para compartir el presupuesto
  }

  // ✅ NUEVO: Método para limpiar el resumen del localStorage
  private clearSummaryFromLocalStorage(): void {
    if (this.reservationId) {
      try {
        localStorage.removeItem(`checkout_summary_${this.reservationId}`);
        console.log(
          '🗑️ Resumen del localStorage eliminado para reservación:',
          this.reservationId
        );
      } catch (error) {
        console.warn('⚠️ Error al limpiar resumen del localStorage:', error);
      }
    }
  }

  // ✅ NUEVO: Método para limpiar localStorage cuando se complete el checkout
  public onCheckoutComplete(): void {
    this.clearSummaryFromLocalStorage();
    console.log('✅ Checkout completado, resumen del localStorage limpiado');
  }

  // ✅ NUEVO: Método para limpiar localStorage cuando se cancele el checkout
  public onCheckoutCancel(): void {
    this.clearSummaryFromLocalStorage();
    console.log('❌ Checkout cancelado, resumen del localStorage limpiado');
  }

  /**
   * ✅ NUEVO: Método para obtener el tooltip del botón Continuar
   */
  public getContinueButtonTooltip(): string {
    if (this.isFlightlessProcessing) {
      return 'Espera a que se complete el procesamiento de sin vuelos';
    }
    if (!this.selectedFlight) {
      return 'Debes seleccionar un vuelo para continuar';
    }
    return '';
  }

  /**
   * ✅ NUEVO: Maneja la navegación a un step específico desde el componente de pago
   * @param stepNumber Número del step al que navegar
   */
  public onNavigateToStep(stepNumber: number): void {
    console.log(`🔄 Navegando al step ${stepNumber} desde payment-management`);

    if (stepNumber === 1) {
      // Navegar al step 1 (selección de vuelos)
      console.log('📍 Navegando a selección de vuelos (step 1)');

      // Cambiar al step 1
      this.onActiveIndexChange(1);

      // Mostrar mensaje informativo al usuario
      this.messageService.add({
        severity: 'info',
        summary: 'Navegación',
        detail:
          'Has sido redirigido a la selección de vuelos para elegir una nueva opción',
        life: 4000,
      });

      // Opcional: Limpiar estado relacionado con vuelos si es necesario
      this.clearFlightSelectionState();
    } else {
      console.log(`⚠️ Step ${stepNumber} no manejado específicamente`);
      // Para otros steps, usar la navegación estándar
      this.onActiveIndexChange(stepNumber);
    }
  }

  /**
   * ✅ NUEVO: Limpia el estado relacionado con la selección de vuelos
   */
  private clearFlightSelectionState(): void {
    console.log('🧹 Limpiando estado de selección de vuelos...');

    // Resetear vuelo seleccionado
    this.selectedFlight = null;
    this.flightPrice = 0;

    // Actualizar el resumen sin vuelos
    if (this.travelerSelector && this.travelerSelector.travelersNumbers) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    }

    console.log('✅ Estado de vuelos limpiado');
  }
}
