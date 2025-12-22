import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';

// Interfaces
import { IReservationTravelerResponse } from '../../../../../../core/services/reservation/reservation-traveler.service';
import { IActivityResponse } from '../../../../../../core/services/activity/activity.service';
import { IReservationTravelerActivityResponse, ReservationTravelerActivityFilters } from '../../../../../../core/services/reservation/reservation-traveler-activity.service';
import { IReservationTravelerActivityPackResponse, ReservationTravelerActivityPackFilters } from '../../../../../../core/services/reservation/reservation-traveler-activity-pack.service';

// Servicios
import { ActivityService } from '../../../../../../core/services/activity/activity.service';
import { ReservationTravelerActivityService } from '../../../../../../core/services/reservation/reservation-traveler-activity.service';
import { ReservationTravelerActivityPackService } from '../../../../../../core/services/reservation/reservation-traveler-activity-pack.service';
import { ReservationTravelerService, IReservationTravelerResponse as IReservationTraveler } from '../../../../../../core/services/reservation/reservation-traveler.service';

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
    private reservationTravelerService: ReservationTravelerService
  ) {}

  ngOnInit(): void {
    this.loadOptionalActivitiesAndThenTravelerActivities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Obtener actividades individuales visibles
   */
  get visibleActivities(): IActivityResponse[] {
    return this.optionalActivities.filter(activity => activity.type !== 'pack');
  }

  /**
   * Obtener paquetes de actividades visibles
   */
  get visibleActivityPacks(): IActivityResponse[] {
    return this.optionalActivities.filter(activity => activity.type === 'pack');
  }

  /**
   * Cargar actividades opcionales basadas en las seleccionadas por cualquier viajero de la reserva
   */
  private loadOptionalActivitiesAndThenTravelerActivities(): void {
    if (!this.itineraryId || !this.departureId || !this.reservationId) {
      return;
    }

    this.loading = true;

    // Primero obtener todos los viajeros de la reserva
    this.reservationTravelerService.getAll({ reservationId: this.reservationId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (travelers) => {
          if (!travelers || travelers.length === 0) {
            this.loading = false;
            return;
          }

          // Crear requests para obtener actividades y packs de todos los viajeros
          const activityRequests = travelers.map(traveler => 
            this.reservationTravelerActivityService.getAll({ reservationTravelerId: traveler.id })
          );
          const packRequests = travelers.map(traveler => 
            this.reservationTravelerActivityPackService.getAll({ reservationTravelerId: traveler.id })
          );

          // Ejecutar todas las llamadas en paralelo
          forkJoin({
            activities: forkJoin(activityRequests),
            packs: forkJoin(packRequests)
          })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: ({ activities, packs }) => {
                // Aplanar arrays de arrays
                const allActivities = activities.flat();
                const allPacks = packs.flat();

                // Obtener IDs únicos de actividades y packs seleccionados
                const selectedActivityIds = new Set(allActivities.map(a => a.activityId));
                const selectedPackIds = new Set(allPacks.map(p => p.activityPackId));

                // Cargar catálogo completo de actividades
                this.activityService
                  .getForItineraryWithPacks(this.itineraryId, this.departureId)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: (allActivities) => {
                      // Filtrar solo las actividades que han sido seleccionadas por algún viajero
                      this.optionalActivities = allActivities.filter(activity => 
                        selectedActivityIds.has(activity.id) || selectedPackIds.has(activity.id)
                      );

                      // Cargar las asignaciones del viajero actual
                      this.loadTravelerActivities();
                    },
                    error: (error) => {
                      this.loading = false;
                    }
                  });
              },
              error: (error) => {
                this.loading = false;
              }
            });
        },
        error: (error) => {
          this.loading = false;
        }
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
          this.loading = false;
          this.emitInitialActivitiesState();
        },
        error: (error) => {
          this.loading = false;
        }
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
   * Saber si una actividad (o pack) está actualmente asignada
   */
  isCurrentlyAssigned(activityId: number): boolean {
    return (
      this.travelerActivities.some(a => a.activityId === activityId) ||
      this.travelerActivityPacks.some(p => p.activityPackId === activityId)
    );
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
      if (isSelected) {
        this.createActivityAssignment(activityId, activityName);
      } else {
        this.deactivateActivityAssignment(activityId, activityName);
      }
    }
  }

  /**
   * Crear asignación de actividad
   */
  private createActivityAssignment(activityId: number, activityName: string): void {
    const key = `${this.traveler.id}_${activityId}`;
    
    if (this.savingActivities[key]) {
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
  private deactivateActivityAssignment(activityId: number, activityName: string): void {
    const key = `${this.traveler.id}_${activityId}`;
    if (this.savingActivities[key]) {
      return;
    }

    this.savingActivities[key] = true;

    const packToDelete = this.travelerActivityPacks.find(p => p.activityPackId === activityId);
    if (packToDelete) {
      this.reservationTravelerActivityPackService
        .delete(packToDelete.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.savingActivities[key] = false;
            // Quitar de asignadas, pero NO de visibles
            this.travelerActivityPacks = this.travelerActivityPacks.filter(p => p.activityPackId !== activityId);
            this.deletedFromDB[activityId] = true;
            this.activitiesAssignmentChange.emit();
          },
          error: (error) => {
            this.savingActivities[key] = false;
          }
        });
      return;
    }

    const activityToDelete = this.travelerActivities.find(a => a.activityId === activityId);
    if (activityToDelete) {
      this.reservationTravelerActivityService
        .delete(activityToDelete.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.savingActivities[key] = false;
            // Quitar de asignadas, pero NO de visibles
            this.travelerActivities = this.travelerActivities.filter(a => a.activityId !== activityId);
            this.deletedFromDB[activityId] = true;
            this.activitiesAssignmentChange.emit();
          },
          error: (error) => {
            this.savingActivities[key] = false;
          }
        });
      return;
    }

    // Si no hay registro, solo marcar borrado para reflejar estado
    this.savingActivities[key] = false;
    this.deletedFromDB[activityId] = true;
    this.activitiesAssignmentChange.emit();
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

