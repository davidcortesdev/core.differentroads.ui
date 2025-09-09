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

  // Outputs para comunicación con componente padre
  @Output() activitiesSelectionChange = new EventEmitter<{
    selectedActivities: ActivityWithPrice[];
    totalPrice: number;
  }>();

  @Output() saveCompleted = new EventEmitter<{
    component: string;
    success: boolean;
    error?: string;
  }>();

  // Estado del componente
  optionalActivities: ActivityWithPrice[] = [];
  addedActivities: Set<number> = new Set();
  public errorMessage: string | null = null;

  // Individual loading states per activity
  private activityLoadingStates: Map<number, boolean> = new Map();

  // Cache y control de carga
  private ageGroupsCache: IAgeGroupResponse[] = [];
  private saveTimeout: any;
  private activitiesByTravelerLoaded: boolean = false;

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

    if (
      changes['reservationId'] &&
      this.reservationId &&
      !this.activitiesByTravelerLoaded
    ) {
      this.showActivitiesByTraveler();
    }
  }

  ngOnDestroy(): void {
    this.clearPendingOperations();
  }

  private loadAgeGroups(): void {
    this.ageGroupService.getAll().subscribe({
      next: (ageGroups) => {
        this.ageGroupsCache = ageGroups;
        this.initializeComponent();
      },
      error: (error) => {
        console.error('Error loading age groups:', error);
        this.initializeComponent();
      },
    });
  }

  private initializeComponent(): void {
    if (this.itineraryId && this.departureId) {
      this.loadActivities();
    }

    if (this.reservationId && !this.activitiesByTravelerLoaded) {
      this.showActivitiesByTraveler();
    }
  }

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
          this.optionalActivities = activities.map((activity) => ({
            ...activity,
            priceData: [],
          }));

          this.loadPricesForActivities();
        },
        error: (error) => {
          console.error('Error loading activities:', error);
        },
      });
  }

  /**
   * Carga las actividades asignadas por viajero y las marca como añadidas
   */
  private showActivitiesByTraveler(): void {
    if (!this.reservationId || this.activitiesByTravelerLoaded) return;

    this.reservationTravelerService
      .getByReservation(this.reservationId!)
      .subscribe({
        next: (travelers) => {
          const assignedActivities = new Set<number>();
          let processedTravelers = 0;
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
                result.activities.forEach((activity) => {
                  assignedActivities.add(activity.activityId);
                });

                result.activityPacks.forEach((pack) => {
                  assignedActivities.add(pack.activityPackId);
                });

                processedTravelers++;

                if (processedTravelers === travelers.length) {
                  this.markAssignedActivitiesAsAdded(assignedActivities);
                  this.activitiesByTravelerLoaded = true;
                }
              },
              error: (error) => {
                console.error(
                  `Error obteniendo actividades del viajero ${traveler.travelerNumber}:`,
                  error
                );
                processedTravelers++;

                if (processedTravelers === travelers.length) {
                  this.markAssignedActivitiesAsAdded(assignedActivities);
                  this.activitiesByTravelerLoaded = true;
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

  private markAssignedActivitiesAsAdded(assignedActivities: Set<number>): void {
    this.addedActivities.clear();
    assignedActivities.forEach((activityId) => {
      this.addedActivities.add(activityId);
    });
    this.emitActivitiesChange();
  }

  private loadPricesForActivities(): void {
    if (!this.departureId) return;

    this.optionalActivities.forEach((activity, index) => {
      this.loadPriceForActivity(activity, index);
    });
  }

  private loadPriceForActivity(
    activity: ActivityWithPrice,
    index: number
  ): void {
    if (!this.departureId) return;

    if (activity.type === 'act') {
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
          this.optionalActivities[index].priceData = prices.map(
            (price: IActivityPriceResponse) => ({
              age_group_name: this.getAgeGroupName(price.ageGroupId),
              value: price.campaignPrice || price.basePrice,
              currency: 'EUR',
            })
          );

          if (this.addedActivities.has(activity.id)) {
            this.emitActivitiesChange();
          }
        });
    } else if (activity.type === 'pack') {
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
          this.optionalActivities[index].priceData = prices.map(
            (price: IActivityPackPriceResponse) => ({
              age_group_name: this.getAgeGroupName(price.ageGroupId),
              value: price.campaignPrice || price.basePrice,
              currency: 'EUR',
            })
          );

          if (this.addedActivities.has(activity.id)) {
            this.emitActivitiesChange();
          }
        });
    }
  }

  private getAgeGroupName(ageGroupId: number): string {
    const ageGroup = this.ageGroupsCache.find(
      (group) => group.id === ageGroupId
    );
    return ageGroup ? ageGroup.name : 'Adultos';
  }

  getAdultPrices(priceData: PriceData[]): PriceData[] {
    if (!priceData) return [];
    return priceData.filter((price) => price.age_group_name === 'Adultos');
  }

  getBasePrice(item: ActivityWithPrice): number | null {
    const adultPrices = this.getAdultPrices(item.priceData);
    return adultPrices.length > 0 ? adultPrices[0].value : null;
  }

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

  private clearPendingOperations(): void {
    clearTimeout(this.saveTimeout);
  }

  private validateReservation(): boolean {
    this.errorMessage = null;

    if (!this.reservationId) {
      this.errorMessage = 'No hay reserva seleccionada';
      return false;
    }
    return true;
  }

  toggleActivity(item: ActivityWithPrice): void {
    if (this.isActivityLoading(item)) {
      return;
    }

    if (this.addedActivities.has(item.id)) {
      this.addedActivities.delete(item.id);
      this.debouncedSave(item, 'remove');
    } else {
      this.addedActivities.add(item.id);
      this.debouncedSave(item, 'add');
    }

    this.emitActivitiesChange();
  }

  private addActivityToAllTravelers(item: ActivityWithPrice): void {
    if (!this.validateReservation() || this.isActivityLoading(item)) return;

    this.setActivityLoading(item, true);

    this.reservationTravelerService
      .getByReservation(this.reservationId!)
      .subscribe({
        next: (travelers) => {
          if (travelers.length === 0) {
            this.setActivityLoading(item, false);
            this.saveCompleted.emit({
              component: 'activities-optionals',
              success: false,
              error: 'No hay viajeros en la reserva',
            });
            return;
          }

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
              this.setActivityLoading(item, false);

              this.updateActivityState(item.id, true);
              this.errorMessage = null;
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: true,
              });
            })
            .catch((error) => {
              this.setActivityLoading(item, false);
              console.error('❌ Error guardando actividad:', error);

              this.addedActivities.delete(item.id);
              this.emitActivitiesChange();
              this.errorMessage =
                'Error al guardar la actividad. Inténtalo de nuevo.';
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: false,
                error: 'Error al guardar la actividad',
              });
            });
        },
        error: (error) => {
          this.setActivityLoading(item, false);
          console.error('❌ Error obteniendo viajeros:', error);

          this.addedActivities.delete(item.id);
          this.emitActivitiesChange();
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

  private removeActivityFromAllTravelers(item: ActivityWithPrice): void {
    if (!this.validateReservation() || this.isActivityLoading(item)) return;

    this.setActivityLoading(item, true);

    this.reservationTravelerService
      .getByReservation(this.reservationId!)
      .subscribe({
        next: (travelers) => {
          if (travelers.length === 0) {
            this.setActivityLoading(item, false);
            this.saveCompleted.emit({
              component: 'activities-optionals',
              success: false,
              error: 'No hay viajeros en la reserva',
            });
            return;
          }

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
              const allAssignments = assignmentsArrays.flat();

              if (allAssignments.length === 0) {
                this.setActivityLoading(item, false);
                this.errorMessage = null;
                this.saveCompleted.emit({
                  component: 'activities-optionals',
                  success: true,
                });
                return;
              }

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
              this.setActivityLoading(item, false);

              this.updateActivityState(item.id, false);
              this.errorMessage = null;
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: true,
              });
            })
            .catch((error) => {
              this.setActivityLoading(item, false);
              console.error('❌ Error eliminando actividad:', error);

              this.addedActivities.add(item.id);
              this.emitActivitiesChange();
              this.errorMessage =
                'Error al eliminar la actividad. Inténtalo de nuevo.';
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: false,
                error: 'Error al eliminar la actividad',
              });
            });
        },
        error: (error) => {
          this.setActivityLoading(item, false);
          console.error('❌ Error obteniendo viajeros:', error);

          this.addedActivities.add(item.id);
          this.emitActivitiesChange();
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

  private updateActivityState(activityId: number, isAdded: boolean): void {
    if (isAdded) {
      this.addedActivities.add(activityId);
    } else {
      this.addedActivities.delete(activityId);
    }
    this.emitActivitiesChange();
  }

  isActivityAdded(item: ActivityWithPrice): boolean {
    return this.addedActivities.has(item.id);
  }

  isActivityLoading(item: ActivityWithPrice): boolean {
    return this.activityLoadingStates.get(item.id) || false;
  }

  private setActivityLoading(item: ActivityWithPrice, loading: boolean): void {
    this.activityLoadingStates.set(item.id, loading);
  }

  hasAnyActivityLoading(): boolean {
    return Array.from(this.activityLoadingStates.values()).some(
      (loading) => loading
    );
  }

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

  get selectedActivities(): ActivityWithPrice[] {
    return this.optionalActivities.filter((activity) =>
      this.addedActivities.has(activity.id)
    );
  }

  get totalActivitiesPrice(): number {
    return this.selectedActivities.reduce((total, activity) => {
      const price = this.getBasePrice(activity);
      return total + (price || 0);
    }, 0);
  }

  get hasSelectedActivities(): boolean {
    return this.addedActivities.size > 0;
  }
}
