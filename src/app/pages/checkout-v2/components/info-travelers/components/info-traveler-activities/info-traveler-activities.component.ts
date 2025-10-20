import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';

// Interfaces
import { IReservationTravelerResponse } from '../../../../../../core/services/reservation/reservation-traveler.service';
import { IActivityResponse } from '../../../../../../core/services/activity/activity.service';
import { IReservationTravelerActivityResponse } from '../../../../../../core/services/reservation/reservation-traveler-activity.service';
import { IReservationTravelerActivityPackResponse } from '../../../../../../core/services/reservation/reservation-traveler-activity-pack.service';

// Servicios
import { ActivityService } from '../../../../../../core/services/activity/activity.service';
import { ReservationTravelerActivityService } from '../../../../../../core/services/reservation/reservation-traveler-activity.service';
import { ReservationTravelerActivityPackService } from '../../../../../../core/services/reservation/reservation-traveler-activity-pack.service';
import { ActivityPriceService } from '../../../../../../core/services/activity/activity-price.service';
import { ActivityPackPriceService } from '../../../../../../core/services/activity/activity-pack-price.service';

@Component({
  selector: 'app-info-traveler-activities',
  standalone: false,
  templateUrl: './info-traveler-activities.component.html',
  styleUrls: ['./info-traveler-activities.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoTravelerActivitiesComponent implements OnInit, OnDestroy {
  @Input() traveler!: IReservationTravelerResponse;
  @Input() reservationId!: number;
  @Input() departureId!: number;
  @Input() itineraryId!: number;

  @Output() activitiesAssignmentChange = new EventEmitter<void>();

  // Propiedades de datos
  optionalActivities: IActivityResponse[] = [];
  travelerActivities: IReservationTravelerActivityResponse[] = [];
  travelerActivityPacks: IReservationTravelerActivityPackResponse[] = [];
  
  // Precios de actividades
  activityPrices: { [activityId: number]: number } = {};
  
  // Estados de control
  private deletedFromDB: { [activityId: number]: boolean } = {};
  private savingActivities: { [key: string]: boolean } = {};
  
  // Estados de carga
  loading: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private messageService: MessageService,
    private activityService: ActivityService,
    private reservationTravelerActivityService: ReservationTravelerActivityService,
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private activityPriceService: ActivityPriceService,
    private activityPackPriceService: ActivityPackPriceService
  ) {}

  ngOnInit(): void {
    this.loadOptionalActivitiesAndThenTravelerActivities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar actividades opcionales y luego las asignadas al viajero
   */
  private loadOptionalActivitiesAndThenTravelerActivities(): void {
    if (!this.itineraryId || !this.departureId) {
      return;
    }

    this.loading = true;

    this.activityService
      .getForItineraryWithPacks(this.itineraryId, this.departureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (activities) => {
          this.optionalActivities = activities;
          this.loadTravelerActivities();
        },
        error: (error) => {
          this.loadTravelerActivities();
        },
      });
  }

  /**
   * Cargar actividades asignadas al viajero
   */
  private loadTravelerActivities(): void {
    if (!this.traveler) {
      this.loading = false;
      return;
    }

    forkJoin({
      activities: this.reservationTravelerActivityService.getByReservationTraveler(this.traveler.id),
      activityPacks: this.reservationTravelerActivityPackService.getByReservationTraveler(this.traveler.id)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ activities, activityPacks }) => {
          this.travelerActivities = activities;
          this.travelerActivityPacks = activityPacks;

          this.loadActivityPricesForTraveler(activities);
          this.loadActivityPackPricesForTraveler(activityPacks);

          this.loading = false;
          this.emitInitialActivitiesState();
        },
        error: (error) => {
          console.error('Error al cargar actividades del viajero:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Cargar precios de actividades individuales
   */
  private loadActivityPricesForTraveler(activities: IReservationTravelerActivityResponse[]): void {
    if (!activities || activities.length === 0) {
      return;
    }

    activities.forEach((travelerActivity) => {
      const activity = this.optionalActivities.find(
        (act) => act.id === travelerActivity.activityId
      );

      if (!activity) {
        return;
      }

      this.activityPriceService
        .getAll({
          ActivityId: [travelerActivity.activityId],
          DepartureId: this.departureId,
          AgeGroupId: this.traveler.ageGroupId,
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (prices) => {
            if (prices && prices.length > 0) {
              const price = prices[0];
              const finalPrice = price.campaignPrice 
                ? price.campaignPrice 
                : price.basePrice;

              this.activityPrices[travelerActivity.activityId] = finalPrice;
            }
          },
          error: (error) => {
            console.error('Error al cargar precio de actividad:', error);
          }
        });
    });
  }

  /**
   * Cargar precios de paquetes de actividades
   */
  private loadActivityPackPricesForTraveler(activityPacks: IReservationTravelerActivityPackResponse[]): void {
    if (!activityPacks || activityPacks.length === 0) {
      return;
    }

    activityPacks.forEach((travelerActivityPack) => {
      this.activityPackPriceService
        .getAll({
          activityPackId: travelerActivityPack.activityPackId,
          departureId: this.departureId,
          ageGroupId: this.traveler.ageGroupId,
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (prices) => {
            if (prices && prices.length > 0) {
              const price = prices[0];
              const finalPrice = price.campaignPrice 
                ? price.campaignPrice 
                : price.basePrice;

              this.activityPrices[travelerActivityPack.activityPackId] = finalPrice;
            }
          },
          error: (error) => {
            console.error('Error al cargar precio de paquete:', error);
          }
        });
    });
  }

  /**
   * Emitir estado inicial de actividades
   */
  private emitInitialActivitiesState(): void {
    // En lugar de emitir item por item, emitimos un único evento de actualización
    this.activitiesAssignmentChange.emit();
  }

  /**
   * Obtener precio de actividad
   */
  getActivityPrice(activityId: number): number | null {
    return this.activityPrices[activityId] || null;
  }

  /**
   * Obtener nombre de actividad
   */
  getActivityName(activityId: number): string {
    const activity = this.optionalActivities.find((a) => a.id === activityId);
    return activity ? activity.name || 'Sin nombre' : '';
  }

  /**
   * Verificar si se está guardando una actividad
   */
  isSavingActivity(activityId: number): boolean {
    const key = `${this.traveler.id}_${activityId}`;
    return !!this.savingActivities[key];
  }

  /**
   * Verificar si una actividad fue eliminada de la BD
   */
  isTravelerActivityDeleted(activityId: number): boolean {
    return this.deletedFromDB[activityId] || false;
  }

  /**
   * Manejar cambio de toggle de actividad
   */
  onActivityToggleChange(activityId: number, isSelected: boolean): void {
    const activityName = this.getActivityName(activityId);

    if (activityName) {
      const activityPrice = this.getActivityPrice(activityId) || 0;

      if (isSelected) {
        this.createActivityAssignment(activityId, activityName, activityPrice);
      } else {
        this.removeActivityAssignment(activityId, activityName, activityPrice);
      }
    }
  }

  /**
   * Crear asignación de actividad
   */
  private createActivityAssignment(activityId: number, activityName: string, activityPrice: number): void {
    const key = `${this.traveler.id}_${activityId}`;
    
    if (this.savingActivities[key]) {
      console.log('⏳ Guardado de actividad en curso, esperando...');
      return;
    }

    this.savingActivities[key] = true;

    const isCurrentlyAssigned = this.isTravelerActivityAssigned(activityId);
    const wasDeletedFromDB = this.deletedFromDB[activityId];

    if (isCurrentlyAssigned && !wasDeletedFromDB) {
      this.savingActivities[key] = false;
      this.activitiesAssignmentChange.emit();
      return;
    }

    const activity = this.optionalActivities.find((a) => a.id === activityId);
    if (!activity) {
      this.savingActivities[key] = false;
      return;
    }

    const isActivityPack = activity.type === 'pack';

    if (isActivityPack) {
      // Crear paquete de actividad
      const createData = {
        id: 0,
        reservationTravelerId: this.traveler.id,
        activityPackId: activityId,
      };

      this.reservationTravelerActivityPackService
        .create(createData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.savingActivities[key] = false;
            
            const existingPackIndex = this.travelerActivityPacks
              ?.findIndex((pack) => pack.activityPackId === activityId);

            if (existingPackIndex !== -1 && existingPackIndex !== undefined) {
              this.travelerActivityPacks[existingPackIndex] = response;
            } else {
              this.travelerActivityPacks.push(response);
            }

            if (this.deletedFromDB[activityId]) {
              delete this.deletedFromDB[activityId];
            }

            this.activitiesAssignmentChange.emit();

            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: `Actividad "${activityName}" asignada correctamente`,
              life: 3000,
            });
          },
          error: (error) => {
            this.savingActivities[key] = false;
            console.error('❌ Error guardando actividad:', error);
            
            this.activitiesAssignmentChange.emit();

            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al asignar la actividad',
              life: 5000,
            });
          }
        });
    } else {
      // Crear actividad individual
      const createData = {
        id: 0,
        reservationTravelerId: this.traveler.id,
        activityId: activityId,
      };

      this.reservationTravelerActivityService
        .create(createData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.savingActivities[key] = false;
            
            const existingActivityIndex = this.travelerActivities
              ?.findIndex((activity) => activity.activityId === activityId);

            if (existingActivityIndex !== -1 && existingActivityIndex !== undefined) {
              this.travelerActivities[existingActivityIndex] = response;
            } else {
              this.travelerActivities.push(response);
            }

            if (this.deletedFromDB[activityId]) {
              delete this.deletedFromDB[activityId];
            }

            this.activitiesAssignmentChange.emit();

            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: `Actividad "${activityName}" asignada correctamente`,
              life: 3000,
            });
          },
          error: (error) => {
            this.savingActivities[key] = false;
            console.error('❌ Error guardando actividad:', error);
            
            this.activitiesAssignmentChange.emit();

            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al asignar la actividad',
              life: 5000,
            });
          }
        });
    }
  }

  /**
   * Eliminar asignación de actividad
   */
  private removeActivityAssignment(activityId: number, activityName: string, activityPrice: number): void {
    const key = `${this.traveler.id}_${activityId}`;
    
    if (this.savingActivities[key]) {
      console.log('⏳ Eliminación de actividad en curso, esperando...');
      return;
    }

    this.savingActivities[key] = true;

    const activity = this.optionalActivities.find((a) => a.id === activityId);
    if (!activity) {
      this.savingActivities[key] = false;
      return;
    }

    const isActivityPack = activity.type === 'pack';

    if (isActivityPack) {
      // Eliminar paquete de actividad
      const packToDelete = this.travelerActivityPacks.find(
        (pack) => pack.activityPackId === activityId
      );

      if (packToDelete) {
        this.reservationTravelerActivityPackService
          .delete(packToDelete.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.savingActivities[key] = false;
              
              this.travelerActivityPacks = this.travelerActivityPacks.filter(
                (pack) => pack.activityPackId !== activityId
              );

              this.deletedFromDB[activityId] = true;

              this.activitiesAssignmentChange.emit();

              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `Actividad "${activityName}" eliminada correctamente`,
                life: 3000,
              });
            },
            error: (error) => {
              this.savingActivities[key] = false;
              console.error('❌ Error eliminando actividad:', error);
              
              this.activitiesAssignmentChange.emit();

              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al eliminar la actividad',
                life: 5000,
              });
            }
          });
      } else {
        this.savingActivities[key] = false;
      }
    } else {
      // Eliminar actividad individual
      const activityToDelete = this.travelerActivities.find(
        (act) => act.activityId === activityId
      );

      if (activityToDelete) {
        this.reservationTravelerActivityService
          .delete(activityToDelete.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.savingActivities[key] = false;
              
              this.travelerActivities = this.travelerActivities.filter(
                (act) => act.activityId !== activityId
              );

              this.deletedFromDB[activityId] = true;

              this.activitiesAssignmentChange.emit();

              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `Actividad "${activityName}" eliminada correctamente`,
                life: 3000,
              });
            },
            error: (error) => {
              this.savingActivities[key] = false;
              console.error('❌ Error eliminando actividad:', error);
              
              this.activitiesAssignmentChange.emit();

              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al eliminar la actividad',
                life: 5000,
              });
            }
          });
      } else {
        this.savingActivities[key] = false;
      }
    }
  }

  /**
   * Verificar si una actividad está asignada al viajero
   */
  private isTravelerActivityAssigned(activityId: number): boolean {
    const isInActivities = this.travelerActivities.some(
      (activity) => activity.activityId === activityId
    );
    const isInActivityPacks = this.travelerActivityPacks.some(
      (pack) => pack.activityPackId === activityId
    );
    
    return isInActivities || isInActivityPacks;
  }
}


