import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
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
import { of, forkJoin } from 'rxjs';

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
export class ActivitiesOptionalsComponent implements OnInit, OnChanges {
  @Input() itineraryId: number | null = null;
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null; // Nuevo input para la reservación

  // 🔥 NUEVO: Output para notificar cambios al componente padre
  @Output() activitiesSelectionChange = new EventEmitter<{
    selectedActivities: ActivityWithPrice[];
    totalPrice: number;
  }>();

  // Variables siguiendo el patrón del ejemplo
  optionalActivities: ActivityWithPrice[] = [];
  addedActivities: Set<number> = new Set();
  
  // Cache de grupos de edad
  private ageGroupsCache: IAgeGroupResponse[] = [];

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
      }
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
      .getByReservation(this.reservationId)
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
    const ageGroup = this.ageGroupsCache.find(group => group.id === ageGroupId);
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
   * 🔥 MODIFICADO: Alterna la selección de actividad y emite cambios
   */
  toggleActivity(item: ActivityWithPrice): void {
    if (this.addedActivities.has(item.id)) {
      // Actualizar UI inmediatamente
      this.addedActivities.delete(item.id);
      // Eliminar de BD en background
      this.removeActivityFromDatabase(item);
    } else {
      // Actualizar UI inmediatamente
      this.addedActivities.add(item.id);
      // Guardar en BD en background
      this.addActivityToDatabase(item);
    }

    // Emitir cambios inmediatamente
    this.emitActivitiesChange();
  }

  /**
   * Guarda en BD pero no afecta la UI
   */
  private addActivityToDatabase(item: ActivityWithPrice): void {
    if (!this.reservationId) return;

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          travelers.forEach((traveler) => {
            if (item.type === 'act') {
              this.reservationTravelerActivityService
                .create({
                  id: 0,
                  reservationTravelerId: traveler.id,
                  activityId: item.id,
                })
                .subscribe({
                  error: (error) => {
                    console.error('Error guardando actividad:', error);
                    // Si falla, revertir UI
                    this.addedActivities.delete(item.id);
                    this.emitActivitiesChange();
                  },
                });
            } else if (item.type === 'pack') {
              this.reservationTravelerActivityPackService
                .create({
                  id: 0,
                  reservationTravelerId: traveler.id,
                  activityPackId: item.id,
                })
                .subscribe({
                  error: (error) => {
                    console.error('Error guardando pack:', error);
                    // Si falla, revertir UI
                    this.addedActivities.delete(item.id);
                    this.emitActivitiesChange();
                  },
                });
            }
          });
        },
      });
  }

  /**
   * Elimina de BD pero no afecta la UI
   */
  private removeActivityFromDatabase(item: ActivityWithPrice): void {
    if (!this.reservationId) return;

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          travelers.forEach((traveler) => {
            if (item.type === 'act') {
              this.reservationTravelerActivityService
                .getByReservationTraveler(traveler.id)
                .subscribe({
                  next: (activities) => {
                    const activityToDelete = activities.find(
                      (a) => a.activityId === item.id
                    );
                    if (activityToDelete) {
                      this.reservationTravelerActivityService
                        .delete(activityToDelete.id)
                        .subscribe({
                          error: (error) => {
                            console.error('Error eliminando actividad:', error);
                            // Si falla, revertir UI
                            this.addedActivities.add(item.id);
                            this.emitActivitiesChange();
                          },
                        });
                    }
                  },
                });
            } else if (item.type === 'pack') {
              this.reservationTravelerActivityPackService
                .getByReservationTraveler(traveler.id)
                .subscribe({
                  next: (packs) => {
                    const packToDelete = packs.find(
                      (p) => p.activityPackId === item.id
                    );
                    if (packToDelete) {
                      this.reservationTravelerActivityPackService
                        .delete(packToDelete.id)
                        .subscribe({
                          error: (error) => {
                            console.error('Error eliminando pack:', error);
                            // Si falla, revertir UI
                            this.addedActivities.add(item.id);
                            this.emitActivitiesChange();
                          },
                        });
                    }
                  },
                });
            }
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
}
