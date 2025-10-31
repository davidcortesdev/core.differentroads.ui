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
import { TourService } from '../../core/services/tour/tour.service';
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
import { AuthenticateService } from '../../core/services/auth/auth-service.service';
import { UsersNetService } from '../../core/services/users/usersNet.service';
import { AnalyticsService } from '../../core/services/analytics/analytics.service';
import { IFlightPackDTO } from './services/flightsNet.service';
import {
  ReservationTravelerService,
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
import { Title } from '@angular/platform-browser';

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
  @ViewChild('activitiesOptionals') activitiesOptionals!: any; // Referencia al componente de actividades opcionales

  // Datos del tour
  tourName: string = '';
  tourData: any = null; // Tour completo cargado desde la BD
  departureDate: string = '';
  returnDate: string = '';
  departureId: number | null = null;
  reservationId: number | null = null;
  totalAmount: number = 0;
  loading: boolean = false;
  isStep0Saving: boolean = false; // NUEVO: Variable para controlar el loading del botón de continuar del paso 0
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

  // Flags para controlar eventos del funnel que se disparan solo una vez
  private viewCartEventFired: boolean = false;
  private viewFlightsInfoEventFired: boolean = false;
  private viewPersonalInfoEventFired: boolean = false;
  private viewPaymentInfoEventFired: boolean = false;
  // Flag para controlar si ya se inicializó el componente
  private componentInitialized: boolean = false;

  // Datos de precios por grupo de edad
  departurePriceSupplements: IDeparturePriceSupplementResponse[] = [];
  ageGroups: IAgeGroupResponse[] = [];
  pricesByAgeGroup: { [ageGroupId: number]: number } = {};
  reservationData: any = null;

  // Propiedades para seguros
  selectedInsurance: any = null;
  insurancePrice: number = 0;

  // Propiedades para vuelos
  selectedFlight: IFlightPackDTO | null = null;
  flightPrice: number = 0;
  hasAvailableFlights: boolean = false; // Nueva propiedad para controlar la visibilidad del botón
  availableFlights: IFlightPackDTO[] = []; // Nueva propiedad para almacenar los vuelos disponibles
  departureActivityPackId: number | null = null; // NUEVO: ID del paquete de actividad del departure

  // Steps configuration
  items: MenuItem[] = [];
  activeIndex: number = 0;

  // Tour slug para navegación
  tourSlug: string = '';

  // Propiedades para datos del tour (analytics)
  tourCountry: string = '';
  tourContinent: string = '';
  tourRating: number | null = null;
  tourDuration: string = '';
  tourTripType: string = '';
  tourProductStyle: string = '';

  // Propiedades para autenticación
  loginDialogVisible: boolean = false;

  // Propiedades para monitoreo de jobs de sincronización
  currentJobId: string | null = null;
  jobMonitoringSubscription: Subscription | null = null;
  isSyncInProgress: boolean = false;
  isAuthenticated: boolean = false;

  // NUEVO: Propiedades para controlar el estado de carga del botón "Sin Vuelos"
  isFlightlessProcessing: boolean = false;
  flightlessProcessingMessage: string = '';

  // Propiedades para controlar la verificación de precios
  priceCheckExecuted: boolean = false;
  lastPriceCheckParams: {
    retailerID: number;
    departureID: number;
    numPasajeros: number;
  } | null = null;

  // NUEVO: Propiedad para detectar modo standalone
  isStandaloneMode: boolean = false;

  // NUEVO: Propiedad para mostrar opción de transferencia del 25%
  showTransfer25Option: boolean = false;
  
  // NUEVO: Propiedad para indicar si es Tour Operator (TO)
  isTourOperator: boolean = false;

  // NUEVO: Trigger para refrescar el resumen
  summaryRefreshTrigger: any = null;

  constructor(
    private titleService: Title,
    private route: ActivatedRoute,
    private router: Router,
    private tourService: TourService,
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
    private http: HttpClient,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Checkout - Different Roads');

    // NUEVO: Detectar si estamos en modo standalone
    this.detectStandaloneMode();

    // Configurar los steps
    this.initializeSteps();

    // Verificar estado de autenticación inicial (solo si NO es modo standalone)
    if (!this.isStandaloneMode) {
      this.authService.isLoggedIn().subscribe((isLoggedIn) => {
        this.isAuthenticated = isLoggedIn;
      });
    } else {
      // En modo standalone, asumir que no necesitamos autenticación
      this.isAuthenticated = false;
    }

    // Leer step de URL si está presente (para redirección después del login)
    this.route.queryParams.subscribe((params) => {
      if (params['step']) {
        const stepParam = parseInt(params['step']);
        if (!isNaN(stepParam) && stepParam >= 0 && stepParam <= 3) {
          this.activeIndex = stepParam;
        }
      }
    });

    // Obtener el reservationId de la URL
    this.route.paramMap.subscribe((params) => {
      const reservationIdParam = params.get('reservationId');
      if (reservationIdParam) {
        this.reservationId = +reservationIdParam;

        // NUEVO: Restaurar resumen desde localStorage antes de cargar datos
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

  // NUEVO: Método para disparar la actualización del resumen del pedido
  triggerSummaryRefresh(): void {
    this.summaryRefreshTrigger = { timestamp: Date.now() };
  }

  ngAfterViewInit(): void {
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

    // NUEVO: Limpiar el resumen del localStorage al destruir el componente
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

  /**
   * Detectar si estamos en modo standalone y leer parámetros de configuración
   */
  private detectStandaloneMode(): void {
    // Verificar si la URL contiene 'standalone'
    const currentPath = window.location.pathname;
    this.isStandaloneMode = currentPath.includes('/standalone/');

    // Leer parámetros de query string
    this.route.queryParams.subscribe((params) => {
      // Si viene el parámetro showTransfer25Option=true, activar la opción
      if (params['showTransfer25Option'] === 'true') {
        this.showTransfer25Option = true;
        console.log('✅ showTransfer25Option activado desde URL');
      }
      
      // Si viene el parámetro isTourOperator=true, activar modo TO
      if (params['isTourOperator'] === 'true' || params['isTO'] === 'true') {
        this.isTourOperator = true;
        // Si es TO, también activar showTransfer25Option automáticamente
        this.showTransfer25Option = true;
        console.log('✅ isTourOperator activado desde URL');
      }
    });

    console.log('🔍 Modo standalone:', this.isStandaloneMode);
    console.log('🔍 showTransfer25Option:', this.showTransfer25Option);
    console.log('🔍 isTourOperator:', this.isTourOperator);
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

        // Disparar evento view_cart SOLO la primera vez que se inicializa el componente
        if (!this.componentInitialized && this.activeIndex === 0) {
          this.trackViewCart();
          this.componentInitialized = true;
        }

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

  /**
   * Método llamado cuando se actualizan las actividades
   */
  onActivitiesUpdated(): void {
    console.log('🎯 Las actividades se han actualizado');
    // Disparar actualización del summary inmediatamente
    this.triggerSummaryRefresh();
  }

  /**
   * Maneja el evento de actualización de travelers desde selector-traveler
   */
  async onTravelersUpdated(): Promise<void> {
    console.log('🔔 Checkout recibió evento: travelers actualizados', {
      timestamp: new Date().toISOString(),
      component: 'selector-traveler'
    });
    
    // Recargar viajeros en el selector de habitaciones
    if (this.roomSelector) {
      await this.roomSelector.reloadOnTravelersChange();
    }
    
    // Recargar viajeros en el selector de seguros y actualizar asignaciones
    if (this.insuranceSelector) {
      await this.insuranceSelector.reloadOnTravelersChange();
    }
    
    // Disparar actualización del summary
    this.triggerSummaryRefresh();
  }

  /**
   * NUEVO: Muestra un toast de error
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
   * Maneja las actualizaciones de datos de viajeros (formularios y actividades)
   */
  onTravelerDataUpdated(): void {
    console.log('📝 Datos de viajeros actualizados');
    
    // ✅ Disparar actualización del summary inmediatamente
    this.triggerSummaryRefresh();
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
    this.tourService.getTourById(tourId).subscribe({
      next: (tour) => {
        this.tourName = tour.name || '';
        this.tourSlug = tour.slug || '';
        this.tourData = tour; // Guardar el tour completo para usarlo en analytics

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
          this.itineraryId = null;
        }
      },
      error: (error) => {
        this.itineraryId = null;
      },
    });
  }

  // Método para cargar datos del departure - manteniendo como respaldo
  private loadDepartureData(departureId: number): void {
    this.departureService.getById(departureId).subscribe({
      next: (departure) => {
        // Verificar que departure no sea null antes de acceder a sus propiedades
        if (departure) {
        this.departureDate = departure.departureDate ?? '';
        this.returnDate = departure.arrivalDate ?? '';
        this.departureData = departure; // Almacenar datos del departure

        // NUEVO: Obtener el departureActivityPackId desde el departure
        // Por ahora, vamos a usar un valor por defecto o buscar en la BD
        this.loadDepartureActivityPackId(departureId);

        // Solo asignar si no se ha obtenido desde el tour (como respaldo)
        if (!this.itineraryId && departure.itineraryId) {
          this.itineraryId = departure.itineraryId;
          }
        } else {
          // Si departure es null, establecer valores por defecto
          this.departureDate = '';
          this.returnDate = '';
          this.departureData = null;
        }
      },
      error: (error) => {
        // Error al cargar los datos del departure - continuando sin fechas
        this.departureDate = '';
        this.returnDate = '';
        this.departureData = null;
      },
    });
  }

  // NUEVO: Método para cargar el departureActivityPackId
  private loadDepartureActivityPackId(departureId: number): void {
    // SIMPLIFICADO: No hacer nada especial, solo mantener el departureId como referencia
    this.departureActivityPackId = departureId;
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
        this.pricesByAgeGroup[ageGroup.id] = supplement.basePeriodPrice;
      }
    });

    // MEJORADO: Verificar si hay un resumen persistido en localStorage
    if (this.reservationId && this.summary.length === 0) {
      this.restoreSummaryFromLocalStorage();
    }

    // MEJORADO: Solo inicializar el resumen si no hay uno persistido
    if (this.summary.length === 0) {
      this.initializeOrderSummary();
    } else {
      // NUEVO: Recalcular totales del resumen restaurado
      this.calculateTotals();
      this.updateReservationTotalAmount();
    }

    // NUEVO: Forzar actualización adicional después de un delay para asegurar que los componentes estén listos
    setTimeout(() => {
      if (this.summary.length === 0) {
        this.forceSummaryUpdate();
      }
    }, 500);
  }

  // Método para inicializar el resumen automáticamente
  private initializeOrderSummary(): void {
    // SIMPLIFICADO: Solo verificar una vez cuando se cargan los precios
    this.checkAndInitializeSummary();

    // ELIMINADO: No llamar múltiples veces con delays que sobrescriben el summary
    // Solo verificar una vez más después de un delay si el summary está vacío
    setTimeout(() => {
      if (this.summary.length === 0) {
        this.checkAndInitializeSummary();
      }
    }, 2000);
  }

  // Método para normalizar nombres de grupos de edad
  // Eliminado: no se usan nombres fijos de grupos de edad, se trabaja por ID



  /**
   * Método llamado cuando se actualizan las habitaciones
   */
  onRoomsUpdated(): void {
    console.log('🏠 Las habitaciones se han actualizado');

        // Disparar actualización del summary inmediatamente
        this.triggerSummaryRefresh();
  }

  /**
   * Método llamado cuando cambia la selección de seguro
   */
  async onInsuranceSelectionChange(insuranceData: {
    selectedInsurance: any;
    price: number;
  }): Promise<void> {
    this.selectedInsurance = insuranceData.selectedInsurance;
    this.insurancePrice = insuranceData.price;

    // Guardar inmediatamente cambios de seguro
    try {
      await this.insuranceSelector?.saveInsuranceAssignments?.();
    } catch (err) {
      console.error('Error guardando asignaciones de seguro:', err);
    }

    // Disparar actualización del summary inmediatamente
    this.triggerSummaryRefresh();
  }

  /**
   * Método llamado cuando cambia la selección de vuelos
   */
  async onFlightSelectionChange(flightData: {
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }): Promise<void> {
    this.selectedFlight = flightData.selectedFlight;
    this.flightPrice = flightData.totalPrice; // Ahora es el precio por persona

    // MEJORADO: Verificar si es una opción "Sin Vuelos"
    if (this.selectedFlight && this.isNoFlightOption(this.selectedFlight)) {
      // NUEVO: Forzar precio 0 para opciones "Sin Vuelos"
      this.flightPrice = 0;
    }

    // MEJORADO: Verificar si no hay vuelo seleccionado
    if (!this.selectedFlight) {
      // NUEVO: Forzar precio 0 cuando no hay vuelo
      this.flightPrice = 0;
    }

    // Determinar si hay vuelos disponibles
    this.hasAvailableFlights = this.checkIfFlightsAvailable();

    // Limpiar resumen anterior del localStorage
    if (this.reservationId) {
      localStorage.removeItem(`checkout_summary_${this.reservationId}`);
    }

    // Guardar inmediatamente cambios de vuelos
    try {
      if (
        this.flightManagement?.defaultFlightsComponent?.saveFlightAssignments
      ) {
        await this.flightManagement.defaultFlightsComponent.saveFlightAssignments();
      }
    } catch (err) {
      console.error('Error guardando asignaciones de vuelos:', err);
    }

    // Disparar actualización del summary inmediatamente
    this.triggerSummaryRefresh();
  }

  /**
   * Método para verificar si hay vuelos disponibles
   * MODIFICADO: Ahora verifica si hay flightPacks disponibles en default-flights
   * para determinar si mostrar la opción "Sin Vuelos"
   */
  private checkIfFlightsAvailable(): boolean {
    // NUEVA LÓGICA: Mostrar la opción "Sin Vuelos" solo cuando hay flightPacks disponibles
    // Esto asegura que la opción esté disponible cuando realmente hay vuelos en el sistema

    // Verificar si hay flightPacks disponibles
    if (this.availableFlights && this.availableFlights.length > 0) {
      return true;
    }
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
    // El summary se actualiza automáticamente mediante el componente summary-table
    // Solo disparamos el trigger de actualización
    this.triggerSummaryRefresh();
  }

  // NUEVO: Método para forzar la actualización del summary cuando se cargan datos de habitaciones
  private forceSummaryUpdate(): void {
    // El summary se actualiza automáticamente mediante el componente summary-table
    this.triggerSummaryRefresh();
  }
  // Método para actualizar el resumen del pedido
  updateOrderSummary(ageGroupCounts: { [ageGroupId: number]: number }): void {
    this.summary = [];

    // Plan básico por grupo de edad (dinámico)
    this.ageGroups.forEach((ag) => {
      const qty = ageGroupCounts[ag.id] || 0;
      const price = this.pricesByAgeGroup[ag.id] || 0;
      if (qty > 0 && price > 0) {
        this.summary.push({
          qty,
          value: price,
          description: `Plan básico ${ag.name}`,
        });
      }
    });

    // CORREGIDO: Manejo mejorado de vuelos
    if (this.selectedFlight) {
      // Verificar si es una opción "Sin Vuelos"
      const isNoFlightOption = this.isNoFlightOption(this.selectedFlight);

      if (isNoFlightOption) {
        // CASO "Sin Vuelos": Agregar al resumen con precio 0 y texto "incluido"
        const totalTravelers = Object.values(ageGroupCounts).reduce(
          (a, b) => a + b,
          0
        );

        const noFlightItem = {
          qty: totalTravelers,
          value: 0, // Precio 0 para "Sin Vuelos"
          description: 'Sin Vuelos',
        };
        this.summary.push(noFlightItem);
      } else if (this.flightPrice > 0) {
        // Vuelo con precio: agregar normalmente
        const totalTravelers = Object.values(ageGroupCounts).reduce(
          (a, b) => a + b,
          0
        );

        const flightItem = {
          qty: totalTravelers,
          value: this.flightPrice, // Precio por persona
          description: `Vuelo ${
            this.selectedFlight.flights[0]?.departureCity || ''
          } - ${this.selectedFlight.flights[0]?.arrivalCity || ''}`,
        };
        this.summary.push(flightItem);
      }
    } else {
      // CASO: No hay vuelo seleccionado (estado inicial o después de recarga)
      const totalTravelers = Object.values(ageGroupCounts).reduce(
        (a, b) => a + b,
        0
      );

      const noFlightItem = {
        qty: totalTravelers,
        value: 0, // Precio 0 para "Sin Vuelos"
        description: 'Sin Vuelos',
      };
      this.summary.push(noFlightItem);
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
      const totalTravelers = Object.values(ageGroupCounts).reduce(
        (a, b) => a + b,
        0
      );

      this.selectedActivities.forEach((activity) => {
        const activityPrice =
          activity.priceData?.find(
            (price: any) =>
              price.age_group_name === this.ageGroups[0]?.name || 'Adultos'
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

    // SEGURO SELECCIONADO (solo desde BD)
    if (this.selectedInsurance) {
      const totalTravelers = Object.values(ageGroupCounts).reduce(
        (a, b) => a + b,
        0
      );

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

    // NUEVO: Log específico para verificar "Sin Vuelos"
    const hasNoFlight = this.summary.some(
      (item) => item.description === 'Sin Vuelos'
    );

    // NUEVO: Persistir el resumen en localStorage para mantener consistencia
    this.persistSummaryToLocalStorage();

    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  // NUEVO: Método para verificar si un vuelo es la opción "Sin Vuelos"
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

  // NUEVO: Método para persistir el resumen en localStorage
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
      } catch (error) {
        console.warn('No se pudo persistir el resumen en localStorage:', error);
      }
    }
  }

  // NUEVO: Método para recuperar el resumen desde localStorage
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
            this.cdr.detectChanges();
          } else {
            localStorage.removeItem(`checkout_summary_${this.reservationId}`);
          }
        }
      } catch (error) {
        localStorage.removeItem(`checkout_summary_${this.reservationId}`);
      }
    }
  }

  // Método para calcular totales
  calculateTotals(): void {
    // Calcular subtotal (solo valores positivos) - mantener para compatibilidad
    this.subtotal = this.summary.reduce((acc, item) => {
      const itemTotal = item.value * item.qty;
      if (item.value >= 0) {
        return acc + itemTotal;
      }
      return acc;
    }, 0);

    // MODIFICADO: No calcular total en frontend, usar el que viene del backend
    // El totalAmountCalculated se actualizará desde el backend cuando se recargue el resumen
  }

  // Método para actualizar totalAmount en la reserva
  private updateReservationTotalAmount(): void {
    if (!this.reservationId || !this.reservationData) {
      return;
    }

    // MODIFICADO: No sobrescribir el totalAmount del backend
    // Solo actualizar la variable local para mantener consistencia, pero no sobrescribir el backend
    this.totalAmount = this.reservationData.totalAmount;
    this.totalAmountCalculated = this.reservationData.totalAmount;
  }

  // Método para guardar actividades seleccionadas (CON SOPORTE COMPLETO PARA PACKS)
  async saveActivitiesAssignments(): Promise<boolean> {
    if (
      !this.reservationId ||
      !this.selectedActivities ||
      this.selectedActivities.length === 0
    ) {
      return true; // Si no hay actividades seleccionadas, consideramos exitoso
    }

    try {
      // Verificar que tenemos el componente travelerSelector con datos
      if (!this.travelerSelector) {
        console.error('No se encontró el componente travelerSelector');
        throw new Error('No se encontró información de viajeros');
      }

      // Obtener los travelers desde el componente travelerSelector
      const existingTravelers = this.travelerSelector.travelers || [];

      if (existingTravelers.length === 0) {
        console.error('No se encontraron viajeros para esta reserva');
        throw new Error('No se encontraron viajeros para esta reserva');
      }

      // Limpiar actividades y packs existentes para esta reserva
      await this.clearExistingActivitiesAndPacks(existingTravelers);

      // Separar actividades individuales y packs
      const individualActivities = this.selectedActivities.filter(
        (activity) => activity.type === 'act'
      );
      const activityPacks = this.selectedActivities.filter(
        (activity) => activity.type === 'pack'
      );

      const createPromises: Promise<any>[] = [];

      // Crear asignaciones para actividades individuales
      individualActivities.forEach((activity) => {
        existingTravelers.forEach((traveler: any) => {
          const activityAssignment = {
            id: 0,
            reservationTravelerId: traveler.id,
            activityId: activity.id,
          };

          const createPromise = new Promise((resolve, reject) => {
            this.reservationTravelerActivityService
              .create(activityAssignment)
              .subscribe({
                next: (result) => {
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

          const createPromise = new Promise((resolve, reject) => {
            this.reservationTravelerActivityPackService
              .create(packAssignment)
              .subscribe({
                next: (result) => {
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
        } catch (error) {
          console.error(
            'Error durante la ejecución de operaciones de creación:',
            error
          );
          throw error; // Re-lanzar el error para que sea capturado por el catch externo
        }
      } else {
      }

      return true;
    } catch (error) {
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
    const deletePromises: Promise<any>[] = [];
    let totalActivitiesFound = 0;
    let totalPacksFound = 0;
    let totalActivitiesDeleted = 0;
    let totalPacksDeleted = 0;

    for (const traveler of existingTravelers) {
      try {
        // Obtener y eliminar actividades individuales existentes
        const existingActivities = await new Promise<any[]>(
          (resolve, reject) => {
            this.reservationTravelerActivityService
              .getByReservationTraveler(traveler.id)
              .subscribe({
                next: (activities) => {
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
            this.reservationTravelerActivityService
              .delete(activity.id)
              .subscribe({
                next: (result) => {
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
            this.reservationTravelerActivityPackService
              .delete(pack.id)
              .subscribe({
                next: (result) => {
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
      try {
        await Promise.all(deletePromises);
      } catch (error) {
        console.warn(
          'Algunas eliminaciones fallaron, pero continuando:',
          error
        );
      }
    } else {
    }
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
    const previousIndex = this.activeIndex;
    this.activeIndex = index;
    this.updateStepInUrl(index);

    // Disparar evento begin_checkout cuando pasa del paso 0 al paso 1
    if (previousIndex === 0 && index === 1) {
      this.trackBeginCheckout();
    }

    // Disparar evento view_flights_info cuando visualiza el paso de vuelos
    if (index === 1 && !this.viewFlightsInfoEventFired) {
      this.trackViewFlightsInfo();
      this.viewFlightsInfoEventFired = true;
    }

    // Disparar evento add_flights_info cuando pasa del paso 1 (vuelos) al paso 2 (datos pasajeros)
    if (previousIndex === 1 && index === 2) {
      this.trackAddFlightsInfo();
    }

    // Disparar evento view_personal_info cuando visualiza el paso de datos de pasajeros
    if (index === 2 && !this.viewPersonalInfoEventFired) {
      this.trackViewPersonalInfo();
      this.viewPersonalInfoEventFired = true;
    }

    // Disparar evento add_personal_info cuando pasa del paso 2 (datos) al paso 3 (pago)
    if (previousIndex === 2 && index === 3) {
      this.trackAddPersonalInfo();
    }

    // Disparar evento view_payment_info cuando visualiza el paso de pago
    if (index === 3 && !this.viewPaymentInfoEventFired) {
      this.trackViewPaymentInfo();
      this.viewPaymentInfoEventFired = true;
    }

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
    // Verificar que tengamos todos los datos necesarios
    if (!this.infoTravelers) {
      return;
    }

    if (!this.departureId || !this.reservationId) {
      return;
    }

    // Verificar si el componente ya tiene datos cargados
    if (
      !this.infoTravelers.travelers ||
      this.infoTravelers.travelers.length === 0
    ) {
      // Usar un pequeño delay para asegurar que el componente esté completamente renderizado
      setTimeout(() => {
        try {
          this.infoTravelers.reloadData();
        } catch (error) {
          console.error('Error al recargar datos:', error);
        }
      }, 200);
    }
  }

  /**
   * Inicializa componentes de personalización
   */
  private initializePersonalizationComponents(): void {}

  /**
   */
  private initializeFlightManagementComponent(): void {}

  /**
   * Inicializa componente de pago
   */
  private initializePaymentComponent(): void {
    // Lógica para componente de pago si es necesaria
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
  private logComponentState(): void {}

  // NUEVO: Método para guardar todos los datos del paso 0 (personaliza tu viaje)
  private async saveStep0Data(): Promise<boolean> {
    try {
      // Verificar que los componentes necesarios estén disponibles
      if (
        !this.travelerSelector ||
        !this.roomSelector ||
        !this.insuranceSelector ||
        !this.activitiesOptionals
      ) {
        console.error('Componentes requeridos no están disponibles:', {
          travelerSelector: !!this.travelerSelector,
          roomSelector: !!this.roomSelector,
          insuranceSelector: !!this.insuranceSelector,
          activitiesOptionals: !!this.activitiesOptionals,
        });
        this.messageService.add({
          severity: 'error',
          summary: 'Error de inicialización',
          detail:
            'Los componentes necesarios no están disponibles. Por favor, recarga la página.',
          life: 5000,
        });
        return false;
      }

      // Los travelers se guardan automáticamente al hacer cambios, no hay pendientes

      // 1. Verificar habitaciones seleccionadas
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
        return false;
      }

      // 3. Recargar travelers después de guardar cambios
      await this.roomSelector.loadExistingTravelers();
      this.insuranceSelector.loadExistingTravelers();

      // 4. Actualizar el resumen
      this.triggerSummaryRefresh();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 6. Guardar asignaciones de habitaciones y actividades EN PARALELO (SIN seguros)

      const [roomsSaved, activitiesSaved] = await Promise.allSettled([
        this.roomSelector.saveRoomAssignments(),
        this.saveActivitiesAssignments(),
      ]);

      // Verificar que las operaciones fueron exitosas
      if (roomsSaved.status === 'rejected') {
        console.error('Error al guardar habitaciones:', roomsSaved.reason);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al guardar habitaciones',
          detail:
            'Hubo un error al guardar las asignaciones de habitaciones. Por favor, inténtalo de nuevo.',
          life: 5000,
        });
        return false;
      }

      if (activitiesSaved.status === 'rejected') {
        console.error('Error al guardar actividades:', activitiesSaved.reason);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al guardar actividades',
          detail:
            'Hubo un error al guardar las actividades seleccionadas. Por favor, inténtalo de nuevo.',
          life: 5000,
        });
        return false;
      }

      // Verificar que las operaciones fueron exitosas
      if (!roomsSaved.value || !activitiesSaved.value) {
        const failedOperations = [];
        if (!roomsSaved.value) failedOperations.push('habitaciones');
        if (!activitiesSaved.value) failedOperations.push('actividades');

        this.messageService.add({
          severity: 'error',
          summary: 'Error al guardar',
          detail: `No se pudieron guardar: ${failedOperations.join(
            ', '
          )}. Por favor, inténtalo de nuevo.`,
          life: 5000,
        });
        return false;
      }

      // 7. Actualizar datos de la reserva
      if (this.reservationId && this.reservationData) {
        const reservationUpdateData = {
          ...this.reservationData,
          totalPassengers: this.totalPassengers,
          updatedAt: new Date().toISOString(),
        };

        await new Promise((resolve, reject) => {
          this.reservationService
            .update(this.reservationId!, reservationUpdateData)
            .subscribe({
              next: (response) => {
                let isSuccess = false;

                if (typeof response === 'boolean') {
                  isSuccess = response;
                } else if (typeof response === 'object' && response !== null) {
                  const responseObj = response as any;
                  isSuccess =
                    responseObj.success !== false &&
                    responseObj.error === undefined &&
                    responseObj.status !== 'error';
                } else if (response !== null && response !== undefined) {
                  isSuccess = true;
                }

                if (isSuccess) {
                  this.reservationData.totalPassengers = this.totalPassengers;

                  this.messageService.add({
                    severity: 'success',
                    summary: 'Guardado exitoso',
                    detail: `Datos guardados correctamente para ${
                      this.totalPassengers
                    } viajeros con ${
                      this.selectedActivities?.length || 0
                    } actividades.`,
                    life: 3000,
                  });

                  resolve(response);
                } else {
                  console.error(
                    'La actualización no fue exitosa. Respuesta:',
                    response
                  );
                  reject(
                    new Error(
                      `Error al actualizar la reserva. Respuesta del servicio: ${JSON.stringify(
                        response
                      )}`
                    )
                  );
                }
              },
              error: (error) => {
                console.error(
                  'Error en la llamada al servicio de actualización:',
                  error
                );
                reject(
                  new Error(
                    `Error al actualizar la reserva: ${
                      error.message || 'Error desconocido'
                    }`
                  )
                );
              },
            });
        });
      }

      return true;
    } catch (error) {
      console.error('Error en saveStep0Data:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error inesperado',
        detail:
          'Hubo un error al guardar los datos. Por favor, inténtalo de nuevo.',
        life: 5000,
      });
      return false;
    }
  }

  async nextStepWithValidation(targetStep: number): Promise<void> {
    // NUEVO: Activar loading para el paso 0
    if (targetStep === 1) {
      this.isStep0Saving = true;
    }

    try {
      // ✅ NUEVO: En modo standalone, omitir validación de autenticación
      if (this.isStandaloneMode) {
        await this.performStepValidation(targetStep);
        return;
      }

      // Verificar autenticación para pasos que la requieren (solo en modo normal)
      if (targetStep >= 2) {
        // ✅ MEJORADO: El servicio ahora espera automáticamente a que termine la verificación inicial
        const isLoggedIn = await new Promise<boolean>((resolve) => {
          const subscription = this.authService.isLoggedIn().subscribe({
            next: (loggedIn) => {
              resolve(loggedIn);
              subscription.unsubscribe();
            },
            error: (error) => {
              console.error('❌ Error al verificar autenticación:', error);
              // En caso de error, asumir que no está logueado por seguridad
              resolve(false);
              subscription.unsubscribe();
            }
          });
        });

        if (!isLoggedIn) {
          // Usuario no está logueado, mostrar modal
          sessionStorage.setItem('redirectUrl', window.location.pathname);
          this.loginDialogVisible = true;
          return;
        }
        
        // Usuario está logueado, actualizar variable local y continuar con la validación normal
        this.isAuthenticated = true;
        await this.performStepValidation(targetStep);
        return;
      }

      // Para el paso 0 (personalizar viaje) y paso 1 (vuelos), no se requiere autenticación
      await this.performStepValidation(targetStep);
    } finally {
      // NUEVO: Desactivar loading para el paso 0
      if (targetStep === 1) {
        this.isStep0Saving = false;
      }
    }
  }

  private async performStepValidation(targetStep: number): Promise<void> {
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

    // NUEVO: Guardar datos del paso 0 (personaliza tu viaje) antes de continuar al paso 1
    if (targetStep === 1) {
      const step0Saved = await this.saveStep0Data();
      if (!step0Saved) {
        return; // No continuar si no se pudieron guardar los datos
      }
    }

    // Validar datos de viajeros antes de continuar al paso de pago (targetStep === 3)
    if (targetStep === 3) {
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

      // ✅ NUEVO: Validar que todos los viajeros estén listos para continuar
      console.log('=== Validando viajeros antes de continuar al pago ===');
      const allTravelersReady = await this.infoTravelers.canContinueToNextStep();

      if (!allTravelersReady) {
        // ❌ Algunos viajeros no están listos
        console.log('❌ Validación de viajeros fallida: no se puede continuar');
        
        // Mostrar error específico indicando qué viajeros faltan
        this.infoTravelers.showValidationError();
        
        return; // No continuar al siguiente paso
      }

      // ✅ Todos los viajeros están listos
      console.log('✅ Validación de viajeros exitosa: todos los viajeros están listos');
    }

    // Navegar al siguiente paso
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

  // Bandera para evitar múltiples actualizaciones de userId
  private isUpdatingUserId: boolean = false;

  /**
   * Verifica si el userId está vacío y el usuario está logueado, y actualiza la reservación si es necesario
   */
  private checkAndUpdateUserId(reservation: any): void {
    // Verificar si el userId está vacío
    if (!reservation.userId && !this.isUpdatingUserId) {
      this.isUpdatingUserId = true;
      
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
                  this.isUpdatingUserId = false;
                }
              },
              error: (error) => {
                console.error(
                  '❌ Error buscando usuario por Cognito ID:',
                  error
                );
                this.isUpdatingUserId = false;
              },
            });
          } else {
            this.isUpdatingUserId = false;
          }
        },
        error: (error) => {
          console.error('❌ Error obteniendo Cognito ID:', error);
          this.isUpdatingUserId = false;
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
        this.isUpdatingUserId = false;
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
        this.isUpdatingUserId = false;
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

    // ✅ MEJORADO: El servicio ahora espera automáticamente a que termine la verificación inicial
    const isLoggedIn = await new Promise<boolean>((resolve) => {
      const subscription = this.authService.isLoggedIn().subscribe({
        next: (loggedIn) => {
          resolve(loggedIn);
          subscription.unsubscribe();
        },
        error: (error) => {
          console.error('❌ Error al verificar autenticación:', error);
          resolve(false);
          subscription.unsubscribe();
        }
      });
    });

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
  }

  /**
   * ✅ MÉTODO MEJORADO: Manejar la selección de "sin vuelos" con bloqueo de paso
   */
  private async handleFlightlessSelection(): Promise<void> {
    try {
      // ✅ NUEVO: Activar estado de procesamiento
      this.isFlightlessProcessing = true;
      this.flightlessProcessingMessage = 'Procesando selección sin vuelos...';

      // Buscar el paquete de vuelos real que corresponde a "sin vuelos"
      if (this.hasAvailableFlights && this.availableFlights) {
        const flightlessPack = this.availableFlights.find(
          (pack: IFlightPackDTO) => {
            const name = pack.name?.toLowerCase() || '';
            const description = pack.description?.toLowerCase() || '';
            const isFlightless =
              name.includes('sin vuelos') ||
              description.includes('sin vuelos') ||
              name.includes('pack sin vuelos') ||
              description.includes('pack sin vuelos');

            return isFlightless;
          }
        );

        if (flightlessPack) {
          // ✅ NUEVO: Usar la lógica simplificada del componente default-flights y ESPERAR
          if (this.flightManagement && this.reservationId) {
            // NUEVO: Actualizar mensaje de procesamiento
            this.flightlessProcessingMessage =
              'Guardando asignaciones sin vuelos...';

            // ✅ NUEVO: Llamar al método del componente default-flights para asignar "sin vuelos" y ESPERAR
            await this.flightManagement.defaultFlightsComponent.saveFlightAssignmentsForAllTravelers(
              0,
              true
            );

            // ✅ NUEVO: Continuar con la selección de "Sin Vuelos" y ESPERAR
            await this.continueWithFlightlessSelection(flightlessPack);
          } else {
            await this.continueWithFlightlessSelection(flightlessPack);
          }
        } else {
          console.error('❌ No se encontró paquete sin vuelos disponible');
          this.availableFlights.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
          }));

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

        // ✅ NUEVO: Mostrar error y desactivar procesamiento
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No hay vuelos disponibles en el sistema',
          life: 5000,
        });
      }
    } catch (error) {
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
    }
  }

  /**
   * ✅ MÉTODO MEJORADO: Continuar con la selección de "Sin Vuelos" (sin cambio automático de paso)
   */
  private async continueWithFlightlessSelection(
    flightlessPack: IFlightPackDTO
  ): Promise<void> {
    // ✅ NUEVO: Actualizar mensaje de procesamiento
    this.flightlessProcessingMessage = 'Actualizando resumen y datos...';

    // Actualizar el selectedFlight
    this.selectedFlight = flightlessPack;

    // Llamar a onFlightSelectionChange para actualizar el resumen
    this.onFlightSelectionChange({
      selectedFlight: flightlessPack,
      totalPrice: 0, // precio 0 para opción sin vuelos
    });

    // ✅ NUEVO: Actualizar mensaje de procesamiento
    this.flightlessProcessingMessage = 'Recalculando precios...';

    // Actualizar el resumen
    this.triggerSummaryRefresh();

    // ✅ NUEVO: Mostrar mensaje de éxito
    this.messageService.add({
      severity: 'success',
      summary: 'Sin vuelos seleccionado',
      detail:
        'La opción sin vuelos ha sido seleccionada y guardada correctamente. Ahora puedes continuar al siguiente paso.',
      life: 5000,
    });

    // ✅ NUEVO: NO cambiar automáticamente de paso - el usuario debe hacer clic en "Continuar"
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
                    // Disparar evento add_to_wishlist
                    this.trackAddToWishlist();

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

  // Construir conteo de grupos de edad de fallback usando el primer grupo
  private buildFallbackAgeGroupCounts(total: number): {
    [ageGroupId: number]: number;
  } {
    const counts: { [id: number]: number } = {};
    if (this.ageGroups && this.ageGroups.length > 0) {
      const firstId = this.ageGroups
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder)[0].id;
      counts[firstId] = Math.max(1, total || 1);
    }
    return counts;
  }

  // ✅ NUEVO: Método para limpiar el resumen del localStorage
  private clearSummaryFromLocalStorage(): void {
    if (this.reservationId) {
      try {
        localStorage.removeItem(`checkout_summary_${this.reservationId}`);
      } catch (error) {
        console.warn('⚠️ Error al limpiar resumen del localStorage:', error);
      }
    }
  }

  // ✅ NUEVO: Método para limpiar localStorage cuando se complete el checkout
  public onCheckoutComplete(): void {
    this.clearSummaryFromLocalStorage();
  }

  // ✅ NUEVO: Método para limpiar localStorage cuando se cancele el checkout
  public onCheckoutCancel(): void {
    this.clearSummaryFromLocalStorage();
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
    if (stepNumber === 1) {
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
      // Para otros steps, usar la navegación estándar
      this.onActiveIndexChange(stepNumber);
    }
  }

  /**
   * Maneja el cambio de total desde el summary-table
   * @param newTotal Nuevo total calculado
   */
  onTotalChanged(newTotal: number): void {
    this.totalAmountCalculated = newTotal;
    this.cdr.detectChanges();
  }

  /**
   * Maneja el evento de pago completado
   * @param paymentOption Opción de pago seleccionada
   */
  public onPaymentCompleted(paymentOption: any): void {
    this.trackAddPaymentInfo(paymentOption);
  }

  /**
   * ✅ NUEVO: Limpia el estado relacionado con la selección de vuelos
   */
  private clearFlightSelectionState(): void {
    // Resetear vuelo seleccionado
    this.selectedFlight = null;
    this.flightPrice = 0;

    // Actualizar el resumen sin vuelos
    this.triggerSummaryRefresh();
  }

  /**
   * Disparar evento view_cart cuando se visualiza el checkout paso 1
   */
  private trackViewCart(): void {
    if (!this.reservationData) return;

    const tourData = this.reservationData.tour || {};
    
    // Obtener item_list_id y item_list_name desde el state del router (heredados desde home)
    const state = window.history.state;
    const itemListId = state?.['listId'] || '';
    const itemListName = state?.['listName'] || '';
    
    // Calcular pasajeros niños dinámicamente
    const childrenCount = this.getChildrenPassengersCount();
    
    // Obtener ID del tour usando el helper
    const tourItemId = this.getTourItemId();
    
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.viewCart(
          'EUR',
          this.totalAmountCalculated || this.totalAmount || 0,
          {
            item_id: tourItemId,
            item_name: this.tourName || tourData.name || '',
            coupon: '',
            discount: 0,
            index: 1,
            item_brand: 'Different Roads',
            item_category: tourData.destination?.continent || '',
            item_category2: tourData.destination?.country || '',
            item_category3: tourData.marketingSection?.marketingSeasonTag || '',
            item_category4: tourData.monthTags?.join(', ') || '',
            item_category5: tourData.tourType || '',
            item_list_id: itemListId,
            item_list_name: itemListName,
            item_variant: `${tourData.tkId || tourData.id} - ${this.selectedFlight?.name || 'Sin vuelo'}`,
            price: this.totalAmountCalculated || this.totalAmount || 0,
            quantity: 1,
            puntuacion: tourData.rating?.toString() || '',
            duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
            start_date: this.departureDate || '',
            end_date: this.returnDate || '',
            pasajeros_adultos: this.totalPassengers?.toString() || '0',
            pasajeros_niños: childrenCount
          },
          userData
        );
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        this.analyticsService.viewCart(
          'EUR',
          this.totalAmountCalculated || this.totalAmount || 0,
          {
            item_id: this.getTourItemId(), // ✅ Priorizar ID real de BD
            item_name: this.tourName || tourData.name || '',
            coupon: '',
            discount: 0,
            index: 1,
            item_brand: 'Different Roads',
            item_category: tourData.destination?.continent || '',
            item_category2: tourData.destination?.country || '',
            item_category3: tourData.marketingSection?.marketingSeasonTag || '',
            item_category4: tourData.monthTags?.join(', ') || '',
            item_category5: tourData.tourType || '',
            item_list_id: itemListId,
            item_list_name: itemListName,
            item_variant: `${tourData.tkId || tourData.id} - ${this.selectedFlight?.name || 'Sin vuelo'}`,
            price: this.totalAmountCalculated || this.totalAmount || 0,
            quantity: 1,
            puntuacion: tourData.rating?.toString() || '',
            duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
            start_date: this.departureDate || '',
            end_date: this.returnDate || '',
            pasajeros_adultos: this.totalPassengers?.toString() || '0',
            pasajeros_niños: childrenCount
          },
          this.getUserData()
        );
      }
    });
  }

  /**
   * Obtener el ID del tour desde múltiples fuentes
   * Prioridad: tourData.id (de BD) > reservationData.tour.id > tourId > tkId
   */
  private getTourItemId(): string {
    const tourData = this.reservationData?.tour || {};
    return this.tourData?.id?.toString() || 
           tourData.id?.toString() || 
           this.tourId?.toString() || 
           tourData.tkId?.toString() || 
           '';
  }

  /**
   * Calcular el número de pasajeros niños (menores de edad) dinámicamente
   * NOTA: Simplificado para independencia de componentes
   */
  private getChildrenPassengersCount(): string {
    // Retornar 0 ya que cada componente maneja sus propios datos
    return '0';
  }

  /**
   * Disparar evento begin_checkout cuando el usuario continúa del paso 1
   */
  private trackBeginCheckout(): void {
    if (!this.reservationData) return;

    const tourData = this.reservationData.tour || {};
    
    // Obtener item_list_id y item_list_name desde el state del router (heredados desde home)
    const state = window.history.state;
    const itemListId = state?.['listId'] || '';
    const itemListName = state?.['listName'] || '';
    
    // Obtener actividades seleccionadas
    const activitiesText =
      this.selectedActivities && this.selectedActivities.length > 0
        ? this.selectedActivities.map((a) => a.description || a.name).join(', ')
        : '';

    // Obtener seguro seleccionado
    const selectedInsurance = this.reservationData.insurance?.name || '';
    
    // Calcular pasajeros niños dinámicamente
    const childrenCount = this.getChildrenPassengersCount();
    
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.beginCheckout(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(),
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${this.selectedFlight?.name || 'Sin vuelo'}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance
            }]
          },
          userData
        );
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        this.analyticsService.beginCheckout(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(), // ✅ Priorizar ID real de BD
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${this.selectedFlight?.name || 'Sin vuelo'}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance
            }]
          },
          this.getUserData()
        );
      }
    });
  }

  /**
   * Disparar evento view_flights_info cuando se visualiza el paso de vuelos
   */
  private trackViewFlightsInfo(): void {
    if (!this.reservationData) return;

    const tourData = this.reservationData.tour || {};
    
    // Obtener item_list_id y item_list_name desde el state del router (heredados desde home)
    const state = window.history.state;
    const itemListId = state?.['listId'] || '';
    const itemListName = state?.['listName'] || '';
    
    // Obtener actividades seleccionadas
    const activitiesText =
      this.selectedActivities && this.selectedActivities.length > 0
        ? this.selectedActivities.map((a) => a.description || a.name).join(', ')
        : '';

    // Obtener seguro seleccionado
    const selectedInsurance = this.reservationData.insurance?.name || '';
    
    // Calcular pasajeros niños dinámicamente
    const childrenCount = this.getChildrenPassengersCount();
    
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.viewFlightsInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(),
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${this.selectedFlight?.name || 'Sin vuelo'}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance
            }]
          },
          userData
        );
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        this.analyticsService.viewFlightsInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(), // ✅ Priorizar ID real de BD
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${this.selectedFlight?.name || 'Sin vuelo'}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance
            }]
          },
          this.getUserData()
        );
      }
    });
  }

  /**
   * Disparar evento add_flights_info cuando el usuario selecciona vuelo y continúa
   */
  private trackAddFlightsInfo(): void {
    if (!this.reservationData) return;

    const tourData = this.reservationData.tour || {};
    
    // Obtener item_list_id y item_list_name desde el state del router (heredados desde home)
    const state = window.history.state;
    const itemListId = state?.['listId'] || '';
    const itemListName = state?.['listName'] || '';
    
    // Obtener actividades seleccionadas
    const activitiesText =
      this.selectedActivities && this.selectedActivities.length > 0
        ? this.selectedActivities.map((a) => a.description || a.name).join(', ')
        : '';

    // Obtener seguro seleccionado
    const selectedInsurance = this.reservationData.insurance?.name || '';

    // Obtener ciudad de vuelo seleccionado
    const flightCity = this.selectedFlight?.name || 'Sin vuelo';
    
    // Calcular pasajeros niños dinámicamente
    const childrenCount = this.getChildrenPassengersCount();
    
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.addFlightsInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(),
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance,
              vuelo: flightCity
            }]
          },
          userData
        );
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        this.analyticsService.addFlightsInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(), // ✅ Priorizar ID real de BD
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance,
              vuelo: flightCity
            }]
          },
          this.getUserData()
        );
      }
    });
  }

  /**
   * Disparar evento view_personal_info cuando se visualiza el paso de datos de pasajeros
   */
  private trackViewPersonalInfo(): void {
    if (!this.reservationData) return;

    const tourData = this.reservationData.tour || {};
    
    // Obtener item_list_id y item_list_name desde el state del router (heredados desde home)
    const state = window.history.state;
    const itemListId = state?.['listId'] || '';
    const itemListName = state?.['listName'] || '';
    
    // Obtener actividades seleccionadas
    const activitiesText =
      this.selectedActivities && this.selectedActivities.length > 0
        ? this.selectedActivities.map((a) => a.description || a.name).join(', ')
        : '';

    // Obtener seguro seleccionado
    const selectedInsurance = this.reservationData.insurance?.name || '';

    // Obtener ciudad de vuelo seleccionado
    const flightCity = this.selectedFlight?.name || 'Sin vuelo';
    
    // Calcular pasajeros niños dinámicamente
    const childrenCount = this.getChildrenPassengersCount();
    
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.viewPersonalInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(),
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance,
              vuelo: flightCity
            }]
          },
          userData
        );
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        this.analyticsService.viewPersonalInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(), // ✅ Priorizar ID real de BD
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance,
              vuelo: flightCity
            }]
          },
          this.getUserData()
        );
      }
    });
  }

  /**
   * Disparar evento add_payment_info cuando el usuario selecciona método de pago
   */
  private trackAddPaymentInfo(paymentOption?: any): void {
    if (!this.reservationData) return;

    const tourData = this.reservationData.tour || {};
    
    // Obtener item_list_id y item_list_name desde el state del router (heredados desde home)
    const state = window.history.state;
    const itemListId = state?.['listId'] || '';
    const itemListName = state?.['listName'] || '';
    
    // Obtener actividades seleccionadas
    const activitiesText =
      this.selectedActivities && this.selectedActivities.length > 0
        ? this.selectedActivities.map((a) => a.description || a.name).join(', ')
        : '';

    // Obtener seguro seleccionado
    const selectedInsurance = this.reservationData.insurance?.name || '';

    // Obtener ciudad de vuelo seleccionado
    const flightCity = this.selectedFlight?.name || 'Sin vuelo';
    
    // Obtener método de pago seleccionado (dinámico)
    let paymentType = 'completo, transferencia'; // Valor por defecto

    if (paymentOption) {
      const method =
        paymentOption.method === 'creditCard' ? 'tarjeta' : 'transferencia';
      const type = paymentOption.type === 'deposit' ? 'depósito' : 'completo';
      paymentType = `${type}, ${method}`;
    }
    
    // Calcular pasajeros niños dinámicamente
    const childrenCount = this.getChildrenPassengersCount();
    
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.addPaymentInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            payment_type: paymentType,
            items: [{
              item_id: this.getTourItemId(),
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance,
              vuelo: flightCity
            }]
          },
          userData
        );
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        this.analyticsService.addPaymentInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            payment_type: paymentType,
            items: [{
              item_id: this.getTourItemId(),
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance,
              vuelo: flightCity
            }]
          },
          this.getUserData()
        );
      }
    });
  }

  /**
   * Disparar evento view_payment_info cuando el usuario visualiza el paso de pago
   */
  private trackViewPaymentInfo(): void {
    if (!this.reservationData) return;

    const tourData = this.reservationData.tour || {};
    
    // Obtener item_list_id y item_list_name desde el state del router (heredados desde home)
    const state = window.history.state;
    const itemListId = state?.['listId'] || '';
    const itemListName = state?.['listName'] || '';
    
    // Obtener actividades seleccionadas
    const activitiesText =
      this.selectedActivities && this.selectedActivities.length > 0
        ? this.selectedActivities.map((a) => a.description || a.name).join(', ')
        : '';

    // Obtener seguro seleccionado
    const selectedInsurance = this.reservationData.insurance?.name || '';

    // Obtener ciudad de vuelo seleccionado
    const flightCity = this.selectedFlight?.name || 'Sin vuelo';
    
    // Calcular pasajeros niños dinámicamente
    const childrenCount = this.getChildrenPassengersCount();
    
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.viewPaymentInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(),
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance,
              vuelo: flightCity
            }]
          },
          userData
        );
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        this.analyticsService.viewPaymentInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(),
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance,
              vuelo: flightCity
            }]
          },
          this.getUserData()
        );
      }
    });
  }

  /**
   * Disparar evento add_personal_info cuando el usuario completa datos de pasajeros
   */
  private trackAddPersonalInfo(): void {
    if (!this.reservationData) return;

    const tourData = this.reservationData.tour || {};
    
    // Obtener item_list_id y item_list_name desde el state del router (heredados desde home)
    const state = window.history.state;
    const itemListId = state?.['listId'] || '';
    const itemListName = state?.['listName'] || '';
    
    // Obtener actividades seleccionadas
    const activitiesText =
      this.selectedActivities && this.selectedActivities.length > 0
        ? this.selectedActivities.map((a) => a.description || a.name).join(', ')
        : '';

    // Obtener seguro seleccionado
    const selectedInsurance = this.reservationData.insurance?.name || '';

    // Obtener ciudad de vuelo seleccionado
    const flightCity = this.selectedFlight?.name || 'Sin vuelo';
    
    // Calcular pasajeros niños dinámicamente
    const childrenCount = this.getChildrenPassengersCount();
    
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.addPersonalInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(),
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance,
              vuelo: flightCity
            }]
          },
          userData
        );
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        this.analyticsService.addPersonalInfo(
          {
            currency: 'EUR',
            value: this.totalAmountCalculated || this.totalAmount || 0,
            coupon: this.reservationData.coupon?.code || '',
            items: [{
              item_id: this.getTourItemId(),
              item_name: this.tourName || tourData.name || '',
              coupon: '',
              discount: 0,
              index: 1,
              item_brand: 'Different Roads',
              item_category: tourData.destination?.continent || '',
              item_category2: tourData.destination?.country || '',
              item_category3: tourData.marketingSection?.marketingSeasonTag || '',
              item_category4: tourData.monthTags?.join(', ') || '',
              item_category5: tourData.tourType || '',
              item_list_id: itemListId,
              item_list_name: itemListName,
              item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
              price: this.totalAmountCalculated || this.totalAmount || 0,
              quantity: 1,
              puntuacion: tourData.rating?.toString() || '',
              duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
              start_date: this.departureDate || '',
              end_date: this.returnDate || '',
              pasajeros_adultos: this.totalPassengers?.toString() || '0',
              pasajeros_niños: childrenCount,
              actividades: activitiesText,
              seguros: selectedInsurance,
              vuelo: flightCity
            }]
          },
          this.getUserData()
        );
      }
    });
  }

  /**
   * Disparar evento add_to_wishlist cuando se guarda presupuesto desde checkout
   */
  private trackAddToWishlist(): void {
    if (!this.reservationData) return;

    const tourData = this.reservationData.tour || {};
    
    // Obtener item_list_id y item_list_name dinámicamente desde query params
    const queryParams = this.route.snapshot.queryParams;
    const itemListId = queryParams['listId'] || 'saved_budgets';
    const itemListName = queryParams['listName'] || 'Presupuestos guardados';
    
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.addToWishlist(
          itemListId,
          itemListName,
          {
            item_id: this.getTourItemId(),
            item_name: this.tourName || tourData.name || '',
            coupon: '',
            discount: 0,
            index: 1, // Índice dinámico basado en la posición del tour
            item_brand: 'Different Roads',
            item_category: tourData.destination?.continent || '',
            item_category2: tourData.destination?.country || '',
            item_category3: tourData.marketingSection?.marketingSeasonTag || '',
            item_category4: tourData.monthTags?.join(', ').toLowerCase() || '',
            item_category5: tourData.tourType || '',
            item_list_id: typeof itemListId === 'number' ? itemListId.toString() : itemListId,
            item_list_name: itemListName,
            item_variant: '',
            price: this.totalAmountCalculated || 0,
            quantity: 1,
            puntuacion: this.analyticsService.formatRating(tourData.rating, '5.0'),
            duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
            start_date: this.departureDate || '',
            end_date: this.returnDate || '',
            pasajeros_adultos: this.totalPassengers?.toString() || '0',
            pasajeros_niños: '0'
          },
          userData
        );
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        this.analyticsService.addToWishlist(
          itemListId,
          itemListName,
          {
            item_id: this.getTourItemId(),
            item_name: this.tourName || tourData.name || '',
            coupon: '',
            discount: 0,
            index: 1, // Índice dinámico basado en la posición del tour
            item_brand: 'Different Roads',
            item_category: tourData.destination?.continent || '',
            item_category2: tourData.destination?.country || '',
            item_category3: tourData.marketingSection?.marketingSeasonTag || '',
            item_category4: tourData.monthTags?.join(', ').toLowerCase() || '',
            item_category5: tourData.tourType || '',
            item_list_id: typeof itemListId === 'number' ? itemListId.toString() : itemListId,
            item_list_name: itemListName,
            item_variant: '',
            price: this.totalAmountCalculated || 0,
            quantity: 1,
            puntuacion: this.analyticsService.formatRating(tourData.rating, '5.0'),
            duracion: tourData.days ? `${tourData.days} días, ${tourData.nights || tourData.days - 1} noches` : '',
            start_date: this.departureDate || '',
            end_date: this.returnDate || '',
            pasajeros_adultos: this.totalPassengers?.toString() || '0',
            pasajeros_niños: '0'
          },
          this.getUserData()
        );
      }
    });
  }

  /**
   * Obtener datos del usuario actual si está logueado
   */
  private getUserData() {
    if (this.authService.isAuthenticatedValue()) {
      return this.analyticsService.getUserData(
        this.authService.getUserEmailValue(),
        undefined,
        this.authService.getCognitoIdValue()
      );
    }
    return undefined;
  }
}
