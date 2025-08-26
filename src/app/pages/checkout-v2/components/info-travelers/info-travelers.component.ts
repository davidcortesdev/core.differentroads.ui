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
  DepartureReservationFieldService,
  IDepartureReservationFieldResponse,
  DepartureReservationFieldFilters,
} from '../../../../core/services/departure/departure-reservation-field.service';
import {
  MandatoryTypeService,
  IMandatoryTypeResponse,
} from '../../../../core/services/reservation/mandatory-type.service';
import {
  ReservationFieldService,
  IReservationFieldResponse,
} from '../../../../core/services/reservation/reservation-field.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../../../core/services/agegroup/age-group.service';
import {
  ReservationTravelerFieldService,
  ReservationTravelerFieldCreate,
  ReservationTravelerFieldUpdate,
  IReservationTravelerFieldResponse,
} from '../../../../core/services/reservation/reservation-traveler-field.service';
import {
  ActivityService,
  IActivityResponse,
} from '../../../../core/services/activity/activity.service';
import {
  ReservationTravelerActivityService,
  IReservationTravelerActivityResponse,
} from '../../../../core/services/reservation/reservation-traveler-activity.service';
import {
  ReservationTravelerActivityPackService,
  IReservationTravelerActivityPackResponse,
} from '../../../../core/services/reservation/reservation-traveler-activity-pack.service';
import {
  ActivityPriceService,
  IActivityPriceResponse,
} from '../../../../core/services/activity/activity-price.service';
import {
  ActivityPackPriceService,
  IActivityPackPriceResponse,
} from '../../../../core/services/activity/activity-pack-price.service';
import {
  FormGroup,
  FormBuilder,
  FormArray,
  FormControl,
  Validators,
} from '@angular/forms';
import { ReservationService } from '../../../../core/services/reservation/reservation.service';
import {
  IReservationStatusResponse,
  ReservationStatusService,
} from '../../../../core/services/reservation/reservation-status.service';
import { FlightSearchService, IBookingRequirements, IPassengerConditions } from '../../../../core/services/flight-search.service';

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

  @Output() activitiesAssignmentChange = new EventEmitter<{
    travelerId: number;
    activityId: number;
    isAssigned: boolean;
    activityName: string;
    activityPrice: number;
  }>();

  @Output() formValidityChange = new EventEmitter<boolean>();

  // Formulario reactivo principal
  travelersForm: FormGroup;

  // Estados de carga
  checkingReservationStatus: boolean = false;

  departureReservationFields: IDepartureReservationFieldResponse[] = [];
  mandatoryTypes: IMandatoryTypeResponse[] = [];
  reservationFields: IReservationFieldResponse[] = [];
  travelers: IReservationTravelerResponse[] = [];
  ageGroups: IAgeGroupResponse[] = [];

  loading: boolean = false;
  error: string | null = null;
  showMoreFields: boolean = false;

  existingTravelerFields: IReservationTravelerFieldResponse[] = [];
  optionalActivities: IActivityResponse[] = [];

  travelerActivities: {
    [travelerId: number]: IReservationTravelerActivityResponse[];
  } = {};

  travelerActivityPacks: {
    [travelerId: number]: IReservationTravelerActivityPackResponse[];
  } = {};

  activityPrices: {
    [travelerId: number]: {
      [activityId: number]: number;
    };
  } = {};

  private deletedFromDB: {
    [travelerId: number]: {
      [activityId: number]: boolean;
    };
  } = {};

  sexOptions = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
  ];

  countryOptions = [
    { name: 'España', code: 'ES', value: 'ES' },
    { name: 'Colombia', code: 'CO', value: 'CO' },
  ];

  cartStatusId: number | null = null;
  budgetStatusId: number | null = null;
  draftStatusId: number | null = null;

  // Propiedades para requisitos de reserva de Amadeus
  amadeusBookingRequirements: IBookingRequirements | null = null;
  hasFlightSelected: boolean = false;
  isCheckingFlightStatus: boolean = false;

  // Mensajes de error personalizados
  errorMessages: { [key: string]: { [key: string]: string } } = {
    email: {
      required: 'El correo electrónico es requerido.',
      email: 'Ingresa un correo electrónico válido.',
    },
    phone: {
      required: 'El teléfono es requerido.',
      pattern:
        'Ingresa un número de teléfono válido. Puede incluir código de país.',
    },
    text: {
      required: 'Este campo es obligatorio.',
      minlength: 'Debe tener al menos {minLength} caracteres.',
      maxlength: 'No puede tener más de {maxLength} caracteres.',
      pattern:
        'Ingresa un número de teléfono válido. Puede incluir código de país.', // Para el campo phone con fieldType text
    },
    number: {
      required: 'Este campo es obligatorio.',
      min: 'El valor mínimo es {min}.',
      max: 'El valor máximo es {max}.',
    },
    date: {
      required: 'Esta fecha es obligatoria.',
      invalidDate: 'Fecha inválida.',
      pastDate: 'La fecha debe ser anterior a hoy.',
      futureDate: 'La fecha debe ser posterior a hoy.',
    },
    sex: {
      required: 'Debe seleccionar un sexo.',
    },
    country: {
      required: 'Debe seleccionar un país.',
    },
    required: {
      required: 'Este campo es obligatorio.',
    },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private departureReservationFieldService: DepartureReservationFieldService,
    private mandatoryTypeService: MandatoryTypeService,
    private reservationFieldService: ReservationFieldService,
    private reservationTravelerService: ReservationTravelerService,
    private ageGroupService: AgeGroupService,
    private reservationTravelerFieldService: ReservationTravelerFieldService,
    private activityService: ActivityService,
    private reservationTravelerActivityService: ReservationTravelerActivityService,
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private activityPriceService: ActivityPriceService,
    private activityPackPriceService: ActivityPackPriceService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private reservationStatusService: ReservationStatusService,
    private reservationService: ReservationService,
    private flightSearchService: FlightSearchService
  ) {
    this.travelersForm = this.fb.group({
      travelers: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    if (this.departureId && this.reservationId) {
      console.log('departureId:', this.departureId);
      console.log('reservationId:', this.reservationId);
      console.log('itineraryId:', this.itineraryId);

      // PRIMERO: Verificar si hay un vuelo seleccionado en Amadeus
      this.checkFlightSelectionStatus();
    } else {
      this.error = 'No se proporcionó un ID de departure o reservación válido';
    }
  }

  /**
   * Carga los estados de reserva y luego procede con la verificación del estado actual
   */
  private loadReservationStatuses(): void {
    this.checkingReservationStatus = true;
    this.error = null;
    
    // Usar forkJoin para cargar todos los estados en paralelo
    forkJoin({
      cartStatus: this.reservationStatusService.getByCode('CART'),
      budgetStatus: this.reservationStatusService.getByCode('BUDGET'),
      draftStatus: this.reservationStatusService.getByCode('DRAFT')
    }).subscribe({
      next: (statuses) => {
        this.cartStatusId = statuses.cartStatus[0].id;
        this.budgetStatusId = statuses.budgetStatus[0].id;
        this.draftStatusId = statuses.draftStatus[0].id;
        
        console.log('Estados de reserva cargados:', {
          cart: this.cartStatusId,
          budget: this.budgetStatusId,
          draft: this.draftStatusId
        });
        
        // Ahora verificar el estado actual de la reserva
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
        console.log('Estado actual de la reserva:', reservation.reservationStatusId);
        
        if (reservation.reservationStatusId === this.budgetStatusId) {
          console.log('Reserva en estado BUDGET');
          this.checkingReservationStatus = false;
          // Cargar datos después de verificar el estado
          this.loadAllData();
        } else if (reservation.reservationStatusId === this.draftStatusId) {
          console.log('Reserva en estado DRAFT');
          console.log('Pasando a estado CART');
          
          // Actualizar estado y luego cargar datos
          this.reservationService
            .updateStatus(this.reservationId!, this.cartStatusId!)
            .subscribe({
              next: (success) => {
                if (success) {
                  console.log('Estado actualizado correctamente a CART');
                  this.checkingReservationStatus = false;
                  // Solo cargar datos después de actualizar el estado
                  this.loadAllData();
                } else {
                  console.error('Error al actualizar estado de la reserva');
                  this.error = 'Error al actualizar estado de la reserva';
                  this.checkingReservationStatus = false;
                }
              },
              error: (error) => {
                console.error('Error al actualizar estado:', error);
                this.error = 'Error al actualizar estado de la reserva';
                this.checkingReservationStatus = false;
              }
            });
        } else {
          console.log('Reserva en otro estado, cargando datos directamente');
          this.checkingReservationStatus = false;
          // Para otros estados, cargar datos directamente
          this.loadAllData();
        }
      },
      error: (error) => {
        console.error('Error al obtener la reserva:', error);
        this.error = 'Error al obtener información de la reserva';
        this.checkingReservationStatus = false;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges - info-travelers:', changes);
    if (
      (changes['departureId'] && changes['departureId'].currentValue) ||
      (changes['reservationId'] && changes['reservationId'].currentValue)
    ) {
      console.log('🔄 Recargando datos de info-travelers');
      if (this.departureId && this.reservationId) {
        // Reinicializar control de eliminados
        this.deletedFromDB = {};
        // Reiniciar estados de carga
        this.loading = false;
        this.checkingReservationStatus = false;
        this.isCheckingFlightStatus = false;
        this.error = null;
        // Limpiar requisitos de Amadeus
        this.amadeusBookingRequirements = null;
        this.hasFlightSelected = false;
        // Recargar desde el inicio para asegurar el orden correcto
        this.checkFlightSelectionStatus();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }



  // Accesor para los formularios de viajeros
  get travelerForms(): FormArray {
    return this.travelersForm.get('travelers') as FormArray;
  }

  // Método helper para obtener un formulario de viajero específico
  getTravelerForm(index: number): FormGroup | null {
    const control = this.travelerForms.at(index);
    return control instanceof FormGroup ? control : null;
  }

  /**
   * Crea un formulario para un viajero específico
   */
  private createTravelerForm(
    traveler: IReservationTravelerResponse
  ): FormGroup {
    const formGroup = this.fb.group({});

    // Agregar controles para todos los campos posibles
    this.departureReservationFields.forEach((field) => {
      const fieldDetails = this.getReservationFieldDetails(
        field.reservationFieldId
      );
      if (fieldDetails) {
        const existingValue = this.getExistingFieldValue(
          traveler.id,
          fieldDetails.id
        );

        // Para campos de fecha, convertir string a Date si es necesario
        let controlValue: any = existingValue;
        if (fieldDetails.fieldType === 'date' && existingValue) {
          // Si el valor está en formato dd/mm/yyyy, convertirlo a Date
          const parsedDate = this.parseDateFromDDMMYYYY(existingValue);
          if (parsedDate) {
            controlValue = parsedDate;
          }
        }

        // Aplicar validaciones según el tipo de campo
        const validators = this.getValidatorsForField(
          fieldDetails,
          field,
          traveler.isLeadTraveler
        );

        formGroup.addControl(
          `${fieldDetails.code}_${traveler.id}`,
          this.fb.control(controlValue, validators)
        );
      }
    });

    return formGroup;
  }

  /**
   * Obtiene las validaciones para un campo específico
   */
  private getValidatorsForField(
    fieldDetails: IReservationFieldResponse,
    field: IDepartureReservationFieldResponse,
    isLeadTraveler: boolean
  ): any[] {
    const validators: any[] = [];

    // Verificar si el campo es obligatorio (estándar + Amadeus)
    if (this.isFieldMandatory(field, isLeadTraveler)) {
      validators.push(Validators.required);
    }

    // Validaciones específicas según el tipo de campo
    switch (fieldDetails.fieldType) {
      case 'email':
        validators.push(Validators.email);
        break;
      case 'phone':
        // Aplicar la validación específica para teléfono como en SignUpFormComponent
        validators.push(Validators.pattern(/^(\+\d{1,3})?\s?\d{6,14}$/));
        break;
      case 'text':
        // Validación específica para el campo de teléfono basada en el código
        if (fieldDetails.code === 'phone') {
          validators.push(Validators.pattern(/^(\+\d{1,3})?\s?\d{6,14}$/));
        } else {
          // Validaciones para otros campos de texto
          validators.push(Validators.minLength(2)); // Mínimo 2 caracteres
          validators.push(Validators.maxLength(50)); // Máximo 100 caracteres
        }
        break;
      case 'number':
        // Validaciones para campos numéricos - usar valores por defecto
        validators.push(Validators.min(0)); // Mínimo 0
        validators.push(Validators.max(999999)); // Máximo 999999
        break;
      case 'date':
        // Para campos de fecha, agregar validación de fecha válida
        validators.push(this.dateValidator());
        break;
      case 'sex':
        // Para campos de sexo, validar que sea M o F
        validators.push(Validators.pattern(/^[MF]$/));
        break;
      case 'country':
        // Para campos de país, validar que sea un código válido
        validators.push(Validators.pattern(/^[A-Z]{2}$/));
        break;
    }

    return validators;
  }

  /**
   * Validador personalizado para fechas
   */
  private dateValidator() {
    return (control: FormControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null; // Si no hay valor, la validación required se encargará
      }

      let date: Date;

      if (control.value instanceof Date) {
        date = control.value;
      } else if (typeof control.value === 'string') {
        if (control.value.includes('/')) {
          // Formato dd/mm/yyyy
          const parts = control.value.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            date = new Date(year, month, day);
          } else {
            return { invalidDate: true };
          }
        } else {
          // Formato ISO
          date = new Date(control.value);
        }
      } else {
        return { invalidDate: true };
      }

      if (isNaN(date.getTime())) {
        return { invalidDate: true };
      }

      return null;
    };
  }

  /**
   * Inicializa los formularios para todos los viajeros
   */
  private initializeTravelerForms(): void {
    // Limpiar formularios existentes
    while (this.travelerForms.length !== 0) {
      this.travelerForms.removeAt(0);
    }

    // Agregar formularios para cada viajero
    this.travelers.forEach((traveler, index) => {
      const travelerForm = this.createTravelerForm(traveler);
      this.travelerForms.push(travelerForm);
    });

    // Emitir el estado de validez inicial
    setTimeout(() => {
      this.emitFormValidity();
    }, 50);
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
      departureFields: this.departureReservationFieldService.getByDeparture(
        this.departureId
      ),
      mandatoryTypes: this.mandatoryTypeService.getAll(),
      reservationFields: this.reservationFieldService.getAllOrdered(),
      travelers: this.reservationTravelerService.getByReservationOrdered(
        this.reservationId
      ),
      ageGroups: this.ageGroupService.getAllOrdered(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({
          departureFields,
          mandatoryTypes,
          reservationFields,
          travelers,
          ageGroups,
        }) => {
          this.departureReservationFields = departureFields;
          this.mandatoryTypes = mandatoryTypes;
          this.reservationFields = reservationFields;
          this.ageGroups = ageGroups;
          this.travelers = this.sortTravelersWithLeadFirst(travelers);

          // Ordenar los campos de departure por displayOrder
          this.sortDepartureFieldsByDisplayOrder();

          // Cargar campos existentes primero, luego inicializar formularios
          this.loadExistingTravelerFields();
          this.loadOptionalActivitiesAndThenTravelerActivities();

          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error al cargar los datos de configuración';
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los datos de configuración',
            life: 5000,
          });
        },
      });
  }

  /**
   * Ordenar los campos de departure por displayOrder
   */
  private sortDepartureFieldsByDisplayOrder(): void {
    this.departureReservationFields.sort((a, b) => {
      const fieldA = this.getReservationFieldDetails(a.reservationFieldId);
      const fieldB = this.getReservationFieldDetails(b.reservationFieldId);

      if (!fieldA || !fieldB) {
        return 0;
      }

      return fieldA.displayOrder - fieldB.displayOrder;
    });
  }

  /**
   * Cargar actividades opcionales primero, luego las actividades de viajeros
   */
  private loadOptionalActivitiesAndThenTravelerActivities(): void {
    if (!this.itineraryId || !this.departureId) {
      return;
    }

    this.activityService
      .getForItineraryWithPacks(
        this.itineraryId,
        this.departureId,
        undefined,
        undefined,
        true // onlyOpt = true
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (activities) => {
          this.optionalActivities = activities;

          // Ahora cargar las actividades de los viajeros
          this.loadTravelerActivities();
        },
        error: (error) => {
          this.loadTravelerActivities();
        },
      });
  }

  /**
   * Cargar actividades y paquetes de actividades por cada viajero
   */
  private loadTravelerActivities(): void {
    if (!this.travelers || this.travelers.length === 0) {
      return;
    }

    let loadedTravelers = 0;
    const totalTravelers = this.travelers.length;

    this.travelers.forEach((traveler) => {
      forkJoin({
        activities:
          this.reservationTravelerActivityService.getByReservationTraveler(
            traveler.id
          ),
        activityPacks:
          this.reservationTravelerActivityPackService.getByReservationTraveler(
            traveler.id
          ),
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: ({ activities, activityPacks }) => {
            this.travelerActivities[traveler.id] = activities;
            this.travelerActivityPacks[traveler.id] = activityPacks;

            this.loadActivityPricesForTraveler(traveler, activities);
            this.loadActivityPackPricesForTraveler(traveler, activityPacks);

            loadedTravelers++;

            if (loadedTravelers === totalTravelers) {
              if (this.optionalActivities.length > 0) {
                setTimeout(() => {
                  this.emitInitialActivitiesState();
                }, 1000);
              } else {
                setTimeout(() => {
                  if (this.optionalActivities.length > 0) {
                    this.emitInitialActivitiesState();
                  }
                }, 2000);
              }
            }
          },
          error: (error) => {
            loadedTravelers++;

            if (loadedTravelers === totalTravelers) {
              if (this.optionalActivities.length > 0) {
                setTimeout(() => {
                  this.emitInitialActivitiesState();
                }, 1000);
              }
            }
          },
        });
    });
  }

  /**
   * Cargar precios de actividades para un viajero específico
   */
  private loadActivityPricesForTraveler(
    traveler: IReservationTravelerResponse,
    activities: IReservationTravelerActivityResponse[]
  ): void {
    if (!activities || activities.length === 0 || !this.departureId) {
      return;
    }

    if (!this.activityPrices[traveler.id]) {
      this.activityPrices[traveler.id] = {};
    }

    activities.forEach((travelerActivity) => {
      const activity = this.optionalActivities.find(
        (act) => act.id === travelerActivity.activityId
      );

      if (!activity) {
        return;
      }

      if (activity.type === 'pack') {
        this.activityPackPriceService
          .getAll({
            activityPackId: travelerActivity.activityId,
            departureId: this.departureId!,
            ageGroupId: traveler.ageGroupId,
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (prices) => {
              if (prices && prices.length > 0) {
                const price = prices[0];
                const finalPrice =
                  price.campaignPrice && price.campaignPrice > 0
                    ? price.campaignPrice
                    : price.basePrice;

                this.activityPrices[traveler.id][travelerActivity.activityId] =
                  finalPrice;
              }
            },
            error: (error) => {
              // Error handling
            },
          });
      } else {
        this.activityPriceService
          .getAll({
            ActivityId: [travelerActivity.activityId],
            DepartureId: this.departureId!,
            AgeGroupId: traveler.ageGroupId,
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (prices) => {
              if (prices && prices.length > 0) {
                const price = prices[0];
                const finalPrice =
                  price.campaignPrice && price.campaignPrice > 0
                    ? price.campaignPrice
                    : price.basePrice;

                this.activityPrices[traveler.id][travelerActivity.activityId] =
                  finalPrice;
              }
            },
            error: (error) => {
              // Error handling
            },
          });
      }
    });
  }

  /**
   * Cargar precios de paquetes de actividades para un viajero específico
   */
  private loadActivityPackPricesForTraveler(
    traveler: IReservationTravelerResponse,
    activityPacks: IReservationTravelerActivityPackResponse[]
  ): void {
    if (!activityPacks || activityPacks.length === 0 || !this.departureId) {
      return;
    }

    if (!this.activityPrices[traveler.id]) {
      this.activityPrices[traveler.id] = {};
    }

    activityPacks.forEach((travelerActivityPack) => {
      this.activityPackPriceService
        .getAll({
          activityPackId: travelerActivityPack.activityPackId,
          departureId: this.departureId!,
          ageGroupId: traveler.ageGroupId,
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (prices) => {
            if (prices && prices.length > 0) {
              const price = prices[0];
              const finalPrice =
                price.campaignPrice && price.campaignPrice > 0
                  ? price.campaignPrice
                  : price.basePrice;

              this.activityPrices[traveler.id][
                travelerActivityPack.activityPackId
              ] = finalPrice;
            }
          },
          error: (error) => {
            // Error handling
          },
        });
    });
  }

  /**
   * Emite el estado inicial de todas las actividades asignadas
   */
  private emitInitialActivitiesState(): void {
    if (!this.travelers || this.travelers.length === 0) {
      return;
    }

    this.travelers.forEach((traveler) => {
      // Emitir actividades individuales
      const travelerActivities = this.travelerActivities[traveler.id];
      if (travelerActivities) {
        travelerActivities.forEach((activity) => {
          const activityName = this.getActivityName(activity.activityId);
          if (activityName) {
            const activityPrice =
              this.getActivityPrice(traveler.id, activity.activityId) || 0;

            this.activitiesAssignmentChange.emit({
              travelerId: traveler.id,
              activityId: activity.activityId,
              isAssigned: true,
              activityName,
              activityPrice,
            });
          }
        });
      }

      // Emitir paquetes de actividades
      const travelerActivityPacks = this.travelerActivityPacks[traveler.id];
      if (travelerActivityPacks) {
        travelerActivityPacks.forEach((activityPack) => {
          const activityName = this.getActivityName(
            activityPack.activityPackId
          );
          if (activityName) {
            const activityPrice =
              this.getActivityPrice(traveler.id, activityPack.activityPackId) ||
              0;

            this.activitiesAssignmentChange.emit({
              travelerId: traveler.id,
              activityId: activityPack.activityPackId,
              isAssigned: true,
              activityName,
              activityPrice,
            });
          }
        });
      }
    });
  }

  /**
   * Cargar datos existentes de campos de viajeros
   */
  private loadExistingTravelerFields(): void {
    if (!this.travelers || this.travelers.length === 0) {
      return;
    }

    const travelerIds = this.travelers.map((t) => t.id);
    const travelerFieldRequests = travelerIds.map((travelerId) =>
      this.reservationTravelerFieldService.getByReservationTraveler(travelerId)
    );

    forkJoin(travelerFieldRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responses) => {
          this.existingTravelerFields = responses.flat();

          // Debug para campos existentes de fecha
          const existingDateFields = this.existingTravelerFields.filter(
            (field) => {
              const fieldDetails = this.getReservationFieldDetails(
                field.reservationFieldId
              );
              return fieldDetails?.fieldType === 'date';
            }
          );

          // Inicializar formularios con los valores existentes
          this.initializeTravelerForms();

          // Debug: Log de tipos de campos para debugging
          this.logFieldTypesForDebugging();
        },
        error: (error) => {
          // Error handling
        },
      });
  }
  /**
   * Recopilar datos del formulario reactivo
   */
  private collectFormDataFromReactiveForms(): ReservationTravelerFieldCreate[] {
    const formData: ReservationTravelerFieldCreate[] = [];

    // Recorrer todos los formularios de viajeros
    this.travelerForms.controls.forEach((travelerForm) => {
      if (travelerForm instanceof FormGroup) {
        Object.keys(travelerForm.controls).forEach((controlName) => {
          const control = travelerForm.get(controlName);

          // Solo procesar controles modificados (dirty)
          if (control && control.dirty) {
            const { travelerId, fieldId } = this.parseFieldName(controlName);

            if (travelerId && fieldId) {
              const fieldDetails = this.getReservationFieldDetails(fieldId);
              // Para campos de fecha, formatear a dd/mm/yyyy
              let fieldValue = control.value?.toString() || '';
              if (fieldDetails?.fieldType === 'date' && control.value) {
                if (control.value instanceof Date) {
                  fieldValue = this.formatDateToDDMMYYYY(control.value);
                } else if (typeof control.value === 'string') {
                  // Si ya está en formato dd/mm/yyyy, mantenerlo
                  if (control.value.includes('/')) {
                    fieldValue = control.value;
                  } else {
                    // Intentar parsear y formatear
                    const date = new Date(control.value);
                    if (!isNaN(date.getTime())) {
                      fieldValue = this.formatDateToDDMMYYYY(date);
                    }
                  }
                }
              }

              const fieldData = {
                id: 0,
                reservationTravelerId: travelerId,
                reservationFieldId: fieldId,
                value: fieldValue,
              };

              formData.push(fieldData);
            }
          }
        });
      }
    });

    return formData;
  }

  /**
   * Guardar todos los datos de los viajeros desde el formulario
   */
  async saveAllTravelersData(): Promise<void> {
    const formData = this.collectFormDataFromReactiveForms();

    if (formData.length === 0) {
      return;
    }

    try {
      const savePromises = formData.map((fieldData) => {
        const existingField = this.findExistingField(
          fieldData.reservationTravelerId,
          fieldData.reservationFieldId
        );

        const fieldDetails = this.getReservationFieldDetails(
          fieldData.reservationFieldId
        );

        if (existingField) {
          const updateData: ReservationTravelerFieldUpdate = {
            id: existingField.id,
            reservationTravelerId: fieldData.reservationTravelerId,
            reservationFieldId: fieldData.reservationFieldId,
            value: fieldData.value,
          };

          return this.reservationTravelerFieldService
            .update(existingField.id, updateData)
            .toPromise();
        } else {
          return this.reservationTravelerFieldService
            .create(fieldData)
            .toPromise();
        }
      });

      await Promise.all(savePromises);

      // Recargar datos existentes después de guardar
      this.loadExistingTravelerFields();

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Datos de viajeros guardados correctamente',
        life: 3000,
      });
    } catch (error) {
      console.error('Error al guardar datos:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al guardar los datos de viajeros',
        life: 5000,
      });
      throw error;
    }
  }

  /**
   * Obtener el valor existente de un campo específico
   */
  getExistingFieldValue(travelerId: number, fieldId: number): string {
    const existingField = this.existingTravelerFields.find(
      (field) =>
        field.reservationTravelerId === travelerId &&
        field.reservationFieldId === fieldId
    );

    const value = existingField ? existingField.value : '';

    return value;
  }

  /**
   * Verificar si existe un registro para un campo específico
   */
  private findExistingField(
    travelerId: number,
    fieldId: number
  ): IReservationTravelerFieldResponse | null {
    return (
      this.existingTravelerFields.find(
        (field) =>
          field.reservationTravelerId === travelerId &&
          field.reservationFieldId === fieldId
      ) || null
    );
  }

  /**
   * Parsear el nombre del campo para extraer traveler ID y field ID
   */
  private parseFieldName(name: string): {
    travelerId: number | null;
    fieldId: number | null;
  } {
    const nameParts = name.split('_');
    if (nameParts.length < 2) return { travelerId: null, fieldId: null };

    const travelerId = parseInt(nameParts[nameParts.length - 1]);
    const fieldCode = nameParts.slice(0, -1).join('_');

    const field = this.reservationFields.find((f) => f.code === fieldCode);
    if (!field) return { travelerId: null, fieldId: null };

    return {
      travelerId: isNaN(travelerId) ? null : travelerId,
      fieldId: field.id,
    };
  }

  /**
   * Obtener detalles del campo de reservación
   */
  getReservationFieldDetails(
    reservationFieldId: number
  ): IReservationFieldResponse | null {
    return (
      this.reservationFields.find((field) => field.id === reservationFieldId) ||
      null
    );
  }

  /**
   * Verifica si un campo es obligatorio según el tipo de viajero
   */
  isFieldMandatory(
    field: IDepartureReservationFieldResponse,
    isLeadTraveler: boolean = false
  ): boolean {
    // Verificar si es obligatorio según la configuración estándar
    let isStandardMandatory = false;
    
    if (field.mandatoryTypeId === 1) {
      isStandardMandatory = false;
    } else if (field.mandatoryTypeId === 2) {
      isStandardMandatory = true;
    } else if (field.mandatoryTypeId === 3 && isLeadTraveler) {
      isStandardMandatory = true;
    }

    // Verificar si es obligatorio según los requisitos de Amadeus
    const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
    const isAmadeusMandatory = fieldDetails ? this.isFieldAmadeusMandatory(fieldDetails, isLeadTraveler) : false;

    // El campo es obligatorio si lo requiere la configuración estándar O los requisitos de Amadeus
    return isStandardMandatory || isAmadeusMandatory;
  }

  /**
   * Verifica si un campo es obligatorio según los requisitos de Amadeus
   */
  private isFieldAmadeusMandatory(
    fieldDetails: IReservationFieldResponse,
    isLeadTraveler: boolean
  ): boolean {
    // Si no hay requisitos de Amadeus o no hay vuelo seleccionado, no es obligatorio por Amadeus
    if (!this.amadeusBookingRequirements || !this.hasFlightSelected) {
      return false;
    }

    const fieldCode = fieldDetails.code.toLowerCase();

    // Requisitos generales (solo para el líder)
    if (isLeadTraveler) {
      // Mailing address requerida
      if (this.amadeusBookingRequirements.mailingAddressRequired && 
          (fieldCode === 'address' || fieldCode === 'mailing_address')) {
        return true;
      }

      // Mobile phone requerido
      if (this.amadeusBookingRequirements.mobilePhoneNumberRequired && 
          fieldCode === 'phone') {
        return true;
      }

      // Phone requerido
      if (this.amadeusBookingRequirements.phoneNumberRequired && 
          fieldCode === 'phone') {
        return true;
      }

      // Email requerido
      if (this.amadeusBookingRequirements.emailAddressRequired && 
          fieldCode === 'email') {
        return true;
      }

      // Postal code requerido
      if (this.amadeusBookingRequirements.postalCodeRequired && 
          fieldCode === 'postal_code') {
        return true;
      }

      // Invoice address requerida
      if (this.amadeusBookingRequirements.invoiceAddressRequired && 
          (fieldCode === 'invoice_address' || fieldCode === 'billing_address')) {
        return true;
      }

      // Phone country code requerido
      if (this.amadeusBookingRequirements.phoneCountryCodeRequired && 
          fieldCode === 'phone_country_code') {
        return true;
      }
    }

    // Requisitos específicos por viajero
    if (this.amadeusBookingRequirements.travelerRequirements && 
        this.amadeusBookingRequirements.travelerRequirements.length > 0) {
      
      // Buscar el viajero actual en los requisitos
      const currentTravelerIndex = this.travelers.findIndex(t => t.isLeadTraveler === isLeadTraveler);
      if (currentTravelerIndex !== -1) {
        const currentTraveler = this.travelers[currentTravelerIndex];
        const travelerRequirements = this.amadeusBookingRequirements.travelerRequirements.find(
          req => String(req.travelerId) === String(currentTraveler.id)
        );

        if (travelerRequirements) {
          // Gender requerido
          if (travelerRequirements.genderRequired && fieldCode === 'sex') {
            return true;
          }

          // Document requerido
          if (travelerRequirements.documentRequired && fieldCode === 'national_id') {
            return true;
          }

          // Date of birth requerido
          if (travelerRequirements.dateOfBirthRequired && fieldCode === 'birthdate') {
            return true;
          }

          // Document issuance city requerido
          if (travelerRequirements.documentIssuanceCityRequired && 
              fieldCode === 'document_issuance_city') {
            return true;
          }

          // Redress requerido si existe
          if (travelerRequirements.redressRequiredIfAny && fieldCode === 'redress_number') {
            return true;
          }

          // Air France discount requerido
          if (travelerRequirements.airFranceDiscountRequired && 
              fieldCode === 'air_france_discount') {
            return true;
          }

          // Spanish resident discount requerido
          if (travelerRequirements.spanishResidentDiscountRequired && 
              fieldCode === 'spanish_resident_discount') {
            return true;
          }

          // Residence requerido
          if (travelerRequirements.residenceRequired && fieldCode === 'country') {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Alternar mostrar campos adicionales
   */
  toggleMoreFields(): void {
    this.showMoreFields = !this.showMoreFields;
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
    return travelers.sort((a, b) => {
      if (a.isLeadTraveler && !b.isLeadTraveler) {
        return -1;
      }
      if (b.isLeadTraveler && !a.isLeadTraveler) {
        return 1;
      }
      return a.travelerNumber - b.travelerNumber;
    });
  }

  /**
   * Recargar los datos del departure
   */
  reloadData(): void {
    if (this.departureId && this.reservationId) {
      console.log('🔄 Recarga manual de datos solicitada');
      this.deletedFromDB = {};
      // Reiniciar estados de carga
      this.loading = false;
      this.checkingReservationStatus = false;
      this.isCheckingFlightStatus = false;
      this.error = null;
      // Limpiar requisitos de Amadeus
      this.amadeusBookingRequirements = null;
      this.hasFlightSelected = false;
      // Recargar desde el inicio para asegurar el orden correcto
      this.checkFlightSelectionStatus();
    }
  }

  /**
   * Obtener el precio de una actividad para un viajero específico
   */
  getActivityPrice(travelerId: number, activityId: number): number | null {
    return this.activityPrices[travelerId]?.[activityId] || null;
  }

  /**
   * Obtener el precio formateado de una actividad para un viajero específico
   */
  getFormattedActivityPrice(travelerId: number, activityId: number): string {
    const price = this.getActivityPrice(travelerId, activityId);
    return price ? `$${price.toLocaleString()}` : 'Precio no disponible';
  }

  /**
   * Obtener el nombre de la actividad por ID
   */
  getActivityName(activityId: number): string {
    const activity = this.optionalActivities.find((a) => a.id === activityId);
    return activity ? activity.name || 'Sin nombre' : '';
  }

  /**
   * Obtener el tipo de la actividad por ID
   */
  getActivityType(activityId: number): string {
    const activity = this.optionalActivities.find((a) => a.id === activityId);
    return activity ? activity.type || 'Sin tipo' : 'Tipo no encontrado';
  }

  /**
   * Manejar cambio de toggle de actividad
   */
  onActivityToggleChange(
    travelerId: number,
    activityId: number,
    isSelected: boolean
  ): void {
    const activityName = this.getActivityName(activityId);

    if (activityName) {
      const activityPrice = this.getActivityPrice(travelerId, activityId) || 0;

      if (isSelected) {
        this.createActivityAssignment(
          travelerId,
          activityId,
          activityName,
          activityPrice
        );
      } else {
        this.removeActivityAssignment(
          travelerId,
          activityId,
          activityName,
          activityPrice
        );
      }
    }
  }

  /**
   * Crear nueva asignación de actividad en base de datos
   */
  private createActivityAssignment(
    travelerId: number,
    activityId: number,
    activityName: string,
    activityPrice: number
  ): void {
    const isCurrentlyAssigned = this.isTravelerActivityAssigned(
      travelerId,
      activityId
    );
    const wasDeletedFromDB = this.deletedFromDB[travelerId]?.[activityId];

    if (isCurrentlyAssigned && !wasDeletedFromDB) {
      this.activitiesAssignmentChange.emit({
        travelerId,
        activityId,
        isAssigned: true,
        activityName,
        activityPrice,
      });
      return;
    }

    const activity = this.optionalActivities.find((a) => a.id === activityId);
    if (!activity) {
      return;
    }

    const isActivityPack = activity.type === 'pack';

    if (isActivityPack) {
      const activityPackData = {
        id: 0,
        reservationTravelerId: travelerId,
        activityPackId: activityId,
      };

      this.reservationTravelerActivityPackService
        .create(activityPackData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (wasDeletedFromDB) {
              const existingPackIndex = this.travelerActivityPacks[
                travelerId
              ]?.findIndex((pack) => pack.activityPackId === activityId);

              if (existingPackIndex !== -1 && existingPackIndex !== undefined) {
                this.travelerActivityPacks[travelerId][existingPackIndex] =
                  response;
              } else {
                if (!this.travelerActivityPacks[travelerId]) {
                  this.travelerActivityPacks[travelerId] = [];
                }
                this.travelerActivityPacks[travelerId].push(response);
              }
            } else {
              if (!this.travelerActivityPacks[travelerId]) {
                this.travelerActivityPacks[travelerId] = [];
              }
              this.travelerActivityPacks[travelerId].push(response);
            }

            if (this.deletedFromDB[travelerId]?.[activityId]) {
              delete this.deletedFromDB[travelerId][activityId];
            }

            this.activitiesAssignmentChange.emit({
              travelerId,
              activityId,
              isAssigned: true,
              activityName,
              activityPrice,
            });

            this.messageService.add({
              severity: 'success',
              summary: 'Actividad agregada',
              detail: `${activityName} agregada correctamente`,
              life: 3000,
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Error al agregar ${activityName}: ${
                error.message || 'Error desconocido'
              }`,
              life: 5000,
            });
          },
        });
    } else {
      const activityData = {
        id: 0,
        reservationTravelerId: travelerId,
        activityId: activityId,
      };

      this.reservationTravelerActivityService
        .create(activityData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (wasDeletedFromDB) {
              const existingActivityIndex = this.travelerActivities[
                travelerId
              ]?.findIndex((activity) => activity.activityId === activityId);

              if (
                existingActivityIndex !== -1 &&
                existingActivityIndex !== undefined
              ) {
                this.travelerActivities[travelerId][existingActivityIndex] =
                  response;
              } else {
                if (!this.travelerActivities[travelerId]) {
                  this.travelerActivities[travelerId] = [];
                }
                this.travelerActivities[travelerId].push(response);
              }
            } else {
              if (!this.travelerActivities[travelerId]) {
                this.travelerActivities[travelerId] = [];
              }
              this.travelerActivities[travelerId].push(response);
            }

            if (this.deletedFromDB[travelerId]?.[activityId]) {
              delete this.deletedFromDB[travelerId][activityId];
            }

            this.activitiesAssignmentChange.emit({
              travelerId,
              activityId,
              isAssigned: true,
              activityName,
              activityPrice,
            });

            this.messageService.add({
              severity: 'success',
              summary: 'Actividad agregada',
              detail: `${activityName} agregada correctamente`,
              life: 3000,
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Error al agregar ${activityName}: ${
                error.message || 'Error desconocido'
              }`,
              life: 5000,
            });
          },
        });
    }
  }

  /**
   * Eliminar asignación de actividad de base de datos
   */
  private removeActivityAssignment(
    travelerId: number,
    activityId: number,
    activityName: string,
    activityPrice: number
  ): void {
    const individualActivities = this.travelerActivities[travelerId] || [];
    const individualActivity = individualActivities.find(
      (activity) => activity.activityId === activityId
    );

    const activityPacks = this.travelerActivityPacks[travelerId] || [];
    const activityPack = activityPacks.find(
      (pack) => pack.activityPackId === activityId
    );

    if (individualActivity) {
      this.reservationTravelerActivityService
        .delete(individualActivity.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            if (!this.deletedFromDB[travelerId]) {
              this.deletedFromDB[travelerId] = {};
            }
            this.deletedFromDB[travelerId][activityId] = true;

            this.activitiesAssignmentChange.emit({
              travelerId,
              activityId,
              isAssigned: false,
              activityName,
              activityPrice,
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Error al eliminar ${activityName}: ${
                error.message || 'Error desconocido'
              }`,
              life: 5000,
            });
          },
        });
    } else if (activityPack) {
      this.reservationTravelerActivityPackService
        .delete(activityPack.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            if (!this.deletedFromDB[travelerId]) {
              this.deletedFromDB[travelerId] = {};
            }
            this.deletedFromDB[travelerId][activityId] = true;

            this.activitiesAssignmentChange.emit({
              travelerId,
              activityId,
              isAssigned: false,
              activityName,
              activityPrice,
            });
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Error al eliminar ${activityName}: ${
                error.message || 'Error desconocido'
              }`,
              life: 5000,
            });
          },
        });
    } else {
      this.activitiesAssignmentChange.emit({
        travelerId,
        activityId,
        isAssigned: false,
        activityName,
        activityPrice,
      });
    }
  }

  /**
   * Verificar si un viajero tiene una actividad específica asignada
   */
  isTravelerActivityAssigned(travelerId: number, activityId: number): boolean {
    if (this.deletedFromDB[travelerId]?.[activityId]) {
      return false;
    }

    const activities = this.travelerActivities[travelerId];
    const hasIndividualActivity = activities
      ? activities.some((activity) => activity.activityId === activityId)
      : false;

    const activityPacks = this.travelerActivityPacks[travelerId];
    const hasActivityPack = activityPacks
      ? activityPacks.some(
          (activityPack) => activityPack.activityPackId === activityId
        )
      : false;

    return hasIndividualActivity || hasActivityPack;
  }

  /**
   * Formatear fecha a dd/mm/yyyy
   */
  private formatDateToDDMMYYYY(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Parsear string dd/mm/yyyy a Date
   */
  private parseDateFromDDMMYYYY(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }

    const parts = dateString.split('/');
    if (parts.length !== 3) {
      return null;
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Los meses en JS van de 0-11
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }

    const date = new Date(year, month, day);

    // Verificar que la fecha es válida
    if (
      date.getDate() !== day ||
      date.getMonth() !== month ||
      date.getFullYear() !== year
    ) {
      return null;
    }

    return date;
  }

  /**
   * Manejar cambio en campo de fecha
   */
  onDateFieldChange(travelerId: number, fieldCode: string, value: any): void {
    const controlName = `${fieldCode}_${travelerId}`;
    const control = this.travelerForms.controls
      .find((form) => form instanceof FormGroup && form.get(controlName))
      ?.get(controlName);

    if (control) {
      // Forzar que el control se marque como modificado
      control.markAsDirty();
      control.markAsTouched();
      this.emitFormValidity();
    }
  }

  /**
   * Manejar cambio en cualquier campo del formulario
   */
  onFieldChange(travelerId: number, fieldCode: string): void {
    const controlName = `${fieldCode}_${travelerId}`;
    const control = this.travelerForms.controls
      .find((form) => form instanceof FormGroup && form.get(controlName))
      ?.get(controlName);

    if (control) {
      control.markAsDirty();
      control.markAsTouched();
      this.emitFormValidity();
    }
  }

  /**
   * Maneja el cambio en campos de teléfono, filtrando caracteres no numéricos
   */
  onPhoneFieldChange(travelerId: number, fieldCode: string, event: any): void {
    const input = event.target as HTMLInputElement;
    // Filtrar solo números, +, espacios y guiones
    const filteredValue = input.value.replace(/[^\d+\s-]/g, '');
    input.value = filteredValue;

    // Actualizar el control del formulario
    const controlName = `${fieldCode}_${travelerId}`;
    const control = this.travelerForms.controls
      .find((form) => form instanceof FormGroup && form.get(controlName))
      ?.get(controlName);

    if (control) {
      control.setValue(filteredValue);
      control.markAsDirty();
      control.markAsTouched();
      this.emitFormValidity();
    }
  }

  /**
   * Obtener el valor formateado de una fecha para mostrar en el campo
   */
  getFormattedDateValue(travelerId: number, fieldCode: string): string {
    const controlName = `${fieldCode}_${travelerId}`;
    const control = this.travelerForms.controls
      .find((form) => form instanceof FormGroup && form.get(controlName))
      ?.get(controlName);

    if (control && control.value) {
      // Si el valor es un objeto Date, convertirlo a dd/mm/yyyy
      if (control.value instanceof Date) {
        return this.formatDateToDDMMYYYY(control.value);
      }

      // Si es un string en formato dd/mm/yyyy, devolverlo tal como está
      if (typeof control.value === 'string' && control.value.includes('/')) {
        return control.value;
      }

      // Si es un string en formato ISO (YYYY-MM-DD), convertirlo
      if (typeof control.value === 'string' && control.value.includes('-')) {
        const date = new Date(control.value);
        if (!isNaN(date.getTime())) {
          return this.formatDateToDDMMYYYY(date);
        }
      }

      // Para cualquier otro caso, intentar parsear como fecha
      const date = new Date(control.value);
      if (!isNaN(date.getTime())) {
        return this.formatDateToDDMMYYYY(date);
      }
    }

    return '';
  }

  /**
   * Obtener el valor actual de un campo de fecha para debugging
   */
  getCurrentDateValue(travelerId: number, fieldCode: string): any {
    const controlName = `${fieldCode}_${travelerId}`;
    const control = this.travelerForms.controls
      .find((form) => form instanceof FormGroup && form.get(controlName))
      ?.get(controlName);

    if (control) {
      return {
        value: control.value,
        type: typeof control.value,
        isDate: control.value instanceof Date,
        formatted: this.getFormattedDateValue(travelerId, fieldCode),
        dirty: control.dirty,
        touched: control.touched,
        valid: control.valid,
      };
    }

    return null;
  }

  /**
   * Verifica si el formulario completo es válido
   */
  isFormValid(): boolean {
    if (!this.travelersForm || !this.travelerForms) {
      return false;
    }

    // Verificar que todos los formularios de viajeros sean válidos
    for (let i = 0; i < this.travelerForms.length; i++) {
      const travelerForm = this.getTravelerForm(i);
      if (travelerForm && !travelerForm.valid) {
        return false;
      }
    }

    return true;
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getErrorMessage(fieldCode: string, errors: any): string {
    if (!errors) return '';

    const fieldType = this.getFieldTypeByCode(fieldCode);
    const errorMessages =
      this.errorMessages[fieldType] || this.errorMessages['required'];

    for (const errorKey in errors) {
      if (errorMessages[errorKey]) {
        let message = errorMessages[errorKey];

        // Reemplazar placeholders en los mensajes
        if (errorKey === 'minlength' && errors[errorKey]?.requiredLength) {
          message = message.replace(
            '{minLength}',
            errors[errorKey].requiredLength
          );
        } else if (
          errorKey === 'maxlength' &&
          errors[errorKey]?.requiredLength
        ) {
          message = message.replace(
            '{maxLength}',
            errors[errorKey].requiredLength
          );
        } else if (errorKey === 'min' && errors[errorKey]?.min) {
          message = message.replace('{min}', errors[errorKey].min);
        } else if (errorKey === 'max' && errors[errorKey]?.max) {
          message = message.replace('{max}', errors[errorKey].max);
        }

        return message;
      }
    }

    return 'Campo inválido';
  }

  /**
   * Obtiene el tipo de campo por su código
   */
  private getFieldTypeByCode(fieldCode: string): string {
    const field = this.reservationFields.find((f) => f.code === fieldCode);

    // Si el campo es 'phone', usar 'phone' como tipo para los mensajes de error
    if (fieldCode === 'phone') {
      return 'phone';
    }

    return field?.fieldType || 'required';
  }

  /**
   * Verifica si un campo específico tiene errores
   */
  hasFieldError(travelerId: number, fieldCode: string): boolean {
    const controlName = `${fieldCode}_${travelerId}`;
    const control = this.travelerForms.controls
      .find((form) => form instanceof FormGroup && form.get(controlName))
      ?.get(controlName);

    return control
      ? control.invalid && (control.dirty || control.touched)
      : false;
  }

  /**
   * Obtiene los errores de un campo específico
   */
  getFieldErrors(travelerId: number, fieldCode: string): any {
    const controlName = `${fieldCode}_${travelerId}`;
    const control = this.travelerForms.controls
      .find((form) => form instanceof FormGroup && form.get(controlName))
      ?.get(controlName);

    return control ? control.errors : null;
  }

  /**
   * Marca todos los campos como touched para mostrar errores
   */
  markAllFieldsAsTouched(): void {
    this.travelerForms.controls.forEach((travelerForm) => {
      if (travelerForm instanceof FormGroup) {
        Object.keys(travelerForm.controls).forEach((controlName) => {
          const control = travelerForm.get(controlName);
          if (control) {
            control.markAsTouched();
          }
        });
      }
    });
  }

  /**
   * Emite el estado de validez del formulario
   */
  private emitFormValidity(): void {
    const isValid = this.isFormValid();
    this.formValidityChange.emit(isValid);
  }

  /**
   * Verifica si todos los campos obligatorios están completados
   */
  areAllMandatoryFieldsCompleted(): boolean {
    if (!this.travelers || this.travelers.length === 0) {
      return false;
    }

    for (const traveler of this.travelers) {
      const travelerForm = this.getTravelerForm(
        this.travelers.indexOf(traveler)
      );
      if (!travelerForm) continue;

      // Verificar campos obligatorios para este viajero
      for (const field of this.departureReservationFields) {
        if (this.isFieldMandatory(field, traveler.isLeadTraveler)) {
          const fieldDetails = this.getReservationFieldDetails(
            field.reservationFieldId
          );
          if (fieldDetails) {
            const controlName = `${fieldDetails.code}_${traveler.id}`;
            const control = travelerForm.get(controlName);

            if (!control || !control.value || control.invalid) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * Obtiene la lista de campos faltantes para mostrar al usuario
   */
  getMissingFieldsList(): string[] {
    const missingFields: string[] = [];

    if (!this.travelers || this.travelers.length === 0) {
      return missingFields;
    }

    for (const traveler of this.travelers) {
      const travelerForm = this.getTravelerForm(
        this.travelers.indexOf(traveler)
      );
      if (!travelerForm) continue;

      for (const field of this.departureReservationFields) {
        if (this.isFieldMandatory(field, traveler.isLeadTraveler)) {
          const fieldDetails = this.getReservationFieldDetails(
            field.reservationFieldId
          );
          if (fieldDetails) {
            const controlName = `${fieldDetails.code}_${traveler.id}`;
            const control = travelerForm.get(controlName);

            if (!control || !control.value || control.invalid) {
              missingFields.push(
                `${fieldDetails.name} (Viajero ${traveler.travelerNumber})`
              );
            }
          }
        }
      }
    }

    return missingFields;
  }

  /**
   * Muestra un toast informativo cuando faltan campos obligatorios
   */
  showMissingFieldsToast(): void {
    console.log('=== DEBUG: showMissingFieldsToast iniciado ===');

    const missingFields = this.getMissingFieldsList();
    console.log('Campos faltantes:', missingFields);

    if (missingFields.length > 0) {
      const message = `Por favor completa los siguientes campos obligatorios: ${missingFields.join(
        ', '
      )}`;

      console.log('Mensaje del toast:', message);

      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: message,
        life: 5000,
      });

      console.log('Toast agregado al MessageService');
    } else {
      console.log('No hay campos faltantes');
    }

    console.log('=== DEBUG: showMissingFieldsToast terminado ===');
  }

  /**
   * Valida el formulario y muestra toast si hay errores
   */
  validateFormAndShowToast(): boolean {
    console.log('=== DEBUG: validateFormAndShowToast iniciado ===');

    const isValid = this.isFormValid();
    console.log('Formulario válido:', isValid);

    if (!isValid) {
      console.log('Formulario NO válido, marcando campos como touched...');
      this.markAllFieldsAsTouched();
      console.log('Mostrando toast de campos faltantes...');
      this.showMissingFieldsToast();
    } else {
      console.log('Formulario válido, no se muestra toast');
    }

    console.log('=== DEBUG: validateFormAndShowToast terminado ===');
    return isValid;
  }

  /**
   * Obtiene información detallada de validación para debugging
   */
  getValidationDebugInfo(): any {
    const debugInfo: any = {
      totalTravelers: this.travelers?.length || 0,
      formValid: this.isFormValid(),
      missingFields: this.getMissingFieldsList(),
      fieldTypes: {},
    };

    // Obtener información de tipos de campos
    if (this.departureReservationFields && this.reservationFields) {
      this.departureReservationFields.forEach((field) => {
        const fieldDetails = this.getReservationFieldDetails(
          field.reservationFieldId
        );
        if (fieldDetails) {
          debugInfo.fieldTypes[fieldDetails.code] = {
            name: fieldDetails.name,
            type: fieldDetails.fieldType,
            mandatory: this.isFieldMandatory(field, false),
          };
        }
      });
    }

    return debugInfo;
  }

  /**
   * Console log para debugging de tipos de campos
   */
  logFieldTypesForDebugging(): void {
    console.log('=== DEBUG: Tipos de campos disponibles ===');

    if (this.reservationFields) {
      this.reservationFields.forEach((field) => {
        console.log(
          `Campo: ${field.name} (${field.code}) - Tipo: ${field.fieldType}`
        );
      });
    }

    if (this.departureReservationFields) {
      console.log('=== DEBUG: Campos de departure ===');
      this.departureReservationFields.forEach((field) => {
        const fieldDetails = this.getReservationFieldDetails(
          field.reservationFieldId
        );
        console.log(
          `Departure Field: ${
            fieldDetails?.name
          } - Mandatory: ${this.isFieldMandatory(field, false)}`
        );
      });
    }
  }

  /**
   * Método de prueba para verificar que el toast funciona
   */
  testToast(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Prueba de Toast',
      detail:
        'Este es un mensaje de prueba para verificar que el toast funciona correctamente',
      life: 3000,
    });
  }

  /**
   * Método para debuggear los tipos de campo de teléfono
   */
  debugPhoneFieldTypes(): void {
    console.log('=== DEBUG: Tipos de campo de teléfono ===');
    this.departureReservationFields.forEach((field) => {
      const fieldDetails = this.getReservationFieldDetails(
        field.reservationFieldId
      );
      if (fieldDetails && fieldDetails.code.toLowerCase().includes('phone')) {
        console.log(
          'Campo:',
          fieldDetails.name,
          'Código:',
          fieldDetails.code,
          'Tipo:',
          fieldDetails.fieldType
        );
      }
    });
    console.log('=== FIN DEBUG ===');
  }

  /**
   * Obtiene información sobre los requisitos de reserva de Amadeus
   */
  getAmadeusRequirementsInfo(): any {
    return {
      hasFlightSelected: this.hasFlightSelected,
      requirements: this.amadeusBookingRequirements,
      isChecking: this.isCheckingFlightStatus
    };
  }

  /**
   * Verifica si hay requisitos específicos de Amadeus que requieran campos adicionales
   */
  hasAmadeusSpecificRequirements(): boolean {
    if (!this.amadeusBookingRequirements || !this.hasFlightSelected) {
      return false;
    }

    // Verificar si hay requisitos específicos que no estén cubiertos por los campos estándar
    return !!(
      this.amadeusBookingRequirements.invoiceAddressRequired ||
      this.amadeusBookingRequirements.mailingAddressRequired ||
      this.amadeusBookingRequirements.phoneCountryCodeRequired ||
      (this.amadeusBookingRequirements.travelerRequirements && 
       this.amadeusBookingRequirements.travelerRequirements.length > 0)
    );
  }

  /**
   * Obtiene la lista de campos que se han vuelto obligatorios debido a los requisitos de Amadeus
   */
  getAmadeusMandatoryFields(): string[] {
    const mandatoryFields: string[] = [];

    if (!this.amadeusBookingRequirements || !this.hasFlightSelected) {
      return mandatoryFields;
    }

    // Requisitos generales para el líder
    if (this.amadeusBookingRequirements.mailingAddressRequired) {
      mandatoryFields.push('Dirección de correo');
    }
    if (this.amadeusBookingRequirements.mobilePhoneNumberRequired || 
        this.amadeusBookingRequirements.phoneNumberRequired) {
      mandatoryFields.push('Teléfono');
    }
    if (this.amadeusBookingRequirements.emailAddressRequired) {
      mandatoryFields.push('Correo electrónico');
    }
    if (this.amadeusBookingRequirements.postalCodeRequired) {
      mandatoryFields.push('Código postal');
    }
    if (this.amadeusBookingRequirements.invoiceAddressRequired) {
      mandatoryFields.push('Dirección de facturación');
    }
    if (this.amadeusBookingRequirements.phoneCountryCodeRequired) {
      mandatoryFields.push('Código de país del teléfono');
    }

    // Requisitos específicos por viajero
    if (this.amadeusBookingRequirements.travelerRequirements) {
      this.amadeusBookingRequirements.travelerRequirements.forEach((req, index) => {
        const travelerNumber = index + 1;
        if (req.genderRequired) {
          mandatoryFields.push(`Género (Viajero ${travelerNumber})`);
        }
        if (req.documentRequired) {
          mandatoryFields.push(`Documento de identidad (Viajero ${travelerNumber})`);
        }
        if (req.dateOfBirthRequired) {
          mandatoryFields.push(`Fecha de nacimiento (Viajero ${travelerNumber})`);
        }
        if (req.documentIssuanceCityRequired) {
          mandatoryFields.push(`Ciudad de emisión del documento (Viajero ${travelerNumber})`);
        }
        if (req.redressRequiredIfAny) {
          mandatoryFields.push(`Número de redress (Viajero ${travelerNumber})`);
        }
        if (req.airFranceDiscountRequired) {
          mandatoryFields.push(`Descuento de Air France (Viajero ${travelerNumber})`);
        }
        if (req.spanishResidentDiscountRequired) {
          mandatoryFields.push(`Descuento de residente español (Viajero ${travelerNumber})`);
        }
        if (req.residenceRequired) {
          mandatoryFields.push(`País de residencia (Viajero ${travelerNumber})`);
        }
      });
    }

    return mandatoryFields;
  }

  /**
   * Obtiene información de debugging sobre los campos obligatorios
   */
  getMandatoryFieldsDebugInfo(): any {
    const debugInfo: any = {
      hasAmadeusRequirements: !!this.amadeusBookingRequirements,
      hasFlightSelected: this.hasFlightSelected,
      amadeusMandatoryFields: this.getAmadeusMandatoryFields(),
      fieldAnalysis: {}
    };

    // Analizar cada campo para determinar por qué es obligatorio
    if (this.departureReservationFields && this.travelers) {
      this.departureReservationFields.forEach((field) => {
        const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
        if (fieldDetails) {
          const fieldCode = fieldDetails.code;
          const isStandardMandatory = this.isFieldMandatory(field, false);
          const isAmadeusMandatory = this.isFieldAmadeusMandatory(fieldDetails, false);
          
          debugInfo.fieldAnalysis[fieldCode] = {
            name: fieldDetails.name,
            type: fieldDetails.fieldType,
            standardMandatory: isStandardMandatory,
            amadeusMandatory: isAmadeusMandatory,
            finalMandatory: isStandardMandatory || isAmadeusMandatory,
            mandatoryTypeId: field.mandatoryTypeId
          };
        }
      });
    }

    return debugInfo;
  }

  /**
   * Verifica si hay un vuelo seleccionado en Amadeus y obtiene los requisitos de reserva si es necesario
   */
  private checkFlightSelectionStatus(): void {
    if (!this.reservationId) {
      console.log('No hay reservationId, continuando con carga normal...');
      this.loadReservationStatuses();
      return;
    }

    console.log('=== Verificando estado de selección de vuelos en Amadeus ===');
    this.isCheckingFlightStatus = true;

    this.flightSearchService.getSelectionStatus(this.reservationId).subscribe({
      next: (hasSelection: boolean) => {
        console.log('Estado de selección de vuelos:', hasSelection);
        this.hasFlightSelected = hasSelection;

        if (hasSelection) {
          console.log('✅ Vuelo seleccionado encontrado, obteniendo requisitos de reserva...');
          this.getAmadeusBookingRequirements();
        } else {
          console.log('ℹ️ No hay vuelo seleccionado, continuando con carga normal...');
          this.isCheckingFlightStatus = false;
          this.loadReservationStatuses();
        }
      },
      error: (error) => {
        console.error('❌ Error al verificar estado de selección de vuelos:', error);
        console.log('⚠️ Continuando con carga normal debido al error...');
        this.isCheckingFlightStatus = false;
        this.loadReservationStatuses();
      }
    });
  }

  /**
   * Obtiene los requisitos de reserva de Amadeus para la reserva actual
   */
  private getAmadeusBookingRequirements(): void {
    if (!this.reservationId) {
      console.log('No hay reservationId, continuando con carga normal...');
      this.isCheckingFlightStatus = false;
      this.loadReservationStatuses();
      return;
    }

    console.log('=== Obteniendo requisitos de reserva de Amadeus ===');

    this.flightSearchService.getBookingRequirements(this.reservationId).subscribe({
      next: (requirements: IBookingRequirements) => {
        console.log('✅ Requisitos de reserva obtenidos:', requirements);
        this.amadeusBookingRequirements = requirements;
        this.isCheckingFlightStatus = false;

        // Si ya tenemos formularios inicializados, reinicializarlos para aplicar las nuevas validaciones
        if (this.travelerForms.length > 0) {
          console.log('🔄 Reinicializando formularios con nuevos requisitos de Amadeus...');
          this.initializeTravelerForms();
        }

        // Ahora continuar con la carga normal de datos
        this.loadReservationStatuses();
      },
      error: (error) => {
        console.error('❌ Error al obtener requisitos de reserva:', error);
        console.log('⚠️ Continuando con carga normal debido al error...');
        this.amadeusBookingRequirements = null;
        this.isCheckingFlightStatus = false;
        this.loadReservationStatuses();
      }
    });
  }
}
