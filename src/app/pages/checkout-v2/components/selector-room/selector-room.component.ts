import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  Output,
  EventEmitter,
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
import { BehaviorSubject, forkJoin, throwError } from 'rxjs';
import { AgeGroupFilters, AgeGroupService } from '../../../../core/services/agegroup/age-group.service';

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
export class SelectorRoomComponent implements OnInit, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;

  // NUEVO: Output para notificar cambios en habitaciones al componente padre
  @Output() roomsSelectionChange = new EventEmitter<{
    [tkId: string]: number;
  }>();

  // Propiedades principales - IGUAL QUE EN EL EJEMPLO
  roomsAvailabilityForTravelersNumber: RoomAvailability[] = [];
  allRoomsAvailability: RoomAvailability[] = [];
  selectedRooms: { [tkId: string]: number } = {};
  errorMsg: string | null = null;

  // Información de viajeros - IGUAL QUE EN EL EJEMPLO
  travelers: {
    adults: number;
    childs: number;
    babies: number;
  } = { adults: 0, childs: 0, babies: 0 };

  // Datos de travelers existentes en la reserva
  existingTravelers: IReservationTravelerResponse[] = [];
  accommodationTypes: IDepartureAccommodationTypeResponse[] = [];

  // NUEVO: Para almacenar asignaciones existentes de habitaciones
  existingTravelerAccommodations: IReservationTravelerAccommodationResponse[] =
    [];

  // NUEVO: Para mostrar qué habitación está asignada a cada traveler
  travelerRoomAssignments: TravelerRoomAssignment[] = [];

  // NUEVO: Para asignaciones de habitaciones
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

  // Simulación de servicios reactivos como en el ejemplo
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
    private ageGroupService: AgeGroupService
  ) {
    // IGUAL QUE EN EL EJEMPLO: Inicializar en constructor

    // IGUAL QUE EN EL EJEMPLO: Suscripción a cambios de travelers
    this.travelersNumbers$.subscribe((data) => {
      const newTotalTravelers = data.adults + data.childs + data.babies;

      // IGUAL QUE EN EL EJEMPLO: Deseleccionar habitaciones que excedan capacidad
      Object.entries(this.selectedRooms).forEach(([tkId, qty]) => {
        const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);
        if (room && room.capacity > newTotalTravelers && qty > 0) {
          // Deseleccionar esta habitación
          delete this.selectedRooms[tkId];
        }
      });

      this.filterRooms(newTotalTravelers);
      this.updateRooms();
    });

    // IGUAL QUE EN EL EJEMPLO: Suscripción a habitaciones seleccionadas
    this.selectedRooms$.subscribe((rooms) => {
      this.selectedRooms = rooms.reduce((acc, room) => {
        acc[room.tkId] = room.qty || 0;
        return acc;
      }, {} as { [tkId: string]: number });
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

  // OPTIMIZADO: Método para inicializar el componente con carga paralela
  async initializeComponent(): Promise<void> {
    if (!this.departureId) return;

    try {
      // OPTIMIZACIÓN: Cargar datos en paralelo para mejorar rendimiento
      const [accommodations, types] = await Promise.all([
        this.departureAccommodationService
          .getByDeparture(this.departureId!)
          .toPromise(),
        this.departureAccommodationTypeService.getAll().toPromise(),
      ]);

      // Procesar datos básicos inmediatamente
      this.processBasicData(accommodations || [], types || []);

      // Cargar precios y travelers en paralelo
      const [prices, travelers] = await Promise.all([
        this.departureAccommodationPriceService
          .getByDeparture(this.departureId!)
          .toPromise(),
        this.reservationId
          ? this.reservationTravelerService
              .getByReservationOrdered(this.reservationId)
              .toPromise()
          : Promise.resolve([]),
      ]);

      // Asignar precios
      this.assignPricesToRooms(prices || []);

      // Procesar travelers si existen
      if (travelers && travelers.length > 0) {
        this.existingTravelers = travelers;
        await this.loadExistingTravelerAccommodations();
      }

      // Actualizar UI y emitir cambios
      this.updateUIFromData();

      // NUEVO: Emitir cambios al componente padre para actualizar el summary
      this.emitRoomsSelectionChange();
    } catch (error) {
      console.error('Error initializing component:', error);
    }
  }

  // NUEVO: Método para procesar datos básicos
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

  // NUEVO: Método para emitir cambios de habitaciones
  private emitRoomsSelectionChange(): void {
    // Emitir los cambios actuales al componente padre
    this.roomsSelectionChange.emit(this.selectedRooms);
  }

  // NUEVO: Versión async de loadReservationModes
  loadReservationModesAsync(): Promise<void> {
    if (!this.departureId) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.departureAccommodationService
        .getByDeparture(this.departureId!)
        .subscribe({
          next: (accommodations: IDepartureAccommodationResponse[]) => {
            this.processAccommodationsAsync(accommodations)
              .then(() => {
                resolve();
              })
              .catch(reject);
          },
          error: reject,
        });
    });
  }

  // NUEVO: Versión async de processAccommodations
  async processAccommodationsAsync(
    accommodations: IDepartureAccommodationResponse[]
  ): Promise<void> {
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

    // Cargar tipos de alojamiento
    await this.loadAccommodationTypesAsync();

    // Cargar precios
    if (this.departureId) {
      await this.loadPricesAsync();
    }
  }

  // NUEVO: Versión async de loadAccommodationTypes
  loadAccommodationTypesAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.departureAccommodationTypeService.getAll().subscribe({
        next: (types) => {
          this.accommodationTypes = types;
          this.updateRoomSharedStatus();
          resolve();
        },
        error: reject,
      });
    });
  }

  // NUEVO: Versión async para cargar precios
  loadPricesAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.departureAccommodationPriceService
        .getByDeparture(this.departureId!)
        .subscribe({
          next: (prices) => {
            this.assignPricesToRooms(prices);
            resolve();
          },
          error: reject,
        });
    });
  }

  // OPTIMIZADO: Método para actualizar la UI después de cargar todos los datos
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

    // Limpiar errores de inicialización
    this.errorMsg = null;

    console.log('Selected rooms initialized:', this.selectedRooms);
  }

  processAccommodations(
    accommodations: IDepartureAccommodationResponse[]
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

    // Cargar tipos de alojamiento para determinar habitaciones compartidas
    this.loadAccommodationTypes();

    // Cargar precios
    if (this.departureId) {
      this.departureAccommodationPriceService
        .getByDeparture(this.departureId)
        .subscribe((prices) => {
          this.assignPricesToRooms(prices);
        });
    }
  }

  loadAccommodationTypes(): void {
    this.departureAccommodationTypeService.getAll().subscribe((types) => {
      this.accommodationTypes = types;
      this.updateRoomSharedStatus();
    });
  }

  updateRoomSharedStatus(): void {
    // IGUAL QUE EN EL EJEMPLO: Detectar habitaciones compartidas
    this.allRoomsAvailability.forEach((room) => {
      const accommodationType = this.accommodationTypes.find(
        (t) => t.id === room.accommodationTypeId
      );
      if (accommodationType) {
        room.isShared = accommodationType.isShared;
      } else {
        // Fallback: detectar por nombre y capacidad como en el ejemplo
        room.isShared =
          room.name?.toLowerCase().includes('individual') ||
          room.name?.toLowerCase().includes('single') ||
          (room.name?.toLowerCase().includes('doble') && room.capacity === 1);
      }
    });
  }

  async assignPricesToRooms(prices: IDepartureAccommodationPriceResponse[]): Promise<void> {
    const adultAgeGroups = await this.ageGroupService.getByCode('ADULT').toPromise();
    const adultAgeGroupId = adultAgeGroups?.[0]?.id ?? throwError(() => new Error('Adult age group not found')); // Default to 1 if not found

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

  loadExistingTravelers(): Promise<void> {
    if (!this.reservationId) return Promise.resolve();

    return new Promise((resolve) => {
      this.reservationTravelerService
        .getByReservationOrdered(this.reservationId!)
        .subscribe((travelers) => {
          this.existingTravelers = travelers;
          // NUEVO: Cargar asignaciones de habitaciones existentes
          this.loadExistingTravelerAccommodations().then(() => {
            resolve();
          });
        });
    });
  }

  // NUEVO: Cargar asignaciones de habitaciones existentes desde la BD
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

        // NUEVO: Crear el mapeo de travelers a habitaciones
        this.createTravelerRoomAssignments();

        resolve();
      });
    });
  }

  // NUEVO: Crear el mapeo de qué habitación tiene asignada cada traveler
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
   * MODIFICADO: Inicializar habitaciones desde travelers existentes usando datos de BD
   */
  initializeRoomsFromTravelers(): { [tkId: string]: number } {
    const roomCounts: { [tkId: string]: number } = {};

    if (
      !this.existingTravelerAccommodations ||
      this.existingTravelerAccommodations.length === 0
    ) {
      console.log('No existing accommodations found');
      return {};
    }

    console.log(
      'Existing accommodations:',
      this.existingTravelerAccommodations
    );
    console.log('All rooms availability:', this.allRoomsAvailability);

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
        console.log(
          `Found traveler in room ${room.name} (${room.tkId}), count: ${
            roomCounts[room.tkId]
          }`
        );
      }
    });

    // Convertir conteos de travelers a cantidades de habitaciones
    const result: { [tkId: string]: number } = {};
    Object.entries(roomCounts).forEach(([roomTkId, travelerCount]) => {
      const room = this.allRoomsAvailability.find((r) => r.tkId === roomTkId);
      if (room && room.capacity) {
        // Calcular cuántas habitaciones se necesitan
        result[roomTkId] = Math.ceil(travelerCount / room.capacity);
        console.log(
          `Room ${room.name}: ${travelerCount} travelers, capacity ${room.capacity}, need ${result[roomTkId]} rooms`
        );
      }
    });

    console.log('Final room assignments:', result);
    return result;
  }

  // IGUAL QUE EN EL EJEMPLO: Verificar si hay bebés
  hasBabies(): boolean {
    return this.travelers.babies > 0;
  }

  // IGUAL QUE EN EL EJEMPLO: Filtrar habitaciones
  filterRooms(totalTravelers: number): void {
    this.roomsAvailabilityForTravelersNumber = this.allRoomsAvailability.filter(
      (room) => {
        // REQUISITO ESPECÍFICO: Habitaciones compartidas siempre aparecen (capacidad = 1)
        if (room.isShared) {
          return true;
        }
        // Habitaciones normales: solo si capacidad <= total travelers
        return room.capacity <= totalTravelers;
      }
    );
  }

  // OPTIMIZADO: Manejar cambios en selección
  onRoomSpacesChange(changedRoom: RoomAvailability, newValue: number): void {
    if (newValue === 0) {
      delete this.selectedRooms[changedRoom.tkId];
    } else {
      this.selectedRooms[changedRoom.tkId] = newValue;
    }

    // NUEVO: Emitir cambios al componente padre
    this.roomsSelectionChange.emit(this.selectedRooms);

    this.updateRooms();
  }

  // IGUAL QUE EN EL EJEMPLO: Actualizar habitaciones
  updateRooms(): void {
    const updatedRooms = Object.keys(this.selectedRooms).map((tkId) => {
      const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);
      return {
        ...room,
        qty: this.selectedRooms[tkId],
      } as RoomAvailability;
    });

    const travelerNumbers = this.travelersNumbersSource.getValue();
    const totalTravelers =
      travelerNumbers.adults + travelerNumbers.childs + travelerNumbers.babies;

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

    // IGUAL QUE EN EL EJEMPLO: Calcular plazas seleccionadas
    const selectedPlaces = updatedRooms.reduce((sum, room) => {
      let roomQty = room.qty || 0;

      if (roomQty > 0) {
        let roomCapacity = room.capacity || 0;

        // REQUISITO ESPECÍFICO: Habitaciones compartidas SIEMPRE cuentan como 1 viajero
        if (room.isShared) {
          roomCapacity = 1;
        }

        return sum + roomCapacity * roomQty;
      }

      return sum;
    }, 0);

    // NUEVO: Distribuir camas entre travelers
    if (hasSelectedRooms) {
      this.distributeRoomsToTravelers(updatedRooms.filter((r) => r.qty! > 0));
    }

    // VALIDACIÓN MODIFICADA: Solo error cuando plazas EXCEDEN travelers
    if (selectedPlaces > totalTravelers) {
      this.errorMsg =
        'Las habitaciones seleccionadas no se corresponden con la cantidad de viajeros.';
    } else {
      this.errorMsg = null;
    }

    // IGUAL QUE EN EL EJEMPLO: Actualizar servicio (simulado)
    this.updateSelectedRooms(updatedRooms);
  }

  // NUEVO: Método para distribuir habitaciones entre travelers
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

    // NUEVO: Guardar asignaciones para usar al guardar
    this.currentRoomAssignments = roomAssignments;
  }

  // NUEVO: Método para guardar las asignaciones de habitaciones (OPTIMIZADO)
  async saveRoomAssignments(): Promise<boolean> {
    if (!this.reservationId) {
      return false;
    }

    try {
      // OPTIMIZACIÓN: Solo recargar travelers si no hay asignaciones actuales
      let currentTravelers = this.existingTravelers;

      if (!currentTravelers || currentTravelers.length === 0) {
        currentTravelers =
          (await this.reservationTravelerService
            .getByReservationOrdered(this.reservationId)
            .toPromise()) || [];
        this.existingTravelers = currentTravelers;
      }

      if (!currentTravelers || currentTravelers.length === 0) {
        return false;
      }

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

      // OPTIMIZACIÓN: Hacer eliminación y creación en paralelo por grupos

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

      // OPTIMIZACIÓN: Crear nuevas asignaciones en paralelo
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
            return this.reservationTravelerAccommodationService
              .create({
                id: 0,
                reservationTravelerId: travelerInDB.id,
                departureAccommodationId: assignment.departureAccommodationId,
              })
              .toPromise();
          }
          return Promise.resolve(null);
        })
        .filter((promise) => promise !== null);

      // Ejecutar creaciones en chunks para mejor rendimiento
      const results = [];
      for (let i = 0; i < createPromises.length; i += chunkSize) {
        const chunk = createPromises.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(chunk);
        results.push(...chunkResults);
      }

      // NUEVO: Recargar las asignaciones después de guardar
      await this.loadExistingTravelerAccommodations();

      return true;
    } catch (error) {
      return false;
    }
  }

  // NUEVO: Método para verificar si hay asignaciones válidas para guardar
  get hasValidAssignments(): boolean {
    return (
      this.currentRoomAssignments.length > 0 &&
      this.currentRoomAssignments.length === this.existingTravelers.length
    );
  }

  // NUEVO: Método para obtener el resumen de asignaciones
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

  // NUEVO: Método para obtener las asignaciones existentes desde la BD
  getTravelerRoomAssignments(): TravelerRoomAssignment[] {
    return this.travelerRoomAssignments;
  }

  // NUEVO: Método para obtener qué habitación tiene asignada un traveler específico
  getTravelerAssignedRoom(travelerId: number): string | null {
    const assignment = this.travelerRoomAssignments.find(
      (assign) => assign.travelerId === travelerId
    );
    return assignment ? assignment.roomName : null;
  }

  // NUEVO: Método para verificar si un traveler tiene habitación asignada
  hasTravelerRoomAssigned(travelerId: number): boolean {
    return this.travelerRoomAssignments.some(
      (assign) => assign.travelerId === travelerId
    );
  }

  // IGUAL QUE EN EL EJEMPLO: Actualizar servicio de habitaciones
  updateSelectedRooms(rooms: RoomAvailability[]): void {
    // Simular actualización de servicio
    this.selectedRoomsSource.next(rooms);
  }

  // IGUAL QUE EN EL EJEMPLO: Verificar opciones de habitaciones compartidas
  get hasSharedRoomsOption(): boolean {
    return this.allRoomsAvailability.some((room) => room.isShared);
  }

  // IGUAL QUE EN EL EJEMPLO: Verificar si hay habitación compartida seleccionada
  get isSharedRoomSelected(): boolean {
    return Object.keys(this.selectedRooms).some((tkId) => {
      const room = this.allRoomsAvailability.find((r) => r.tkId === tkId);
      return room && room.isShared && this.selectedRooms[tkId] > 0;
    });
  }

  // IGUAL QUE EN EL EJEMPLO: Método para actualizar desde componente padre
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

  // IGUAL QUE EN EL EJEMPLO: Método para obtener travelers (si se necesita)
  getTravelers(): IReservationTravelerResponse[] {
    return this.existingTravelers;
  }
}
