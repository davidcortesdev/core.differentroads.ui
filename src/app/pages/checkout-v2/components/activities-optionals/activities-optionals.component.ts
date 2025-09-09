import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import {
  ActivityService,
  IActivityResponse,
} from '../../../../core/services/activity/activity.service';
import {
  ActivityPriceService,
  IActivityPriceResponse,
} from '../../../../core/services/activity/activity-price.service';
import {
  ActivityPackPriceService,
  IActivityPackPriceResponse,
} from '../../../../core/services/activity/activity-pack-price.service';
import {
  ReservationTravelerActivityService,
  IReservationTravelerActivityResponse,
} from '../../../../core/services/reservation/reservation-traveler-activity.service';
import {
  ReservationTravelerActivityPackService,
  IReservationTravelerActivityPackResponse,
} from '../../../../core/services/reservation/reservation-traveler-activity-pack.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../../../core/services/agegroup/age-group.service';
import { catchError, map } from 'rxjs/operators';
import { of, forkJoin, firstValueFrom } from 'rxjs';

// Interface para el formato de precio esperado (siguiendo el ejemplo)
interface PriceData {
  age_group_name: string;
  value: number;
  currency: string;
}

// Interface simplificada siguiendo el patrón del ejemplo
interface ActivityWithPrice extends IActivityResponse {
  priceData: PriceData[];
}

