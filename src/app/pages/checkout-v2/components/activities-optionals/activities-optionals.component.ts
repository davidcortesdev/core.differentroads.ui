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
} from '../../../../core/services/reservation/reservation-traveler-activity.service';
import {
  ReservationTravelerActivityPackService,
} from '../../../../core/services/reservation/reservation-traveler-activity-pack.service';
import {
  ReservationTravelerService,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../../../core/services/agegroup/age-group.service';
import {
  ActivityAvailabilityService,
  IActivityAvailabilityResponse,
} from '../../../../core/services/activity/activity-availability.service';
import {
  ActivityPackAvailabilityService,
  IActivityPackAvailabilityResponse,
} from '../../../../core/services/activity/activity-pack-availability.service';
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
  availablePlaces?: number; // Disponibilidad de plazas
  lastAvailabilityUpdate?: string; // Última actualización de disponibilidad
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

  // Output para notificar que se han actualizado las actividades
  @Output() activitiesUpdated = new EventEmitter<void>();

  // Estado del componente
  optionalActivities: ActivityWithPrice[] = [];
  addedActivities: Set<number> = new Set();
  public errorMessage: string | null = null;

  // Modal de descripción completa
  descriptionModalVisible: boolean = false;
  selectedActivityForModal: ActivityWithPrice | null = null;

  // Individual loading states per activity
  private activityLoadingStates: Map<number, boolean> = new Map();

  // Cache y control de carga
  private ageGroupsCache: IAgeGroupResponse[] = [];
  private saveTimeout: any;
  private activitiesByTravelerLoaded: boolean = false;

  // NUEVO: contador de operaciones pendientes para sincronización con backend
  private pendingOperationsCount: number = 0;

  constructor(
    private activityService: ActivityService,
    private activityPriceService: ActivityPriceService,
    private activityPackPriceService: ActivityPackPriceService,
    private activityAvailabilityService: ActivityAvailabilityService,
    private activityPackAvailabilityService: ActivityPackAvailabilityService,
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
            availablePlaces: undefined,
            lastAvailabilityUpdate: undefined,
          }));

          this.loadPricesForActivities();
          this.loadAvailabilityForActivities();
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
    // No emitir evento aquí, solo en guardados
  }

  private loadPricesForActivities(): void {
    if (!this.departureId) return;

    this.optionalActivities.forEach((activity, index) => {
      this.loadPriceForActivity(activity, index);
    });
  }

  // NUEVO: Método para cargar disponibilidad de actividades
  private loadAvailabilityForActivities(): void {
    if (!this.departureId) return;

    this.optionalActivities.forEach((activity, index) => {
      this.loadAvailabilityForActivity(activity, index);
    });
  }

  // NUEVO: Método para cargar disponibilidad de una actividad específica
  private loadAvailabilityForActivity(
    activity: ActivityWithPrice,
    index: number
  ): void {
    if (!this.departureId) return;

    if (activity.type === 'act') {
      // Cargar disponibilidad para actividades individuales
      this.activityAvailabilityService
        .getByActivityAndDeparture(activity.id, this.departureId)
        .pipe(
          map((availabilities) => (availabilities.length > 0 ? availabilities : [])),
          catchError((error) => {
            console.error(
              `Error loading availability for activity ${activity.id}:`,
              error
            );
            return of([]);
          })
        )
        .subscribe((availabilities) => {
          if (availabilities && availabilities.length > 0) {
            // Usar bookableAvailability como disponibilidad principal
            const availability = availabilities[0];
            this.optionalActivities[index].availablePlaces = availability.bookableAvailability;
            this.optionalActivities[index].lastAvailabilityUpdate = availability.lastAvailabilityUpdate;
          } else {
            // Si no hay disponibilidad, establecer en 0
            this.optionalActivities[index].availablePlaces = 0;
          }
        });
    } else if (activity.type === 'pack') {
      // Cargar disponibilidad para activity packs
      this.activityPackAvailabilityService
        .getByActivityPackAndDeparture(activity.id, this.departureId)
        .pipe(
          map((availabilities) => (availabilities.length > 0 ? availabilities : [])),
          catchError((error) => {
            console.error(
              `Error loading availability for activity pack ${activity.id}:`,
              error
            );
            return of([]);
          })
        )
        .subscribe((availabilities) => {
          if (availabilities && availabilities.length > 0) {
            // Usar bookableAvailability como disponibilidad principal
            const availability = availabilities[0];
            this.optionalActivities[index].availablePlaces = availability.bookableAvailability;
            this.optionalActivities[index].lastAvailabilityUpdate = availability.lastAvailabilityUpdate;
          } else {
            // Si no hay disponibilidad, establecer en 0
            this.optionalActivities[index].availablePlaces = 0;
          }
        });
    }
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

    // Validar disponibilidad antes de añadir
    if (!this.addedActivities.has(item.id)) {
      if (item.availablePlaces !== undefined && item.availablePlaces === 0) {
        this.errorMessage = 'No hay disponibilidad para esta actividad.';
        return;
      }
    }

    if (this.addedActivities.has(item.id)) {
      this.addedActivities.delete(item.id);
      this.debouncedSave(item, 'remove');
    } else {
      this.addedActivities.add(item.id);
      this.debouncedSave(item, 'add');
    }

    // No emitir aquí, solo después de guardar
  }

  // NUEVO: Método para verificar si una actividad está disponible
  isActivityAvailable(item: ActivityWithPrice): boolean {
    if (item.availablePlaces === undefined) {
      return true; // Si no hay información de disponibilidad, permitir
    }
    return item.availablePlaces > 0;
  }

  private addActivityToAllTravelers(item: ActivityWithPrice): void {
    if (!this.validateReservation() || this.isActivityLoading(item)) return;

    this.setActivityLoading(item, true);

    this.pendingOperationsCount++;
    this.reservationTravelerService
      .getByReservation(this.reservationId!)
      .subscribe({
        next: (travelers) => {
          if (travelers.length === 0) {
            this.setActivityLoading(item, false);
            this.errorMessage = 'No hay viajeros en la reserva';
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
              
              // Emitir que se actualizaron las actividades
              this.emitActivitiesUpdated();
            })
            .catch((error) => {
              this.setActivityLoading(item, false);
              console.error('❌ Error guardando actividad:', error);

              this.addedActivities.delete(item.id);
              this.errorMessage =
                'Error al guardar la actividad. Inténtalo de nuevo.';
              
              // Emitir incluso en error
              this.emitActivitiesUpdated();
            });
        },
        error: (error) => {
          this.setActivityLoading(item, false);
          console.error('❌ Error obteniendo viajeros:', error);

          this.addedActivities.delete(item.id);
          this.errorMessage =
            'Error al obtener información de viajeros. Inténtalo de nuevo.';
          
          // Emitir incluso en error
          this.emitActivitiesUpdated();
        },
        complete: () => {
          this.pendingOperationsCount = Math.max(0, this.pendingOperationsCount - 1);
        }
      });
  }

  private removeActivityFromAllTravelers(item: ActivityWithPrice): void {
    if (!this.validateReservation() || this.isActivityLoading(item)) return;

    this.setActivityLoading(item, true);

    this.pendingOperationsCount++;
    this.reservationTravelerService
      .getByReservation(this.reservationId!)
      .subscribe({
        next: (travelers) => {
          if (travelers.length === 0) {
            this.setActivityLoading(item, false);
            this.errorMessage = 'No hay viajeros en la reserva';
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
                
                // Emitir que se actualizaron las actividades
                this.emitActivitiesUpdated();
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
              
              // Emitir que se actualizaron las actividades
              this.emitActivitiesUpdated();
            })
            .catch((error) => {
              this.setActivityLoading(item, false);
              console.error('❌ Error eliminando actividad:', error);

              this.addedActivities.add(item.id);
              this.errorMessage =
                'Error al eliminar la actividad. Inténtalo de nuevo.';
              
              // Emitir incluso en error
              this.emitActivitiesUpdated();
            });
        },
        error: (error) => {
          this.setActivityLoading(item, false);
          console.error('❌ Error obteniendo viajeros:', error);

          this.addedActivities.add(item.id);
          this.errorMessage =
            'Error al obtener información de viajeros. Inténtalo de nuevo.';
          
          // Emitir incluso en error
          this.emitActivitiesUpdated();
        },
        complete: () => {
          this.pendingOperationsCount = Math.max(0, this.pendingOperationsCount - 1);
        }
      });
  }

  private updateActivityState(activityId: number, isAdded: boolean): void {
    if (isAdded) {
      this.addedActivities.add(activityId);
    } else {
      this.addedActivities.delete(activityId);
    }
    // No emitir aquí, se emite después de guardar en BD
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

  // Método para emitir que se actualizaron las actividades
  private emitActivitiesUpdated(): void {
    this.activitiesUpdated.emit();
  }

  // NUEVO: método público para esperar a que no haya operaciones pendientes
  async waitForPendingSaves(timeoutMs: number = 4000): Promise<void> {
    const start = Date.now();
    while (this.pendingOperationsCount > 0) {
      if (Date.now() - start > timeoutMs) {
        break;
      }
      await new Promise((res) => setTimeout(res, 100));
    }
  }

  /**
   * 🔥 NUEVO: Getter para obtener las actividades seleccionadas
   */
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

  /**
   * Verifica si la descripción de la actividad está cortada y necesita mostrar "Ver más"
   * Considera el contenido HTML y estima si excede aproximadamente 4 líneas
   */
  shouldShowReadMore(activity: ActivityWithPrice): boolean {
    if (!activity.description) {
      return false;
    }

    // Crear un elemento temporal para extraer el texto sin HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = activity.description;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';

    // Estimar si el texto es largo (más de ~200 caracteres o más de ~30 palabras)
    // Esto corresponde aproximadamente a 4 líneas de texto
    const wordCount = textContent.trim().split(/\s+/).length;
    const charCount = textContent.trim().length;

    return charCount > 200 || wordCount > 30;
  }

  /**
   * Abre la modal con la descripción completa de la actividad
   */
  openDescriptionModal(activity: ActivityWithPrice): void {
    this.selectedActivityForModal = activity;
    this.descriptionModalVisible = true;
  }

  /**
   * Cierra la modal de descripción
   */
  closeDescriptionModal(): void {
    this.descriptionModalVisible = false;
    this.selectedActivityForModal = null;
  }

  /**
   * Convierte ActivityWithPrice a formato para el modal
   */
  getActivityForModal(): { id: number; name: string; description: string; imageUrl?: string } | null {
    if (!this.selectedActivityForModal) return null;
    return {
      id: this.selectedActivityForModal.id,
      name: this.selectedActivityForModal.name || '',
      description: this.selectedActivityForModal.description || '',
      imageUrl: this.selectedActivityForModal.imageUrl || undefined
    };
  }
}
