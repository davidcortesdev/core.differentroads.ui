import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
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

  @Output() activitiesAssignmentChange = new EventEmitter<void>();
  @Output() dataUpdated = new EventEmitter<void>();
  @Output() roomAssignmentsChange = new EventEmitter<{ [travelerId: number]: number }>();

  // Estados de carga
  checkingReservationStatus: boolean = false;
  
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
    if (this.departureId && this.reservationId) {
      this.checkFlightSelectionStatus();
    } else {
      this.error = 'No se proporcionó un ID de departure o reservación válido';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
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
   * NUEVO: Manejar cambios en asignaciones de habitaciones desde el componente hijo
   */
  onRoomAssignmentsChange(roomAssignments: { [travelerId: number]: number }): void {
    this.roomAssignmentsChange.emit(roomAssignments);
  }

  /**
   * Manejar cambios en asignaciones de actividades desde el componente hijo
   */
  onActivitiesAssignmentChange(): void {
    this.activitiesAssignmentChange.emit();
  }

  /**
   * Manejar actualización de datos de un viajero
   */
  onTravelerDataUpdated(travelerId: number): void {
    console.log(`Datos del viajero ${travelerId} actualizados`);
    this.dataUpdated.emit();
  }
}
