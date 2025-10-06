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
import { FlightSearchService } from '../../../../../core/services/flight-search.service';

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
  @Input() departureActivityPackId: number | null = null; // ✅ NUEVO: ID del paquete del departure
  @Output() flightSelectionChange = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }>();
  @Output() defaultFlightSelected = new EventEmitter<{
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
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private flightSearchService: FlightSearchService
  ) {}

  ngOnInit(): void {
    this.getFlights();
    this.getTravelers();

    // ✅ NUEVO: Cargar datos existentes del servicio para mostrar como seleccionado
    if (this.reservationId) {
      this.loadExistingFlightAssignments();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (
      changes['departureId'] &&
      changes['departureId'].currentValue &&
      changes['departureId'].currentValue !==
        changes['departureId'].previousValue
    ) {
      this.getFlights();
    }

    if (
      changes['reservationId'] &&
      changes['reservationId'].currentValue &&
      changes['reservationId'].currentValue !==
        changes['reservationId'].previousValue
    ) {
      this.getTravelers();

      // NUEVO: Cargar vuelo existente cuando cambie el reservationId
      if (this.flightPacks && this.flightPacks.length > 0) {
        this.loadAndSelectExistingFlight();
      }
    }

    // NUEVO: Manejar cambio en departureActivityPackId
    if (
      changes['departureActivityPackId'] &&
      changes['departureActivityPackId'].currentValue !==
        changes['departureActivityPackId'].previousValue
    ) {

      // NUEVO: Cargar asignaciones existentes cuando cambie el departure
      if (this.reservationId) {
        this.loadExistingFlightAssignments();
      }

      // Seleccionar automáticamente el vuelo del departure si existe
      this.selectFlightFromDeparture(
        changes['departureActivityPackId'].currentValue
      );
    }

    // Nuevo: Actualizar selectedFlight cuando cambie desde el padre
    if (
      changes['selectedFlightFromParent'] &&
      changes['selectedFlightFromParent'].currentValue !==
        changes['selectedFlightFromParent'].previousValue
    ) {
     

      this.selectedFlight = changes['selectedFlightFromParent'].currentValue;

      // Solo guardar asignaciones si NO es una selección interna
      if (
        !this.isInternalSelection &&
        this.selectedFlight &&
        this.reservationId
      ) {
      

        this.saveFlightAssignments()
          .then((success) => {
            if (success) {
            
            } else {
              console.error('Error al guardar asignaciones desde padre');
            }
          })
          .catch((error) => {
            console.error('Error al guardar asignaciones desde padre:', error);
          });
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

      // MODIFICADO: Ejecutar en orden correcto para asegurar actualización
      if (this.reservationId && this.departureActivityPackId) {
        // 1. Primero cargar asignaciones existentes
        this.loadExistingFlightAssignments().then(() => {
          // 2. Luego seleccionar vuelo del departure si existe
          if (
            this.departureActivityPackId &&
            this.departureActivityPackId > 0
          ) {
            this.selectFlightFromDeparture(this.departureActivityPackId);
          }

          // 3. Finalmente cargar vuelo existente de la BD
          this.loadAndSelectExistingFlight();
        });
      } else {
        // SELECCIONAR AUTOMÁTICAMENTE el vuelo del departure si existe
        if (this.departureActivityPackId && this.departureActivityPackId > 0) {
          this.selectFlightFromDeparture(this.departureActivityPackId);
        }

        // ✅ NUEVO: Cargar vuelo existente de la BD y mostrarlo como seleccionado
        if (this.reservationId) {
          this.loadAndSelectExistingFlight();
        }
      }
    });
  }

  // ✅ MÉTODO NUEVO: Cargar y mostrar como seleccionado el vuelo que ya existe en la BD
  private async loadAndSelectExistingFlight(): Promise<void> {

    if (
      !this.reservationId ||
      !this.flightPacks ||
      this.flightPacks.length === 0
    ) {
      return;
    }

    try {
      // Obtener viajeros
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => resolve(travelers),
              error: (error) => reject(error),
            });
        }
      );

      if (travelers.length === 0) {
        return;
      }

      // Verificar si algún viajero tiene asignaciones de vuelos
      const firstTraveler = travelers[0];
      const existingAssignments = await new Promise<
        IReservationTravelerActivityPackResponse[]
      >((resolve, reject) => {
        this.reservationTravelerActivityPackService
          .getByReservationTraveler(firstTraveler.id)
          .subscribe({
            next: (assignments) => resolve(assignments),
            error: (error) => reject(error),
          });
      });

      // Buscar asignaciones de vuelos (activityPackId > 0)
      const flightAssignments = existingAssignments.filter(
        (a) => a.activityPackId > 0
      );

      if (flightAssignments.length > 0) {
        // Ordenar por ID descendente para obtener el más reciente
        const mostRecentFlight = flightAssignments.sort(
          (a, b) => b.id - a.id
        )[0];
        const flightId = mostRecentFlight.activityPackId;


        // Buscar si este vuelo está disponible en la lista actual
        const matchingFlight = this.flightPacks.find((f) => f.id === flightId);

        if (matchingFlight) {

          // Seleccionar el vuelo existente
          this.isInternalSelection = true;
          this.selectedFlight = matchingFlight;

          // Calcular precio
          const basePrice =
            matchingFlight.ageGroupPrices.find(
              (price) => price.ageGroupId === travelers[0]?.ageGroupId
            )?.price || 0;

          this.flightSelectionChange.emit({
            selectedFlight: matchingFlight,
            totalPrice: basePrice,
          });

        } else {
        }
      } else {
      }
    } catch (error) {
      console.error('Error al cargar vuelo existente:', error);
    }
  }

  // ✅ MÉTODO NUEVO: Seleccionar vuelo basado en el departure
  private selectFlightFromDeparture(departureActivityPackId: number): void {

    if (!this.flightPacks || this.flightPacks.length === 0) {
      return;
    }

    // Buscar el vuelo que coincida con el ID del departure
    const matchingFlight = this.flightPacks.find(
      (flightPack) => flightPack.id === departureActivityPackId
    );

    if (matchingFlight) {

      // Seleccionar el vuelo sin emitir cambios (es interno)
      this.isInternalSelection = true;
      this.selectedFlight = matchingFlight;

      // Calcular precio
      const basePrice =
        matchingFlight.ageGroupPrices.find(
          (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
        )?.price || 0;

      this.flightSelectionChange.emit({
        selectedFlight: matchingFlight,
        totalPrice: basePrice,
      });

    }
  }

  // ✅ MÉTODO NUEVO: Verificar si el vuelo seleccionado es el del departure
  private isSelectedFlightFromDeparture(): boolean {
    if (!this.selectedFlight || !this.departureActivityPackId) {
      return false;
    }
    return this.selectedFlight.id === this.departureActivityPackId;
  }

  // ✅ MÉTODO NUEVO: Obtener información del departure
  getDepartureInfo(): { isFromDeparture: boolean; departureId: number | null } {
    return {
      isFromDeparture: this.isSelectedFlightFromDeparture(),
      departureId: this.departureActivityPackId,
    };
  }

  // ✅ MÉTODO NUEVO: Verificar si hay vuelos existentes en la BD
  async checkExistingFlights(): Promise<{
    hasExistingFlights: boolean;
    flightIds: number[];
    message: string;
  }> {
    if (!this.reservationId) {
      return {
        hasExistingFlights: false,
        flightIds: [],
        message: 'No hay reservationId disponible',
      };
    }

    try {
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => resolve(travelers),
              error: (error) => reject(error),
            });
        }
      );

      if (travelers.length === 0) {
        return {
          hasExistingFlights: false,
          flightIds: [],
          message: 'No hay viajeros para verificar',
        };
      }

      const firstTraveler = travelers[0];
      const existingAssignments = await new Promise<
        IReservationTravelerActivityPackResponse[]
      >((resolve, reject) => {
        this.reservationTravelerActivityPackService
          .getByReservationTraveler(firstTraveler.id)
          .subscribe({
            next: (assignments) => resolve(assignments),
            error: (error) => reject(error),
          });
      });

      const flightAssignments = existingAssignments.filter(
        (a) => a.activityPackId > 0
      );
      const flightIds = flightAssignments.map((a) => a.activityPackId);

      return {
        hasExistingFlights: flightIds.length > 0,
        flightIds: flightIds,
        message:
          flightIds.length > 0
            ? `Se encontraron ${
                flightIds.length
              } vuelo(s) existente(s): ${flightIds.join(', ')}`
            : 'No se encontraron vuelos existentes',
      };
    } catch (error) {
      console.error('💥 Error al verificar vuelos existentes:', error);
      return {
        hasExistingFlights: false,
        flightIds: [],
        message: `Error al verificar: ${error}`,
      };
    }
  }

  // ✅ MÉTODO NUEVO: Forzar actualización de datos del departure
  async forceUpdateDepartureData(): Promise<void> {

    if (!this.departureActivityPackId || !this.reservationId) {
      return;
    }

    try {
      // 1. Cargar asignaciones existentes
      await this.loadExistingFlightAssignments();

      // 2. Seleccionar vuelo del departure si existe
      if (this.flightPacks && this.flightPacks.length > 0) {
        this.selectFlightFromDeparture(this.departureActivityPackId);
      }

      // 3. Cargar vuelo existente de la BD
      if (this.flightPacks && this.flightPacks.length > 0) {
        await this.loadAndSelectExistingFlight();
      }

    } catch (error) {
      console.error('💥 Error en forceUpdateDepartureData:', error);
    }
  }

  // ✅ MÉTODO NUEVO: Deseleccionar vuelo del departure sin guardar en BD (para sincronización con specific-search)
  deselectDepartureFlightWithoutSaving(): void {

    
    if (this.selectedFlight && this.selectedFlight.id === this.departureActivityPackId) {
      
      // Marcar como selección interna para evitar guardar automáticamente
      this.isInternalSelection = true;
      
      // Deseleccionar el vuelo
      this.selectedFlight = null;
      
      // Emitir el cambio
      this.flightSelectionChange.emit({ selectedFlight: null, totalPrice: 0 });
    } 
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
    if (!this.selectedFlight) {
      // ✅ CASO: Sin vuelo seleccionado - emitir precio 0
      this.flightSelectionChange.emit({
        selectedFlight: null,
        totalPrice: 0,
      });
      return;
    }

    const basePrice =
      this.selectedFlight.ageGroupPrices.find(
        (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
      )?.price || 0; //TODO: Añadir al summary los precios segun el ageGroup de los diferentes viajeros , no solo el del leadTraveler
    const totalTravelers = this.travelers.length;
    const totalPrice = totalTravelers > 0 ? basePrice * totalTravelers : 0;

    this.flightSelectionChange.emit({
      selectedFlight: this.selectedFlight,
      totalPrice: basePrice,
    });
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

    if (this.selectedFlight === flightPack) {
      // Deseleccionar vuelo
      this.selectedFlight = null;

      // Emitir "Sin Vuelos" con precio 0
      this.flightSelectionChange.emit({ selectedFlight: null, totalPrice: 0 });

      // Guardar estado "sin vuelo" para todos los viajeros
      this.saveFlightAssignmentsForAllTravelers(0, true); // 0 = sin vuelos, true = deseleccionar specific-search
    } else {
      // Seleccionar nuevo vuelo
      this.selectedFlight = flightPack;
      
      const basePrice =
        flightPack.ageGroupPrices.find(
          (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
        )?.price || 0;


      // Emitir eventos
      this.defaultFlightSelected.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
      });

      this.flightSelectionChange.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
      });

      // Guardar asignaciones del vuelo seleccionado para todos los viajeros
      this.saveFlightAssignmentsForAllTravelers(flightPack.id, true); // flightPack.id, true = deseleccionar specific-search
    }
  }

  // ✅ MÉTODO NUEVO: Obtener texto del vuelo seleccionado para el summary
  getSelectedFlightText(): string {
    if (!this.selectedFlight) {
      return 'Sin Vuelos';
    }

    // Si es del departure, mostrar texto especial
    if (this.selectedFlight.id === this.departureActivityPackId) {
      return 'Vuelo del Departure';
    }

    // Para otros vuelos, mostrar información básica
    return `Vuelo ${this.selectedFlight.id}`;
  }

  // ✅ MÉTODO NUEVO: Obtener precio del vuelo seleccionado para el summary
  getSelectedFlightPrice(): number {
    if (!this.selectedFlight) {
      return 0;
    }

    const basePrice =
      this.selectedFlight.ageGroupPrices.find(
        (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
      )?.price || 0;

    return basePrice;
  }

  // ✅ MÉTODO NUEVO: Verificar si hay vuelo seleccionado
  hasSelectedFlight(): boolean {
    return this.selectedFlight !== null;
  }

  // ✅ MÉTODO NUEVO: Obtener información completa del vuelo para el summary
  getFlightSummaryInfo(): {
    hasFlight: boolean;
    flightText: string;
    price: number;
    isFromDeparture: boolean;
  } {
    const hasFlight = this.hasSelectedFlight();
    const flightText = this.getSelectedFlightText();
    const price = this.getSelectedFlightPrice();
    const isFromDeparture = this.isSelectedFlightFromDeparture();

    return {
      hasFlight,
      flightText,
      price,
      isFromDeparture,
    };
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

  /**
   * ✅ MÉTODO SIMPLIFICADO: Guardar asignaciones de vuelos para todos los viajeros
   * @param targetFlightPackId ID del flightPack a asignar (0 para buscar automáticamente "sin vuelos")
   * @param shouldUnselectSpecificSearch Si debe deseleccionar vuelos de specific-search
   */
  async saveFlightAssignmentsForAllTravelers(
    targetFlightPackId: number,
    shouldUnselectSpecificSearch: boolean = false
  ): Promise<boolean> {

    if (!this.reservationId) {
      return false;
    }

    // ✅ CORRECCIÓN: Si targetFlightPackId es 0, buscar automáticamente el flightPack "sin vuelos"
    let finalFlightPackId = targetFlightPackId;
    if (targetFlightPackId === 0) {
      const noFlightPack = this.flightPacks?.find((pack) => {
        const name = pack.name?.toLowerCase() || '';
        const description = pack.description?.toLowerCase() || '';
        return (
          name.includes('sin vuelos') ||
          description.includes('sin vuelos') ||
          name.includes('pack sin vuelos') ||
          description.includes('pack sin vuelos')
        );
      });

      if (noFlightPack) {
        finalFlightPackId = noFlightPack.id;
      } else {
        finalFlightPackId = 0;
      }
    }

    try {
      // 1. Obtener todos los viajeros de la reserva
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => {
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
        return true;
      }

      // 2. Para cada viajero, buscar y actualizar/crear asignaciones
      const updatePromises = travelers.map((traveler) => {
        return new Promise<boolean>((resolve, reject) => {
          this.reservationTravelerActivityPackService
            .getByReservationTraveler(traveler.id)
            .subscribe({
              next: (assignments) => {
                // Filtrar por flightPacks (activityPackId > 0)
                const flightPackAssignments = assignments.filter(
                  (a) => a.activityPackId > 0
                );

                if (flightPackAssignments.length > 0) {
                  // Actualizar la asignación más reciente
                  const mostRecentAssignment = flightPackAssignments.sort(
                    (a, b) => b.id - a.id
                  )[0];
                  const updateData = {
                    id: mostRecentAssignment.id,
                    reservationTravelerId: traveler.id,
                    activityPackId: finalFlightPackId,
                    updatedAt: new Date().toISOString(),
                  };

                  this.reservationTravelerActivityPackService
                    .update(mostRecentAssignment.id, updateData)
                    .subscribe({
                      next: (updated) => {
                        if (updated) {

                          resolve(true);
                        } else {
                          console.error(
                            `Error al actualizar asignación para viajero ${traveler.id}`
                          );
                          resolve(false);
                        }
                      },
                      error: (error) => {
                        console.error(
                          `Error al actualizar asignación para viajero ${traveler.id}:`,
                          error
                        );
                        reject(error);
                      },
                    });
                } else {
                  // Crear nueva asignación si no existe

                  const newAssignment = {
                    id: 0,
                    reservationTravelerId: traveler.id,
                    activityPackId: finalFlightPackId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };

                  this.reservationTravelerActivityPackService
                    .create(newAssignment)
                    .subscribe({
                      next: (created) => {
                        if (created) {
                          resolve(true);
                        } else {
                          console.error(
                            `Error al crear asignación para viajero ${traveler.id}`
                          );
                          resolve(false);
                        }
                      },
                      error: (error) => {
                        console.error(
                          `Error al crear asignación para viajero ${traveler.id}:`,
                          error
                        );
                        reject(error);
                      },
                    });
                }
              },
              error: (error) => {
                console.error(
                  `Error al obtener asignaciones para viajero ${traveler.id}:`,
                  error
                );
                reject(error);
              },
            });
        });
      });

      // 3. Esperar a que se completen todas las actualizaciones
      await Promise.all(updatePromises);

      // 4. Deseleccionar vuelos de specific-search si es necesario
      if (shouldUnselectSpecificSearch && this.reservationId) {
        this.flightSearchService.unselectAllFlights(this.reservationId).subscribe({
          next: () => {
          },
          error: (error) => {
            console.error('Error al deseleccionar vuelos de specific-search:', error);
          },
        });
      }

      return true;
    } catch (error) {
      console.error('Error en saveFlightAssignmentsForAllTravelers:', error);
      return false;
    }
  }

  async saveFlightAssignments(): Promise<boolean> {
    // Incrementar contador estático
    DefaultFlightsComponent.saveFlightAssignmentsCallCount++;
      
    if (!this.selectedFlight || !this.reservationId) {
      return true;
    }

    try {
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => {
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
        return true;  
      }

      // ✅ MODIFICADO: Solo actualizar registros del departure existentes, NUNCA crear nuevos
      if (!this.selectedFlight) {

        const updatePromises = travelers.map((traveler) => {
          return new Promise<boolean>((resolve, reject) => {
            this.reservationTravelerActivityPackService
              .getByReservationTraveler(traveler.id)
              .subscribe({
                next: (assignments) => {
                  // ✅ SOLO buscar asignaciones del departure (por departureActivityPackId)
                  const departureAssignments = assignments.filter(
                    (a) => a.activityPackId === this.departureActivityPackId
                  );

                  if (departureAssignments.length === 0) {
                    resolve(true);
                    return;
                  }

                  // Ordenar por ID descendente para obtener el más reciente
                  const sortedAssignments = departureAssignments.sort(
                    (a, b) => b.id - a.id
                  );
                  const mostRecentAssignment = sortedAssignments[0];


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
                        } else {
                          console.error(
                            `Error al actualizar asignación del departure ${mostRecentAssignment.id} para viajero ${traveler.id}`
                          );
                        }
                        resolve(updated);
                      },
                      error: (error: any) => {
                        console.error(
                          `Error al actualizar asignación del departure para viajero ${traveler.id}:`,
                          error
                        );
                        reject(error);
                      },
                    });
                },
                error: (error: any) => {
                  console.error(
                    `Error al obtener asignaciones para viajero ${traveler.id}:`,
                    error
                  );
                  reject(error);
                },
              });
          });
        });

        await Promise.all(updatePromises);
        return true;
      }

      const activityPackId = this.selectedFlight.id;


      // ✅ MODIFICADO: SOLO actualizar registros existentes del departure, NUNCA crear nuevos
      const existingAssignmentsPromises = travelers.map((traveler) => {
        return new Promise<{
          traveler: IReservationTravelerResponse;
          existingAssignments: IReservationTravelerActivityPackResponse[];
        }>((resolve, reject) => {
          this.reservationTravelerActivityPackService
            .getByReservationTraveler(traveler.id)
            .subscribe({
              next: (assignments) => {
                // ✅ SOLO buscar asignaciones del departure
                const departureAssignments = assignments.filter(
                  (a) => a.activityPackId === this.departureActivityPackId
                );

                // Ordenar por ID descendente para obtener el más reciente
                const sortedAssignments = departureAssignments.sort(
                  (a, b) => b.id - a.id
                );
                resolve({
                  traveler,
                  existingAssignments: sortedAssignments,
                });
              },
              error: (error) => {
                console.error(
                  `Error al obtener asignaciones para viajero ${traveler.id}:`,
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

      // ✅ MODIFICADO: SOLO actualizar registros existentes, NUNCA crear nuevos
      const hasExistingDepartureAssignments = existingAssignmentsResults.some(
        (result) => result.existingAssignments.length > 0
      );

      if (hasExistingDepartureAssignments) {

        const updatePromises = existingAssignmentsResults.map((result) => {
          return new Promise<boolean>((resolve, reject) => {
            const { traveler, existingAssignments } = result;

            if (existingAssignments.length > 0) {
              // Siempre usar la primera asignación (la más reciente por ID)
              const mostRecentAssignment = existingAssignments[0];

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
                    } else {
                      console.error(
                        `Error al actualizar asignación del departure ${mostRecentAssignment.id} para viajero ${traveler.id}`
                      );
                    }
                    resolve(updated);
                  },
                  error: (error: any) => {
                    console.error(
                      `Error al actualizar asignación del departure para viajero ${traveler.id}:`,
                      error
                    );
                    reject(error);
                  },
                });
            } else {
              // ✅ MODIFICADO: NO crear nuevas asignaciones, solo log
              resolve(true); // Resolver como éxito sin crear nada
            }
          });
        });

              await Promise.all(updatePromises);
      
      // ✅ NUEVO: Deseleccionar todos los vuelos en specific-search después de guardar
      if (this.reservationId) {
        this.flightSearchService.unselectAllFlights(this.reservationId).subscribe({
          next: () => {
          },
          error: (error) => {
            console.error('Error al deseleccionar vuelos de specific-search después de guardar:', error);
          }
        });
      }
    } else {
      // ✅ MODIFICADO: NO crear nuevas asignaciones si no existen
    }

      // ✅ MODIFICADO: Verificar solo las asignaciones del departure
      for (const traveler of travelers) {
        this.reservationTravelerActivityPackService
          .getByReservationTraveler(traveler.id)
          .subscribe({
            next: (finalAssignments) => {
              // ✅ SOLO verificar asignaciones del departure
              const departureAssignments = finalAssignments.filter(
                (a) => a.activityPackId === this.selectedFlight!.id
              );
            },
            error: (error) => {
              console.error(
                `Error al verificar estado final del departure para viajero ${traveler.id}:`,
                error
              );
            },
          });
      }

      return true;
    } catch (error) {
      console.error('Error en saveFlightAssignments:', error);
      return false;
    }
  }

  private async loadExistingFlightAssignments(): Promise<void> {

    if (!this.reservationId) {
      return;
    }

    try {
      const travelers = await new Promise<IReservationTravelerResponse[]>(
        (resolve, reject) => {
          this.reservationTravelerService
            .getAll({ reservationId: this.reservationId! })
            .subscribe({
              next: (travelers) => {
                resolve(travelers);
              },
              error: (error) => {
                console.error(
                  'Error al obtener viajeros para carga de asignaciones:',
                  error
                );
                reject(error);
              },
            });
        }
      );

      if (travelers.length === 0) {
        return;
      }

      // ✅ MODIFICADO: Usar departureActivityPackId en lugar de selectedFlightFromParent?.id
      const activityPackId = this.departureActivityPackId;
      if (!activityPackId || activityPackId <= 0) {
        return;
      }


      const updatePromises = travelers.map((traveler) => {
        return new Promise<boolean>((resolve, reject) => {
          this.reservationTravelerActivityPackService
            .getByReservationTraveler(traveler.id)
            .subscribe({
              next: (assignments) => {
                // ✅ MODIFICADO: Buscar asignaciones del departure específico
                const departureAssignments = assignments.filter(
                  (a) => a.activityPackId === activityPackId
                );

                if (departureAssignments.length > 0) {
                  const mostRecentAssignment = departureAssignments.sort(
                    (a, b) => b.id - a.id
                  )[0];

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
                        } else {
                          console.error(
                            `Error al actualizar asignación del departure ${mostRecentAssignment.id} para viajero ${traveler.id}`
                          );
                        }
                        resolve(updated);
                      },
                      error: (error: any) => {
                        console.error(
                          `Error al actualizar asignación del departure para viajero ${traveler.id}:`,
                          error
                        );
                        reject(error);
                      },
                    });
                } else {
                  // No creamos asignaciones automáticamente durante la carga
                  // Solo resolvemos como true para continuar el proceso
                  resolve(true);
                }
              },
              error: (error: any) => {
                console.error(
                  `Error al obtener asignaciones para viajero ${traveler.id}:`,
                  error
                );
                reject(error);
              },
            });
        });
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error en loadExistingFlightAssignments:', error);
    }
  }

  private async clearExistingFlightAssignments(
    travelers: IReservationTravelerResponse[]
  ): Promise<void> {

    const clearPromises = travelers.map((traveler) => {
      return new Promise<void>((resolve, reject) => {

        this.reservationTravelerActivityPackService
          .getByReservationTraveler(traveler.id)
          .subscribe({
            next: (
              existingAssignments: IReservationTravelerActivityPackResponse[]
            ) => {

              // ✅ MODIFICADO: Solo filtrar asignaciones del departure
              const departureAssignments = existingAssignments.filter(
                (assignment) =>
                  assignment.activityPackId === this.departureActivityPackId
              );

              // Filtrar asignaciones que NO son del departure actual
              const otherDepartureAssignments = departureAssignments.filter(
                (assignment) => {
                  const isCurrentDeparture =
                    assignment.activityPackId === this.departureActivityPackId;
                  // No eliminar asignaciones del departure actual, solo las de otros departures
                  return !isCurrentDeparture;
                }
              );

              // Verificar si hay asignaciones para el departure actual
              const currentDepartureAssignments = departureAssignments.filter(
                (assignment) =>
                  assignment.activityPackId === this.departureActivityPackId
              );

              if (otherDepartureAssignments.length === 0) {
                resolve();
                return;
              }

              const deletePromises = otherDepartureAssignments.map(
                (assignment: IReservationTravelerActivityPackResponse) => {
                  return new Promise<void>((resolveDelete, rejectDelete) => {

                    this.reservationTravelerActivityPackService
                      .delete(assignment.id)
                      .subscribe({
                        next: (deleted: boolean) => {
                          if (deleted) {

                            // Verificar inmediatamente si se eliminó correctamente
                            this.reservationTravelerActivityPackService
                              .getByReservationTraveler(traveler.id)
                              .subscribe({
                                next: (verificationAssignments) => {
                                  const remainingAssignments =
                                    verificationAssignments.filter(
                                      (a) => a.id !== assignment.id
                                    );
                                },
                                error: (error) => {
                                  console.error(
                                    `Error en verificación después de eliminación del departure para viajero ${traveler.id}:`,
                                    error
                                  );
                                },
                              });
                          }
                          resolveDelete();
                        },
                        error: (error: any) => {
                          console.error(
                            `Error al eliminar asignación del departure ${assignment.id} para viajero ${traveler.id}:`,
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
                  resolve();
                })
                .catch((error) => {
                  console.error(
                    `Error en limpieza del departure para viajero ${traveler.id}:`,
                    error
                  );
                  resolve();
                });
            },
            error: (error: any) => {
              console.error(
                `Error al obtener asignaciones del departure para limpieza del viajero ${traveler.id}:`,
                error
              );
              resolve();
            },
          });
      });
    });

    await Promise.all(clearPromises);
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
