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
  
  
  // Memoria de elementos visibles desde la carga inicial (compartida entre todas las instancias)
  private static visibleActivityIds: number[] = [];
  private static visiblePackIds: number[] = [];
  private static initializedVisible: boolean = false;

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

  // Getters para acceder a las propiedades estáticas desde el template
  get visibleActivityIds(): number[] {
    return InfoTravelerActivitiesComponent.visibleActivityIds;
  }

  get visiblePackIds(): number[] {
    return InfoTravelerActivitiesComponent.visiblePackIds;
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
          // Primero, cargar todas las asignaciones de la reserva para rellenar la lista
          this.populateVisibleFromReservation();
          // Luego, cargar las asignaciones del viajero actual para marcar sus toggles
          this.loadTravelerActivities();
        },
        error: (error) => {
          // Si falla la carga de catálogo, al menos continuar con asignaciones del viajero
          this.populateVisibleFromReservation();
          this.loadTravelerActivities();
        },
      });
  }

  /**
   * Rellenar listas visibles (actividades y packs) con todas las asignaciones de la reserva
   */
  private populateVisibleFromReservation(): void {
    if (!this.reservationId) {
      return;
    }

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (travelers: IReservationTraveler[]) => {
          if (!travelers || travelers.length === 0) {
            return;
          }

          const requests = travelers.map((t) =>
            forkJoin({
              activities: this.reservationTravelerActivityService.getByReservationTraveler(t.id),
              activityPacks: this.reservationTravelerActivityPackService.getByReservationTraveler(t.id),
            })
          );

          forkJoin(requests)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (results) => {
                const activityIds = new Set<number>();
                const packIds = new Set<number>();

                results.forEach(({ activities, activityPacks }) => {
                  activities?.forEach((a) => activityIds.add(a.activityId));
                  activityPacks?.forEach((p) => packIds.add(p.activityPackId));
                });

                // Memorizar una sola vez si no estaba inicializado; si ya estaba, actualizar unión manteniendo memoria
                if (!InfoTravelerActivitiesComponent.initializedVisible) {
                  InfoTravelerActivitiesComponent.visibleActivityIds = Array.from(activityIds);
                  InfoTravelerActivitiesComponent.visiblePackIds = Array.from(packIds);
                  InfoTravelerActivitiesComponent.initializedVisible = true;
                } else {
                  const currentActivities = new Set(InfoTravelerActivitiesComponent.visibleActivityIds);
                  const currentPacks = new Set(InfoTravelerActivitiesComponent.visiblePackIds);
                  activityIds.forEach((id) => currentActivities.add(id));
                  packIds.forEach((id) => currentPacks.add(id));
                  InfoTravelerActivitiesComponent.visibleActivityIds = Array.from(currentActivities);
                  InfoTravelerActivitiesComponent.visiblePackIds = Array.from(currentPacks);
                }
              },
              error: (error) => {
                // Error al cargar asignaciones por reserva
              },
            });
        },
        error: (error) => {
          // Error al obtener viajeros de la reserva
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


          // Memorizar listas visibles solo en la primera carga
          if (!InfoTravelerActivitiesComponent.initializedVisible) {
            InfoTravelerActivitiesComponent.visibleActivityIds = Array.from(new Set(activities.map(a => a.activityId)));
            InfoTravelerActivitiesComponent.visiblePackIds = Array.from(new Set(activityPacks.map(p => p.activityPackId)));
            InfoTravelerActivitiesComponent.initializedVisible = true;
          }

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

            // Asegurar que permanezca visible
            if (!InfoTravelerActivitiesComponent.visiblePackIds.includes(activityId)) {
              InfoTravelerActivitiesComponent.visiblePackIds.push(activityId);
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
            
            // Asegurar que permanezca visible
            if (!InfoTravelerActivitiesComponent.visibleActivityIds.includes(activityId)) {
              InfoTravelerActivitiesComponent.visibleActivityIds.push(activityId);
            }
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


