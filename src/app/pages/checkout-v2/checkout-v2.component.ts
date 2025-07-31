import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TourNetService } from '../../core/services/tourNet.service';
import { ReservationService } from '../../core/services/reservation/reservation.service';
import { DepartureService } from '../../core/services/departure/departure.service';
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
import { MenuItem, MessageService } from 'primeng/api';
import { SelectorRoomComponent } from './components/selector-room/selector-room.component';
import { SelectorTravelerComponent } from './components/selector-traveler/selector-traveler.component';
import { InsuranceComponent } from './components/insurance/insurance.component';
import { InfoTravelersComponent } from './components/info-travelers/info-travelers.component';
import { forkJoin } from 'rxjs';
import { PaymentsNetService } from './services/paymentsNet.service';
import { AuthenticateService } from '../../core/services/auth-service.service';
import { UsersNetService } from '../../core/services/usersNet.service';

@Component({
  selector: 'app-checkout-v2',
  standalone: false,
  templateUrl: './checkout-v2.component.html',
  styleUrl: './checkout-v2.component.scss',
})
export class CheckoutV2Component implements OnInit {
  // Referencias a componentes hijos
  @ViewChild('roomSelector') roomSelector!: SelectorRoomComponent;
  @ViewChild('travelerSelector') travelerSelector!: SelectorTravelerComponent;
  @ViewChild('insuranceSelector') insuranceSelector!: InsuranceComponent;
  @ViewChild('infoTravelers') infoTravelers!: InfoTravelersComponent;

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

  // Variables para actividades
  selectedActivities: any[] = [];
  activitiesTotalPrice: number = 0;

  // Variables para el resumen del pedido
  summary: { qty: number; value: number; description: string }[] = [];
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

  // Steps configuration
  items: MenuItem[] = [];
  activeIndex: number = 0;

  // Tour slug para navegación
  tourSlug: string = '';