@Component({
  selector: 'app-activities-optionals',
  standalone: false,
  templateUrl: './activities-optionals.component.html',
  styleUrl: './activities-optionals.component.scss',
})
export class ActivitiesOptionalsComponent
  implements OnInit, OnChanges, OnDestroy
{
  @Input() itineraryId: number | null = null;
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null; // Nuevo input para la reservación

  // 🔥 NUEVO: Output para notificar cambios al componente padre
  @Output() activitiesSelectionChange = new EventEmitter<{
    selectedActivities: ActivityWithPrice[];
    totalPrice: number;
  }>();

  // 🔥 NUEVO: Output para notificar el estado de guardado
  @Output() saveCompleted = new EventEmitter<{
    component: string;
    success: boolean;
    error?: string;
  }>();

  // Variables siguiendo el patrón del ejemplo
  optionalActivities: ActivityWithPrice[] = [];
  addedActivities: Set<number> = new Set();

  // Cache de grupos de edad
  private ageGroupsCache: IAgeGroupResponse[] = [];

  // 🔥 NUEVO: Propiedades para controlar el estado de guardado
  public saving: boolean = false;

  // 🔥 NUEVO: Propiedad para debounce
  private saveTimeout: any;

  // 🔥 NUEVO: Propiedad para mensajes de error
  public errorMessage: string | null = null;

  constructor(
    private activityService: ActivityService,
    private activityPriceService: ActivityPriceService,
    private activityPackPriceService: ActivityPackPriceService,
    private reservationTravelerActivityService: ReservationTravelerActivityService,
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private reservationTravelerService: ReservationTravelerService,
    private ageGroupService: AgeGroupService
  ) {}

  ngOnInit(): void {
    this.loadAgeGroups();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['itineraryId'] || changes['departureId']) &&
      this.itineraryId &&
      this.departureId
    ) {
      this.loadActivities();
    }

    // Si cambia reservationId, mostrar actividades por pasajero
    if (changes['reservationId'] && this.reservationId) {
      this.showActivitiesByTraveler();
    }
  }

  ngOnDestroy(): void {
    // Limpiar timeout pendiente para evitar memory leaks
    this.clearPendingOperations();
  }

  /**
   * Carga los grupos de edad desde el servicio
   */
  private loadAgeGroups(): void {
    this.ageGroupService.getAll().subscribe({
      next: (ageGroups) => {
        this.ageGroupsCache = ageGroups;
        this.initializeComponent();
      },
      error: (error) => {
        console.error('Error loading age groups:', error);
        // Continuar sin grupos de edad, usar valores por defecto
        this.initializeComponent();
      },
    });
  }

  /**
   * Inicializa el componente después de cargar los grupos de edad
   */
  private initializeComponent(): void {
    if (this.itineraryId && this.departureId) {
      this.loadActivities();
    }

    // Mostrar actividades por pasajero si tenemos reservationId
    if (this.reservationId) {
      this.showActivitiesByTraveler();
    }
  }

  /**
   * Carga actividades siguiendo el patrón del ejemplo
   */
  private loadActivities(): void {
    if (!this.itineraryId || !this.departureId) return;

    this.activityService
      .getForItineraryWithPacks(
        this.itineraryId,
        this.departureId,
        undefined,
        true, // isVisibleOnWeb
        true // onlyOpt - solo actividades opcionales
      )
      .subscribe({
        next: (activities) => {
          // Procesar actividades y cargar precios
          this.optionalActivities = activities.map((activity) => ({
            ...activity,
            priceData: [], // Inicializar array vacío
          }));

          // Cargar precios para cada actividad
          this.loadPricesForActivities();
        },
        error: (error) => {
          console.error('Error loading activities:', error);
        },
      });
  }

  /**
   * Muestra las actividades por pasajero usando los servicios y marca como añadidas
   */
  private showActivitiesByTraveler(): void {
    if (!this.reservationId) return;

    // Obtener todos los viajeros de la reservación
    this.reservationTravelerService
      .getByReservation(this.reservationId!)
      .subscribe({
        next: (travelers) => {
          // Set para almacenar todas las actividades asignadas
          const assignedActivities = new Set<number>();

          // Contador para saber cuándo terminar de procesar todos los viajeros
          let processedTravelers = 0;

          // Para cada viajero, obtener sus actividades individuales y packs
          travelers.forEach((traveler) => {
            forkJoin({
              activities:
                this.reservationTravelerActivityService.getByReservationTraveler(
                  traveler.id
                ),
              activityPacks:
                this.reservationTravelerActivityPackService.getByReservationTraveler(
                  traveler.id
                ),
            }).subscribe({
              next: (result) => {
                // Agregar actividades individuales al set
                result.activities.forEach((activity) => {
                  assignedActivities.add(activity.activityId);
                });

                // Agregar packs de actividades al set
                result.activityPacks.forEach((pack) => {
                  assignedActivities.add(pack.activityPackId);
                });

                // Incrementar contador de viajeros procesados
                processedTravelers++;

                // Si ya procesamos todos los viajeros, marcar actividades como añadidas
                if (processedTravelers === travelers.length) {
                  this.markAssignedActivitiesAsAdded(assignedActivities);
                }
              },
              error: (error) => {
                console.error(
                  `Error obteniendo actividades del viajero ${traveler.travelerNumber}:`,
                  error
                );
                processedTravelers++;

                // Verificar si terminamos de procesar incluso con error
                if (processedTravelers === travelers.length) {
                  this.markAssignedActivitiesAsAdded(assignedActivities);
                }
              },
            });
          });
        },
        error: (error) => {
          console.error('Error obteniendo viajeros:', error);
        },
      });
  }

  /**
   * Marca las actividades asignadas como añadidas en la interfaz
   */
  private markAssignedActivitiesAsAdded(assignedActivities: Set<number>): void {
    // Limpiar actividades añadidas previamente
    this.addedActivities.clear();

    // Agregar todas las actividades asignadas al set
    assignedActivities.forEach((activityId) => {
      this.addedActivities.add(activityId);
    });

    // Emitir cambios para actualizar el componente padre si es necesario
    this.emitActivitiesChange();
  }

  /**
   * Carga precios para todas las actividades
   */
  private loadPricesForActivities(): void {
    if (!this.departureId) return;

    this.optionalActivities.forEach((activity, index) => {
      this.loadPriceForActivity(activity, index);
    });
  }

  /**
   * Carga precio para una actividad específica
   */
  private loadPriceForActivity(
    activity: ActivityWithPrice,
    index: number
  ): void {
    if (!this.departureId) return;

    if (activity.type === 'act') {
      // Cargar precio de actividad individual
      this.activityPriceService
        .getAll({
          ActivityId: [activity.id],
          DepartureId: this.departureId,
        })
        .pipe(
          map((prices) => (prices.length > 0 ? prices : [])),
          catchError((error) => {
            console.error(
              `Error loading price for activity ${activity.id}:`,
              error
            );
            return of([]);
          })
        )
        .subscribe((prices) => {
          // Transformar precios al formato esperado (similar al ejemplo)
          this.optionalActivities[index].priceData = prices.map(
            (price: IActivityPriceResponse) => ({
              age_group_name: this.getAgeGroupName(price.ageGroupId),
              value: price.campaignPrice || price.basePrice,
              currency: 'EUR', // Ajustar según tu moneda
            })
          );

          // 🔥 NUEVO: Emitir cambios después de cargar precios si la actividad está seleccionada
          if (this.addedActivities.has(activity.id)) {
            this.emitActivitiesChange();
          }
        });
    } else if (activity.type === 'pack') {
      // Cargar precio de pack
      this.activityPackPriceService
        .getAll({
          activityPackId: activity.id,
          departureId: this.departureId,
        })
        .pipe(
          map((prices) => (prices.length > 0 ? prices : [])),
          catchError((error) => {
            console.error(
              `Error loading price for pack ${activity.id}:`,
              error
            );
            return of([]);
          })
        )
        .subscribe((prices) => {
          // Transformar precios al formato esperado
          this.optionalActivities[index].priceData = prices.map(
            (price: IActivityPackPriceResponse) => ({
              age_group_name: this.getAgeGroupName(price.ageGroupId),
              value: price.campaignPrice || price.basePrice,
              currency: 'EUR',
            })
          );

          // 🔥 NUEVO: Emitir cambios después de cargar precios si la actividad está seleccionada
          if (this.addedActivities.has(activity.id)) {
            this.emitActivitiesChange();
          }
        });
    }
  }

  /**
   * Obtiene el nombre del grupo de edad basado en el ID
   */
  private getAgeGroupName(ageGroupId: number): string {
    const ageGroup = this.ageGroupsCache.find(
      (group) => group.id === ageGroupId
    );
    return ageGroup ? ageGroup.name : 'Adultos'; // Por defecto
  }

  /**
   * Obtiene precios de adultos (siguiendo el patrón del ejemplo)
   */
  getAdultPrices(priceData: PriceData[]): PriceData[] {
    if (!priceData) return [];
    return priceData.filter((price) => price.age_group_name === 'Adultos');
  }

  /**
   * Obtiene el precio base para mostrar
   */
  getBasePrice(item: ActivityWithPrice): number | null {
    const adultPrices = this.getAdultPrices(item.priceData);
    return adultPrices.length > 0 ? adultPrices[0].value : null;
  }

  /**
   * 🔥 NUEVO: Método con debounce para guardar
   */
  private debouncedSave(
    item: ActivityWithPrice,
    action: 'add' | 'remove'
  ): void {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      if (action === 'add') {
        this.addActivityToAllTravelers(item);
      } else {
        this.removeActivityFromAllTravelers(item);
      }
    }, 300);
  }

  /**
   * 🔥 NUEVO: Método para verificar si hay operaciones pendientes
   */
  private hasPendingOperations(): boolean {
    return this.saving;
  }

  /**
   * 🔥 NUEVO: Método para limpiar operaciones pendientes
   */
  private clearPendingOperations(): void {
    clearTimeout(this.saveTimeout);
  }

  /**
   * 🔥 NUEVO: Validar que existe reserva y limpiar errores
   */
  private validateReservation(): boolean {
    // Limpiar mensaje de error anterior
    this.errorMessage = null;

    if (!this.reservationId) {
      this.errorMessage = 'No hay reserva seleccionada';
      return false;
    }
    return true;
  }

  /**
   * 🔥 MODIFICADO: Alterna la selección de actividad con debounce y operaciones robustas
   */
  toggleActivity(item: ActivityWithPrice): void {
    // Si hay operaciones pendientes, no permitir nuevas
    if (this.hasPendingOperations()) {
      console.log('⏳ Operación de guardado en curso, esperando...');
      return;
    }

    if (this.addedActivities.has(item.id)) {
      // Actualizar UI inmediatamente
      this.addedActivities.delete(item.id);
      // Eliminar de BD con debounce
      this.debouncedSave(item, 'remove');
    } else {
      // Actualizar UI inmediatamente
      this.addedActivities.add(item.id);
      // Guardar en BD con debounce
      this.debouncedSave(item, 'add');
    }

    // Emitir cambios inmediatamente
    this.emitActivitiesChange();
  }

  /**
   * 🔥 NUEVO: Método optimizado para añadir actividad a todos los viajeros
   */
  private addActivityToAllTravelers(item: ActivityWithPrice): void {
    if (!this.validateReservation() || this.saving) return;

    this.saving = true;

    // SIEMPRE obtener viajeros frescos (sin cache)
    this.reservationTravelerService
      .getByReservation(this.reservationId!)
      .subscribe({
        next: (travelers) => {
          if (travelers.length === 0) {
            this.saving = false;
            this.saveCompleted.emit({
              component: 'activities-optionals',
              success: false,
              error: 'No hay viajeros en la reserva',
            });
            return;
          }

          // Crear todas las asignaciones en paralelo
          const savePromises = travelers.map((traveler) => {
            if (item.type === 'act') {
              return firstValueFrom(
                this.reservationTravelerActivityService.create({
                  id: 0,
                  reservationTravelerId: traveler.id,
                  activityId: item.id,
                })
              );
            } else if (item.type === 'pack') {
              return firstValueFrom(
                this.reservationTravelerActivityPackService.create({
                  id: 0,
                  reservationTravelerId: traveler.id,
                  activityPackId: item.id,
                })
              );
            }
            return Promise.resolve(null);
          });

          Promise.all(savePromises)
            .then(() => {
              this.saving = false;

              // NUEVO: Limpiar errores y emitir evento de guardado exitoso
              this.errorMessage = null;
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: true,
              });

              console.log(
                `✅ Actividad "${item.name}" añadida a ${travelers.length} viajeros`
              );
            })
            .catch((error) => {
              this.saving = false;
              console.error('❌ Error guardando actividad:', error);

              // Revertir UI en caso de error
              this.addedActivities.delete(item.id);
              this.emitActivitiesChange();

              // NUEVO: Mostrar error al usuario
              this.errorMessage =
                'Error al guardar la actividad. Inténtalo de nuevo.';

              // NUEVO: Emitir evento de error
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: false,
                error: 'Error al guardar la actividad',
              });
            });
        },
        error: (error) => {
          this.saving = false;
          console.error('❌ Error obteniendo viajeros:', error);

          // Revertir UI en caso de error
          this.addedActivities.delete(item.id);
          this.emitActivitiesChange();

          // NUEVO: Mostrar error al usuario
          this.errorMessage =
            'Error al obtener información de viajeros. Inténtalo de nuevo.';

          this.saveCompleted.emit({
            component: 'activities-optionals',
            success: false,
            error: 'Error al obtener viajeros',
          });
        },
      });
  }

  /**
   * 🔥 NUEVO: Método optimizado para eliminar actividad de todos los viajeros
   */
  private removeActivityFromAllTravelers(item: ActivityWithPrice): void {
    if (!this.validateReservation() || this.saving) return;

    this.saving = true;

    // SIEMPRE obtener viajeros frescos (sin cache)
    this.reservationTravelerService
      .getByReservation(this.reservationId!)
      .subscribe({
        next: (travelers) => {
          if (travelers.length === 0) {
            this.saving = false;
            this.saveCompleted.emit({
              component: 'activities-optionals',
              success: false,
              error: 'No hay viajeros en la reserva',
            });
            return;
          }

          // Obtener todas las asignaciones existentes en paralelo
          const getAssignmentsPromises = travelers.map((traveler) => {
            if (item.type === 'act') {
              return firstValueFrom(
                this.reservationTravelerActivityService.getByReservationTraveler(
                  traveler.id
                )
              ).then((activities) =>
                (activities || []).filter((a) => a.activityId === item.id)
              );
            } else if (item.type === 'pack') {
              return firstValueFrom(
                this.reservationTravelerActivityPackService.getByReservationTraveler(
                  traveler.id
                )
              ).then((packs) =>
                (packs || []).filter((p) => p.activityPackId === item.id)
              );
            }
            return Promise.resolve([]);
          });

          Promise.all(getAssignmentsPromises)
            .then((assignmentsArrays) => {
              // Aplanar todas las asignaciones
              const allAssignments = assignmentsArrays.flat();

              if (allAssignments.length === 0) {
                this.saving = false;
                this.errorMessage = null;
                this.saveCompleted.emit({
                  component: 'activities-optionals',
                  success: true,
                });
                return;
              }

              // Eliminar todas las asignaciones en paralelo
              const deletePromises = allAssignments.map((assignment) => {
                if (item.type === 'act') {
                  return firstValueFrom(
                    this.reservationTravelerActivityService.delete(
                      assignment.id
                    )
                  );
                } else if (item.type === 'pack') {
                  return firstValueFrom(
                    this.reservationTravelerActivityPackService.delete(
                      assignment.id
                    )
                  );
                }
                return Promise.resolve(null);
              });

              return Promise.all(deletePromises);
            })
            .then(() => {
              this.saving = false;

              // NUEVO: Limpiar errores y emitir evento de guardado exitoso
              this.errorMessage = null;
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: true,
              });

              console.log(
                `✅ Actividad "${item.name}" eliminada de ${travelers.length} viajeros`
              );
            })
            .catch((error) => {
              this.saving = false;
              console.error('❌ Error eliminando actividad:', error);

              // Revertir UI en caso de error
              this.addedActivities.add(item.id);
              this.emitActivitiesChange();

              // NUEVO: Mostrar error al usuario
              this.errorMessage =
                'Error al eliminar la actividad. Inténtalo de nuevo.';

              // NUEVO: Emitir evento de error
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: false,
                error: 'Error al eliminar la actividad',
              });
            });
        },
        error: (error) => {
          this.saving = false;
          console.error('❌ Error obteniendo viajeros:', error);

          // Revertir UI en caso de error
          this.addedActivities.add(item.id);
          this.emitActivitiesChange();

          // NUEVO: Mostrar error al usuario
          this.errorMessage =
            'Error al obtener información de viajeros. Inténtalo de nuevo.';

          this.saveCompleted.emit({
            component: 'activities-optionals',
            success: false,
            error: 'Error al obtener viajeros',
          });
        },
      });
  }

  /**
   * Verifica si la actividad está añadida (siguiendo el patrón del ejemplo)
   */
  isActivityAdded(item: ActivityWithPrice): boolean {
    return this.addedActivities.has(item.id);
  }

  /**
   * 🔥 NUEVO: Emite los cambios de actividades seleccionadas al componente padre
   */
  private emitActivitiesChange(): void {
    const selectedActivities = this.optionalActivities.filter((activity) =>
      this.addedActivities.has(activity.id)
    );

    const totalPrice = selectedActivities.reduce((total, activity) => {
      const price = this.getBasePrice(activity);
      return total + (price || 0);
    }, 0);

    this.activitiesSelectionChange.emit({
      selectedActivities,
      totalPrice,
    });
  }

  /**
   * 🔥 NUEVO: Getter para obtener las actividades seleccionadas
   */
  get selectedActivities(): ActivityWithPrice[] {
    return this.optionalActivities.filter((activity) =>
      this.addedActivities.has(activity.id)
    );
  }

  /**
   * 🔥 NUEVO: Getter para obtener el precio total de actividades seleccionadas
   */
  get totalActivitiesPrice(): number {
    return this.selectedActivities.reduce((total, activity) => {
      const price = this.getBasePrice(activity);
      return total + (price || 0);
    }, 0);
  }

  /**
   * 🔥 NUEVO: Getter para verificar si hay actividades seleccionadas
   */
  get hasSelectedActivities(): boolean {
    return this.addedActivities.size > 0;
  }
}
