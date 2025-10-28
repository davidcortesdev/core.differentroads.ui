import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../../../core/services/agegroup/age-group.service';
import { ReservationService } from '../../../../core/services/reservation/reservation.service';
import {
  ReservationStatusService,
} from '../../../../core/services/reservation/reservation-status.service';
import { FlightSearchService, IBookingRequirements } from '../../../../core/services/flight/flight-search.service';
import { InfoTravelerFormComponent } from './components/info-traveler-form/info-traveler-form.component';

@Component({
  selector: 'app-info-travelers',
  standalone: false,
  templateUrl: './info-travelers.component.html',
  styleUrls: ['./info-travelers.component.scss'],
})
export class InfoTravelersComponent implements OnInit, OnDestroy, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() itineraryId: number | null = null;

  @Output() dataUpdated = new EventEmitter<void>();

  // Referencias a los formularios de viajeros
  @ViewChildren(InfoTravelerFormComponent)
  travelerForms!: QueryList<InfoTravelerFormComponent>;

  // Estados de carga
  checkingReservationStatus: boolean = false;
  private isInitialized: boolean = false;
  
  travelers: IReservationTravelerResponse[] = [];
  ageGroups: IAgeGroupResponse[] = [];

  loading: boolean = false;
  error: string | null = null;

  cartStatusId: number | null = null;
  budgetStatusId: number | null = null;
  draftStatusId: number | null = null;
  bookedStatusId: number | null = null;

  // Propiedades para requisitos de reserva de Amadeus
  amadeusBookingRequirements: IBookingRequirements | null = null;
  hasFlightSelected: boolean = false;
  isCheckingFlightStatus: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private reservationTravelerService: ReservationTravelerService,
    private ageGroupService: AgeGroupService,
    private messageService: MessageService,
    private reservationStatusService: ReservationStatusService,
    private reservationService: ReservationService,
    private flightSearchService: FlightSearchService
  ) {}

  ngOnInit(): void {
    if (this.departureId && this.reservationId && !this.isInitialized) {
      this.isInitialized = true;
      this.checkFlightSelectionStatus();
    } else if (!this.departureId || !this.reservationId) {
      this.error = 'No se proporcionó un ID de departure o reservación válido';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Solo procesar cambios si el componente aún no se ha inicializado
    // Esto evita ejecutar la lógica múltiples veces
    if (this.isInitialized) {
      return;
    }

    if (
      (changes['departureId'] && changes['departureId'].currentValue) ||
      (changes['reservationId'] && changes['reservationId'].currentValue)
    ) {
      if (this.departureId && this.reservationId) {
        this.loading = false;
        this.checkingReservationStatus = false;
        this.isCheckingFlightStatus = false;
        this.error = null;
        this.amadeusBookingRequirements = null;
        this.hasFlightSelected = false;
        this.isInitialized = true;
        this.checkFlightSelectionStatus();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los estados de reserva y luego procede con la verificación del estado actual
   */
  private loadReservationStatuses(): void {
    this.checkingReservationStatus = true;
    this.error = null;
    
    forkJoin({
      cartStatus: this.reservationStatusService.getByCode('CART'),
      budgetStatus: this.reservationStatusService.getByCode('BUDGET'),
      draftStatus: this.reservationStatusService.getByCode('DRAFT'),
      bookedStatus: this.reservationStatusService.getByCode('BOOKED')
    }).subscribe({
      next: (statuses) => {
        this.cartStatusId = statuses.cartStatus[0].id;
        this.budgetStatusId = statuses.budgetStatus[0].id;
        this.draftStatusId = statuses.draftStatus[0].id;
        this.bookedStatusId = statuses.bookedStatus[0].id;
        
        this.checkReservationStatus();
      },
      error: (error) => {
        console.error('Error al cargar estados de reserva:', error);
        this.error = 'Error al cargar estados de reserva';
        this.checkingReservationStatus = false;
      }
    });
  }

  /**
   * Verifica el estado actual de la reserva y actualiza si es necesario
   */
  private checkReservationStatus(): void {
    this.reservationService.getById(this.reservationId!).subscribe({
      next: (reservation) => {
        if (reservation.reservationStatusId === this.budgetStatusId) {
          this.checkingReservationStatus = false;
          this.loadAllData();
        } else if (reservation.reservationStatusId === this.draftStatusId) {
          this.reservationService
            .updateStatus(this.reservationId!, this.cartStatusId!)
            .subscribe({
              next: (success) => {
                if (success) {
                  this.checkingReservationStatus = false;
                  this.loadAllData();
                } else {
                  this.error = 'Error al actualizar estado de la reserva';
                  this.checkingReservationStatus = false;
                }
              },
              error: (error) => {
                console.error('Error al actualizar estado de la reserva:', error);
                this.error = 'Error al actualizar estado de la reserva';
                this.checkingReservationStatus = false;
              }
            });
        } else {
          this.checkingReservationStatus = false;
          this.loadAllData();
        }
      },
      error: (error) => {
        console.error('Error al obtener información de la reserva:', error);
        this.error = 'Error al obtener información de la reserva';
        this.checkingReservationStatus = false;
      }
    });
  }

  /**
   * Cargar todos los datos necesarios
   */
  private loadAllData(): void {
    if (!this.departureId || !this.reservationId) {
      return;
    }

    this.loading = true;
    this.error = null;

    forkJoin({
      travelers: this.reservationTravelerService.getByReservationOrdered(this.reservationId!),
      ageGroups: this.ageGroupService.getAllOrdered(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ travelers, ageGroups }) => {
          this.ageGroups = ageGroups;
          this.travelers = this.sortTravelersWithLeadFirst(travelers);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar datos:', error);
          this.error = 'Error al cargar los datos de los viajeros';
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los datos de los viajeros',
            life: 5000,
          });
        },
      });
  }

  /**
   * Obtener nombre del grupo de edad por ID
   */
  getAgeGroupName(ageGroupId: number): string {
    const ageGroup = this.ageGroups.find((group) => group.id === ageGroupId);
    return ageGroup ? ageGroup.name : 'Adulto';
  }

  /**
   * Ordenar travelers con el lead traveler siempre primero
   */
  private sortTravelersWithLeadFirst(
    travelers: IReservationTravelerResponse[]
  ): IReservationTravelerResponse[] {
    const sortedTravelers = travelers.sort((a, b) => a.travelerNumber - b.travelerNumber);
    
    const correctedTravelers = sortedTravelers.map((traveler, index) => ({
      ...traveler,
      isLeadTraveler: index === 0
    }));
    
    return correctedTravelers;
  }

  /**
   * Recargar los datos del departure
   */
  reloadData(): void {
    if (this.departureId && this.reservationId) {
      this.loading = false;
      this.checkingReservationStatus = false;
      this.isCheckingFlightStatus = false;
      this.error = null;
      this.amadeusBookingRequirements = null;
      this.hasFlightSelected = false;
      // Permitir reload explícito reseteando la bandera
      this.isInitialized = false;
      this.isInitialized = true;
      this.checkFlightSelectionStatus();
    }
  }

  /**
   * Verifica si hay un vuelo seleccionado en Amadeus
   */
  private checkFlightSelectionStatus(): void {
    if (!this.reservationId) {
      this.loadReservationStatuses();
      return;
    }

    this.isCheckingFlightStatus = true;

    this.flightSearchService.getSelectionStatus(this.reservationId).subscribe({
      next: (hasSelection: boolean) => {
        this.hasFlightSelected = hasSelection;

        if (hasSelection) {
          this.getAmadeusBookingRequirements();
        } else {
          this.isCheckingFlightStatus = false;
          this.loadReservationStatuses();
        }
      },
      error: (error) => {
        console.error('Error al verificar selección de vuelo:', error);
        this.isCheckingFlightStatus = false;
        this.loadReservationStatuses();
      }
    });
  }

  /**
   * Obtiene los requisitos de reserva de Amadeus
   */
  private getAmadeusBookingRequirements(): void {
    if (!this.reservationId) {
      this.isCheckingFlightStatus = false;
      this.loadReservationStatuses();
      return;
    }

    this.flightSearchService.getBookingRequirements(this.reservationId).subscribe({
      next: (requirements: IBookingRequirements) => {
        this.amadeusBookingRequirements = requirements;
        this.isCheckingFlightStatus = false;
        this.loadReservationStatuses();
      },
      error: (error) => {
        console.error('Error al obtener requisitos de Amadeus:', error);
        this.amadeusBookingRequirements = null;
        this.isCheckingFlightStatus = false;
        this.loadReservationStatuses();
      }
    });
  }

  /**
   * Manejar actualización de datos de un viajero
   */
  onTravelerDataUpdated(travelerId: number): void {
    console.log(`Datos del viajero ${travelerId} actualizados`);
    this.dataUpdated.emit();
  }

  /**
   * Valida si todos los viajeros están listos para continuar al siguiente paso
   * 
   * @returns true si TODOS los viajeros tienen sus campos obligatorios completos, válidos y guardados
   * 
   * Este método itera sobre todos los formularios de viajeros y verifica que cada uno
   * esté listo usando el método isReadyToContinue() de InfoTravelerFormComponent
   * 
   * Condiciones para estar listo:
   * 1. ✅ Todos los campos obligatorios completos y válidos
   * 2. ✅ No hay cambios pendientes (todo guardado en BD)
   */
  canContinueToNextStep(): boolean {
    console.log('=== canContinueToNextStep() INICIADO ===');

    // Verificar que haya formularios cargados
    if (!this.travelerForms || this.travelerForms.length === 0) {
      console.log('[canContinueToNextStep] ❌ No hay formularios de viajeros cargados');
      return false;
    }

    const forms = this.travelerForms.toArray();
    console.log(`[canContinueToNextStep] Verificando ${forms.length} viajero(s)...`);

    // Verificar que TODOS los viajeros estén listos
    const allReady = forms.every((form, index) => {
      const isReady = form.isReadyToContinue();
      const travelerNumber = index + 1;
      
      if (isReady) {
        console.log(`[canContinueToNextStep] ✅ Viajero ${travelerNumber} (ID: ${form.travelerId}): LISTO`);
      } else {
        console.log(`[canContinueToNextStep] ❌ Viajero ${travelerNumber} (ID: ${form.travelerId}): NO LISTO`);
      }
      
      return isReady;
    });

    if (allReady) {
      console.log('[canContinueToNextStep] ✅ TODOS los viajeros están listos para continuar');
    } else {
      console.log('[canContinueToNextStep] ❌ ALGUNOS viajeros no están listos');
    }

    return allReady;
  }

  /**
   * Obtiene información detallada sobre los viajeros que NO están listos
   * 
   * @returns Array con información de los viajeros que faltan por completar
   * 
   * Útil para mostrar mensajes de error específicos al usuario
   */
  getNotReadyTravelers(): { travelerNumber: number; travelerId: number }[] {
    if (!this.travelerForms || this.travelerForms.length === 0) {
      return [];
    }

    const notReady: { travelerNumber: number; travelerId: number }[] = [];

    this.travelerForms.toArray().forEach((form, index) => {
      if (!form.isReadyToContinue()) {
        notReady.push({
          travelerNumber: index + 1,
          travelerId: form.travelerId || 0
        });
      }
    });

    return notReady;
  }

  /**
   * Muestra un mensaje de error indicando qué viajeros faltan por completar
   */
  showValidationError(): void {
    const notReady = this.getNotReadyTravelers();

    if (notReady.length === 0) {
      return;
    }

    let errorMessage = 'Por favor, completa todos los campos obligatorios de los viajeros antes de continuar.';

    if (notReady.length === 1) {
      errorMessage = `El Pasajero ${notReady[0].travelerNumber} tiene campos obligatorios incompletos o cambios sin guardar.`;
    } else if (notReady.length > 1) {
      const travelerNumbers = notReady.map(t => t.travelerNumber).join(', ');
      errorMessage = `Los Pasajeros ${travelerNumbers} tienen campos obligatorios incompletos o cambios sin guardar.`;
    }

    this.messageService.add({
      severity: 'warn',
      summary: 'Atención',
      detail: errorMessage,
      life: 5000
    });
  }

  /**
   * Verificar si un viajero es niño
   */
  private isChildTraveler(traveler: IReservationTravelerResponse): boolean {
    const ageGroup = this.ageGroups.find(group => group.id === traveler.ageGroupId);
    
    if (ageGroup) {
      if (ageGroup.upperLimitAge === null || ageGroup.upperLimitAge === undefined) {
        return false; // No tiene límite superior = Adulto
      } else if (ageGroup.upperLimitAge <= 15) {
        return true; // Tiene límite superior <= 15 = Niño
      }
    }
    
    return false; // Por defecto, es adulto
  }

  /**
   * Obtener el número de adultos
   */
  getAdultsCount(): number {
    return this.travelers.filter(traveler => !this.isChildTraveler(traveler)).length;
  }

  /**
   * Obtener el número de niños
   */
  getChildrenCount(): number {
    return this.travelers.filter(traveler => this.isChildTraveler(traveler)).length;
  }

  /**
   * Verificar si hay más de un niño por adulto
   */
  hasMoreThanOneChildPerAdult(): boolean {
    const adultsCount = this.getAdultsCount();
    const childrenCount = this.getChildrenCount();
    
    if (adultsCount === 0) {
      return childrenCount > 0; // Si no hay adultos pero hay niños, mostrar mensaje
    }
    
    return childrenCount / adultsCount > 1;
  }
}
