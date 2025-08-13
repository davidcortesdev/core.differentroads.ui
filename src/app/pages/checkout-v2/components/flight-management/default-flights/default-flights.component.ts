import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  FlightsNetService,
  IFlightDetailDTO,
  IFlightPackDTO,
} from '../../../services/flightsNet.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerActivityPackService,
  IReservationTravelerActivityPackResponse,
} from '../../../../../core/services/reservation/reservation-traveler-activity-pack.service';

@Component({
  selector: 'app-default-flights',
  standalone: false,
  templateUrl: './default-flights.component.html',
  styleUrl: './default-flights.component.scss',
})
export class DefaultFlightsComponent implements OnInit, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() selectedFlightFromParent: IFlightPackDTO | null = null; // Nuevo input
  @Output() flightSelectionChange = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }>();

  // Contador estático para rastrear llamadas a saveFlightAssignments
  private static saveFlightAssignmentsCallCount = 0;

  // Bandera para evitar llamadas duplicadas a saveFlightAssignments
  private isInternalSelection: boolean = false;

  selectedFlight: IFlightPackDTO | null = null;
  flightPacks: IFlightPackDTO[] = [];
  loginDialogVisible: boolean = false;
  flightDetails: Map<number, IFlightDetailDTO> = new Map();
  travelers: IReservationTravelerResponse[] = [];

  constructor(
    private router: Router,
    private flightsNetService: FlightsNetService,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService
  ) {}

  ngOnInit(): void {
    this.getFlights();
    this.getTravelers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 ngOnChanges ejecutado');
    console.log('📊 Cambios detectados:', Object.keys(changes));
    console.log('🕐 Timestamp:', new Date().toISOString());

    if (
      changes['departureId'] &&
      changes['departureId'].currentValue &&
      changes['departureId'].currentValue !==
        changes['departureId'].previousValue
    ) {
      console.log(
        '🔄 departureId cambió:',
        changes['departureId'].currentValue
      );
      this.getFlights();
    }

    if (
      changes['reservationId'] &&
      changes['reservationId'].currentValue &&
      changes['reservationId'].currentValue !==
        changes['reservationId'].previousValue
    ) {
      console.log(
        '🔄 reservationId cambió:',
        changes['reservationId'].currentValue
      );
      this.getTravelers();
    }

    // Nuevo: Actualizar selectedFlight cuando cambie desde el padre
    if (
      changes['selectedFlightFromParent'] &&
      changes['selectedFlightFromParent'].currentValue !==
        changes['selectedFlightFromParent'].previousValue
    ) {
      console.log('🔄 selectedFlightFromParent cambió');
      console.log(
        '📊 Valor anterior:',
        changes['selectedFlightFromParent'].previousValue
      );
      console.log(
        '📊 Valor actual:',
        changes['selectedFlightFromParent'].currentValue
      );
      console.log('🔄 Actualizando selectedFlight interno...');

      this.selectedFlight = changes['selectedFlightFromParent'].currentValue;

      // Solo guardar asignaciones si NO es una selección interna
      if (
        !this.isInternalSelection &&
        this.selectedFlight &&
        this.reservationId
      ) {
        console.log(
          '💾 Guardando asignaciones para vuelo seleccionado desde padre...'
        );
        console.log('🎯 Vuelo seleccionado:', this.selectedFlight);
        console.log('🆔 reservationId:', this.reservationId);

        this.saveFlightAssignments()
          .then((success) => {
            if (success) {
              console.log('✅ Asignaciones guardadas exitosamente desde padre');
            } else {
              console.error('❌ Error al guardar asignaciones desde padre');
            }
          })
          .catch((error) => {
            console.error(
              '💥 Error al guardar asignaciones desde padre:',
              error
            );
          });
      } else {
        if (this.isInternalSelection) {
          console.log(
            '⚠️ No se guardan asignaciones - es una selección interna'
          );
        } else {
          console.log(
            '⚠️ No se puede guardar - selectedFlight o reservationId faltan'
          );
          console.log('📊 selectedFlight:', this.selectedFlight);
          console.log('🆔 reservationId:', this.reservationId);
        }
      }

      // Resetear la bandera después de procesar el cambio
      this.isInternalSelection = false;
    }
  }

  getFlights(): void {
    if (!this.departureId) {
      return;
    }
    this.flightsNetService.getFlights(this.departureId).subscribe((flights) => {
      this.flightPacks = flights;
      this.flightPacks.forEach((pack) => {
        pack.flights.forEach((flight) => {
          this.getFlightDetail(flight.id);
        });
      });
    });
  }

  getTravelers(): void {
    if (!this.reservationId) {
      return;
    }

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          this.travelers = travelers;
          this.recalculateFlightPrice();
        },
        error: (error) => {
          // Handle error silently or add proper error handling
        },
      });
  }

  private recalculateFlightPrice(): void {
    if (this.selectedFlight) {
      const basePrice =
        this.selectedFlight.ageGroupPrices.find(
          (price) => price.ageGroupId === this.travelers[0].ageGroupId
        )?.price || 0; //TODO: Añadir al summary los precios segun el ageGroup de los diferentes viajeros , no solo el del leadTraveler
      const totalTravelers = this.travelers.length;
      const totalPrice = totalTravelers > 0 ? basePrice * totalTravelers : 0;

      this.flightSelectionChange.emit({
        selectedFlight: this.selectedFlight,
        totalPrice: basePrice,
      });
    }
  }

  getTravelerInfo(): void {
    if (!this.reservationId) return;

    this.reservationTravelerService
      .getTravelerCount(this.reservationId)
      .subscribe((count) => {
        // Handle count if needed
      });

    this.reservationTravelerService
      .hasLeadTraveler(this.reservationId)
      .subscribe((hasLead) => {
        // Handle hasLead if needed
      });

    this.reservationTravelerService
      .getLeadTraveler(this.reservationId)
      .subscribe((leadTraveler) => {
        if (leadTraveler) {
          // Handle leadTraveler if needed
        }
      });
  }

  selectFlight(flightPack: IFlightPackDTO): void {
    console.log('🎯 selectFlight llamado');
    console.log('📦 flightPack:', flightPack);
    console.log('🔄 selectedFlight actual:', this.selectedFlight);
    console.log('🕐 Timestamp:', new Date().toISOString());

    if (this.selectedFlight === flightPack) {
      console.log('🔄 Deseleccionando vuelo actual');
      this.selectedFlight = null;
      this.flightSelectionChange.emit({ selectedFlight: null, totalPrice: 0 });
    } else {
      console.log('✅ Seleccionando nuevo vuelo');
      this.selectedFlight = flightPack;
      const basePrice =
        flightPack.ageGroupPrices.find(
          (price) => price.ageGroupId === this.travelers[0].ageGroupId
        )?.price || 0; //TODO: Añadir al summary los precios segun el ageGroup de los diferentes viajeros , no solo el del leadTraveler
      const totalTravelers = this.travelers.length;
      const totalPrice = totalTravelers > 0 ? basePrice * totalTravelers : 0;

      console.log('💰 Precio base:', basePrice);
      console.log('👥 Total de viajeros:', totalTravelers);
      console.log('💰 Precio total:', totalPrice);

      // Marcar como selección interna antes de emitir el cambio
      this.isInternalSelection = true;

      this.flightSelectionChange.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
      });

      console.log('💾 Guardando asignaciones de vuelo...');
      this.saveFlightAssignments()
        .then((success) => {
          if (success) {
            console.log(
              '✅ Asignaciones guardadas exitosamente desde selectFlight'
            );
          } else {
            console.error(
              '❌ Error al guardar asignaciones desde selectFlight'
            );
          }
        })
        .catch((error) => {
          console.error(
            '💥 Error al guardar asignaciones desde selectFlight:',
            error
          );
        });
    }
  }

  getFlightDetail(flightId: number): void {
    this.flightsNetService.getFlightDetail(flightId).subscribe((detail) => {
      this.flightDetails.set(flightId, detail);
    });
  }

  refreshData(): void {
    this.getFlights();
    this.getTravelers();
  }

  logTravelerIds(): void {
    const ids = this.travelers.map((t) => t.id);
    // Handle ids if needed
  }

  logLeadTravelerId(): void {
    const leadTraveler = this.travelers.find((t) => t.isLeadTraveler);
    if (leadTraveler) {
      // Handle leadTraveler.id if needed
    }
  }

  closeLoginModal(): void {
    this.loginDialogVisible = false;
  }

  async saveFlightAssignments(): Promise<boolean> {
    // Incrementar contador estático
    DefaultFlightsComponent.saveFlightAssignmentsCallCount++;

    console.log('🔍 saveFlightAssignments llamado');
    console.log(
      '🔢 Número de llamada:',
      DefaultFlightsComponent.saveFlightAssignmentsCallCount
    );
    console.log('📊 selectedFlight:', this.selectedFlight);
    console.log('🆔 reservationId:', this.reservationId);
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('📍 Stack trace:', new Error().stack);

    if (!this.selectedFlight || !this.reservationId) {
      console.log(
        '❌ No se puede guardar - selectedFlight o reservationId faltan'
      );
      return true;
    }

    try {
      console.log('👥 Obteniendo viajeros...');
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => {
                console.log('✅ Viajeros obtenidos:', travelers);
                console.log('👥 Cantidad de viajeros:', travelers.length);
                resolve(travelers);
              },
              error: (error) => {
                console.error('❌ Error al obtener viajeros:', error);
                reject(error);
              },
            });
        }
      );

      if (travelers.length === 0) {
        console.log('⚠️ No hay viajeros para asignar');
        return true;
      }

      // Si no hay vuelo seleccionado, actualizar las asignaciones existentes con activityPackId = 0
      if (!this.selectedFlight) {
        console.log(
          '🔄 No hay vuelo seleccionado, actualizando asignaciones existentes con activityPackId = 0...'
        );

        const updatePromises = travelers.map((traveler) => {
          return new Promise<boolean>((resolve, reject) => {
            this.reservationTravelerActivityPackService
              .getByReservationTraveler(traveler.id)
              .subscribe({
                next: (assignments) => {
                  // Buscar todas las asignaciones de vuelos (activityPackId > 0)
                  const flightAssignments = assignments.filter(
                    (a) => a.activityPackId > 0
                  );

                  if (flightAssignments.length === 0) {
                    console.log(
                      `ℹ️ Viajero ${traveler.id} no tiene asignaciones de vuelos para actualizar`
                    );
                    resolve(true);
                    return;
                  }

                  // Ordenar por ID descendente para obtener el más reciente
                  const sortedAssignments = flightAssignments.sort(
                    (a, b) => b.id - a.id
                  );
                  const mostRecentAssignment = sortedAssignments[0];

                  console.log(
                    `🔄 Actualizando asignación más reciente ${mostRecentAssignment.id} para viajero ${traveler.id}`
                  );
                  console.log(
                    `🔄 Cambio: vuelo ${mostRecentAssignment.activityPackId} -> sin vuelo (0)`
                  );

                  const updateData = {
                    id: mostRecentAssignment.id,
                    reservationTravelerId: traveler.id,
                    activityPackId: 0, // 0 significa sin vuelo
                    updatedAt: new Date().toISOString(),
                  };

                  this.reservationTravelerActivityPackService
                    .update(mostRecentAssignment.id, updateData)
                    .subscribe({
                      next: (updated: boolean) => {
                        if (updated) {
                          console.log(
                            `✅ Asignación ${mostRecentAssignment.id} actualizada para viajero ${traveler.id} (sin vuelo)`
                          );
                        } else {
                          console.error(
                            `❌ Error al actualizar asignación ${mostRecentAssignment.id} para viajero ${traveler.id}`
                          );
                        }
                        resolve(updated);
                      },
                      error: (error: any) => {
                        console.error(
                          `❌ Error al actualizar asignación para viajero ${traveler.id}:`,
                          error
                        );
                        reject(error);
                      },
                    });
                },
                error: (error: any) => {
                  console.error(
                    `❌ Error al obtener asignaciones para viajero ${traveler.id}:`,
                    error
                  );
                  reject(error);
                },
              });
          });
        });

        await Promise.all(updatePromises);
        console.log(
          '✅ Todas las asignaciones actualizadas exitosamente (sin vuelo)'
        );
        return true;
      }

      const activityPackId = this.selectedFlight.id;
      console.log('🎯 ID del paquete de actividad a asignar:', activityPackId);

      console.log(
        '📝 Procesando asignaciones para',
        travelers.length,
        'viajeros...'
      );

      // Primero verificar si ya existen asignaciones para este vuelo
      console.log('🔍 Verificando asignaciones existentes para este vuelo...');
      const existingAssignmentsPromises = travelers.map((traveler) => {
        return new Promise<{
          traveler: IReservationTravelerResponse;
          existingAssignments: IReservationTravelerActivityPackResponse[];
        }>((resolve, reject) => {
          this.reservationTravelerActivityPackService
            .getByReservationTraveler(traveler.id)
            .subscribe({
              next: (assignments) => {
                // Buscar TODAS las asignaciones de vuelos (activityPackId > 0), no solo del vuelo actual
                const allFlightAssignments = assignments.filter(
                  (a) => a.activityPackId > 0
                );

                // Ordenar por ID descendente para obtener el más reciente
                const sortedAssignments = allFlightAssignments.sort(
                  (a, b) => b.id - a.id
                );

                console.log(
                  `🔍 Viajero ${traveler.id}: ${allFlightAssignments.length} asignaciones de vuelos encontradas`
                );
                console.log(
                  `🔍 IDs de asignaciones: ${allFlightAssignments
                    .map((a) => a.id)
                    .join(', ')}`
                );

                resolve({
                  traveler,
                  existingAssignments: sortedAssignments,
                });
              },
              error: (error) => {
                console.error(
                  `❌ Error al obtener asignaciones para viajero ${traveler.id}:`,
                  error
                );
                reject(error);
              },
            });
        });
      });

      const existingAssignmentsResults = await Promise.all(
        existingAssignmentsPromises
      );

      // Determinar si debemos crear nuevos registros o actualizar existentes
      const hasExistingAssignments = existingAssignmentsResults.some(
        (result) => result.existingAssignments.length > 0
      );

      if (hasExistingAssignments) {
        console.log(
          '🔄 Se encontraron asignaciones existentes de vuelos, actualizando el más reciente...'
        );

        const updatePromises = existingAssignmentsResults.map((result) => {
          return new Promise<boolean>((resolve, reject) => {
            const { traveler, existingAssignments } = result;

            if (existingAssignments.length > 0) {
              // Siempre usar la primera asignación (la más reciente por ID)
              const mostRecentAssignment = existingAssignments[0];
              console.log(
                `🔄 Actualizando asignación más reciente ${mostRecentAssignment.id} para viajero ${traveler.id}`
              );
              console.log(
                `🔄 ID anterior: ${mostRecentAssignment.activityPackId} -> Nuevo ID: ${activityPackId}`
              );

              const updateData = {
                id: mostRecentAssignment.id,
                reservationTravelerId: traveler.id,
                activityPackId: activityPackId,
                updatedAt: new Date().toISOString(),
              };

              this.reservationTravelerActivityPackService
                .update(mostRecentAssignment.id, updateData)
                .subscribe({
                  next: (updated: boolean) => {
                    if (updated) {
                      console.log(
                        `✅ Asignación ${mostRecentAssignment.id} actualizada para viajero ${traveler.id}`
                      );
                      console.log(
                        `✅ Cambio: vuelo ${mostRecentAssignment.activityPackId} -> vuelo ${activityPackId}`
                      );
                    } else {
                      console.error(
                        `❌ Error al actualizar asignación ${mostRecentAssignment.id} para viajero ${traveler.id}`
                      );
                    }
                    resolve(updated);
                  },
                  error: (error: any) => {
                    console.error(
                      `❌ Error al actualizar asignación para viajero ${traveler.id}:`,
                      error
                    );
                    reject(error);
                  },
                });
            } else {
              // Solo crear nueva asignación si no hay ninguna asignación de vuelos
              console.log(
                `➕ No hay asignaciones de vuelos para viajero ${traveler.id}, creando nueva...`
              );

              const assignmentData = {
                id: 0,
                reservationTravelerId: traveler.id,
                activityPackId: activityPackId,
                createdAt: new Date().toISOString(),
              };

              this.reservationTravelerActivityPackService
                .create(assignmentData)
                .subscribe({
                  next: (
                    createdAssignment: IReservationTravelerActivityPackResponse
                  ) => {
                    console.log(
                      `✅ Nueva asignación creada para viajero ${traveler.id}:`,
                      createdAssignment.id
                    );
                    resolve(true);
                  },
                  error: (error: any) => {
                    console.error(
                      `❌ Error al crear asignación para viajero ${traveler.id}:`,
                      error
                    );
                    reject(error);
                  },
                });
            }
          });
        });

        await Promise.all(updatePromises);
        console.log('✅ Todas las asignaciones actualizadas exitosamente');
      } else {
        console.log(
          '➕ No se encontraron asignaciones de vuelos existentes, creando nuevas...'
        );

        const assignmentPromises = travelers.map((traveler) => {
          return new Promise<boolean>((resolve, reject) => {
            console.log(
              `➕ Creando nueva asignación para viajero ${traveler.id}`
            );

            const assignmentData = {
              id: 0,
              reservationTravelerId: traveler.id,
              activityPackId: activityPackId,
              createdAt: new Date().toISOString(),
            };
            console.log(`➕ Datos para nueva asignación:`, assignmentData);

            this.reservationTravelerActivityPackService
              .create(assignmentData)
              .subscribe({
                next: (
                  createdAssignment: IReservationTravelerActivityPackResponse
                ) => {
                  console.log(
                    `✅ Nueva asignación creada para viajero ${traveler.id}:`,
                    createdAssignment
                  );
                  console.log(
                    `✅ ID de nueva asignación:`,
                    createdAssignment.id
                  );

                  resolve(true);
                },
                error: (error: any) => {
                  console.error(
                    `❌ Error al crear asignación para viajero ${traveler.id}:`,
                    error
                  );
                  reject(error);
                },
              });
          });
        });

        console.log('⏳ Esperando que se completen todas las asignaciones...');
        await Promise.all(assignmentPromises);
        console.log('✅ Todas las asignaciones creadas exitosamente');
      }

      // Verificar el estado final después de guardar
      console.log('🔍 Verificando estado final de asignaciones...');
      for (const traveler of travelers) {
        this.reservationTravelerActivityPackService
          .getByReservationTraveler(traveler.id)
          .subscribe({
            next: (finalAssignments) => {
              console.log(
                `🔍 Estado final para viajero ${traveler.id}:`,
                finalAssignments
              );
              console.log(
                `🔍 Cantidad final de asignaciones:`,
                finalAssignments.length
              );

              // Verificar si hay duplicados en el estado final
              const currentFlightAssignments = finalAssignments.filter(
                (a) => a.activityPackId === this.selectedFlight!.id
              );

              if (currentFlightAssignments.length > 1) {
                console.log(
                  `✅ Estado final correcto para viajero ${traveler.id}: ${
                    currentFlightAssignments.length
                  } asignaciones para vuelo ${
                    this.selectedFlight!.id
                  } (comportamiento esperado al crear nuevos registros)`
                );
                console.log(
                  `✅ Asignaciones existentes:`,
                  currentFlightAssignments
                );
              } else if (currentFlightAssignments.length === 1) {
                console.log(
                  `✅ Estado final correcto para viajero ${
                    traveler.id
                  }: 1 asignación para vuelo ${this.selectedFlight!.id}`
                );
              } else {
                console.warn(
                  `⚠️ Estado final inesperado para viajero ${
                    traveler.id
                  }: 0 asignaciones para vuelo ${this.selectedFlight!.id}`
                );
              }
            },
            error: (error) => {
              console.error(
                `❌ Error al verificar estado final para viajero ${traveler.id}:`,
                error
              );
            },
          });
      }

      return true;
    } catch (error) {
      console.error('💥 Error en saveFlightAssignments:', error);
      return false;
    }
  }

  private async clearExistingFlightAssignments(
    travelers: IReservationTravelerResponse[]
  ): Promise<void> {
    console.log('🧹 clearExistingFlightAssignments iniciado');
    console.log('🎯 ID del vuelo seleccionado:', this.selectedFlight?.id);
    console.log('👥 Cantidad de viajeros a procesar:', travelers.length);

    const clearPromises = travelers.map((traveler) => {
      return new Promise<void>((resolve, reject) => {
        console.log(
          `🧹 Procesando limpieza para viajero ${traveler.id} (Viajero #${traveler.travelerNumber})`
        );

        this.reservationTravelerActivityPackService
          .getByReservationTraveler(traveler.id)
          .subscribe({
            next: (
              existingAssignments: IReservationTravelerActivityPackResponse[]
            ) => {
              console.log(
                `🧹 Asignaciones existentes para viajero ${traveler.id}:`,
                existingAssignments
              );
              console.log(
                `🧹 Cantidad de asignaciones existentes:`,
                existingAssignments.length
              );

              // Filtrar asignaciones que NO son del vuelo actual
              const otherFlightAssignments = existingAssignments.filter(
                (assignment) => {
                  const isCurrentFlight =
                    assignment.activityPackId === this.selectedFlight!.id;
                  console.log(
                    `🧹 Evaluando asignación ${assignment.id}: activityPackId=${
                      assignment.activityPackId
                    }, vuelo actual=${
                      this.selectedFlight!.id
                    }, es del vuelo actual=${isCurrentFlight}`
                  );
                  // No eliminar asignaciones del vuelo actual, solo las de otros vuelos
                  return !isCurrentFlight;
                }
              );

              console.log(
                `🧹 Asignaciones existentes totales:`,
                existingAssignments
              );
              console.log(`🧹 ID del vuelo actual:`, this.selectedFlight!.id);
              console.log(
                `🧹 Asignaciones a eliminar (diferentes del vuelo actual):`,
                otherFlightAssignments
              );
              console.log(
                `🧹 Cantidad de asignaciones a eliminar:`,
                otherFlightAssignments.length
              );

              // Verificar si hay asignaciones para el vuelo actual
              const currentFlightAssignments = existingAssignments.filter(
                (assignment) =>
                  assignment.activityPackId === this.selectedFlight!.id
              );
              if (currentFlightAssignments.length > 0) {
                console.log(
                  `ℹ️ Viajero ${traveler.id} tiene ${
                    currentFlightAssignments.length
                  } asignaciones para el vuelo actual ${
                    this.selectedFlight!.id
                  } (se mantendrán)`
                );
                console.log(
                  `ℹ️ Asignaciones del vuelo actual:`,
                  currentFlightAssignments
                );
              }

              if (otherFlightAssignments.length === 0) {
                console.log(
                  `🧹 No hay asignaciones a eliminar para viajero ${traveler.id}`
                );
                resolve();
                return;
              }

              const deletePromises = otherFlightAssignments.map(
                (assignment: IReservationTravelerActivityPackResponse) => {
                  return new Promise<void>((resolveDelete, rejectDelete) => {
                    console.log(
                      `🗑️ Eliminando asignación ${assignment.id} para viajero ${traveler.id}`
                    );

                    this.reservationTravelerActivityPackService
                      .delete(assignment.id)
                      .subscribe({
                        next: (deleted: boolean) => {
                          if (deleted) {
                            console.log(
                              `✅ Asignación ${assignment.id} eliminada exitosamente para viajero ${traveler.id}`
                            );

                            // Verificar inmediatamente si se eliminó correctamente
                            this.reservationTravelerActivityPackService
                              .getByReservationTraveler(traveler.id)
                              .subscribe({
                                next: (verificationAssignments) => {
                                  const remainingAssignments =
                                    verificationAssignments.filter(
                                      (a) => a.id !== assignment.id
                                    );
                                  console.log(
                                    `🔍 Verificación después de eliminación para viajero ${traveler.id}:`,
                                    remainingAssignments
                                  );
                                  console.log(
                                    `🔍 Cantidad de asignaciones restantes:`,
                                    remainingAssignments.length
                                  );
                                },
                                error: (error) => {
                                  console.error(
                                    `❌ Error en verificación después de eliminación para viajero ${traveler.id}:`,
                                    error
                                  );
                                },
                              });
                          } else {
                            console.log(
                              `⚠️ Asignación ${assignment.id} no se pudo eliminar para viajero ${traveler.id}`
                            );
                          }
                          resolveDelete();
                        },
                        error: (error: any) => {
                          console.error(
                            `❌ Error al eliminar asignación ${assignment.id} para viajero ${traveler.id}:`,
                            error
                          );
                          resolveDelete();
                        },
                      });
                  });
                }
              );

              Promise.all(deletePromises)
                .then(() => {
                  console.log(
                    `✅ Limpieza completada para viajero ${traveler.id}`
                  );
                  resolve();
                })
                .catch((error) => {
                  console.error(
                    `❌ Error en limpieza para viajero ${traveler.id}:`,
                    error
                  );
                  resolve();
                });
            },
            error: (error: any) => {
              console.error(
                `❌ Error al obtener asignaciones para limpieza del viajero ${traveler.id}:`,
                error
              );
              resolve();
            },
          });
      });
    });

    console.log('⏳ Esperando que se completen todas las limpiezas...');
    await Promise.all(clearPromises);
    console.log('✅ Todas las limpiezas completadas exitosamente');
  }

  navigateToLogin(): void {
    this.closeLoginModal();
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.closeLoginModal();
    this.router.navigate(['/sign-up']);
  }
}
