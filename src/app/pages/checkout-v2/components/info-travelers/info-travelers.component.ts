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
import { FormGroup, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { ReservationService } from '../../../../core/services/reservation/reservation.service';
import { IReservationStatusResponse, ReservationStatusService } from '../../../../core/services/reservation/reservation-status.service';

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

  // Formulario reactivo principal
  travelersForm: FormGroup;

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
    private reservationService: ReservationService
  ) {
    this.travelersForm = this.fb.group({
      travelers: this.fb.array([]),
    });
   }

  ngOnInit(): void {


    if (this.departureId && this.reservationId) {
      this.loadAllData();
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
        this.deletedFromDB = {};
        this.loadAllData();
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

        formGroup.addControl(
          `${fieldDetails.code}_${traveler.id}`,
          this.fb.control(controlValue)
        );
      }
    });

    return formGroup;
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
   * Verificar si un campo es obligatorio según el tipo de viajero
   */
  isFieldMandatory(
    field: IDepartureReservationFieldResponse,
    isLeadTraveler: boolean = false
  ): boolean {
    if (field.mandatoryTypeId === 1) {
      return false;
    }

    if (field.mandatoryTypeId === 2) {
      return true;
    }

    if (field.mandatoryTypeId === 3 && isLeadTraveler) {
      return true;
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
      this.deletedFromDB = {};
      this.loadAllData();
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
              detail: `Error al agregar ${activityName}: ${error.message || 'Error desconocido'
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
              detail: `Error al agregar ${activityName}: ${error.message || 'Error desconocido'
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
              detail: `Error al eliminar ${activityName}: ${error.message || 'Error desconocido'
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
              detail: `Error al eliminar ${activityName}: ${error.message || 'Error desconocido'
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
}
