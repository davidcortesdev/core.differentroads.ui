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

  // Paquetes de actividades asignados por viajero
  travelerActivityPacks: {
    [travelerId: number]: IReservationTravelerActivityPackResponse[];
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
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
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
    if (
      (changes['departureId'] && changes['departureId'].currentValue) ||
      (changes['reservationId'] && changes['reservationId'].currentValue)
    ) {
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

          // Cargar actividades opcionales primero, luego las actividades de viajeros
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
   * Cargar actividades y paquetes de actividades por cada viajero
   */
  private loadTravelerActivities(): void {
    if (!this.travelers || this.travelers.length === 0) {
      return;
    }

    let loadedTravelers = 0;
    const totalTravelers = this.travelers.length;

    this.travelers.forEach((traveler) => {
      // Cargar actividades individuales y paquetes en paralelo
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

            console.log(
              `🎯 Actividades para viajero ${traveler.id}:`,
              activities
            );
            console.log(
              `📦 Paquetes de actividades para viajero ${traveler.id}:`,
              activityPacks
            );

            // Cargar precios para las actividades de este viajero
            this.loadActivityPricesForTraveler(traveler, activities);

            // Cargar precios para los paquetes de actividades de este viajero
            this.loadActivityPackPricesForTraveler(traveler, activityPacks);

            loadedTravelers++;

            // Emitir estado inicial cuando todos los viajeros estén cargados
            if (loadedTravelers === totalTravelers) {
              // Verificar que las actividades opcionales estén cargadas antes de emitir
              if (this.optionalActivities.length > 0) {
                // Pequeño delay para asegurar que los precios se hayan cargado
                setTimeout(() => {
                  this.emitInitialActivitiesState();
                }, 1000);
              } else {
                console.log(
                  '⏳ Esperando a que se carguen las actividades opcionales...'
                );
                // Esperar un poco más y verificar nuevamente
                setTimeout(() => {
                  if (this.optionalActivities.length > 0) {
                    this.emitInitialActivitiesState();
                  } else {
                    console.log(
                      '⚠️ No se pudieron cargar las actividades opcionales'
                    );
                  }
                }, 2000);
              }
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
              // Verificar que las actividades opcionales estén cargadas antes de emitir
              if (this.optionalActivities.length > 0) {
                setTimeout(() => {
                  this.emitInitialActivitiesState();
                }, 1000);
              } else {
                console.log(
                  '⏳ Esperando a que se carguen las actividades opcionales (error case)...'
                );
                // Esperar un poco más y verificar nuevamente
                setTimeout(() => {
                  if (this.optionalActivities.length > 0) {
                    this.emitInitialActivitiesState();
                  } else {
                    console.log(
                      '⚠️ No se pudieron cargar las actividades opcionales (error case)'
                    );
                  }
                }, 2000);
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
   * Cargar precios de paquetes de actividades para un viajero específico
   */
  private loadActivityPackPricesForTraveler(
    traveler: IReservationTravelerResponse,
    activityPacks: IReservationTravelerActivityPackResponse[]
  ): void {
    if (!activityPacks || activityPacks.length === 0 || !this.departureId) {
      return;
    }

    // Inicializar el objeto de precios para este viajero si no existe
    if (!this.activityPrices[traveler.id]) {
      this.activityPrices[traveler.id] = {};
    }

    activityPacks.forEach((travelerActivityPack) => {
      // Obtener precio de pack
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
              // Tomar el primer precio encontrado o el precio de campaña si existe
              const price = prices[0];
              const finalPrice =
                price.campaignPrice && price.campaignPrice > 0
                  ? price.campaignPrice
                  : price.basePrice;

              this.activityPrices[traveler.id][
                travelerActivityPack.activityPackId
              ] = finalPrice;
              console.log(
                `Precio pack actividad ${travelerActivityPack.activityPackId} para viajero ${traveler.id}:`,
                finalPrice
              );
            }
          },
          error: (error) => {
            console.error(
              `Error al cargar precio pack para actividad ${travelerActivityPack.activityPackId}:`,
              error
            );
          },
        });
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
    console.log(`🔍 Buscando actividad con ID: ${activityId}`);
    console.log(
      `📋 Actividades disponibles:`,
      this.optionalActivities.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
      }))
    );

    const activity = this.optionalActivities.find((a) => a.id === activityId);
    console.log(`✅ Actividad encontrada:`, activity);

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
    console.log(
      `Toggle cambiado - Viajero: ${travelerId}, Actividad: ${activityId}, Seleccionado: ${isSelected}`
    );

    // Obtener información de la actividad y su precio
    const activityName = this.getActivityName(activityId);

    // Solo emitir si la actividad tiene nombre válido
    if (activityName) {
      const activityPrice = this.getActivityPrice(travelerId, activityId) || 0;

      console.log(`📊 Datos a emitir:`, {
        travelerId,
        activityId,
        isAssigned: isSelected,
        activityName,
        activityPrice,
      });

      // Emitir el evento al componente padre
      this.activitiesAssignmentChange.emit({
        travelerId,
        activityId,
        isAssigned: isSelected,
        activityName,
        activityPrice,
      });

      console.log(`✅ Evento emitido correctamente`);
    } else {
      console.log(
        `⚠️ No se emitió evento para actividad ${activityId} - nombre no encontrado`
      );
    }

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

    this.travelers.forEach((traveler) => {
      // Emitir actividades individuales
      const travelerActivities = this.travelerActivities[traveler.id];
      if (travelerActivities) {
        travelerActivities.forEach((activity) => {
          const activityName = this.getActivityName(activity.activityId);
          // Solo emitir si la actividad tiene nombre válido
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
          // Solo emitir si la actividad tiene nombre válido
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
   * Verificar si un viajero tiene una actividad específica asignada
   */
  isTravelerActivityAssigned(travelerId: number, activityId: number): boolean {
    // Verificar actividades individuales
    const activities = this.travelerActivities[travelerId];
    const hasIndividualActivity = activities
      ? activities.some((activity) => activity.activityId === activityId)
      : false;

    // Verificar paquetes de actividades
    const activityPacks = this.travelerActivityPacks[travelerId];
    const hasActivityPack = activityPacks
      ? activityPacks.some(
          (activityPack) => activityPack.activityPackId === activityId
        )
      : false;

    const result = hasIndividualActivity || hasActivityPack;
    return result;
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
          console.log('✅ Actividades opcionales cargadas:', activities.length);
          console.log(
            '📋 Detalles de actividades opcionales:',
            activities.map((a) => ({ id: a.id, name: a.name, type: a.type }))
          );

          // Ahora que las actividades opcionales están cargadas, cargar las actividades de viajeros
          this.loadTravelerActivities();
        },
        error: (error) => {
          console.error('❌ Error al cargar actividades opcionales:', error);
          // Aún así intentar cargar las actividades de viajeros
          this.loadTravelerActivities();
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
