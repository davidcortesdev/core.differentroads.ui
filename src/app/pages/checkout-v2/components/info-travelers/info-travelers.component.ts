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
import { ReservationTravelerActivityPackService } from '../../../../core/services/reservation/reservation-traveler-activity-pack.service';

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

  // Propiedades para vuelos de TK
  hasTKFlightSelected: boolean = false;
  tkBookingRequirements: IBookingRequirements | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private reservationTravelerService: ReservationTravelerService,
    private ageGroupService: AgeGroupService,
    private messageService: MessageService,
    private reservationStatusService: ReservationStatusService,
    private reservationService: ReservationService,
    private flightSearchService: FlightSearchService,
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService
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
        this.hasTKFlightSelected = false;
        this.tkBookingRequirements = null; // Resetear requisitos de TK también
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
          // Verificar si hay vuelos de TK asignados (puede coexistir con Amadeus)
          // Esperar un momento para asegurar que la verificación de Amadeus haya terminado
          setTimeout(() => {
            // Verificar TK independientemente de Amadeus (pueden coexistir)
            if (!this.isCheckingFlightStatus) {
              this.checkTKFlightSelection();
            }
          }, 500);
        },
        error: (error) => {
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
          // Verificar vuelos de TK después de verificar Amadeus
          this.loadReservationStatuses();
        }
      },
      error: (error) => {
        this.isCheckingFlightStatus = false;
        // Verificar vuelos de TK incluso si hay error con Amadeus
        this.loadReservationStatuses();
      }
    });
  }

  /**
   * Verifica si hay vuelos de TK asignados a los viajeros
   */
  private checkTKFlightSelection(): void {
    if (!this.reservationId || !this.travelers || this.travelers.length === 0) {
      this.hasTKFlightSelected = false;
      return;
    }

    // Verificar si algún viajero tiene un vuelo de TK asignado
    // Los vuelos de TK se asignan como activityPacks (no como vuelos del consolidador)
    const checkPromises = this.travelers.map(traveler => 
      this.reservationTravelerActivityPackService.getByReservationTraveler(traveler.id).toPromise()
    );

    Promise.all(checkPromises).then(results => {
      // Un vuelo de TK es un activityPack que NO es del consolidador
      // Si hay activityPacks asignados y NO hay vuelo de Amadeus, probablemente es TK
      const hasAnyActivityPacks = results.some(assignments => 
        assignments && assignments.length > 0 && 
        assignments.some(a => a.activityPackId > 0)
      );

      // Si hay activityPacks, es un vuelo de TK (puede coexistir con Amadeus)
      const previousTKFlightSelected = this.hasTKFlightSelected;
      this.hasTKFlightSelected = hasAnyActivityPacks;
      
      // Si hay vuelo de TK, obtener sus requisitos
      if (this.hasTKFlightSelected) {
        this.getTKBookingRequirements();
      } else {
        this.tkBookingRequirements = null;
      }
      
      // Si cambió el estado de TK, forzar actualización de los formularios
      if (this.hasTKFlightSelected !== previousTKFlightSelected && this.travelerForms) {
        this.travelerForms.forEach(form => {
          if (form && typeof form['ngOnChanges'] === 'function') {
            // Forzar actualización del formulario para que agregue campos de TK
            form.ngOnChanges({
              hasTKFlightSelected: {
                previousValue: previousTKFlightSelected,
                currentValue: this.hasTKFlightSelected,
                firstChange: false,
                isFirstChange: () => false
              }
            } as any);
          }
        });
      }
    }).catch(() => {
      this.hasTKFlightSelected = false;
      this.tkBookingRequirements = null;
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
        this.amadeusBookingRequirements = null;
        this.isCheckingFlightStatus = false;
        this.loadReservationStatuses();
      }
    });
  }

  /**
   * Obtiene los requisitos de reserva de TK
   * Usa el mismo endpoint que Amadeus pero puede devolver requisitos diferentes según el tipo de vuelo
   */
  private getTKBookingRequirements(): void {
    if (!this.reservationId) {
      this.tkBookingRequirements = null;
      return;
    }

    // Por ahora, usar el mismo endpoint que Amadeus
    // Si en el futuro hay un endpoint específico para TK, cambiarlo aquí
    this.flightSearchService.getBookingRequirements(this.reservationId).subscribe({
      next: (requirements: IBookingRequirements) => {
        this.tkBookingRequirements = requirements;
      },
      error: (error) => {
        // Si no hay endpoint específico para TK, usar requisitos mínimos (al menos sex)
        this.tkBookingRequirements = {
          travelerRequirements: this.travelers.map(t => ({
            travelerId: String(t.travelerNumber),
            genderRequired: true, // TK siempre requiere sexo según el error
            documentRequired: false,
            dateOfBirthRequired: false,
            residenceRequired: false,
            documentIssuanceCityRequired: false,
            redressRequiredIfAny: false,
            airFranceDiscountRequired: false,
            spanishResidentDiscountRequired: false
          }))
        };
      }
    });
  }

  /**
   * Manejar actualización de datos de un viajero
   */
  onTravelerDataUpdated(travelerId: number): void {

    this.dataUpdated.emit();
  }

  /**
   * Valida si todos los viajeros están listos para continuar al siguiente paso
   * 
   * @returns Promise<boolean> - true si TODOS los viajeros tienen sus campos obligatorios completos, válidos y guardados
   * 
   * Este método itera sobre todos los formularios de viajeros y verifica que cada uno
   * esté listo usando el método isReadyToContinue() de InfoTravelerFormComponent
   * 
   * Si no todos están listos en el primer intento, realiza hasta 3 reintentos adicionales
   * (4 intentos en total) esperando 1 segundo entre cada uno para permitir que las 
   * operaciones asíncronas pendientes se completen.
   * 
   * Condiciones para estar listo:
   * 1. ✅ Todos los campos obligatorios completos y válidos
   * 2. ✅ No hay cambios pendientes (todo guardado en BD)
   */
  async canContinueToNextStep(): Promise<boolean> {

    // Verificar que haya formularios cargados
    if (!this.travelerForms || this.travelerForms.length === 0) {

      return false;
    }

    const forms = this.travelerForms.toArray();

    // PRIMERO: Forzar guardado de campos críticos de Amadeus para todos los viajeros
    if (this.hasFlightSelected && this.amadeusBookingRequirements) {
      const savePromises = forms.map(form => form.forceSaveCriticalAmadeusFields());
      await Promise.all(savePromises);
      // Esperar un momento adicional para asegurar que se completen los guardados y se actualicen en BD
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Función auxiliar para verificar el estado de todos los viajeros
    const checkAllTravelers = (attemptNumber: number): boolean => {
      return forms.every((form, index) => {
        const isReady = form.isReadyToContinue();
        const travelerNumber = index + 1;
        
        
        return isReady;
      });
    };

    // Intentar hasta 4 veces (1 inicial + 3 reintentos)
    const maxAttempts = 4;
    let allReady = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      allReady = checkAllTravelers(attempt);

      if (allReady) {
        if (attempt === 1) {

        } else {

        }
        break;
      }

      // Si no es el último intento, esperar 1 segundo antes del siguiente
      if (attempt < maxAttempts) {

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (allReady) {

    } else {

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

}
