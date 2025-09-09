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
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerAccommodationService,
  IReservationTravelerAccommodationResponse,
} from '../../../../core/services/reservation/reservation-traveler-accommodation.service';
import { BehaviorSubject, forkJoin, throwError, Subject, from } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  takeUntil,
  tap,
  switchMap,
} from 'rxjs/operators';
import {
  AgeGroupFilters,
  AgeGroupService,
} from '../../../../core/services/agegroup/age-group.service';
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
}

interface TravelerRoomAssignment {
  travelerId: number;
  travelerNumber: number;
  isLeadTraveler: boolean;
  roomId: number;
  roomTkId: string;
  roomName: string;
  departureAccommodationId: number;
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

  // Output para notificar cambios en habitaciones al componente padre
  @Output() roomsSelectionChange = new EventEmitter<{
    [tkId: string]: number;
  }>();

  // NUEVO: Output para notificar que se necesita recargar
  @Output() travelersChanged = new EventEmitter<void>();
  @Output() saveStatusChange = new EventEmitter<{
    saving: boolean;
    success?: boolean;
    error?: string;
  }>();

  // NUEVO: Output para notificar guardado exitoso al componente padre
  @Output() saveCompleted = new EventEmitter<{
    component: 'selector-room';
    success: boolean;
    data?: any;
    error?: string;
  }>();

  // Propiedades principales
  roomsAvailabilityForTravelersNumber: RoomAvailability[] = [];
  allRoomsAvailability: RoomAvailability[] = [];
  selectedRooms: { [tkId: string]: number } = {};
  errorMsg: string | null = null;

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

  // Información de viajeros
  travelers: {
    adults: number;
    childs: number;
    babies: number;
  } = { adults: 0, childs: 0, babies: 0 };

  // Datos de travelers existentes en la reserva
  existingTravelers: IReservationTravelerResponse[] = [];
  accommodationTypes: IDepartureAccommodationTypeResponse[] = [];

  // Para almacenar asignaciones existentes de habitaciones
  existingTravelerAccommodations: IReservationTravelerAccommodationResponse[] =
    [];

