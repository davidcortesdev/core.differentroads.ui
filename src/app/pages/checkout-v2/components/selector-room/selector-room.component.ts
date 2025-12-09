import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import {
  DepartureAccommodationService,
  IDepartureAccommodationResponse,
} from '../../../../core/services/departure/departure-accommodation.service';
import {
  DepartureAccommodationPriceService,
  IDepartureAccommodationPriceResponse,
} from '../../../../core/services/departure/departure-accommodation-price.service';
import {
  DepartureAccommodationTypeService,
  IDepartureAccommodationTypeResponse,
} from '../../../../core/services/departure/departure-accommodation-type.service';
import {
  DepartureAccommodationAvailabilityService,
  IDepartureAccommodationAvailabilityResponse,
} from '../../../../core/services/departure/departure-accommodation-availability.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerAccommodationService,
  IReservationTravelerAccommodationResponse,
} from '../../../../core/services/reservation/reservation-traveler-accommodation.service';
import {
  BehaviorSubject,
  forkJoin,
  throwError,
  Subject,
  from,
  firstValueFrom,
} from 'rxjs';
import {
  debounceTime,
  takeUntil,
  switchMap,
} from 'rxjs/operators';
import { AgeGroupService } from '../../../../core/services/agegroup/age-group.service';
import { MessageService } from 'primeng/api';

interface RoomAvailability {
  id: number;
  tkId: string;
  name: string;
  description: string;
  capacity: number;
  basePrice: number;
  qty?: number;
  isShared?: boolean;
  accommodationTypeId?: number;
  availablePlaces?: number; // Disponibilidad de plazas
  lastAvailabilityUpdate?: string; // Última actualización de disponibilidad
}

interface TravelerRoomAssignment {
  travelerId: number;
  travelerNumber: number;
  isLeadTraveler: boolean;
  roomId: number;
  roomTkId: string;
  roomName: string;
  departureAccommodationId: number;
  roomInstanceKey?: string; // Clave única de la instancia de habitación
}

@Component({
  selector: 'app-selector-room',
  standalone: false,
  templateUrl: './selector-room.component.html',
  styleUrl: './selector-room.component.scss',
})
export class SelectorRoomComponent implements OnInit, OnChanges, OnDestroy {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;

  // Output para notificar que se han actualizado las habitaciones
  @Output() roomsUpdated = new EventEmitter<void>();

  // Propiedades principales
  roomsAvailabilityForTravelersNumber: RoomAvailability[] = [];
  allRoomsAvailability: RoomAvailability[] = [];
  selectedRooms: { [tkId: string]: number } = {};
  errorMsg: string | null = null;
  errorMsgType: 'error' | 'warning' | 'info' = 'error'; // Tipo de mensaje

  // Propiedades para guardado automático
  saving: boolean = false;
  private destroy$ = new Subject<void>();
  private saveSubject = new Subject<void>();

  // NUEVO: Propiedades para controlar el estado de carga de viajeros
  loadingTravelers: boolean = false;
  travelersError: string | null = null;

  // Propiedad para rastrear el total anterior de viajeros
  private previousTotalTravelers: number = 0;

  // NUEVO: Propiedades para validación de niños
  private adultAgeGroupIds: number[] = [];
  private childAgeGroupIds: number[] = [];

  // Datos de travelers existentes en la reserva
  existingTravelers: IReservationTravelerResponse[] = [];
  accommodationTypes: IDepartureAccommodationTypeResponse[] = [];

  // Para almacenar asignaciones existentes de habitaciones
  existingTravelerAccommodations: IReservationTravelerAccommodationResponse[] =
    [];

  // Para asignaciones de habitaciones
  currentRoomAssignments: Array<{
    travelerId: number;
    travelerNumber: number;
    isLeadTraveler: boolean;
    roomId: number;
    roomTkId: string;
    roomName: string;
    departureAccommodationId: number;
    bedNumber: number;
    isShared: boolean;
    roomInstanceKey?: string; // Clave única de la instancia de habitación
  }> = [];

  // Servicios reactivos para manejo de estado
  private travelersNumbersSource = new BehaviorSubject<{
    adults: number;
    childs: number;
    babies: number;
  }>({
    adults: 1,
    childs: 0,
    babies: 0,
  });

  private selectedRoomsSource = new BehaviorSubject<RoomAvailability[]>([]);

  // Observables públicos
  travelersNumbers$ = this.travelersNumbersSource.asObservable();
  selectedRooms$ = this.selectedRoomsSource.asObservable();

