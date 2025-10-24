import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { catchError, of, forkJoin, firstValueFrom, map } from 'rxjs';
import {
  ActivityService,
  IActivityResponse,
} from '../../../core/services/activity/activity.service';
import {
  ActivityPriceService,
  IActivityPriceResponse,
} from '../../../core/services/activity/activity-price.service';
import {
  ReservationTravelerActivityService,
  IReservationTravelerActivityResponse,
} from '../../../core/services/reservation/reservation-traveler-activity.service';
import {
  ReservationTravelerActivityPackService,
  IReservationTravelerActivityPackResponse,
} from '../../../core/services/reservation/reservation-traveler-activity-pack.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerFieldService,
  IReservationTravelerFieldResponse,
} from '../../../core/services/reservation/reservation-traveler-field.service';
import {
  ReservationFieldService,
  IReservationFieldResponse,
} from '../../../core/services/reservation/reservation-field.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../../core/services/agegroup/age-group.service';
import {
  DepartureService,
} from '../../../core/services/departure/departure.service';

// Interface para el formato de precio esperado
interface PriceData {
  age_group_name: string;
  value: number;
  currency: string;
}

// Interface simplificada siguiendo el patrón del ejemplo
interface ActivityWithPrice extends IActivityResponse {
  priceData: PriceData[];
  showPassengers?: boolean;
  selectedTravelers?: {
    id: number;
    selected: boolean;
    ageGroup: string;
    price: number;
  }[];
  addedManually?: boolean;
  isIncluded?: boolean;
}

@Component({
  selector: 'app-booking-activities-v2',
  templateUrl: './booking-activities.component.html',
  styleUrls: ['./booking-activities.component.scss'],
  standalone: false,
})
export class BookingActivitiesV2Component implements OnInit {
  @Input() periodId!: string;
  @Input() reservationId!: number;
  @Output() dataUpdated = new EventEmitter<void>();

  // Estado del componente
  availableActivities: ActivityWithPrice[] = [];
  travelers: IReservationTravelerResponse[] = [];
  travelerActivities: { [travelerId: number]: IReservationTravelerActivityResponse[] } = {};
  travelerActivityPacks: { [travelerId: number]: IReservationTravelerActivityPackResponse[] } = {};
  ageGroups: IAgeGroupResponse[] = [];
  travelerNames: { [travelerId: number]: string } = {};
  
  isLoading: boolean = false;
  activitiesByTravelerLoaded: boolean = false;

  constructor(
    private sanitizer: DomSanitizer,
    private messageService: MessageService,
    private activityService: ActivityService,
    private activityPriceService: ActivityPriceService,
    private reservationTravelerActivityService: ReservationTravelerActivityService,
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerFieldService: ReservationTravelerFieldService,
    private reservationFieldService: ReservationFieldService,
    private ageGroupService: AgeGroupService,
    private departureService: DepartureService
  ) {}

  ngOnInit(): void {
    this.loadAgeGroups();
  }

  private loadAgeGroups(): void {
    this.ageGroupService.getAll().subscribe({
      next: (ageGroups) => {
        this.ageGroups = ageGroups;
        this.initializeComponent();
      },
      error: (error) => {
        this.initializeComponent();
      },
    });
  }

  private initializeComponent(): void {
    if (this.periodId) {
      this.loadActivities();
    }

    if (this.reservationId && !this.activitiesByTravelerLoaded) {
      this.loadActivitiesByTraveler();
    }
  }