  // Propiedades para autenticación
  loginDialogVisible: boolean = false;

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
    private usersNetService: UsersNetService
  ) {}

  ngOnInit(): void {
    // Configurar los steps
    this.initializeSteps();

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

        // Cargar datos de la reservación desde el backend
        this.loadReservationData(this.reservationId);
        this.cleanScalapayPendingPayments();
      } else {
        this.error = 'No se proporcionó un ID de reservación válido';
      }
    });
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

        // Cargar precios del departure
        this.loadDeparturePrices(reservation.departureId);
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

    // Inicializar el resumen automáticamente después de cargar precios
    this.initializeOrderSummary();

    // NUEVO: Forzar actualización adicional después de un delay para asegurar que los componentes estén listos
    setTimeout(() => {
      this.forceSummaryUpdate();
    }, 500);
  }

  // Método para inicializar el resumen automáticamente
  private initializeOrderSummary(): void {
    // Verificar inmediatamente
    this.checkAndInitializeSummary();

    // También verificar después de un delay para asegurar que los componentes estén listos
    setTimeout(() => {
      this.checkAndInitializeSummary();
    }, 1500);

    // Y una verificación final después de más tiempo
    setTimeout(() => {
      if (this.summary.length === 0) {
        this.checkAndInitializeSummary();
      }
    }, 3000);
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

    // Recalcular el resumen del pedido (sin afectar la lógica existente)
    if (
      this.travelerSelector &&
      Object.keys(this.pricesByAgeGroup).length > 0
    ) {
      this.updateOrderSummary(this.travelerSelector.travelersNumbers);
    }
  }

  // OPTIMIZADO: Método para verificar si podemos inicializar el resumen
  private checkAndInitializeSummary(): void {
    // Verificar si tenemos todo lo necesario para inicializar
    const hasPrices = Object.keys(this.pricesByAgeGroup).length > 0;
    const hasTravelers =
      this.travelerSelector && this.travelerSelector.travelersNumbers;

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
    if (Object.keys(this.pricesByAgeGroup).length > 0) {
      const currentTravelers = this.travelerSelector?.travelersNumbers || {
        adults: Math.max(1, this.totalPassengers),
        childs: 0,
        babies: 0,
      };
      this.updateOrderSummary(currentTravelers);
    }
  }

  // Método para actualizar el resumen del pedido
  updateOrderSummary(travelersNumbers: {
    adults: number;
    childs: number;
    babies: number;
  }): void {
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

    // Actividades seleccionadas
    if (this.selectedActivities && this.selectedActivities.length > 0) {
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

    // Seguro seleccionado
    if (this.selectedInsurance && this.insurancePrice > 0) {
      const totalTravelers =
        travelersNumbers.adults +
        travelersNumbers.childs +
        travelersNumbers.babies;
      this.summary.push({
        qty: totalTravelers,
        value: this.insurancePrice,
        description: `Seguro ${this.selectedInsurance.name}`,
      });
    }

    // Calcular totales
    this.calculateTotals();

    // Actualizar totales en la reserva (solo localmente, no en BD)
    this.updateReservationTotalAmount();
  }

  // Método para calcular totales
  calculateTotals(): void {
    // Calcular subtotal (solo valores positivos)
    this.subtotal = this.summary.reduce((acc, item) => {
      if (item.value >= 0) {
        return acc + item.value * item.qty;
      }
      return acc;
    }, 0);

    // Calcular total (todos los valores, incluyendo negativos)
    this.totalAmountCalculated = this.summary.reduce((acc, item) => {
      return acc + item.value * item.qty;
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
        throw new Error('No se encontró información de viajeros');
      }

      // Obtener los travelers desde el componente travelerSelector
      const existingTravelers = this.travelerSelector.existingTravelers || [];

      if (existingTravelers.length === 0) {
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
                next: (result) => resolve(result),
                error: (error) => reject(error),
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
                next: (result) => resolve(result),
                error: (error) => reject(error),
              });
          });

          createPromises.push(createPromise);
        });
      });

      // Ejecutar todas las operaciones de creación
      await Promise.all(createPromises);

      return true;
    } catch (error) {
      console.error('Error al guardar actividades:', error);
      return false;
    }
  }

  // Método para limpiar actividades y packs existentes
  private async clearExistingActivitiesAndPacks(
    existingTravelers: any[]
  ): Promise<void> {
    const deletePromises: Promise<any>[] = [];

    for (const traveler of existingTravelers) {
      try {
        // Obtener y eliminar actividades individuales existentes
        const existingActivities = await new Promise<any[]>(
          (resolve, reject) => {
            this.reservationTravelerActivityService
              .getByReservationTraveler(traveler.id)
              .subscribe({
                next: (activities) => resolve(activities),
                error: (error) => resolve([]),
              });
          }
        );

        existingActivities.forEach((activity) => {
          const deletePromise = new Promise((resolve, reject) => {
            this.reservationTravelerActivityService
              .delete(activity.id)
              .subscribe({
                next: (result) => resolve(result),
                error: (error) => resolve(false),
              });
          });
          deletePromises.push(deletePromise);
        });

        // Obtener y eliminar packs de actividades existentes
        const existingPacks = await new Promise<any[]>((resolve, reject) => {
          this.reservationTravelerActivityPackService
            .getByReservationTraveler(traveler.id)
            .subscribe({
              next: (packs) => resolve(packs),
              error: (error) => resolve([]),
            });
        });

        existingPacks.forEach((pack) => {
          const deletePromise = new Promise((resolve, reject) => {
            this.reservationTravelerActivityPackService
              .delete(pack.id)
              .subscribe({
                next: (result) => resolve(result),
                error: (error) => resolve(false),
              });
          });
          deletePromises.push(deletePromise);
        });
      } catch (error) {
        console.warn(
          `Error al obtener actividades/packs para el viajero ${traveler.id}:`,
          error
        );
      }
    }

    // Esperar a que se completen todas las eliminaciones
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
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
    this.activeIndex = index;
    this.updateStepInUrl(index);
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

  // Método para guardar todos los datos de los viajeros
  private async saveTravelersData(): Promise<boolean> {
    if (!this.infoTravelers) {
      return true; // Si no hay componente, no hay nada que guardar
    }

    try {
      // Llamar al método saveAllTravelersData del componente hijo
      await this.infoTravelers.saveAllTravelersData();
      return true;
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al guardar',
        detail: 'Error al guardar los datos de los viajeros',
        life: 5000,
      });
      return false;
    }
  }

  // Método para navegar al siguiente paso con validación
  async nextStepWithValidation(targetStep: number): Promise<void> {
    // Verificar autenticación para pasos que la requieren
    if (targetStep >= 2) {
      this.authService.isLoggedIn().subscribe((isLoggedIn) => {
        if (!isLoggedIn) {
          // Usuario no está logueado, mostrar modal
          sessionStorage.setItem('redirectUrl', window.location.pathname);
          this.loginDialogVisible = true;
          return;
        }
        // Usuario está logueado, continuar con la validación normal
        this.performStepValidation(targetStep);
      });
      return;
    }

    // Para el paso 0 (personalizar viaje) y paso 1 (vuelos), no se requiere autenticación
    this.performStepValidation(targetStep);
  }

  private async performStepValidation(targetStep: number): Promise<void> {
    // Guardar cambios de travelers, habitaciones, seguros y actividades antes de continuar
    if (
      targetStep === 1 &&
      this.travelerSelector &&
      this.roomSelector &&
      this.insuranceSelector
    ) {
      try {
        // 1. Guardar cambios de travelers si hay pendientes
        if (this.travelerSelector.hasUnsavedChanges) {
          this.travelerSelector.saveTravelersChanges();
          await new Promise((resolve) => setTimeout(resolve, 800));
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
          return;
        }

        // 3. Validar que las habitaciones seleccionadas puedan acomodar a todos los pasajeros
        const currentTravelers = this.travelerSelector.travelersNumbers;
        const totalPassengers =
          currentTravelers.adults +
          currentTravelers.childs +
          currentTravelers.babies;

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
              }
            }
          }
        );

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
        await this.roomSelector.loadExistingTravelers();
        this.insuranceSelector.loadExistingTravelers();

        // 5. Actualizar el número de pasajeros total y recalcular resumen
        this.totalPassengers = totalPassengers;
        this.updateOrderSummary(currentTravelers);
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 6. Guardar asignaciones de habitaciones, seguros y actividades EN PARALELO
        const [roomsSaved, insuranceSaved, activitiesSaved] = await Promise.all(
          [
            this.roomSelector.saveRoomAssignments(),
            this.insuranceSelector.saveInsuranceAssignments(),
            this.saveActivitiesAssignments(),
          ]
        );

        if (!roomsSaved) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al guardar habitaciones',
            detail:
              'Hubo un error al guardar las asignaciones de habitaciones. Por favor, inténtalo de nuevo.',
            life: 5000,
          });
          return;
        }

        if (!insuranceSaved) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al guardar seguro',
            detail:
              'Hubo un error al guardar las asignaciones de seguro. Por favor, inténtalo de nuevo.',
            life: 5000,
          });
          return;
        }

        if (!activitiesSaved) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al guardar actividades',
            detail:
              'Hubo un error al guardar las actividades seleccionadas. Por favor, inténtalo de nuevo.',
            life: 5000,
          });
          return;
        }

        // 7. Actualizar el totalPassengers en la reserva
        if (this.reservationId && this.reservationData) {
          const reservationUpdateData = {
            ...this.reservationData,
            totalPassengers: this.totalPassengers,
            totalAmount: this.totalAmountCalculated,
            updatedAt: new Date().toISOString(),
          };

          await new Promise((resolve, reject) => {
            this.reservationService
              .update(this.reservationId!, reservationUpdateData)
              .subscribe({
                next: (success) => {
                  if (success) {
                    this.reservationData.totalPassengers = this.totalPassengers;
                    this.reservationData.totalAmount =
                      this.totalAmountCalculated;
                    this.totalAmount = this.totalAmountCalculated;

                    // Mostrar toast de éxito
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

                    resolve(success);
                  } else {
                    reject(new Error('Error al actualizar la reserva'));
                  }
                },
                error: (error) => {
                  reject(error);
                },
              });
          });
        }
      } catch (error) {
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
      const saved = await this.saveTravelersData();
      if (!saved) {
        return; // No continuar si no se pudieron guardar los datos
      }
    }

    // Navegar al siguiente paso
    this.onActiveIndexChange(targetStep);
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
        }
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
  checkAuthAndContinue(
    nextStep: number,
    activateCallback: (step: number) => void,
    useFlightless: boolean = false
  ): void {
    this.authService.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        // Usuario está logueado, proceder normalmente
        if (useFlightless) {
          // Lógica para continuar sin vuelos
          this.nextStepWithValidation(nextStep);
        } else {
          // Lógica normal
          this.nextStepWithValidation(nextStep);
        }
        // Llamar al callback con el step
        activateCallback(nextStep);
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
}