  constructor(
    private departureAccommodationService: DepartureAccommodationService,
    private departureAccommodationPriceService: DepartureAccommodationPriceService,
    private departureAccommodationTypeService: DepartureAccommodationTypeService,
    private departureAccommodationAvailabilityService: DepartureAccommodationAvailabilityService,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerAccommodationService: ReservationTravelerAccommodationService,
    private ageGroupService: AgeGroupService,
    private messageService: MessageService
  ) {
    // Suscripción a cambios de travelers
    this.travelersNumbers$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        const newTotalTravelers = data.adults + data.childs + data.babies;
        const previousTotalTravelers = this.getPreviousTotalTravelers();

        // Solo procesar si realmente cambió el número de viajeros
        if (previousTotalTravelers !== newTotalTravelers) {
          this.handleTravelerNumberChange(newTotalTravelers, data);
        }

        // Actualizar el total anterior
        this.setPreviousTotalTravelers(newTotalTravelers);
      });

    // Suscripción a habitaciones seleccionadas
    this.selectedRooms$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rooms) => {
        this.selectedRooms = rooms.reduce((acc, room) => {
          acc[room.tkId] = room.qty || 0;
          return acc;
        }, {} as { [tkId: string]: number });
      });

    // Configurar debounce para guardado automático
    this.saveSubject
      .pipe(
        debounceTime(1200),
        switchMap(() => {
          // Convertir la promesa en observable
          return from(this.saveRoomAssignments());
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (success) => {
          // Guardado completado
        },
        error: () => {},
      });

  }

  ngOnInit(): void {
    // Cargar datos cuando se inicializa
    this.initializeComponent();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['departureId'] || changes['reservationId']) {
      this.initializeComponent();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // NUEVO: Método para cargar viajeros independientemente
  private async loadTravelersIndependently(): Promise<
    IReservationTravelerResponse[]
  > {
    if (!this.reservationId) {
      return [];
    }

    this.loadingTravelers = true;
    this.travelersError = null;

    try {
      const travelers = await firstValueFrom(
        this.reservationTravelerService.getByReservationOrdered(
          this.reservationId
        )
      );

      this.existingTravelers = travelers || [];
      this.loadingTravelers = false;

      return this.existingTravelers;
    } catch (error) {
      this.travelersError = 'Error al cargar los viajeros';
      this.loadingTravelers = false;
      return [];
    }
  }

  // Método para inicializar el componente con carga paralela
  async initializeComponent(): Promise<void> {
    if (!this.departureId) return;

    try {
      // FASE 1: Cargar TODOS los datos maestros en paralelo
      const [accommodations, types, prices, travelers] = await Promise.all([
        firstValueFrom(
          this.departureAccommodationService.getByDeparture(this.departureId)
        ),
        firstValueFrom(this.departureAccommodationTypeService.getAll()),
        firstValueFrom(
          this.departureAccommodationPriceService.getByDeparture(
            this.departureId
          )
        ),
        this.loadTravelersIndependently(),
      ]);

      // Cargar grupos de edad (necesario para clasificar viajeros)
      await this.loadAgeGroupsForValidation();

      // Procesar datos maestros
      this.processBasicData(accommodations || [], types || []);
      this.assignPricesToRooms(prices || []);

      // Cargar disponibilidad de habitaciones
      await this.loadRoomAvailability(accommodations || []);

      // Actualizar contadores de viajeros
      if (travelers && travelers.length > 0) {
        this.updateTravelersNumbersFromExistingTravelers();

        // FASE 2: Recuperar y validar asignaciones existentes
        await this.loadAndValidateExistingAssignments();
      }

      // FASE 3: Actualizar UI sin redistribuir
      this.updateUIWithoutDistribution();
    } catch (error) {
      console.error('Error initializing component:', error);
    }
  }

  // Método para procesar datos básicos
  private processBasicData(
    accommodations: IDepartureAccommodationResponse[],
    types: IDepartureAccommodationTypeResponse[]
  ): void {
    // Transformar datos al formato esperado
    this.allRoomsAvailability = accommodations.map((accommodation) => ({
      id: accommodation.id,
      tkId: accommodation.tkId,
      name: accommodation.name,
      description: accommodation.description,
      capacity: accommodation.capacity,
      basePrice: 0,
      qty: 0,
      isShared: false,
      accommodationTypeId: accommodation.accommodationTypeId,
      availablePlaces: undefined, // Se asignará cuando se cargue la disponibilidad
      lastAvailabilityUpdate: undefined,
    }));

    // Asignar tipos de alojamiento
    this.accommodationTypes = types;
    this.updateRoomSharedStatus();
  }

  // NUEVO: Método para cargar disponibilidad de habitaciones
  private async loadRoomAvailability(
    accommodations: IDepartureAccommodationResponse[]
  ): Promise<void> {
    if (!accommodations || accommodations.length === 0) {
      return;
    }

    try {
      // Obtener disponibilidad para cada habitación
      const availabilityPromises = accommodations.map((accommodation) =>
        firstValueFrom(
          this.departureAccommodationAvailabilityService.getByDepartureAccommodation(
            accommodation.id
          )
        )
      );

      const availabilityResults = await Promise.all(availabilityPromises);

      // Procesar resultados y asignar disponibilidad a cada habitación
      availabilityResults.forEach((availabilities, index) => {
        const accommodation = accommodations[index];
        const room = this.allRoomsAvailability.find(
          (r) => r.id === accommodation.id
        );

        if (room && availabilities && availabilities.length > 0) {
          // Sumar todas las disponibilidades (puede haber múltiples registros por sexType)
          // Para habitaciones compartidas: representa plazas disponibles
          // Para habitaciones normales: representa habitaciones disponibles
          const totalAvailablePlaces = availabilities.reduce(
            (sum, avail) => sum + (avail.availablePlaces || 0),
            0
          );

          room.availablePlaces = totalAvailablePlaces;

          // Obtener la última actualización (si existe)
          const lastUpdate = availabilities
            .map((avail) => avail.lastAvailabilityUpdate)
            .filter((date) => date)
            .sort()
            .pop();

          if (lastUpdate) {
            room.lastAvailabilityUpdate = lastUpdate;
          }
        } else if (room) {
          // Si no hay disponibilidad, establecer en 0
          room.availablePlaces = 0;
        }
      });
    } catch (error) {
      console.error('Error loading room availability:', error);
      // En caso de error, establecer disponibilidad en undefined para no bloquear la UI
    }
  }

  // Método para emitir que se actualizaron las habitaciones
  private emitRoomsUpdated(): void {
    this.roomsUpdated.emit();
  }

  // NUEVO: Método para cargar y validar asignaciones existentes sin redistribuir
  private async loadAndValidateExistingAssignments(): Promise<void> {
    // Cargar asignaciones de BD
    await this.loadExistingTravelerAccommodations();

    // Validar asignaciones
    const validation = this.validateExistingAssignments();

    if (validation.isValid) {
      // ✅ Asignaciones válidas → Solo actualizar UI
      this.currentRoomAssignments = validation.assignments;
      this.syncSelectedRoomsFromAssignments();
    } else {
      // ❌ Asignaciones inválidas → Limpiar y esperar interacción
      console.warn('⚠️ Asignaciones inválidas:', validation.error);
      this.clearInvalidAssignments();
    }
  }

  // NUEVO: Validar asignaciones existentes
  private validateExistingAssignments(): {
    isValid: boolean;
    assignments: any[];
    error?: string;
  } {
    if (
      !this.existingTravelerAccommodations ||
      this.existingTravelerAccommodations.length === 0
    ) {
      return { isValid: false, assignments: [], error: 'No hay asignaciones' };
    }

    // Verificar que todos los viajeros tienen asignación
    if (
      this.existingTravelerAccommodations.length !== this.existingTravelers.length
    ) {
      return {
        isValid: false,
        assignments: [],
        error: 'Faltan viajeros por asignar',
      };
    }

    // Construir asignaciones desde BD
    const assignments = this.buildAssignmentsFromDB();

    // Validar que cada habitación tiene al menos un adulto
    const roomGroups = this.groupAssignmentsByRoom(assignments);

    for (const [roomKey, travelers] of Object.entries(roomGroups)) {
      const hasAdult = travelers.some((t) =>
        this.isAdultTraveler(
          this.existingTravelers.find((et) => et.id === t.travelerId)!
        )
      );

      if (!hasAdult) {
        return {
          isValid: false,
          assignments: [],
          error: `Habitación ${roomKey} sin adulto`,
        };
      }

      // Validar que los niños están con adultos
      const children = travelers.filter((t) =>
        this.isChildTraveler(
          this.existingTravelers.find((et) => et.id === t.travelerId)!
        )
      );

      if (children.length > 0 && !hasAdult) {
        return {
          isValid: false,
          assignments: [],
          error: `Niños solos en habitación ${roomKey}`,
        };
      }
    }

    return { isValid: true, assignments };
  }

  // NUEVO: Construir asignaciones desde BD
  private buildAssignmentsFromDB(): any[] {
    const assignments: any[] = [];

    this.existingTravelerAccommodations.forEach((accommodation, index) => {
      const traveler = this.existingTravelers.find(
        (t) => t.id === accommodation.reservationTravelerId
      );

      const room = this.allRoomsAvailability.find(
        (r) => r.id === accommodation.departureAccommodationId
      );

      if (traveler && room) {
        assignments.push({
          travelerId: traveler.id,
          travelerNumber: traveler.travelerNumber,
          isLeadTraveler: traveler.isLeadTraveler,
          roomId: room.id,
          roomTkId: room.tkId,
          roomName: room.name,
          departureAccommodationId: room.id,
          bedNumber: index + 1,
          isShared: room.isShared || false,
          roomInstanceKey: `${room.id}_${accommodation.id}`,
        });
      }
    });

    return assignments;
  }

  // NUEVO: Agrupar asignaciones por habitación
  private groupAssignmentsByRoom(assignments: any[]): {
    [roomKey: string]: any[];
  } {
    return assignments.reduce((groups, assignment) => {
      const key = assignment.roomInstanceKey || assignment.roomId;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(assignment);
      return groups;
    }, {} as { [roomKey: string]: any[] });
  }

  // NUEVO: Sincronizar selectedRooms desde asignaciones BD
  private syncSelectedRoomsFromAssignments(): void {
    this.selectedRooms = {};

    // Contar cuántas habitaciones de cada tipo hay asignadas
    const roomCounts: { [tkId: string]: Set<string> } = {};

    this.currentRoomAssignments.forEach((assignment) => {
      if (!roomCounts[assignment.roomTkId]) {
        roomCounts[assignment.roomTkId] = new Set();
      }
      // Usar roomInstanceKey para contar instancias únicas
      roomCounts[assignment.roomTkId].add(
        assignment.roomInstanceKey || `${assignment.roomId}`
      );
    });

    // Convertir a números
    Object.entries(roomCounts).forEach(([tkId, instanceSet]) => {
      this.selectedRooms[tkId] = instanceSet.size;
    });
  }

  // NUEVO: Limpiar asignaciones inválidas
  private clearInvalidAssignments(): void {
    this.currentRoomAssignments = [];
    this.selectedRooms = {};
    this.errorMsg = 'Por favor, selecciona las habitaciones para los viajeros';
    this.errorMsgType = 'info';
  }

  // NUEVO: Actualizar UI sin redistribuir automáticamente
  private updateUIWithoutDistribution(): void {
    // Ordenar habitaciones por capacidad
    this.allRoomsAvailability.sort(
      (a, b) => (a.capacity || 0) - (b.capacity || 0)
    );

    // Filtrar habitaciones según número de viajeros
    const totalTravelers = this.getTotalTravelers();
    this.filterRooms(totalTravelers);

    // Inicializar el total anterior de viajeros
    this.setPreviousTotalTravelers(totalTravelers);

    // Limpiar errores
    if (!this.errorMsg) {
      this.errorMsg = null;
    }
  }

  // Método para actualizar la UI después de cargar todos los datos
  // ⚠️ OBSOLETO: Usar updateUIWithoutDistribution() en su lugar
  updateUIFromData(): void {
    console.warn('⚠️ updateUIFromData() es obsoleto, usar updateUIWithoutDistribution()');
    this.updateUIWithoutDistribution();
  }

  updateRoomSharedStatus(): void {
    // Detectar habitaciones compartidas
    this.allRoomsAvailability.forEach((room) => {
      const accommodationType = this.accommodationTypes.find(
        (t) => t.id === room.accommodationTypeId
      );
      if (accommodationType) {
        room.isShared = accommodationType.isShared;
      } else {
        // Fallback: detectar por nombre y capacidad
        room.isShared =
          room.name?.toLowerCase().includes('individual') ||
          room.name?.toLowerCase().includes('single') ||
          (room.name?.toLowerCase().includes('doble') && room.capacity === 1);
      }
    });
  }

  async assignPricesToRooms(
    prices: IDepartureAccommodationPriceResponse[]
  ): Promise<void> {
    const adultAgeGroups = await firstValueFrom(
      this.ageGroupService.getByCode('ADULT')
    );
    const adultAgeGroupId =
      adultAgeGroups?.[0]?.id ??
      throwError(() => new Error('Adult age group not found')); // Default to 1 if not found

    // Asignar precios
    this.allRoomsAvailability.forEach((room) => {
      const roomPrice = prices.find(
        (price) =>
          price.departureAccommodationId === room.id &&
          price.ageGroupId === adultAgeGroupId // 1 = Adulto
      );
      if (roomPrice && roomPrice.basePrice !== undefined) {
        room.basePrice = roomPrice.basePrice;
      } else {
        room.basePrice = 0;
      }
    });
  }

  // Cargar asignaciones de habitaciones existentes desde la BD
  loadExistingTravelerAccommodations(): Promise<void> {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      // Obtener todas las asignaciones de habitaciones para todos los travelers
      const accommodationRequests = this.existingTravelers.map((traveler) =>
        this.reservationTravelerAccommodationService.getByReservationTraveler(
          traveler.id
        )
      );

      forkJoin(accommodationRequests).subscribe((results) => {
        // Aplanar los resultados y almacenar todas las asignaciones
        this.existingTravelerAccommodations = results.flat();

        // Crear el mapeo de travelers a habitaciones
        this.createTravelerRoomAssignments();

        resolve();
      });
    });
  }

  // Crear el mapeo de qué habitación tiene asignada cada traveler
  createTravelerRoomAssignments(): TravelerRoomAssignment[] {
    const assignments: TravelerRoomAssignment[] = [];

    this.existingTravelers.forEach((traveler) => {
      // Buscar si este traveler tiene asignación de habitación
      const accommodation = this.existingTravelerAccommodations.find(
        (acc) => acc.reservationTravelerId === traveler.id
      );

      if (accommodation) {
        // Buscar la información de la habitación
        const room = this.allRoomsAvailability.find(
          (r) => r.id === accommodation.departureAccommodationId
        );

        if (room) {
          assignments.push({
            travelerId: traveler.id,
            travelerNumber: traveler.travelerNumber,
            isLeadTraveler: traveler.isLeadTraveler,
            roomId: room.id,
            roomTkId: room.tkId,
            roomName: room.name,
            departureAccommodationId: accommodation.departureAccommodationId,
          });
        }
      }
    });

    return assignments;
  }

  /**
   * Inicializar habitaciones desde travelers existentes usando datos de BD
   */
  initializeRoomsFromTravelers(): { [tkId: string]: number } {
    const roomCounts: { [tkId: string]: number } = {};

    if (
      !this.existingTravelerAccommodations ||
      this.existingTravelerAccommodations.length === 0
    ) {
      return {};
    }

    // Contar cuántos travelers están asignados a cada tipo de habitación
    this.existingTravelerAccommodations.forEach((accommodation) => {
      const room = this.allRoomsAvailability.find(
        (r) => r.id === accommodation.departureAccommodationId
      );
      if (room) {
        if (!roomCounts[room.tkId]) {
          roomCounts[room.tkId] = 0;
        }
        roomCounts[room.tkId]++;
      }
    });

    // Convertir conteos de travelers a cantidades de habitaciones
    const result: { [tkId: string]: number } = {};
    Object.entries(roomCounts).forEach(([roomTkId, travelerCount]) => {
      const room = this.allRoomsAvailability.find((r) => r.tkId === roomTkId);
      if (room && room.capacity) {
        // Calcular cuántas habitaciones se necesitan
        result[roomTkId] = Math.ceil(travelerCount / room.capacity);
      }
    });

    return result;
  }

  // NUEVO: Métodos auxiliares para identificar tipos de viajeros
  private isAdultTraveler(traveler: IReservationTravelerResponse): boolean {
    // Si no hay grupos de edad cargados, asumir que todos son adultos
    if (this.adultAgeGroupIds.length === 0) {
      return true;
    }
    return this.adultAgeGroupIds.includes(traveler.ageGroupId);
  }

  private isChildTraveler(traveler: IReservationTravelerResponse): boolean {
    // Si no hay grupos de edad cargados, asumir que no hay niños
    if (this.childAgeGroupIds.length === 0) {
      return false;
    }
    return this.childAgeGroupIds.includes(traveler.ageGroupId);
  }

  // NUEVO: Método para cargar grupos de edad y configurar validaciones
  private async loadAgeGroupsForValidation(): Promise<void> {
    try {
      // Usar los métodos del servicio que ahora combinan límites de edad + nombre/código
      const [adultGroups, childGroups, allGroups] = await Promise.all([
        firstValueFrom(this.ageGroupService.getAdultGroups()),
        firstValueFrom(this.ageGroupService.getChildGroups()),
        firstValueFrom(this.ageGroupService.getAll()),
      ]);

      // Extraer IDs de grupos de adultos
      this.adultAgeGroupIds = (adultGroups || []).map((group) => group.id);

      // Extraer IDs de grupos de niños
      this.childAgeGroupIds = (childGroups || []).map((group) => group.id);
    } catch (error) {
      console.error(
        'ROOM_VALIDATION: Error loading age groups for validation:',
        error
      );
    }
  }

  // NUEVO: Método para validar que no queden niños solos
  private validateChildrenAssignments(): {
    isValid: boolean;
    errorMessage: string;
  } {
    // Si no hay viajeros cargados aún, usar los números del selector
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      const travelerNumbers = this.travelersNumbersSource.getValue();
      const adults = travelerNumbers.adults;
      const children = travelerNumbers.childs;

      // Si no hay niños, no hay nada que validar
      if (children === 0) {
        return { isValid: true, errorMessage: '' };
      }

      // Si hay niños pero no hay adultos, es un error
      if (adults === 0) {
        return {
          isValid: false,
          errorMessage:
            'Debe haber al menos un adulto para acompañar a los niños.',
        };
      }

      // Si hay niños y adultos, la validación básica está bien
      // La validación detallada de habitaciones se hace en distributeRoomsToTravelers
      return { isValid: true, errorMessage: '' };
    }

    // Obtener viajeros por grupos de edad
    const adults = this.existingTravelers.filter((t) =>
      this.isAdultTraveler(t)
    );
    const children = this.existingTravelers.filter((t) =>
      this.isChildTraveler(t)
    );

    if (children.length === 0) {
      return { isValid: true, errorMessage: '' };
    }

    // Verificar que hay suficientes adultos para acompañar a los niños
    if (adults.length === 0) {
      return {
        isValid: false,
        errorMessage:
          'Debe haber al menos un adulto para acompañar a los niños.',
      };
    }

    // Verificar que cada niño tenga un adulto asignado en la misma habitación

    const invalidAssignments = this.currentRoomAssignments.filter(
      (assignment) => {
        const traveler = this.existingTravelers.find(
          (t) => t.id === assignment.travelerId
        );
        if (!traveler || !this.isChildTraveler(traveler)) {
          return false;
        }

        // Buscar si hay un adulto en la misma habitación usando roomInstanceKey
        const hasAdultInSameRoom = this.currentRoomAssignments.some(
          (otherAssignment) => {
            if (otherAssignment.travelerId === assignment.travelerId) {
              return false;
            }

            const otherTraveler = this.existingTravelers.find(
              (t) => t.id === otherAssignment.travelerId
            );

            // Usar roomInstanceKey si está disponible, sino usar roomId como fallback
            const sameRoom =
              assignment.roomInstanceKey && otherAssignment.roomInstanceKey
                ? assignment.roomInstanceKey === otherAssignment.roomInstanceKey
                : assignment.roomId === otherAssignment.roomId;

            const isAdult =
              otherTraveler && this.isAdultTraveler(otherTraveler);

            return sameRoom && isAdult;
          }
        );

        return !hasAdultInSameRoom;
      }
    );

    if (invalidAssignments.length > 0) {
      return {
        isValid: false,
        errorMessage:
          'Los niños no pueden estar solos en una habitación. Deben estar acompañados por un adulto.',
      };
    }

    return { isValid: true, errorMessage: '' };
  }

  // NUEVO: Validar selecciones de habitaciones
  private validateRoomSelections(): {
    isValid: boolean;
    message: string | null;
  } {
    const selectedRoomsWithQty = Object.keys(this.selectedRooms)
      .filter((tkId) => this.selectedRooms[tkId] > 0)
      .map((tkId) => {
        const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);
        return { ...room, qty: this.selectedRooms[tkId] };
      })
      .filter((room) => room && room.qty > 0);

    // Validar disponibilidad de habitaciones
    for (const room of selectedRoomsWithQty) {
      if (room.availablePlaces !== undefined && room.qty) {
        const availablePlaces = Number(room.availablePlaces);
        
        if (room.isShared) {
          // Para habitaciones compartidas, availablePlaces representa plazas disponibles
          // Cada habitación compartida ocupa 1 plaza
          const requestedPlaces = room.qty;
          if (requestedPlaces > availablePlaces) {
            return {
              isValid: false,
              message: `No hay suficiente disponibilidad para ${room.name}. Disponible: ${availablePlaces} ${availablePlaces === 1 ? 'plaza' : 'plazas'}.`,
            };
          }
        } else {
          // Para habitaciones normales, availablePlaces representa habitaciones disponibles (no plazas)
          if (room.qty > availablePlaces) {
            return {
              isValid: false,
              message: `No hay suficiente disponibilidad para ${room.name}. Disponible: ${availablePlaces} ${availablePlaces === 1 ? 'habitación' : 'habitaciones'}.`,
            };
          }
        }
      }
    }

    if (selectedRoomsWithQty.length === 0) {
      return { isValid: true, message: null };
    }

    // Obtener total de viajeros
    const travelerNumbersForValidation = this.travelersNumbersSource.getValue();
    const totalTravelers =
      travelerNumbersForValidation.adults +
      travelerNumbersForValidation.childs +
      travelerNumbersForValidation.babies;

    // Calcular plazas seleccionadas
    const selectedPlaces = selectedRoomsWithQty.reduce((sum, room) => {
      let roomQty = room.qty || 0;
      if (roomQty > 0) {
        let roomCapacity = room.capacity || 0;
        // Habitaciones compartidas SIEMPRE cuentan como 1 viajero
        if (room.isShared) {
          roomCapacity = 1;
        }
        return sum + roomCapacity * roomQty;
      }
      return sum;
    }, 0);

    // Verificar si las plazas exceden los viajeros
    if (selectedPlaces > totalTravelers) {
      return {
        isValid: false,
        message:
          'Las habitaciones seleccionadas exceden la cantidad de viajeros disponibles.',
      };
    }

    // Verificar si hay habitaciones duplicadas o conflictivas
    const roomCounts = selectedRoomsWithQty.reduce((acc, room) => {
      const key = `${room.tkId}_${room.isShared ? 'shared' : 'normal'}`;
      acc[key] = (acc[key] || 0) + room.qty;
      return acc;
    }, {} as Record<string, number>);

    // Verificar si hay habitaciones compartidas seleccionadas múltiples veces
    const sharedRooms = selectedRoomsWithQty.filter((room) => room.isShared);
    if (sharedRooms.length > 0) {
      const totalSharedRooms = sharedRooms.reduce(
        (sum, room) => sum + (room.qty || 0),
        0
      );
      if (totalSharedRooms > 1) {
        return {
          isValid: false,
          message: 'Solo se puede seleccionar una habitación compartida.',
        };
      }
    }

    // NUEVO: Validar que la cantidad de habitaciones sea apropiada
    const totalRooms = selectedRoomsWithQty.reduce(
      (sum, room) => sum + (room.qty || 0),
      0
    );

    // Usar los números de viajeros del selector en lugar de existingTravelers
    const travelerNumbersForRoomValidation =
      this.travelersNumbersSource.getValue();
    const adults = travelerNumbersForRoomValidation.adults;
    const children = travelerNumbersForRoomValidation.childs;

    // Validar que no se exceda el máximo de habitaciones (adultos)
    if (totalRooms > adults) {
      return {
        isValid: false,
        message: `No se pueden seleccionar más de ${adults} habitaciones (una por adulto).`,
      };
    }

    // Validar que haya suficientes habitaciones para los niños si los hay
    if (children > 0 && totalRooms < Math.ceil(children / 2)) {
      return {
        isValid: false,
        message: `Se necesitan al menos ${Math.ceil(
          children / 2
        )} habitaciones para acomodar a los niños.`,
      };
    }

    return { isValid: true, message: null };
  }

  // Filtrar habitaciones
  filterRooms(totalTravelers: number): void {
    this.roomsAvailabilityForTravelersNumber = this.allRoomsAvailability.filter(
      (room) => {
        // Habitaciones compartidas siempre aparecen (capacidad = 1)
        if (room.isShared) {
          return true;
        }
        // Habitaciones normales: solo si capacidad <= total travelers
        const roomCapacity = room.capacity || 1;
        return roomCapacity <= totalTravelers;
      }
    );
  }

  // Manejar cambios en selección (procesamiento inmediato)
  onRoomSpacesChange(changedRoom: RoomAvailability, newValue: number): void {
    // Validar disponibilidad antes de actualizar
    if (newValue > 0 && changedRoom.availablePlaces !== undefined) {
      const availablePlaces = Number(changedRoom.availablePlaces);
      
      if (changedRoom.isShared) {
        // Para habitaciones compartidas, availablePlaces representa plazas disponibles
        // Cada habitación compartida ocupa 1 plaza
        if (newValue > availablePlaces) {
          this.errorMsg = `No hay suficiente disponibilidad. Disponible: ${availablePlaces} ${availablePlaces === 1 ? 'plaza' : 'plazas'}.`;
          this.errorMsgType = 'error';
          // Revertir al valor anterior
          const previousValue = this.selectedRooms[changedRoom.tkId] || 0;
          this.selectedRooms[changedRoom.tkId] = previousValue;
          // Forzar actualización del input
          setTimeout(() => {
            this.selectedRooms[changedRoom.tkId] = previousValue;
          }, 0);
          return;
        }
      } else {
        // Para habitaciones normales, availablePlaces representa habitaciones disponibles (no plazas)
        if (newValue > availablePlaces) {
          this.errorMsg = `No hay suficiente disponibilidad. Disponible: ${availablePlaces} ${availablePlaces === 1 ? 'habitación' : 'habitaciones'}.`;
          this.errorMsgType = 'error';
          // Revertir al valor anterior
          const previousValue = this.selectedRooms[changedRoom.tkId] || 0;
          this.selectedRooms[changedRoom.tkId] = previousValue;
          // Forzar actualización del input
          setTimeout(() => {
            this.selectedRooms[changedRoom.tkId] = previousValue;
          }, 0);
          return;
        }
      }
    }

    // Actualizar la UI local inmediatamente
    if (newValue === 0) {
      delete this.selectedRooms[changedRoom.tkId];
    } else {
      this.selectedRooms[changedRoom.tkId] = newValue;
    }

    // Limpiar errores si la validación es exitosa
    if (this.errorMsg && this.errorMsg.includes('disponibilidad')) {
      this.errorMsg = null;
    }

    // Procesar inmediatamente (el debounce solo está en el guardado)
    this.processAllRoomSelections();
  }

  // Método para obtener el máximo de habitaciones disponibles según disponibilidad
  getMaxRoomsForAvailability(room: RoomAvailability): number {
    if (room.availablePlaces === undefined) {
      return 0; // Si no hay información de disponibilidad, no se puede reservar
    }

    const availablePlaces = Number(room.availablePlaces);

    if (availablePlaces === 0) {
      return 0; // Si no hay disponibilidad, no se puede reservar
    }

    if (room.isShared) {
      // Para habitaciones compartidas, availablePlaces representa plazas disponibles
      return availablePlaces;
    }

    // Para habitaciones normales, availablePlaces representa habitaciones disponibles (no plazas)
    return availablePlaces;
  }

  // Procesar todas las selecciones
  private processAllRoomSelections(): void {
    // Validar todas las selecciones actuales
    const validationResult = this.validateRoomSelections();
    if (!validationResult.isValid) {
      this.errorMsg = validationResult.message;
      this.errorMsgType = 'error';
      return;
    }

    // Limpiar errores si la validación es exitosa
    this.errorMsg = null;

    // Actualizar habitaciones con todas las selecciones
    this.updateRooms();

    // Guardar con debounce
    this.saveSubject.next();
  }

  // Actualizar habitaciones
  updateRooms(): void {
    const updatedRooms = Object.keys(this.selectedRooms).map((tkId) => {
      const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);
      return {
        ...room,
        qty: this.selectedRooms[tkId],
      } as RoomAvailability;
    });

    // Verificar si hay habitaciones seleccionadas
    const hasSelectedRooms = Object.values(this.selectedRooms).some(
      (qty) => qty > 0
    );

    // Solo validar si hay habitaciones seleccionadas
    if (!hasSelectedRooms) {
      this.errorMsg = null;
      this.selectedRoomsSource.next(updatedRooms);
      return;
    }

    // Usar la nueva validación
    const validationResult = this.validateRoomSelections();
    if (!validationResult.isValid) {
      this.errorMsg = validationResult.message;
      this.errorMsgType = 'error';
      return;
    }

    // Limpiar errores si la validación es exitosa
    this.errorMsg = null;

    // Distribuir camas entre travelers
    if (hasSelectedRooms) {
      this.distributeRoomsToTravelers(updatedRooms.filter((r) => r.qty! > 0));
    }

    // Actualizar servicio (simulado)
    this.selectedRoomsSource.next(updatedRooms);
  }

  // Método para distribuir habitaciones entre travelers
  distributeRoomsToTravelers(selectedRooms: RoomAvailability[]): void {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      return;
    }

    // Separar travelers por tipo (se hará más adelante en el nuevo algoritmo)

    // Ordenar travelers: Lead traveler primero, luego adultos, luego niños, luego bebés
    const sortedTravelers = [...this.existingTravelers].sort((a, b) => {
      if (a.isLeadTraveler && !b.isLeadTraveler) return -1;
      if (!a.isLeadTraveler && b.isLeadTraveler) return 1;

      // Luego ordenar por tipo: adultos primero, niños después, bebés al final
      const aIsAdult = this.isAdultTraveler(a);
      const bIsAdult = this.isAdultTraveler(b);
      const aIsChild = this.isChildTraveler(a);
      const bIsChild = this.isChildTraveler(b);

      if (aIsAdult && !bIsAdult) return -1;
      if (!aIsAdult && bIsAdult) return 1;
      if (aIsChild && !bIsChild) return -1;
      if (!aIsChild && bIsChild) return 1;

      return a.id - b.id; // Ordenar por ID como último criterio
    });

    // Crear lista de todas las habitaciones disponibles (no camas individuales)
    const availableRooms: Array<{
      roomId: number;
      roomTkId: string;
      roomName: string;
      departureAccommodationId: number;
      capacity: number;
      isShared: boolean;
      instanceNumber: number; // Para distinguir múltiples instancias de la misma habitación
    }> = [];

    selectedRooms.forEach((room) => {
      const roomQty = room.qty || 0;

      for (let roomInstance = 1; roomInstance <= roomQty; roomInstance++) {
        const roomCapacity = room.isShared ? 1 : room.capacity || 1;

        availableRooms.push({
          roomId: room.id,
          roomTkId: room.tkId,
          roomName: room.name || 'Habitación',
          departureAccommodationId: room.id,
          capacity: roomCapacity,
          isShared: room.isShared || false,
          instanceNumber: roomInstance,
        });
      }
    });

    // Distribuir travelers a habitaciones de manera inteligente
    const roomAssignments: Array<{
      travelerId: number;
      travelerNumber: number;
      isLeadTraveler: boolean;
      roomId: number;
      roomTkId: string;
      roomName: string;
      departureAccommodationId: number;
      bedNumber: number;
      isShared: boolean;
      roomInstanceKey: string;
    }> = [];

    // Crear un mapa para rastrear qué travelers están en cada habitación
    const roomOccupancy: {
      [roomKey: string]: Array<{
        travelerId: number;
        travelerNumber: number;
        isLeadTraveler: boolean;
        isAdult: boolean;
        isChild: boolean;
      }>;
    } = {};

    // Función para obtener la clave única de una habitación
    const getRoomKey = (room: (typeof availableRooms)[0]) =>
      `${room.roomId}_${room.instanceNumber}`;

    // Función para verificar si una habitación puede aceptar más travelers
    const canAcceptMoreTravelers = (room: (typeof availableRooms)[0]) => {
      const roomKey = getRoomKey(room);
      const currentOccupancy = roomOccupancy[roomKey] || [];
      return currentOccupancy.length < room.capacity;
    };

    // Función para agregar un traveler a una habitación
    const addTravelerToRoom = (
      traveler: (typeof this.existingTravelers)[0],
      room: (typeof availableRooms)[0],
      bedNumber: number
    ) => {
      const roomKey = getRoomKey(room);

      if (!roomOccupancy[roomKey]) {
        roomOccupancy[roomKey] = [];
      }

      const travelerInfo = {
        travelerId: traveler.id,
        travelerNumber: traveler.travelerNumber,
        isLeadTraveler: traveler.isLeadTraveler,
        isAdult: this.isAdultTraveler(traveler),
        isChild: this.isChildTraveler(traveler),
      };

      roomOccupancy[roomKey].push(travelerInfo);

      roomAssignments.push({
        travelerId: traveler.id,
        travelerNumber: traveler.travelerNumber,
        isLeadTraveler: traveler.isLeadTraveler,
        roomId: room.roomId, // ID base de la habitación
        roomTkId: room.roomTkId,
        roomName: room.roomName,
        departureAccommodationId: room.departureAccommodationId,
        bedNumber: bedNumber,
        isShared: room.isShared,
        roomInstanceKey: getRoomKey(room), // Clave única de la instancia
      });
    };

    // Funciones del algoritmo anterior eliminadas - ahora usamos distribución por capacidad

    // NUEVA ESTRATEGIA: Distribuir por capacidad de habitación (mayor a menor)

    // Ordenar habitaciones por capacidad (mayor a menor)
    const sortedRooms = [...availableRooms].sort(
      (a, b) => b.capacity - a.capacity
    );

    // Separar travelers por tipo
    const leadTraveler = sortedTravelers.find((t) => t.isLeadTraveler);
    const adults = sortedTravelers.filter(
      (t) => !t.isLeadTraveler && this.isAdultTraveler(t)
    );
    const children = sortedTravelers.filter((t) => this.isChildTraveler(t));

    // Función para agregar un traveler a una habitación específica
    const addTravelerToSpecificRoom = (
      traveler: (typeof this.existingTravelers)[0],
      room: (typeof availableRooms)[0]
    ) => {
      const roomKey = getRoomKey(room);
      const currentOccupancy = roomOccupancy[roomKey] || [];
      const bedNumber = room.isShared ? 1 : currentOccupancy.length + 1;

      addTravelerToRoom(traveler, room, bedNumber);
    };

    // Función para verificar si una habitación puede aceptar más travelers
    const canRoomAcceptMore = (room: (typeof availableRooms)[0]) => {
      const roomKey = getRoomKey(room);
      const currentOccupancy = roomOccupancy[roomKey] || [];
      return currentOccupancy.length < room.capacity;
    };

    // Función para obtener la ocupación actual de una habitación
    const getRoomOccupancy = (room: (typeof availableRooms)[0]) => {
      const roomKey = getRoomKey(room);
      return roomOccupancy[roomKey] || [];
    };

    // ESTRATEGIA: Llenar habitaciones de mayor capacidad primero
    let adultIndex = 0;
    let childIndex = 0;

    // 1. Asignar Lead Traveler primero (si existe)
    if (leadTraveler) {
      const firstRoom = sortedRooms[0];
      if (canRoomAcceptMore(firstRoom)) {
        addTravelerToSpecificRoom(leadTraveler, firstRoom);
      }
    }

    // 2. Llenar cada habitación de mayor a menor capacidad
    for (const room of sortedRooms) {
      // Llenar esta habitación hasta su capacidad máxima
      while (
        canRoomAcceptMore(room) &&
        (adultIndex < adults.length || childIndex < children.length)
      ) {
        const currentOccupancy = getRoomOccupancy(room);
        const hasAdults = currentOccupancy.some((o) => o.isAdult);
        const hasChildren = currentOccupancy.some((o) => o.isChild);

        // Prioridad: Si hay niños disponibles y la habitación ya tiene adultos, asignar niño
        if (childIndex < children.length && hasAdults && !hasChildren) {
          addTravelerToSpecificRoom(children[childIndex], room);
          childIndex++;
          continue;
        }

        // Si hay niños disponibles y la habitación no tiene adultos, asignar adulto primero
        if (
          childIndex < children.length &&
          !hasAdults &&
          adultIndex < adults.length
        ) {
          addTravelerToSpecificRoom(adults[adultIndex], room);
          adultIndex++;
          continue;
        }

        // Si solo quedan adultos, asignar adulto
        if (adultIndex < adults.length) {
          addTravelerToSpecificRoom(adults[adultIndex], room);
          adultIndex++;
          continue;
        }

        // Si solo quedan niños, asignar niño (debe haber adultos en la habitación)
        if (childIndex < children.length) {
          if (hasAdults) {
            addTravelerToSpecificRoom(children[childIndex], room);
            childIndex++;
          } else {
            break;
          }
        }
      }
    }

    // Verificar que todos los travelers fueron asignados
    const totalAssigned = Object.values(roomOccupancy).reduce(
      (sum, occupants) => sum + occupants.length,
      0
    );
    const totalTravelers = sortedTravelers.length;

    // NUEVO: Validar asignaciones de niños antes de guardar
    this.currentRoomAssignments = roomAssignments;

    // Solo validar si hay habitaciones seleccionadas y viajeros
    if (roomAssignments.length > 0) {
      const validation = this.validateChildrenAssignments();
      if (!validation.isValid) {
        this.errorMsg = validation.errorMessage;
        this.errorMsgType = 'error';
        this.currentRoomAssignments = []; // Limpiar asignaciones inválidas
        return;
      }
    }

    this.errorMsg = null; // Limpiar errores si la validación es exitosa
  }

  // Método para guardar las asignaciones de habitaciones
  async saveRoomAssignments(): Promise<boolean> {
    if (!this.reservationId) {
      return false;
    }

    // Validar que no hay errores antes de guardar
    const validationResult = this.validateRoomSelections();
    if (!validationResult.isValid) {
      this.errorMsg = validationResult.message;
      this.errorMsgType = 'error';
      return false;
    }

    // Validar asignaciones de niños si hay habitaciones seleccionadas
    const selectedRoomsWithQty = Object.keys(this.selectedRooms)
      .filter((tkId) => this.selectedRooms[tkId] > 0)
      .map((tkId) => {
        const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);
        return { ...room, qty: this.selectedRooms[tkId] };
      })
      .filter((room) => room.qty > 0);

    if (selectedRoomsWithQty.length > 0) {
      // Usar las asignaciones actuales que ya fueron validadas correctamente
      // en lugar de generar nuevas asignaciones temporales
      // Las asignaciones ya están validadas en distributeRoomsToTravelers
      // No necesitamos validar nuevamente aquí
    }

    // Mostrar indicador de guardado
    this.saving = true;

    try {
      // Siempre recargar travelers para asegurar datos actualizados
      const currentTravelers =
        (await firstValueFrom(
          this.reservationTravelerService.getByReservationOrdered(
            this.reservationId
          )
        )) || [];

      this.existingTravelers = currentTravelers;

      if (!currentTravelers || currentTravelers.length === 0) {
        throw new Error(
          'No se encontraron viajeros en la reserva. Por favor, verifica los datos.'
        );
      }

      // Verificar que hay habitaciones seleccionadas
      const selectedRoomsWithQty = Object.keys(this.selectedRooms)
        .filter((tkId) => this.selectedRooms[tkId] > 0)
        .map((tkId) => {
          const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);
          return { ...room, qty: this.selectedRooms[tkId] };
        })
        .filter((room) => room.qty > 0);

      // Si no hay habitaciones seleccionadas, eliminar todas las asignaciones existentes
      if (selectedRoomsWithQty.length === 0) {
        // Eliminar todas las asignaciones de habitaciones de todos los viajeros
        const deletePromises = currentTravelers.map((traveler) =>
          firstValueFrom(
            this.reservationTravelerAccommodationService.deleteByReservationTraveler(
              traveler.id
            )
          )
        );

        // Ejecutar eliminaciones
        await Promise.all(deletePromises);

        // Limpiar asignaciones locales
        this.currentRoomAssignments = [];
        this.existingTravelerAccommodations = [];

        // Emitir que se actualizaron las habitaciones
        this.emitRoomsUpdated();

        this.saving = false;
        return true;
      }

      // Generar distribución rápidamente
      this.distributeRoomsToTravelers(
        selectedRoomsWithQty as RoomAvailability[]
      );

      if (this.currentRoomAssignments.length === 0) {
        return false;
      }

      // Validar que todos los viajeros necesarios existen en la DB
      const missingTravelers = this.currentRoomAssignments.filter(
        (assignment) => {
          const travelerInDB = currentTravelers.find(
            (t) =>
              (t.isLeadTraveler && assignment.isLeadTraveler) ||
              (!t.isLeadTraveler &&
                !assignment.isLeadTraveler &&
                t.travelerNumber === assignment.travelerNumber)
          );
          return !travelerInDB;
        }
      );

      if (missingTravelers.length > 0) {
        throw new Error(
          `No se encontraron ${missingTravelers.length} viajero(s) en la base de datos. Por favor, recarga la página.`
        );
      }

      // Hacer eliminación y creación en paralelo por grupos

      // Eliminar asignaciones existentes en paralelo (máximo 5 a la vez)
      const deletePromises = currentTravelers.map((traveler) =>
        firstValueFrom(
          this.reservationTravelerAccommodationService.deleteByReservationTraveler(
            traveler.id
          )
        )
      );

      // Ejecutar eliminaciones en chunks para no sobrecargar
      const chunkSize = 5;
      for (let i = 0; i < deletePromises.length; i += chunkSize) {
        const chunk = deletePromises.slice(i, i + chunkSize);
        await Promise.all(chunk);
      }

      // Crear nuevas asignaciones en paralelo
      const createPromises = this.currentRoomAssignments
        .map((assignment) => {
          const travelerInDB = currentTravelers.find(
            (t) =>
              (t.isLeadTraveler && assignment.isLeadTraveler) ||
              (!t.isLeadTraveler &&
                !assignment.isLeadTraveler &&
                t.travelerNumber === assignment.travelerNumber)
          );

          if (travelerInDB) {
            return firstValueFrom(
              this.reservationTravelerAccommodationService.create({
                id: 0,
                reservationTravelerId: travelerInDB.id,
                departureAccommodationId: assignment.departureAccommodationId,
              })
            );
          } else {
            return Promise.resolve(null);
          }
        })
        .filter((promise) => promise !== null);

      // Ejecutar creaciones en chunks para mejor rendimiento
      const results = [];
      for (let i = 0; i < createPromises.length; i += chunkSize) {
        const chunk = createPromises.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(chunk);
        results.push(...chunkResults);
      }

      // Recargar las asignaciones después de guardar
      await this.loadExistingTravelerAccommodations();

      return true;
    } catch (error) {
      // Determinar el tipo de error y mensaje específico
      let errorMessage = 'Error al guardar las asignaciones de habitaciones';
      let errorDetail = '';

      if (error instanceof Error) {
        if (error.message.includes('foreign key constraint fails')) {
          errorMessage = 'Error de integridad de datos';
          errorDetail =
            'Los datos de viajeros no están sincronizados. Por favor, recarga la página.';
        } else if (error.message.includes('No se encontraron')) {
          errorMessage = 'Viajeros faltantes';
          errorDetail = error.message;
        } else {
          errorDetail = error.message;
        }
      }

      // Mostrar toast de error específico
      this.messageService.add({
        severity: 'error',
        summary: errorMessage,
        detail: errorDetail,
        life: 5000,
      });

      return false;
    } finally {
      // Ocultar indicador de guardado
      this.saving = false;
      
      // Emitir que se actualizaron las habitaciones (éxito o error)
      this.emitRoomsUpdated();
    }
  }

  // Verificar si hay bebés
  get hasBabies(): boolean {
    const travelersNumbers = this.travelersNumbersSource.getValue();
    return travelersNumbers.babies > 0;
  }

  // Obtener el total de viajeros
  getTotalTravelers(): number {
    const travelersNumbers = this.travelersNumbersSource.getValue();
    return travelersNumbers.adults + travelersNumbers.childs + travelersNumbers.babies;
  }

  // Verificar opciones de habitaciones compartidas
  get hasSharedRoomsOption(): boolean {
    return this.allRoomsAvailability.some((room) => room.isShared);
  }

  // Verificar si hay habitación compartida seleccionada
  get isSharedRoomSelected(): boolean {
    return Object.keys(this.selectedRooms).some((tkId) => {
      const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);
      return room && room.isShared && this.selectedRooms[tkId] > 0;
    });
  }

  // Obtener el número de viajeros sin asignar
  get unassignedTravelersCount(): number {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      return 0;
    }

    // Contar cuántos viajeros están asignados actualmente
    const assignedTravelers = this.currentRoomAssignments.length;
    const totalTravelers = this.existingTravelers.length;

    return totalTravelers - assignedTravelers;
  }

  // Verificar si hay viajeros sin asignar
  get hasUnassignedTravelers(): boolean {
    return this.unassignedTravelersCount > 0;
  }

  // Obtener mensaje descriptivo de viajeros sin asignar
  get unassignedTravelersMessage(): string {
    const count = this.unassignedTravelersCount;
    if (count === 0) return '';
    
    const plural = count > 1 ? 's' : '';
    const totalTravelers = this.existingTravelers.length;
    const assignedCount = this.currentRoomAssignments.length;
    
    return `${assignedCount} de ${totalTravelers} viajero${totalTravelers > 1 ? 's' : ''} asignado${assignedCount > 1 ? 's' : ''}. Quedan ${count} viajero${plural} sin asignar. Por favor, selecciona las habitaciones necesarias.`;
  }

  // Obtener el total de plazas seleccionadas en habitaciones
  get totalSelectedPlaces(): number {
    return Object.keys(this.selectedRooms).reduce((total, tkId) => {
      const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);
      const qty = this.selectedRooms[tkId];
      
      if (room && qty > 0) {
        const capacity = room.isShared ? 1 : (room.capacity || 0);
        return total + (capacity * qty);
      }
      
      return total;
    }, 0);
  }

  // Método para actualizar desde componente padre
  updateTravelersNumbers(travelersNumbers: {
    adults: number;
    childs: number;
    babies: number;
  }): void {
    // Asegurar que las propiedades no sean undefined
    const safeTravelersNumbers = {
      adults: travelersNumbers.adults || 0,
      childs: travelersNumbers.childs || 0,
      babies: travelersNumbers.babies || 0,
    };

    this.travelersNumbersSource.next(safeTravelersNumbers);
  }

  // Método para obtener travelers (si se necesita)
  getTravelers(): IReservationTravelerResponse[] {
    return this.existingTravelers;
  }

  // NUEVO: Método público para cargar viajeros existentes (compatibilidad con componente padre)
  async loadExistingTravelers(): Promise<void> {
    await this.loadTravelersIndependently();
  }

  // NUEVO: Método público para recargar cuando cambien los viajeros
  async reloadOnTravelersChange(): Promise<void> {
    try {
      // Recargar viajeros
      await this.loadTravelersIndependently();

      // Actualizar contadores de viajeros basándose en los viajeros reales
      this.updateTravelersNumbersFromExistingTravelers();

      // Cargar asignaciones existentes SIN validar ni limpiar
      // (dejar que el usuario ajuste manualmente si es necesario)
      if (this.existingTravelers.length > 0) {
        await this.loadExistingTravelerAccommodations();
        
        // Solo construir asignaciones desde BD sin validar
        if (this.existingTravelerAccommodations.length > 0) {
          this.currentRoomAssignments = this.buildAssignmentsFromDB();
          this.syncSelectedRoomsFromAssignments();
        }
      }

      // Actualizar UI sin redistribuir
      this.updateUIWithoutDistribution();
    } catch (error) {
      console.error('❌ Error al recargar habitaciones:', error);
      this.errorMsg = 'Error al recargar las habitaciones.';
      this.errorMsgType = 'error';
    }
  }

  // NUEVO: Método para actualizar contadores de viajeros desde viajeros reales
  private updateTravelersNumbersFromExistingTravelers(): void {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      return;
    }

    // Contar adultos y niños usando los métodos de validación existentes
    const adults = this.existingTravelers.filter((t) => 
      this.isAdultTraveler(t)
    ).length;
    
    const children = this.existingTravelers.filter((t) => 
      this.isChildTraveler(t)
    ).length;

    // Calcular bebés: viajeros que no son adultos ni niños
    // (esto incluye bebés que están fuera de los rangos de edad)
    const babies = this.existingTravelers.length - adults - children;

    // Actualizar el BehaviorSubject con los conteos reales
    this.travelersNumbersSource.next({
      adults: adults,
      childs: children,
      babies: babies >= 0 ? babies : 0 // Asegurar que no sea negativo
    });
  }

  // Métodos auxiliares para manejo de cambios de viajeros
  private getPreviousTotalTravelers(): number {
    return this.previousTotalTravelers;
  }

  private setPreviousTotalTravelers(total: number): void {
    this.previousTotalTravelers = total;
  }

  private handleTravelerNumberChange(
    newTotalTravelers: number,
    travelerData: { adults: number; childs: number; babies: number }
  ): void {
    // Limpiar selecciones inválidas
    this.clearInvalidRoomSelections(newTotalTravelers);

    // Filtrar habitaciones disponibles
    this.filterRooms(newTotalTravelers);

    // Actualizar UI
    this.updateRooms();

    // Mostrar mensaje informativo si se limpiaron selecciones
    this.showRoomUpdateMessage(newTotalTravelers, travelerData);
  }

  private clearInvalidRoomSelections(newTotalTravelers: number): void {
    const roomsToRemove: string[] = [];

    Object.entries(this.selectedRooms).forEach(([tkId, qty]) => {
      if (qty > 0) {
        const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);

        // Verificar si la habitación ya no es válida
        if (room) {
          const roomCapacity = room.capacity || 1;
          const isRoomValid =
            room.isShared || roomCapacity <= newTotalTravelers;

          if (!isRoomValid) {
            roomsToRemove.push(tkId);
          }
        }
      }
    });

    // Remover habitaciones inválidas
    roomsToRemove.forEach((tkId) => {
      delete this.selectedRooms[tkId];
    });

    if (roomsToRemove.length > 0) {
    }
  }

  private showRoomUpdateMessage(
    newTotalTravelers: number,
    travelerData: { adults: number; childs: number; babies: number }
  ): void {
    const hasSelectedRooms = Object.values(this.selectedRooms).some(
      (qty) => qty > 0
    );

    if (hasSelectedRooms) {
      this.messageService.add({
        severity: 'info',
        summary: 'Habitaciones actualizadas',
        detail: `Se han actualizado las habitaciones disponibles para ${newTotalTravelers} viajero(s)`,
        life: 3000,
      });
    }
  }
}