  private loadActivities(): void {
    if (!this.periodId) return;

    const departureId = parseInt(this.periodId);
    
    // Primero obtener el departure para conseguir el itineraryId
    this.departureService.getById(departureId).subscribe({
      next: (departure) => {
        this.activityService
          .getForItineraryWithPacks(
            departure.itineraryId,
            departureId,
            undefined,
            true, // isVisibleOnWeb
            true // onlyOpt - solo actividades opcionales
          )
          .subscribe({
            next: (activities) => {
              this.availableActivities = activities.map((activity) => ({
                ...activity,
                priceData: [],
                showPassengers: false,
                selectedTravelers: [],
                addedManually: false,
                isIncluded: false,
              }));

              // Cargar precios para cada actividad
              this.loadPricesForActivities();
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al cargar las actividades',
              });
            },
          });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar el departure',
        });
      },
    });
  }

  private loadPricesForActivities(): void {
    const pricePromises = this.availableActivities.map((activity) =>
      this.activityPriceService
        .getAll({ ActivityId: [activity.id] })
        .pipe(
          catchError(() => of([])),
          map((prices: IActivityPriceResponse[]) => ({
            activityId: activity.id,
            prices: prices.map((price) => ({
              age_group_name: this.getAgeGroupName(price.ageGroupId),
              value: price.basePrice,
              currency: 'EUR', // Usar currencyId para obtener la moneda real si es necesario
            })),
          }))
        )
        .toPromise()
    );

    Promise.all(pricePromises).then((results: any[]) => {
      results.forEach((result) => {
    const activity = this.availableActivities.find(
          (a) => a.id === result.activityId
        );
        if (activity) {
          activity.priceData = result.prices;
        }
      });
    });
  }

  private getAgeGroupName(ageGroupId: number): string {
    const ageGroup = this.ageGroups.find((ag) => ag.id === ageGroupId);
    return ageGroup ? ageGroup.name : 'Adulto';
  }

  private loadActivitiesByTraveler(): void {
    if (!this.reservationId || this.activitiesByTravelerLoaded) return;


    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          this.travelers = travelers;
          const assignedActivities = new Set<number>();
          let processedTravelers = 0;

          travelers.forEach((traveler) => {
            
            forkJoin({
              activities: this.reservationTravelerActivityService.getByReservationTraveler(traveler.id),
              activityPacks: this.reservationTravelerActivityPackService.getByReservationTraveler(traveler.id),
            }).subscribe({
              next: (result) => {
                
                this.travelerActivities[traveler.id] = result.activities;
                this.travelerActivityPacks[traveler.id] = result.activityPacks;

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
                  // Cargar nombres de viajeros después de cargar actividades
                  this.loadTravelerNames();
                }
              },
              error: (error) => {
                processedTravelers++;

                if (processedTravelers === travelers.length) {
                  this.markAssignedActivitiesAsAdded(assignedActivities);
                  this.activitiesByTravelerLoaded = true;
                  // Cargar nombres de viajeros después de cargar actividades
                  this.loadTravelerNames();
                }
              },
            });
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar los datos de los viajeros',
          });
        },
      });
  }

  private markAssignedActivitiesAsAdded(assignedActivities: Set<number>): void {
    this.availableActivities.forEach((activity) => {
      if (assignedActivities.has(activity.id)) {
        activity.isIncluded = true;
      }
    });
  }

  private loadTravelerNames(): void {
    
    this.travelers.forEach((traveler) => {
      
      this.reservationTravelerFieldService.getByReservationTraveler(traveler.id).subscribe({
        next: (travelerFields: IReservationTravelerFieldResponse[]) => {
          
          if (travelerFields.length > 0) {
            // Obtener los IDs de los campos para obtener sus nombres
            const fieldIds = [...new Set(travelerFields.map((field: IReservationTravelerFieldResponse) => field.reservationFieldId))];
            
            const fieldObservables = fieldIds.map(fieldId => 
              this.reservationFieldService.getById(fieldId)
            );

            forkJoin(fieldObservables).subscribe({
              next: (fields: IReservationFieldResponse[]) => {
                
                // Crear un mapa de fieldId -> fieldName
                const fieldMap = new Map<number, string>();
                fields.forEach(field => {
                  fieldMap.set(field.id, field.name);
                });

                // Buscar nombre y apellido
                let name = '';
                let surname = '';

                travelerFields.forEach((field: IReservationTravelerFieldResponse) => {
                  const fieldInfo = fieldMap.get(field.reservationFieldId);
                  if (fieldInfo) {
                    const fieldName = fieldInfo.toLowerCase();
                    
                    if (fieldName.includes('nombre') && !name) {
                      name = field.value;
                    } else if (fieldName.includes('apellido') && !surname) {
                      surname = field.value;
                    }
                  }
                });

                // Crear el nombre completo
                const fullName = [name, surname].filter(Boolean).join(' ');
                this.travelerNames[traveler.id] = fullName || `Viajero ${traveler.travelerNumber}`;
                
              }
            });
          } else {
            this.travelerNames[traveler.id] = `Viajero ${traveler.travelerNumber}`;
          }
        },
        error: (error: any) => {
          this.travelerNames[traveler.id] = `Viajero ${traveler.travelerNumber}`;
        }
      });
    });
  }

  toggleAddActivity(activityId: number): void {
    const activity = this.availableActivities.find((act) => act.id === activityId);
    if (!activity) return;

    if (activity.addedManually) {
      activity.addedManually = false;
      activity.showPassengers = false;
      activity.selectedTravelers = [];
    } else {
      activity.addedManually = true;
      activity.showPassengers = true;
      activity.selectedTravelers = this.travelers.map((traveler) => {
        const ageGroup = this.getAgeGroupName(traveler.ageGroupId);
        const price = this.getPriceForTraveler(activity, ageGroup);

        return {
          id: traveler.id,
          selected: false, // Inicializar como NO seleccionado
          ageGroup,
          price,
        };
      });
    }
  }

  private getPriceForTraveler(activity: ActivityWithPrice, ageGroup: string): number {
    const priceData = activity.priceData.find((p) => p.age_group_name === ageGroup);
    return priceData ? priceData.value : 0;
  }

  onContinueActivity(activityId: number): void {
    const activity = this.availableActivities.find((act) => act.id === activityId);
    if (!activity || !activity.selectedTravelers) return;

    const selectedTravelers = activity.selectedTravelers.filter((t) => t.selected);
    
    if (selectedTravelers.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Selecciona al menos un pasajero para la actividad',
      });
      return;
    }

    this.isLoading = true;

    // Guardar las actividades para los viajeros seleccionados
    const savePromises = selectedTravelers.map((traveler) => {
      if (activity.type === 'act') {
        const createData = {
          id: 0,
          reservationTravelerId: traveler.id,
          activityId: activityId
        };
        return firstValueFrom(this.reservationTravelerActivityService.create(createData));
      } else if (activity.type === 'pack') {
        const createData = {
          id: 0,
          reservationTravelerId: traveler.id,
          activityPackId: activityId
        };
        return firstValueFrom(this.reservationTravelerActivityPackService.create(createData));
      }
      return Promise.resolve(null);
    });

    Promise.all(savePromises)
      .then(() => {
        this.isLoading = false;
        activity.showPassengers = false;
        activity.addedManually = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Actividad "${activity.name}" agregada correctamente a ${selectedTravelers.length} viajero(s)`,
          life: 3000,
        });
        
        // Emitir evento al componente padre
        this.emitDataUpdated();
        
        // Recargar la página para actualizar los datos
        this.reloadParentComponent();
      })
      .catch((error) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron guardar las actividades',
          life: 3000,
        });
      });
  }

  getTravelerNameById(travelerId: number): string {
    return this.travelerNames[travelerId] || `Viajero ${travelerId}`;
  }

  /**
   * Verifica si un viajero tiene una actividad específica asignada
   */
  hasTravelerActivity(travelerId: number, activityId: number): boolean {
    // Verificar actividades individuales
    const hasIndividualActivity = this.travelerActivities[travelerId]?.some(
      activity => activity.activityId === activityId
    );

    // Verificar paquetes de actividades
    const hasPackActivity = this.travelerActivityPacks[travelerId]?.some(
      pack => pack.activityPackId === activityId
    );

    const result = hasIndividualActivity || hasPackActivity || false;
    

    return result;
  }

  /**
   * Verifica si algún viajero tiene una actividad específica asignada
   */
  hasAnyTravelerWithActivity(activityId: number): boolean {
    return this.travelers.some(traveler => 
      this.hasTravelerActivity(traveler.id, activityId)
    );
  }

  getActivityName(activityId: number): string {
    const activity = this.availableActivities.find((a) => a.id === activityId);
    return activity?.name || 'Actividad desconocida';
  }

  /**
   * Verifica si una actividad está agregada (al menos un viajero la tiene)
   */
  isActivityAdded(activity: ActivityWithPrice): boolean {
    return this.hasAnyTravelerWithActivity(activity.id);
  }

  /**
   * Verifica si TODOS los viajeros tienen la actividad
   */
  isAllTravelersHaveActivity(activity: ActivityWithPrice): boolean {
    return this.travelers.length > 0 && 
           this.travelers.every(traveler => 
             this.hasTravelerActivity(traveler.id, activity.id)
           );
  }

  /**
   * Maneja el toggle de agregar/eliminar actividad para TODOS los viajeros
   */
  toggleActivityForAllTravelers(activity: ActivityWithPrice): void {
    
    if (this.isAllTravelersHaveActivity(activity)) {
      // Si todos la tienen, eliminar de todos los viajeros
      this.removeActivityFromAllTravelers(activity);
    } else {
      // Si no todos la tienen, agregar a todos los viajeros
      this.addActivityToAllTravelers(activity);
    }
  }

  onActivityToggleChange(travelerId: number, activityId: number, isSelected: any): void {
    const isSelectedBoolean = Boolean(isSelected);
    
    if (isSelectedBoolean) {
      this.addActivityToTraveler(travelerId, activityId);
    } else {
      this.removeActivityFromTraveler(travelerId, activityId);
    }
  }

  /**
   * Agrega una actividad a un viajero
   */
  private addActivityToTraveler(travelerId: number, activityId: number): void {
    const activity = this.availableActivities.find(a => a.id === activityId);
    if (!activity) return;

    if (activity.type === 'act') {
      // Agregar actividad individual
      const createData = {
        id: 0,
        reservationTravelerId: travelerId,
        activityId: activityId
      };
      
      
      this.reservationTravelerActivityService.create(createData).subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Actividad agregada',
            detail: `La actividad "${activity.name}" ha sido agregada correctamente`,
            life: 3000,
          });
          this.emitDataUpdated();
          this.reloadParentComponent();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
            detail: 'No se pudo agregar la actividad',
          life: 3000,
        });
        }
      });
    } else if (activity.type === 'pack') {
      // Agregar paquete de actividades
      const createData = {
        id: 0,
        reservationTravelerId: travelerId,
        activityPackId: activityId
      };
      
      
      this.reservationTravelerActivityPackService.create(createData).subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Paquete agregado',
            detail: `El paquete "${activity.name}" ha sido agregado correctamente`,
            life: 3000,
          });
          this.emitDataUpdated();
          this.reloadParentComponent();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo agregar el paquete',
            life: 3000,
          });
        }
      });
    }
  }

  /**
   * Remueve una actividad de un viajero
   */
  private removeActivityFromTraveler(travelerId: number, activityId: number): void {
    const activity = this.availableActivities.find(a => a.id === activityId);
    if (!activity) return;

    if (activity.type === 'act') {
      // Buscar la actividad individual asignada
      const travelerActivity = this.travelerActivities[travelerId]?.find(
        ta => ta.activityId === activityId
      );
      
      if (travelerActivity) {
        this.reservationTravelerActivityService.delete(travelerActivity.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Actividad removida',
              detail: `La actividad "${activity.name}" ha sido removida correctamente`,
              life: 3000,
            });
            this.emitDataUpdated();
            this.reloadParentComponent();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo remover la actividad',
              life: 3000,
            });
          }
        });
      }
    } else if (activity.type === 'pack') {
      // Buscar el paquete de actividades asignado
      const travelerActivityPack = this.travelerActivityPacks[travelerId]?.find(
        tap => tap.activityPackId === activityId
      );
      
      if (travelerActivityPack) {
        this.reservationTravelerActivityPackService.delete(travelerActivityPack.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Paquete removido',
              detail: `El paquete "${activity.name}" ha sido removido correctamente`,
              life: 3000,
            });
            this.emitDataUpdated();
            this.reloadParentComponent();
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo remover el paquete',
              life: 3000,
            });
          }
        });
      }
    }
  }

  /**
   * Agrega una actividad a todos los viajeros
   */
  private addActivityToAllTravelers(activity: ActivityWithPrice): void {
    
    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          
          if (travelers.length === 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'No hay viajeros en la reserva',
              life: 3000,
            });
            return;
          }

          const savePromises = travelers.map((traveler) => {
            if (activity.type === 'act') {
              const createData = {
                id: 0,
                reservationTravelerId: traveler.id,
                activityId: activity.id,
              };
              return firstValueFrom(
                this.reservationTravelerActivityService.create(createData)
              );
            } else if (activity.type === 'pack') {
              const createData = {
                id: 0,
                reservationTravelerId: traveler.id,
                activityPackId: activity.id,
              };
              return firstValueFrom(
                this.reservationTravelerActivityPackService.create(createData)
              );
            }
            return Promise.resolve(null);
          });

          Promise.all(savePromises)
            .then(() => {
              this.messageService.add({
                severity: 'success',
                summary: 'Actividad agregada',
                detail: `La actividad "${activity.name}" ha sido agregada correctamente`,
                life: 3000,
              });
              this.emitDataUpdated();
              this.reloadParentComponent();
            })
            .catch((error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo agregar la actividad',
                life: 3000,
              });
            });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al obtener información de viajeros',
            life: 3000,
          });
        },
      });
  }

  /**
   * Remueve una actividad de todos los viajeros
   */
  private removeActivityFromAllTravelers(activity: ActivityWithPrice): void {
    
    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          
          if (travelers.length === 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Advertencia',
              detail: 'No hay viajeros en la reserva',
              life: 3000,
            });
            return;
          }

          const getAssignmentsPromises = travelers.map((traveler) => {
            if (activity.type === 'act') {
              return firstValueFrom(
                this.reservationTravelerActivityService.getByReservationTraveler(
                  traveler.id
                )
              ).then((activities) =>
                (activities || []).filter((a) => a.activityId === activity.id)
              );
            } else if (activity.type === 'pack') {
              return firstValueFrom(
                this.reservationTravelerActivityPackService.getByReservationTraveler(
                  traveler.id
                )
              ).then((packs) =>
                (packs || []).filter((p) => p.activityPackId === activity.id)
              );
            }
            return Promise.resolve([]);
          });

          Promise.all(getAssignmentsPromises)
            .then((assignmentsArrays) => {
              const allAssignments = assignmentsArrays.flat();

              if (allAssignments.length === 0) {
                this.messageService.add({
                  severity: 'info',
                  summary: 'Información',
                  detail: 'La actividad no estaba asignada',
                  life: 3000,
                });
                return;
              }

              const deletePromises = allAssignments.map((assignment) => {
                if (activity.type === 'act') {
                  return firstValueFrom(
                    this.reservationTravelerActivityService.delete(assignment.id)
                  );
                } else if (activity.type === 'pack') {
                  return firstValueFrom(
                    this.reservationTravelerActivityPackService.delete(assignment.id)
                  );
                }
                return Promise.resolve(null);
              });

              return Promise.all(deletePromises);
            })
            .then(() => {
              this.messageService.add({
                severity: 'success',
                summary: 'Actividad removida',
                detail: `La actividad "${activity.name}" ha sido removida correctamente`,
                life: 3000,
              });
              this.emitDataUpdated();
              this.reloadParentComponent();
            })
            .catch((error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo remover la actividad',
                life: 3000,
              });
            });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al obtener información de viajeros',
            life: 3000,
          });
        },
      });
  }

  /**
   * Emite evento al componente padre indicando que los datos han sido actualizados
   */
  private emitDataUpdated(): void {
    this.dataUpdated.emit();
  }

  /**
   * Recarga la página completa
   */
  private reloadParentComponent(): void {
    
    // Recargar la página completa para asegurar que todos los datos estén actualizados
    window.location.reload();
  }

  /**
   * Determina si se debe mostrar el precio de la actividad
   * Mostrar cuando hay al menos un precio mayor a 0
   */
  shouldShowPrice(activity: ActivityWithPrice): boolean {
    if (!activity.priceData || activity.priceData.length === 0) {
      return false;
    }

    // Obtener el precio mayor
    const maxPrice = Math.max(...activity.priceData.map(p => p.value));
    
    // Si el precio mayor es 0, no mostrar
    if (maxPrice === 0) {
    return false;
    }

    return true;
  }

  /**
   * Obtiene el precio de la actividad para mostrar
   */
  getActivityPrice(activity: ActivityWithPrice): number {
    if (!activity.priceData || activity.priceData.length === 0) {
      return 0;
    }

    // Obtener el precio mayor
    return Math.max(...activity.priceData.map(p => p.value));
  }

  /**
   * Obtiene la imagen de la actividad
   */
  getActivityImage(activity: ActivityWithPrice): string {
    if (activity.imageUrl) {
      return activity.imageUrl;
    }
    
    // Si no hay imagen, mostrar el alt o el nombre de la actividad
    const altText = activity.imageAlt || activity.name || 'Actividad sin imagen';
    return `https://via.placeholder.com/400x200/cccccc/666666?text=${encodeURIComponent(altText)}`;
  }

  // Método para sanitizar y limpiar la descripción si contiene etiquetas HTML
  getSafeDescription(description: string | null): SafeHtml {
    if (!description) return '';

    // Si hay etiquetas HTML visibles como texto, reemplazarlas
    if (description.includes('<p') || description.includes('&lt;p')) {
      // Remover etiquetas visibles como texto
      const cleaned = description
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<\/?[^>]+(>|$)/g, ' ')
        .trim();

      return this.sanitizer.bypassSecurityTrustHtml(cleaned);
    }

    // Si no hay etiquetas HTML, devolver el texto tal como está
    return this.sanitizer.bypassSecurityTrustHtml(description);
  }
}