  // Para mostrar qué habitación está asignada a cada traveler
  travelerRoomAssignments: TravelerRoomAssignment[] = [];

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
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerAccommodationService: ReservationTravelerAccommodationService,
    private ageGroupService: AgeGroupService,
    private messageService: MessageService
  ) {
    // Suscripción a cambios de travelers
    this.travelersNumbers$.subscribe((data) => {
      const newTotalTravelers = data.adults + data.childs + data.babies;
      const previousTotalTravelers = this.getPreviousTotalTravelers();

      console.log('ROOM_VALIDATION: 🔄 Cambio detectado en viajeros:', {
        anterior: previousTotalTravelers,
        nuevo: newTotalTravelers,
        adultos: data.adults,
        niños: data.childs,
        bebés: data.babies,
      });

      // Solo procesar si realmente cambió el número de viajeros
      if (previousTotalTravelers !== newTotalTravelers) {
        this.handleTravelerNumberChange(newTotalTravelers, data);
      }

      // Actualizar el total anterior
      this.setPreviousTotalTravelers(newTotalTravelers);
    });

    // Suscripción a habitaciones seleccionadas
    this.selectedRooms$.subscribe((rooms) => {
      this.selectedRooms = rooms.reduce((acc, room) => {
        acc[room.tkId] = room.qty || 0;
        return acc;
      }, {} as { [tkId: string]: number });
    });

    // Configurar debounce para guardado automático
    this.saveSubject
      .pipe(
        debounceTime(1000), // 1 segundo de debounce
        tap(() => {
          console.log('ROOM_VALIDATION: ⏳ Iniciando guardado con debounce...');
        }),
        switchMap(() => {
          // Convertir la promesa en observable
          return from(this.saveRoomAssignments());
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (success) => {
          console.log('ROOM_VALIDATION: ✅ Guardado completado:', success);
        },
        error: (error) => {
          console.error('ROOM_VALIDATION: ❌ Error en guardado:', error);
        },
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
      const travelers = await this.reservationTravelerService
        .getByReservationOrdered(this.reservationId)
        .toPromise();

      this.existingTravelers = travelers || [];
      this.loadingTravelers = false;

      return this.existingTravelers;
    } catch (error) {
      this.travelersError = 'Error al cargar los viajeros';
      this.loadingTravelers = false;
      console.error('Error loading travelers:', error);
      return [];
    }
  }

  // Método para inicializar el componente con carga paralela
  async initializeComponent(): Promise<void> {
    if (!this.departureId) return;

    try {
      // Cargar datos básicos en paralelo
      const [accommodations, types] = await Promise.all([
        this.departureAccommodationService
          .getByDeparture(this.departureId!)
          .toPromise(),
        this.departureAccommodationTypeService.getAll().toPromise(),
      ]);

      this.processBasicData(accommodations || [], types || []);

      // Cargar precios, viajeros y grupos de edad en paralelo
      const [prices, travelers] = await Promise.all([
        this.departureAccommodationPriceService
          .getByDeparture(this.departureId!)
          .toPromise(),
        this.loadTravelersIndependently(), // NUEVO: Carga independiente
      ]);

      // Cargar grupos de edad para validaciones
      await this.loadAgeGroupsForValidation();

      this.assignPricesToRooms(prices || []);

      // Procesar viajeros si existen
      if (travelers && travelers.length > 0) {
        await this.loadExistingTravelerAccommodations();
      }

      this.updateUIFromData();
      this.emitRoomsSelectionChange();
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
    }));

    // Asignar tipos de alojamiento
    this.accommodationTypes = types;
    this.updateRoomSharedStatus();
  }

  // Método para emitir cambios de habitaciones
  private emitRoomsSelectionChange(): void {
    this.roomsSelectionChange.emit(this.selectedRooms);
  }

  // Método para actualizar la UI después de cargar todos los datos
  updateUIFromData(): void {
    // Ordenar por capacidad
    this.allRoomsAvailability.sort(
      (a, b) => (a.capacity || 0) - (b.capacity || 0)
    );

    // Obtener asignaciones existentes de travelers
    const travelersRoomAssignments = this.initializeRoomsFromTravelers();

    // Inicializar selectedRooms con las asignaciones existentes
    this.selectedRooms = {};
    this.allRoomsAvailability.forEach((room) => {
      this.selectedRooms[room.tkId] = travelersRoomAssignments[room.tkId] || 0;
    });

    // Filtrar habitaciones
    const initialTravelers = this.travelersNumbersSource.getValue();
    const totalTravelers =
      initialTravelers.adults +
      initialTravelers.childs +
      initialTravelers.babies;
    this.filterRooms(totalTravelers);

    // Inicializar el total anterior de viajeros
    this.setPreviousTotalTravelers(totalTravelers);

    // Limpiar errores de inicialización
    this.errorMsg = null;
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
    const adultAgeGroups = await this.ageGroupService
      .getByCode('ADULT')
      .toPromise();
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
  createTravelerRoomAssignments(): void {
    this.travelerRoomAssignments = [];

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
          this.travelerRoomAssignments.push({
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

  // Verificar si hay bebés
  hasBabies(): boolean {
    return this.travelers.babies > 0;
  }

  // NUEVO: Métodos auxiliares para identificar tipos de viajeros
  private isAdultTraveler(traveler: IReservationTravelerResponse): boolean {
    // Si no hay grupos de edad cargados, asumir que todos son adultos
    if (this.adultAgeGroupIds.length === 0) {
      console.log(
        'ROOM_VALIDATION: ⚠️ No hay adultAgeGroupIds cargados, asumiendo adulto'
      );
      return true;
    }
    return this.adultAgeGroupIds.includes(traveler.ageGroupId);
  }

  private isChildTraveler(traveler: IReservationTravelerResponse): boolean {
    // Si no hay grupos de edad cargados, asumir que no hay niños
    if (this.childAgeGroupIds.length === 0) {
      console.log(
        'ROOM_VALIDATION: ⚠️ No hay childAgeGroupIds cargados, asumiendo no es niño'
      );
      return false;
    }
    return this.childAgeGroupIds.includes(traveler.ageGroupId);
  }

  // NUEVO: Método para cargar grupos de edad y configurar validaciones
  private async loadAgeGroupsForValidation(): Promise<void> {
    try {
      // Usar los métodos del servicio que ahora combinan límites de edad + nombre/código
      const [adultGroups, childGroups, allGroups] = await Promise.all([
        this.ageGroupService.getAdultGroups().toPromise(),
        this.ageGroupService.getChildGroups().toPromise(),
        this.ageGroupService.getAll().toPromise(),
      ]);

      // Extraer IDs de grupos de adultos
      this.adultAgeGroupIds = (adultGroups || []).map((group) => group.id);

      // Extraer IDs de grupos de niños
      this.childAgeGroupIds = (childGroups || []).map((group) => group.id);

      // Debug: Mostrar información de todos los grupos de edad
      console.log(
        'ROOM_VALIDATION: 📋 Todos los grupos de edad:',
        (allGroups || []).map((g) => ({
          id: g.id,
          name: g.name,
          lowerLimitAge: g.lowerLimitAge,
          upperLimitAge: g.upperLimitAge,
          code: g.code,
        }))
      );

      console.log(
        'ROOM_VALIDATION: Adult age group IDs:',
        this.adultAgeGroupIds
      );
      console.log(
        'ROOM_VALIDATION: Child age group IDs:',
        this.childAgeGroupIds
      );

      // Mostrar qué grupos se identificaron como adultos y niños
      console.log(
        'ROOM_VALIDATION: 🔍 Adultos identificados:',
        (adultGroups || []).map((g) => ({
          id: g.id,
          name: g.name,
          code: g.code,
          method:
            g.lowerLimitAge !== undefined && g.lowerLimitAge >= 18
              ? 'límite_edad'
              : 'nombre/código',
        }))
      );

      console.log(
        'ROOM_VALIDATION: 🔍 Niños identificados:',
        (childGroups || []).map((g) => ({
          id: g.id,
          name: g.name,
          code: g.code,
          method:
            g.upperLimitAge !== undefined && g.upperLimitAge < 18
              ? 'límite_edad'
              : 'nombre/código',
        }))
      );
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

    console.log('ROOM_VALIDATION: 🔍 Debug validateChildrenAssignments:', {
      totalTravelers: this.existingTravelers.length,
      adults: adults.length,
      children: children.length,
      adultAgeGroupIds: this.adultAgeGroupIds,
      childAgeGroupIds: this.childAgeGroupIds,
      travelers: this.existingTravelers.map((t) => ({
        id: t.id,
        ageGroupId: t.ageGroupId,
      })),
    });

    if (children.length === 0) {
      console.log('ROOM_VALIDATION: ✅ No hay niños, validación exitosa');
      return { isValid: true, errorMessage: '' };
    }

    // Verificar que hay suficientes adultos para acompañar a los niños
    if (adults.length === 0) {
      console.log('ROOM_VALIDATION: ❌ Hay niños pero no hay adultos');
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

        // Buscar si hay un adulto en la misma habitación
        const hasAdultInSameRoom = this.currentRoomAssignments.some(
          (otherAssignment) => {
            if (otherAssignment.travelerId === assignment.travelerId) {
              return false;
            }

            const otherTraveler = this.existingTravelers.find(
              (t) => t.id === otherAssignment.travelerId
            );
            return (
              otherAssignment.roomId === assignment.roomId &&
              otherTraveler &&
              this.isAdultTraveler(otherTraveler)
            );
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
      .filter((room) => room.qty > 0);

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
        return room.capacity <= totalTravelers;
      }
    );
  }

  // Manejar cambios en selección
  onRoomSpacesChange(changedRoom: RoomAvailability, newValue: number): void {
    if (newValue === 0) {
      delete this.selectedRooms[changedRoom.tkId];
    } else {
      this.selectedRooms[changedRoom.tkId] = newValue;
    }

    // Validar selecciones antes de continuar
    const validationResult = this.validateRoomSelections();
    if (!validationResult.isValid) {
      this.errorMsg = validationResult.message;
      return;
    }

    // Emitir cambios al componente padre
    this.roomsSelectionChange.emit(this.selectedRooms);

    this.updateRooms();

    // NUEVO: Guardar con debounce para no interferir con la selección del usuario
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
      this.updateSelectedRooms(updatedRooms);
      return;
    }

    // Usar la nueva validación
    const validationResult = this.validateRoomSelections();
    if (!validationResult.isValid) {
      this.errorMsg = validationResult.message;
      return;
    }

    // Limpiar errores si la validación es exitosa
    this.errorMsg = null;

    // Distribuir camas entre travelers
    if (hasSelectedRooms) {
      this.distributeRoomsToTravelers(updatedRooms.filter((r) => r.qty! > 0));
    }

    // Actualizar servicio (simulado)
    this.updateSelectedRooms(updatedRooms);
  }

  // Método para distribuir habitaciones entre travelers
  distributeRoomsToTravelers(selectedRooms: RoomAvailability[]): void {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      return;
    }

    // Ordenar travelers: Lead traveler primero, luego por ID
    const sortedTravelers = [...this.existingTravelers].sort((a, b) => {
      if (a.isLeadTraveler && !b.isLeadTraveler) return -1;
      if (!a.isLeadTraveler && b.isLeadTraveler) return 1;
      return a.id - b.id; // Ordenar por ID
    });

    // Crear lista de todas las camas disponibles
    const availableBeds: Array<{
      roomId: number;
      roomTkId: string;
      roomName: string;
      departureAccommodationId: number;
      bedNumber: number;
      capacity: number;
      isShared: boolean;
    }> = [];

    selectedRooms.forEach((room) => {
      const roomQty = room.qty || 0;

      for (let roomInstance = 1; roomInstance <= roomQty; roomInstance++) {
        const bedCapacity = room.isShared ? 1 : room.capacity || 1;

        for (let bedNumber = 1; bedNumber <= bedCapacity; bedNumber++) {
          availableBeds.push({
            roomId: room.id,
            roomTkId: room.tkId,
            roomName: room.name || 'Habitación sin nombre',
            departureAccommodationId: room.id, // Este es el departureAccommodationId
            bedNumber: room.isShared ? 1 : bedNumber, // Habitaciones compartidas siempre bed 1
            capacity: bedCapacity,
            isShared: room.isShared || false,
          });
        }
      }
    });

    // Distribuir camas a travelers
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
    }> = [];

    sortedTravelers.forEach((traveler, index) => {
      if (index < availableBeds.length) {
        const assignedBed = availableBeds[index];
        roomAssignments.push({
          travelerId: traveler.id,
          travelerNumber: traveler.travelerNumber,
          isLeadTraveler: traveler.isLeadTraveler,
          roomId: assignedBed.roomId,
          roomTkId: assignedBed.roomTkId,
          roomName: assignedBed.roomName,
          departureAccommodationId: assignedBed.departureAccommodationId,
          bedNumber: assignedBed.bedNumber,
          isShared: assignedBed.isShared,
        });
      }
    });

    // NUEVO: Validar asignaciones de niños antes de guardar
    this.currentRoomAssignments = roomAssignments;

    // Solo validar si hay habitaciones seleccionadas y viajeros
    if (roomAssignments.length > 0) {
      const validation = this.validateChildrenAssignments();
      if (!validation.isValid) {
        this.errorMsg = validation.errorMessage;
        this.currentRoomAssignments = []; // Limpiar asignaciones inválidas
        return;
      }
    }

    this.errorMsg = null; // Limpiar errores si la validación es exitosa
  }

  // Método para trigger del guardado con debounce
  private debouncedSave(): void {
    if (!this.reservationId) {
      return;
    }

    // Solo emitir el evento, el debounce ya está configurado en el constructor
    this.saveSubject.next();
  }

  // Método auxiliar para generar asignaciones de habitaciones sin modificar el estado
  private generateRoomAssignments(selectedRooms: RoomAvailability[]): any[] {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      return [];
    }

    const roomAssignments: any[] = [];
    let travelerIndex = 0;

    selectedRooms.forEach((room) => {
      const qty = room.qty || 0;
      for (let i = 0; i < qty; i++) {
        if (travelerIndex < this.existingTravelers.length) {
          const traveler = this.existingTravelers[travelerIndex];
          roomAssignments.push({
            travelerId: traveler.id,
            roomId: room.tkId,
            departureAccommodationId: room.id,
            isLeadTraveler: traveler.isLeadTraveler,
            travelerNumber: traveler.travelerNumber,
          });
          travelerIndex++;
        }
      }
    });

    return roomAssignments;
  }

  // Método auxiliar para validar asignaciones de niños con asignaciones específicas
  private validateChildrenAssignmentsWithAssignments(assignments: any[]): {
    isValid: boolean;
    errorMessage: string;
  } {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      const travelerNumbers = this.travelersNumbersSource.getValue();
      const adults = travelerNumbers.adults;
      const children = travelerNumbers.childs;

      if (children === 0) {
        return { isValid: true, errorMessage: '' };
      }
      if (adults === 0) {
        return {
          isValid: false,
          errorMessage:
            'Debe haber al menos un adulto para acompañar a los niños.',
        };
      }
      return { isValid: true, errorMessage: '' };
    }

    const adults = this.existingTravelers.filter((t) =>
      this.isAdultTraveler(t)
    );
    const children = this.existingTravelers.filter((t) =>
      this.isChildTraveler(t)
    );

    if (children.length === 0) {
      return { isValid: true, errorMessage: '' };
    }
    if (adults.length === 0) {
      return {
        isValid: false,
        errorMessage:
          'Debe haber al menos un adulto para acompañar a los niños.',
      };
    }

    // Verificar que cada niño tenga un adulto asignado en la misma habitación
    const invalidAssignments = assignments.filter((assignment) => {
      const traveler = this.existingTravelers.find(
        (t) => t.id === assignment.travelerId
      );
      if (!traveler || !this.isChildTraveler(traveler)) {
        return false;
      }

      // Buscar si hay un adulto en la misma habitación
      const hasAdultInSameRoom = assignments.some((otherAssignment) => {
        if (otherAssignment.travelerId === assignment.travelerId) {
          return false;
        }
        const otherTraveler = this.existingTravelers.find(
          (t) => t.id === otherAssignment.travelerId
        );
        return (
          otherAssignment.roomId === assignment.roomId &&
          otherTraveler &&
          this.isAdultTraveler(otherTraveler)
        );
      });

      return !hasAdultInSameRoom;
    });

    if (invalidAssignments.length > 0) {
      return {
        isValid: false,
        errorMessage:
          'Los niños no pueden estar solos en una habitación. Deben estar acompañados por un adulto.',
      };
    }

    return { isValid: true, errorMessage: '' };
  }

  // Método para guardar las asignaciones de habitaciones
  async saveRoomAssignments(): Promise<boolean> {
    if (!this.reservationId) {
      return false;
    }

    // Validar que no hay errores antes de guardar
    const validationResult = this.validateRoomSelections();
    if (!validationResult.isValid) {
      console.log(
        'ROOM_VALIDATION: ❌ No se puede guardar debido a errores de validación:',
        validationResult.message
      );
      this.errorMsg = validationResult.message;
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
      // Generar distribución temporal para validar
      const tempAssignments = this.generateRoomAssignments(
        selectedRoomsWithQty as RoomAvailability[]
      );
      const childrenValidation =
        this.validateChildrenAssignmentsWithAssignments(tempAssignments);

      if (!childrenValidation.isValid) {
        console.log(
          'ROOM_VALIDATION: ❌ No se puede guardar debido a validación de niños:',
          childrenValidation.errorMessage
        );
        this.errorMsg = childrenValidation.errorMessage;
        return false;
      }
    }

    // Mostrar indicador de guardado
    this.saving = true;
    this.showSavingToast();

    // Emitir evento de inicio de guardado
    this.saveStatusChange.emit({ saving: true });

    try {
      // Siempre recargar travelers para asegurar datos actualizados
      console.log(
        'ROOM_VALIDATION: 🔄 Recargando viajeros antes de guardar...'
      );
      const currentTravelers =
        (await this.reservationTravelerService
          .getByReservationOrdered(this.reservationId)
          .toPromise()) || [];

      this.existingTravelers = currentTravelers;

      if (!currentTravelers || currentTravelers.length === 0) {
        console.error('ROOM_VALIDATION: ❌ No hay viajeros en la reserva');
        throw new Error(
          'No se encontraron viajeros en la reserva. Por favor, verifica los datos.'
        );
      }

      console.log(
        'ROOM_VALIDATION: ✅ Viajeros cargados:',
        currentTravelers.map((t) => ({
          id: t.id,
          travelerNumber: t.travelerNumber,
          isLeadTraveler: t.isLeadTraveler,
        }))
      );

      // Verificar que hay habitaciones seleccionadas
      const selectedRoomsWithQty = Object.keys(this.selectedRooms)
        .filter((tkId) => this.selectedRooms[tkId] > 0)
        .map((tkId) => {
          const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);
          return { ...room, qty: this.selectedRooms[tkId] };
        })
        .filter((room) => room.qty > 0);

      if (selectedRoomsWithQty.length === 0) {
        return false;
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
        console.error(
          'ROOM_VALIDATION: ❌ Viajeros faltantes en DB:',
          missingTravelers
        );
        throw new Error(
          `No se encontraron ${missingTravelers.length} viajero(s) en la base de datos. Por favor, recarga la página.`
        );
      }

      // Hacer eliminación y creación en paralelo por grupos

      // Eliminar asignaciones existentes en paralelo (máximo 5 a la vez)
      const deletePromises = currentTravelers.map((traveler) =>
        this.reservationTravelerAccommodationService
          .deleteByReservationTraveler(traveler.id)
          .toPromise()
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
            console.log(
              'ROOM_VALIDATION: ✅ Creando asignación para viajero:',
              {
                travelerId: travelerInDB.id,
                travelerNumber: travelerInDB.travelerNumber,
                isLeadTraveler: travelerInDB.isLeadTraveler,
                accommodationId: assignment.departureAccommodationId,
              }
            );

            return this.reservationTravelerAccommodationService
              .create({
                id: 0,
                reservationTravelerId: travelerInDB.id,
                departureAccommodationId: assignment.departureAccommodationId,
              })
              .toPromise();
          } else {
            console.error(
              'ROOM_VALIDATION: ❌ No se encontró viajero en DB para asignación:',
              {
                assignmentTravelerNumber: assignment.travelerNumber,
                assignmentIsLeadTraveler: assignment.isLeadTraveler,
                availableTravelers: currentTravelers.map((t) => ({
                  id: t.id,
                  travelerNumber: t.travelerNumber,
                  isLeadTraveler: t.isLeadTraveler,
                })),
              }
            );
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

      // Mostrar toast de éxito
      this.showSuccessToast();

      // Emitir eventos de éxito
      this.saveStatusChange.emit({ saving: false, success: true });
      this.saveCompleted.emit({
        component: 'selector-room',
        success: true,
        data: this.currentRoomAssignments,
      });

      return true;
    } catch (error) {
      console.error('ROOM_VALIDATION: ❌ Error completo en guardado:', error);

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

      // Emitir eventos de error
      this.saveStatusChange.emit({
        saving: false,
        success: false,
        error: errorMessage,
      });
      this.saveCompleted.emit({
        component: 'selector-room',
        success: false,
        error: errorMessage,
      });

      return false;
    } finally {
      // Ocultar indicador de guardado
      this.saving = false;
    }
  }

  // Método para verificar si hay asignaciones válidas para guardar
  get hasValidAssignments(): boolean {
    return (
      this.currentRoomAssignments.length > 0 &&
      this.currentRoomAssignments.length === this.existingTravelers.length
    );
  }

  // Método para obtener el resumen de asignaciones
  getAssignmentsSummary(): string {
    if (this.currentRoomAssignments.length === 0) {
      return 'Sin asignaciones de habitaciones';
    }

    const roomGroups = this.currentRoomAssignments.reduce(
      (groups, assignment) => {
        if (!groups[assignment.roomName]) {
          groups[assignment.roomName] = 0;
        }
        groups[assignment.roomName]++;
        return groups;
      },
      {} as Record<string, number>
    );

    const summary = Object.entries(roomGroups)
      .map(([roomName, count]) => `${count}x ${roomName}`)
      .join(', ');

    return summary;
  }

  // Método para obtener las asignaciones existentes desde la BD
  getTravelerRoomAssignments(): TravelerRoomAssignment[] {
    return this.travelerRoomAssignments;
  }

  // Método para obtener qué habitación tiene asignada un traveler específico
  getTravelerAssignedRoom(travelerId: number): string | null {
    const assignment = this.travelerRoomAssignments.find(
      (assign) => assign.travelerId === travelerId
    );
    return assignment ? assignment.roomName : null;
  }

  // Método para verificar si un traveler tiene habitación asignada
  hasTravelerRoomAssigned(travelerId: number): boolean {
    return this.travelerRoomAssignments.some(
      (assign) => assign.travelerId === travelerId
    );
  }

  // Actualizar servicio de habitaciones
  updateSelectedRooms(rooms: RoomAvailability[]): void {
    // Simular actualización de servicio
    this.selectedRoomsSource.next(rooms);
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

    this.travelers = safeTravelersNumbers;
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
    console.log('🔄 Recargando habitaciones por cambio de viajeros...');

    try {
      // Emitir evento de cambio de viajeros
      this.travelersChanged.emit();

      // Recargar viajeros
      await this.loadTravelersIndependently();

      // Recargar asignaciones existentes
      if (this.existingTravelers.length > 0) {
        await this.loadExistingTravelerAccommodations();
      }

      // Recalcular distribución de habitaciones
      this.recalculateRoomDistribution();

      // Actualizar UI
      this.updateUIFromData();

      console.log('✅ Habitaciones recargadas correctamente');
    } catch (error) {
      console.error('❌ Error recargando habitaciones:', error);
      this.errorMsg = 'Error al recargar las habitaciones.';
    }
  }

  // NUEVO: Método para recalcular distribución de habitaciones
  private recalculateRoomDistribution(): void {
    if (this.existingTravelers.length === 0) {
      return;
    }

    // Obtener habitaciones seleccionadas actualmente
    const selectedRoomsWithQty = Object.keys(this.selectedRooms)
      .filter((tkId) => this.selectedRooms[tkId] > 0)
      .map((tkId) => {
        const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);
        return { ...room, qty: this.selectedRooms[tkId] };
      })
      .filter((room) => room.qty > 0);

    if (selectedRoomsWithQty.length > 0) {
      this.distributeRoomsToTravelers(
        selectedRoomsWithQty as RoomAvailability[]
      );
    }
  }

  // Métodos para mostrar toasts
  private showSavingToast(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Guardando...',
      detail: 'Actualizando asignaciones de habitaciones',
      life: 2000,
    });
  }

  private showSuccessToast(): void {
    this.messageService.add({
      severity: 'success',
      summary: '¡Guardado!',
      detail: 'Asignaciones de habitaciones actualizadas correctamente',
      life: 3000,
    });
  }

  private showErrorToast(): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudieron guardar las asignaciones de habitaciones',
      life: 4000,
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
    console.log('ROOM_VALIDATION: 🔄 Procesando cambio de viajeros...');

    // Limpiar selecciones inválidas
    this.clearInvalidRoomSelections(newTotalTravelers);

    // Filtrar habitaciones disponibles
    this.filterRooms(newTotalTravelers);

    // Actualizar UI
    this.updateRooms();

    // Emitir cambios al componente padre
    this.roomsSelectionChange.emit(this.selectedRooms);

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
          const isRoomValid =
            room.isShared || room.capacity <= newTotalTravelers;

          if (!isRoomValid) {
            console.log('ROOM_VALIDATION: 🗑️ Removiendo habitación inválida:', {
              tkId,
              capacidad: room.capacity,
              totalViajeros: newTotalTravelers,
              esCompartida: room.isShared,
            });
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
      console.log('ROOM_VALIDATION: ✅ Habitaciones removidas:', roomsToRemove);
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
