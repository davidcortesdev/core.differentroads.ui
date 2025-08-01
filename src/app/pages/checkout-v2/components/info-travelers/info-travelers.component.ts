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
  ActivityPriceService,
  IActivityPriceResponse,
} from '../../../../core/services/activity/activity-price.service';
import {
  ActivityPackPriceService,
  IActivityPackPriceResponse,
} from '../../../../core/services/activity/activity-pack-price.service';

@Component({
  selector: 'app-info-travelers',
  standalone: false,
  templateUrl: './info-travelers.component.html',
  styleUrls: ['./info-travelers.component.scss'],
})
export class InfoTravelersComponent implements OnInit, OnDestroy, OnChanges {
  // Inputs del componente padre
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() itineraryId: number | null = null;

  // Output para comunicar cambios de actividades al componente padre
  @Output() activitiesAssignmentChange = new EventEmitter<{
    travelerId: number;
    activityId: number;
    isAssigned: boolean;
    activityName: string;
    activityPrice: number;
  }>();

  // Datos del departure
  departureReservationFields: IDepartureReservationFieldResponse[] = [];
  mandatoryTypes: IMandatoryTypeResponse[] = [];
  reservationFields: IReservationFieldResponse[] = [];
  travelers: IReservationTravelerResponse[] = [];
  ageGroups: IAgeGroupResponse[] = [];

  // Estados del componente
  loading: boolean = false;
  error: string | null = null;
  showMoreFields: boolean = false;

  // Datos existentes de campos de viajeros
  existingTravelerFields: IReservationTravelerFieldResponse[] = [];

  // Actividades opcionales
  optionalActivities: IActivityResponse[] = [];

  // Actividades asignadas por viajero
  travelerActivities: {
    [travelerId: number]: IReservationTravelerActivityResponse[];
  } = {};

  // Precios de actividades por viajero
  activityPrices: {
    [travelerId: number]: {
      [activityId: number]: number;
    };
  } = {};

  // Opciones para campos específicos
  sexOptions = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
  ];

  countryOptions = [
    { name: 'España', code: 'ES', value: 'ES' },
    { name: 'Colombia', code: 'CO', value: 'CO' },
  ];

  // Subject para manejar la destrucción del componente
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
    private activityPriceService: ActivityPriceService,
    private activityPackPriceService: ActivityPackPriceService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    console.log('departureId:', this.departureId);
    console.log('reservationId:', this.reservationId);
    console.log('itineraryId:', this.itineraryId);

    if (this.departureId && this.reservationId) {
      this.loadAllData();
    } else {
      this.error = 'No se proporcionó un ID de departure o reservación válido';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges - info-travelers:', changes);
    if ((changes['departureId'] && changes['departureId'].currentValue) || 
        (changes['reservationId'] && changes['reservationId'].currentValue)) {
      console.log('🔄 Recargando datos de info-travelers');
      if (this.departureId && this.reservationId) {
        this.loadAllData();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

    // Cargar los cinco servicios en paralelo
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
          // Asegurar que el lead traveler siempre sea el primero
          this.travelers = this.sortTravelersWithLeadFirst(travelers);

          // Cargar datos existentes de campos de viajeros
          this.loadExistingTravelerFields();

          // Cargar actividades opcionales
          this.loadOptionalActivities();

          // Cargar actividades por cada viajero
          this.loadTravelerActivities();

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
   * Cargar actividades por cada viajero
   */
  private loadTravelerActivities(): void {
    if (!this.travelers || this.travelers.length === 0) {
      return;
    }

    let loadedTravelers = 0;
    const totalTravelers = this.travelers.length;

    this.travelers.forEach((traveler) => {
      this.reservationTravelerActivityService
        .getByReservationTraveler(traveler.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (activities) => {
            this.travelerActivities[traveler.id] = activities;
            console.log(`Actividades para viajero ${traveler.id}:`, activities);

            // Cargar precios para las actividades de este viajero
            this.loadActivityPricesForTraveler(traveler, activities);

            loadedTravelers++;
            
            // Emitir estado inicial cuando todos los viajeros estén cargados
            if (loadedTravelers === totalTravelers) {
              // Pequeño delay para asegurar que los precios se hayan cargado
              setTimeout(() => {
                this.emitInitialActivitiesState();
              }, 1000);
            }
          },
          error: (error) => {
            console.error(
              `Error al cargar actividades para viajero ${traveler.id}:`,
              error
            );
            loadedTravelers++;
            
            // Continuar con el conteo incluso si hay error
            if (loadedTravelers === totalTravelers) {
              setTimeout(() => {
                this.emitInitialActivitiesState();
              }, 1000);
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

    // Inicializar el objeto de precios para este viajero si no existe
    if (!this.activityPrices[traveler.id]) {
      this.activityPrices[traveler.id] = {};
    }

    activities.forEach((travelerActivity) => {
      // Buscar la actividad en la lista de actividades opcionales para obtener su tipo
      const activity = this.optionalActivities.find(
        (act) => act.id === travelerActivity.activityId
      );

      if (!activity) {
        console.warn(
          `No se encontró la actividad con ID ${travelerActivity.activityId}`
        );
        return;
      }

      // Determinar si es pack o actividad individual según el tipo
      if (activity.type === 'pack') {
        // Obtener precio de pack
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
                // Tomar el primer precio encontrado o el precio de campaña si existe
                const price = prices[0];
                const finalPrice =
                  price.campaignPrice && price.campaignPrice > 0
                    ? price.campaignPrice
                    : price.basePrice;

                this.activityPrices[traveler.id][travelerActivity.activityId] =
                  finalPrice;
                console.log(
                  `Precio pack actividad ${travelerActivity.activityId} para viajero ${traveler.id}:`,
                  finalPrice
                );
              }
            },
            error: (error) => {
              console.error(
                `Error al cargar precio pack para actividad ${travelerActivity.activityId}:`,
                error
              );
            },
          });
      } else {
        // Obtener precio de actividad individual
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
                // Tomar el primer precio encontrado o el precio de campaña si existe
                const price = prices[0];
                const finalPrice =
                  price.campaignPrice && price.campaignPrice > 0
                    ? price.campaignPrice
                    : price.basePrice;

                this.activityPrices[traveler.id][travelerActivity.activityId] =
                  finalPrice;
                console.log(
                  `Precio actividad ${travelerActivity.activityId} para viajero ${traveler.id}:`,
                  finalPrice
                );
              }
            },
            error: (error) => {
              console.error(
                `Error al cargar precio para actividad ${travelerActivity.activityId}:`,
                error
              );
            },
          });
      }
    });
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
    return activity ? activity.name || 'Sin nombre' : 'Actividad no encontrada';
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
    console.log(
      `Toggle cambiado - Viajero: ${travelerId}, Actividad: ${activityId}, Seleccionado: ${isSelected}`
    );

    // Obtener información de la actividad y su precio
    const activityName = this.getActivityName(activityId);
    const activityPrice = this.getActivityPrice(travelerId, activityId) || 0;

    // Emitir el evento al componente padre
    this.activitiesAssignmentChange.emit({
      travelerId,
      activityId,
      isAssigned: isSelected,
      activityName,
      activityPrice,
    });

    if (isSelected) {
      console.log(
        `Actividad ${activityId} activada para viajero ${travelerId}`
      );
      // Aquí podrías agregar lógica para crear la asignación en BD si es necesario
    } else {
      console.log(
        `Actividad ${activityId} desactivada para viajero ${travelerId}`
      );
      // Aquí podrías agregar lógica para eliminar la asignación en BD si es necesario
    }
  }

  /**
   * Emite el estado inicial de todas las actividades asignadas
   */
  private emitInitialActivitiesState(): void {
    if (!this.travelers || this.travelers.length === 0) {
      return;
    }

    this.travelers.forEach(traveler => {
      const travelerActivities = this.travelerActivities[traveler.id];
      if (travelerActivities) {
        travelerActivities.forEach(activity => {
          const activityName = this.getActivityName(activity.activityId);
          const activityPrice = this.getActivityPrice(traveler.id, activity.activityId) || 0;
          
          this.activitiesAssignmentChange.emit({
            travelerId: traveler.id,
            activityId: activity.activityId,
            isAssigned: true,
            activityName,
            activityPrice,
          });
        });
      }
    });
  }

  /**
   * Verificar si un viajero tiene una actividad específica asignada
   */
  isTravelerActivityAssigned(travelerId: number, activityId: number): boolean {
    const activities = this.travelerActivities[travelerId];
    return activities
      ? activities.some((activity) => activity.activityId === activityId)
      : false;
  }

  /**
   * Cargar actividades opcionales
   */
  private loadOptionalActivities(): void {
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
          console.log('Actividades opcionales:', this.optionalActivities);
        },
        error: (error) => {
          console.error('Error al cargar actividades:', error);
        },
      });
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
    // id: 1 - NOT_MANDATORY (no obligatorio para ninguno)
    if (field.mandatoryTypeId === 1) {
      return false;
    }

    // id: 2 - MANDATORY_ALL (obligatorio para todos)
    if (field.mandatoryTypeId === 2) {
      return true;
    }

    // id: 3 - MANDATORY_LEAD (obligatorio solo para el lead traveler)
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
      // Si a es lead traveler, va primero
      if (a.isLeadTraveler && !b.isLeadTraveler) {
        return -1;
      }
      // Si b es lead traveler, va primero
      if (b.isLeadTraveler && !a.isLeadTraveler) {
        return 1;
      }
      // Si ambos o ninguno es lead traveler, ordenar por travelerNumber
      return a.travelerNumber - b.travelerNumber;
    });
  }

  /**
   * Cargar datos existentes de campos de viajeros
   */
  private loadExistingTravelerFields(): void {
    if (!this.travelers || this.travelers.length === 0) {
      return;
    }

    // Obtener todos los campos existentes para todos los viajeros de esta reserva
    const travelerIds = this.travelers.map((t) => t.id);
    const travelerFieldRequests = travelerIds.map((travelerId) =>
      this.reservationTravelerFieldService.getByReservationTraveler(travelerId)
    );

    forkJoin(travelerFieldRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responses) => {
          // Aplanar todas las respuestas en un solo array
          this.existingTravelerFields = responses.flat();
        },
        error: (error) => {
          console.error(
            'Error al cargar campos existentes de viajeros:',
            error
          );
        },
      });
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
    return existingField ? existingField.value : '';
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
   * Recargar los datos del departure
   */
  reloadData(): void {
    if (this.departureId && this.reservationId) {
      this.loadAllData();
    }
  }

  /**
   * Guardar todos los datos de los viajeros desde el formulario
   * Este método es llamado por el componente padre
   */
  async saveAllTravelersData(): Promise<void> {
    const formData = this.collectFormData();

    if (formData.length === 0) {
      return; // No hay datos para guardar
    }

    try {
      // Procesar cada campo: crear o actualizar según corresponda
      const savePromises = formData.map((fieldData) => {
        const existingField = this.findExistingField(
          fieldData.reservationTravelerId,
          fieldData.reservationFieldId
        );

        if (existingField) {
          // Actualizar registro existente
          const updateData: ReservationTravelerFieldUpdate = {
            id: existingField.id,
            reservationTravelerId: fieldData.reservationTravelerId,
            reservationFieldId: fieldData.reservationFieldId,
            value: fieldData.value,
          };

          return new Promise((resolve, reject) => {
            this.reservationTravelerFieldService
              .update(existingField.id, updateData)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (response) => resolve(response),
                error: (error) => reject(error),
              });
          });
        } else {
          // Crear nuevo registro
          return new Promise((resolve, reject) => {
            this.reservationTravelerFieldService
              .create(fieldData)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (response) => resolve(response),
                error: (error) => reject(error),
              });
          });
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
   * Recopilar todos los datos del formulario
   */
  private collectFormData(): ReservationTravelerFieldCreate[] {
    const formData: ReservationTravelerFieldCreate[] = [];

    // Obtener todos los formularios de viajeros
    const travelerForms = document.querySelectorAll('form.traveler-form');

    travelerForms.forEach((form) => {
      // Obtener todos los elementos de input dentro de cada formulario
      const inputs = form.querySelectorAll('input[name]');
      const selects = form.querySelectorAll('p-select[ng-reflect-name]');
      const datepickers = form.querySelectorAll(
        'p-datepicker[ng-reflect-name]'
      );
      const autocompletes = form.querySelectorAll(
        'p-autocomplete[ng-reflect-name]'
      );
      const checkboxes = form.querySelectorAll('p-checkbox[ng-reflect-name]');

      // Procesar inputs
      inputs.forEach((input: any) => {
        const fieldData = this.extractFieldData(input);
        if (fieldData) formData.push(fieldData);
      });

      // Procesar selects
      selects.forEach((select: any) => {
        const fieldData = this.extractFieldDataFromPrimeComponent(
          select,
          'ng-reflect-name'
        );
        if (fieldData) formData.push(fieldData);
      });

      // Procesar datepickers
      datepickers.forEach((datepicker: any) => {
        const fieldData = this.extractFieldDataFromPrimeComponent(
          datepicker,
          'ng-reflect-name'
        );
        if (fieldData) formData.push(fieldData);
      });

      // Procesar autocompletes
      autocompletes.forEach((autocomplete: any) => {
        const fieldData = this.extractFieldDataFromPrimeComponent(
          autocomplete,
          'ng-reflect-name'
        );
        if (fieldData) formData.push(fieldData);
      });

      // Procesar checkboxes
      checkboxes.forEach((checkbox: any) => {
        const fieldData = this.extractFieldDataFromPrimeComponent(
          checkbox,
          'ng-reflect-name'
        );
        if (fieldData) formData.push(fieldData);
      });
    });

    return formData;
  }

  /**
   * Extraer datos de campo de un elemento input regular
   */
  private extractFieldData(
    element: any
  ): ReservationTravelerFieldCreate | null {
    const name = element.getAttribute('name');
    if (!name) return null;

    const { travelerId, fieldId } = this.parseFieldName(name);
    if (!travelerId || !fieldId) return null;

    let value = '';
    if (element.type === 'checkbox') {
      value = element.checked ? 'true' : 'false';
    } else {
      value = element.value || '';
    }

    if (!value || value.trim() === '') return null;

    return {
      id: 0,
      reservationTravelerId: travelerId,
      reservationFieldId: fieldId,
      value: value.trim(),
    };
  }

  /**
   * Extraer datos de campo de componentes PrimeNG
   */
  private extractFieldDataFromPrimeComponent(
    element: any,
    nameAttribute: string
  ): ReservationTravelerFieldCreate | null {
    const name = element.getAttribute(nameAttribute);
    if (!name) return null;

    const { travelerId, fieldId } = this.parseFieldName(name);
    if (!travelerId || !fieldId) return null;

    let value = '';

    // Intentar obtener el valor de diferentes maneras según el componente
    if (element.tagName.toLowerCase() === 'p-checkbox') {
      const ngReflectBinary = element.getAttribute('ng-reflect-binary');
      value = ngReflectBinary === 'true' ? 'true' : 'false';
    } else {
      // Para otros componentes PrimeNG, intentar obtener el valor del atributo ng-reflect-model
      value =
        element.getAttribute('ng-reflect-model') ||
        element.getAttribute('ng-reflect-value') ||
        element.value ||
        '';
    }

    if (!value || value.trim() === '') return null;

    return {
      id: 0,
      reservationTravelerId: travelerId,
      reservationFieldId: fieldId,
      value: value.trim(),
    };
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

    // Buscar el field ID por el código
    const field = this.reservationFields.find((f) => f.code === fieldCode);
    if (!field) return { travelerId: null, fieldId: null };

    return {
      travelerId: isNaN(travelerId) ? null : travelerId,
      fieldId: field.id,
    };
  }
}
