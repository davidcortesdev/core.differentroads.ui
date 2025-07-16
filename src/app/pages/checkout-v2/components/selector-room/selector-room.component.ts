import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DepartureAccommodationService, IDepartureAccommodationResponse } from '../../../../core/services/departure/departure-accommodation.service';
import { DepartureAccommodationPriceService, IDepartureAccommodationPriceResponse } from '../../../../core/services/departure/departure-accommodation-price.service';
import { DepartureAccommodationTypeService, IDepartureAccommodationTypeResponse } from '../../../../core/services/departure/departure-accommodation-type.service';
import { ReservationTravelerService, IReservationTravelerResponse } from '../../../../core/services/reservation/reservation-traveler.service';
import { ReservationTravelerAccommodationService, IReservationTravelerAccommodationResponse } from '../../../../core/services/reservation/reservation-traveler-accommodation.service';
import { BehaviorSubject, forkJoin } from 'rxjs';

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

@Component({
  selector: 'app-selector-room',
  standalone: false,
  templateUrl: './selector-room.component.html',
  styleUrl: './selector-room.component.scss'
})
export class SelectorRoomComponent implements OnInit, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;

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
  private travelersNumbersSource = new BehaviorSubject<{ adults: number; childs: number; babies: number }>({
    adults: 1,
    childs: 0,
    babies: 0
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
    private reservationTravelerAccommodationService: ReservationTravelerAccommodationService
  ) {
    // IGUAL QUE EN EL EJEMPLO: Inicializar en constructor
    this.loadReservationModes();

    // IGUAL QUE EN EL EJEMPLO: Suscripción a cambios de travelers
    this.travelersNumbers$.subscribe((data) => {
      const newTotalTravelers = data.adults + data.childs + data.babies;

      console.log('_____________');
      console.log('Travelers cambiados:', data);
      console.log('Total travelers:', newTotalTravelers);

      // IGUAL QUE EN EL EJEMPLO: Deseleccionar habitaciones que excedan capacidad
      Object.entries(this.selectedRooms).forEach(([tkId, qty]) => {
        const room = this.allRoomsAvailability.find(r => r.tkId === tkId);
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
    if (this.departureId) {
      this.loadReservationModes();
    }
    if (this.reservationId) {
      this.loadExistingTravelers();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['departureId'] && this.departureId) {
      this.loadReservationModes();
    }
    if (changes['reservationId'] && this.reservationId) {
      this.loadExistingTravelers();
    }
  }

  // IGUAL QUE EN EL EJEMPLO: Cargar modos de reserva
  loadReservationModes(): void {
    if (this.departureId) {
      this.departureAccommodationService.getByDeparture(this.departureId).subscribe((accommodations: IDepartureAccommodationResponse[]) => {
        this.processAccommodations(accommodations);
      });
    }
  }

  processAccommodations(accommodations: IDepartureAccommodationResponse[]): void {
    console.log('🏨 === ACCOMMODATIONS CARGADAS ===');
    console.log('📊 Total accommodations recibidas:', accommodations.length);
    accommodations.forEach((acc, index) => {
      console.log(`🏠 [${index}] Accommodation:`, {
        id: acc.id,
        tkId: acc.tkId,
        name: acc.name,
        description: acc.description,
        capacity: acc.capacity,
        accommodationTypeId: acc.accommodationTypeId,
        departureId: acc.departureId
      });
    });

    // Transformar datos al formato esperado
    this.allRoomsAvailability = accommodations.map(accommodation => ({
      id: accommodation.id,
      tkId: accommodation.tkId,
      name: accommodation.name,
      description: accommodation.description,
      capacity: accommodation.capacity,
      basePrice: 0,
      qty: 0,
      isShared: false,
      accommodationTypeId: accommodation.accommodationTypeId
    }));

    console.log('🔄 Accommodations transformadas:', this.allRoomsAvailability);

    // Cargar tipos de alojamiento para determinar habitaciones compartidas
    this.loadAccommodationTypes();

    // Cargar precios
    if (this.departureId) {
      this.departureAccommodationPriceService.getByDeparture(this.departureId).subscribe(prices => {
        this.assignPricesToRooms(prices);
      });
    }
  }

  loadAccommodationTypes(): void {
    this.departureAccommodationTypeService.getAll().subscribe(types => {
      this.accommodationTypes = types;
      this.updateRoomSharedStatus();
    });
  }

  updateRoomSharedStatus(): void {
    // IGUAL QUE EN EL EJEMPLO: Detectar habitaciones compartidas
    this.allRoomsAvailability.forEach(room => {
      const accommodationType = this.accommodationTypes.find(t => t.id === room.accommodationTypeId);
      if (accommodationType) {
        room.isShared = accommodationType.isShared;
      } else {
        // Fallback: detectar por nombre y capacidad como en el ejemplo
        room.isShared = room.name?.toLowerCase().includes('individual') || 
                        room.name?.toLowerCase().includes('single') ||
                        (room.name?.toLowerCase().includes('doble') && room.capacity === 1);
      }
      
      console.log(`🏠 Habitación ${room.name}: capacidad=${room.capacity}, isShared=${room.isShared}`);
    });
  }

  assignPricesToRooms(prices: IDepartureAccommodationPriceResponse[]): void {
    console.log('💰 === PRECIOS CARGADOS ===');
    console.log('📊 Total precios recibidos:', prices.length);
    prices.forEach((price, index) => {
      console.log(`💵 [${index}] Price:`, {
        id: price.id,
        tkId: price.tkId,
        departureAccommodationId: price.departureAccommodationId,
        basePrice: price.basePrice,
        campaignPrice: price.campaignPrice,
        ageGroupId: price.ageGroupId,
        campaignId: price.campaignId,
        priceCategoryId: price.priceCategoryId,
        currencyId: price.currencyId,
        retailerId: price.retailerId
      });
    });

    // IGUAL QUE EN EL EJEMPLO: Asignar precios y ordenar
    this.allRoomsAvailability.forEach(room => {
      const roomPrice = prices.find(price => price.departureAccommodationId === room.id);
      if (roomPrice && roomPrice.basePrice !== undefined) {
        room.basePrice = roomPrice.basePrice;
        console.log(`✅ Precio asignado: Room ID ${room.id} (${room.name}) → ${roomPrice.basePrice}€`);
      } else {
        room.basePrice = 0;
        console.log(`⚠️ Sin precio: Room ID ${room.id} (${room.name}) → 0€`);
      }
    });

    console.log('🔗 === MAPPING ACCOMMODATION-PRICE ===');
    this.allRoomsAvailability.forEach(room => {
      const relatedPrice = prices.find(price => price.departureAccommodationId === room.id);
      console.log(`🏠 Room "${room.name}" (ID: ${room.id}) ↔️ Price (departureAccommodationId: ${relatedPrice?.departureAccommodationId || 'NO ENCONTRADO'})`);
    });

    // IGUAL QUE EN EL EJEMPLO: Ordenar por capacidad
    this.allRoomsAvailability.sort((a, b) => (a.capacity || 0) - (b.capacity || 0));

    // IGUAL QUE EN EL EJEMPLO: Obtener asignaciones existentes de travelers
    const travelersRoomAssignments = this.initializeRoomsFromTravelers();

    // IGUAL QUE EN EL EJEMPLO: Inicializar selectedRooms
    this.selectedRooms = this.allRoomsAvailability.reduce((acc, room) => {
      acc[room.tkId] = travelersRoomAssignments[room.tkId] || this.selectedRooms[room.tkId] || 0;
      return acc;
    }, {} as { [tkId: string]: number });

    // IGUAL QUE EN EL EJEMPLO: Filtrar después de cargar
    const initialTravelers = this.travelersNumbersSource.getValue();
    const totalTravelers = initialTravelers.adults + initialTravelers.childs + initialTravelers.babies;

    // NO ejecutar updateRooms() aquí para evitar validación en la inicialización
    this.filterRooms(totalTravelers);
    
    // Limpiar cualquier error de inicialización
    this.errorMsg = null;
  }

  loadExistingTravelers(): Promise<void> {
    if (!this.reservationId) return Promise.resolve();

    return new Promise((resolve) => {
      this.reservationTravelerService.getByReservationOrdered(this.reservationId!).subscribe(travelers => {
        this.existingTravelers = travelers;
        console.log('🔄 Travelers actualizados en componente de habitaciones:', travelers.length);
        console.log('👥 Detalle travelers:', travelers.map(t => ({
          id: t.id,
          travelerNumber: t.travelerNumber,
          isLeadTraveler: t.isLeadTraveler
        })));
        resolve();
      });
    });
  }

  /**
   * IGUAL QUE EN EL EJEMPLO: Inicializar habitaciones desde travelers existentes
   */
  initializeRoomsFromTravelers(): { [tkId: string]: number } {
    const roomCounts: { [tkId: string]: number } = {};
    
    // En tu caso, los travelers no tienen aún asignación de habitación
    // Por ahora retornamos objeto vacío, pero aquí irías la lógica cuando
    // los travelers tengan una propiedad como "accommodationId" o similar
    
    const travelers = this.existingTravelers;

    // Contar asignaciones de habitaciones por tipo (cuando esté implementado)
    travelers.forEach((traveler) => {
      // TODO: Cuando tengas el campo de asignación de habitación en traveler
      // const accommodationId = traveler.accommodationId;
      // if (accommodationId) {
      //   if (!roomCounts[accommodationId]) {
      //     roomCounts[accommodationId] = 1;
      //   } else {
      //     roomCounts[accommodationId]++;
      //   }
      // }
    });

    // Convertir conteos de travelers a cantidades de habitaciones
    const result: { [tkId: string]: number } = {};
    Object.entries(roomCounts).forEach(([roomId, travelerCount]) => {
      const room = this.allRoomsAvailability.find(r => r.tkId === roomId);
      if (room && room.capacity) {
        // IGUAL QUE EN EL EJEMPLO: Calcular cuántas habitaciones se necesitan
        result[roomId] = Math.ceil(travelerCount / room.capacity);
      }
    });

    return result;
  }

  // IGUAL QUE EN EL EJEMPLO: Verificar si hay bebés
  hasBabies(): boolean {
    return this.travelers.babies > 0;
  }

  // IGUAL QUE EN EL EJEMPLO: Filtrar habitaciones
  filterRooms(totalTravelers: number): void {
    this.roomsAvailabilityForTravelersNumber = this.allRoomsAvailability.filter((room) => {
      // REQUISITO ESPECÍFICO: Habitaciones compartidas siempre aparecen (capacidad = 1)
      if (room.isShared) {
        return true;
      }
      // Habitaciones normales: solo si capacidad <= total travelers
      return room.capacity <= totalTravelers;
    });
  }

  // IGUAL QUE EN EL EJEMPLO: Manejar cambios en selección
  onRoomSpacesChange(changedRoom: RoomAvailability, newValue: number): void {
    if (newValue === 0) {
      delete this.selectedRooms[changedRoom.tkId];
    } else {
      this.selectedRooms[changedRoom.tkId] = newValue;
    }

    this.updateRooms();
  }

  // IGUAL QUE EN EL EJEMPLO: Actualizar habitaciones
  updateRooms(): void {
    const updatedRooms = Object.keys(this.selectedRooms).map((tkId) => {
      const room = this.allRoomsAvailability.find(r => r.tkId === tkId);
      return {
        ...room,
        qty: this.selectedRooms[tkId],
      } as RoomAvailability;
    });

    const travelerNumbers = this.travelersNumbersSource.getValue();
    const totalTravelers = travelerNumbers.adults + travelerNumbers.childs + travelerNumbers.babies;
    
    // Verificar si hay habitaciones seleccionadas
    const hasSelectedRooms = Object.values(this.selectedRooms).some(qty => qty > 0);
    
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
    
    console.log('🏠 Habitaciones seleccionadas:', updatedRooms.filter(r => r.qty! > 0));
    console.log('👥 Total travelers:', totalTravelers);
    console.log('🛏️ Plazas seleccionadas:', selectedPlaces);
    
    // NUEVO: Distribuir camas entre travelers
    if (hasSelectedRooms) {
      this.distributeRoomsToTravelers(updatedRooms.filter(r => r.qty! > 0));
    }
    
    // VALIDACIÓN MODIFICADA: Solo error cuando plazas EXCEDEN travelers
    if (selectedPlaces > totalTravelers) {
      this.errorMsg = 'Las habitaciones seleccionadas no se corresponden con la cantidad de viajeros.';
    } else {
      this.errorMsg = null;
    }

    // IGUAL QUE EN EL EJEMPLO: Actualizar servicio (simulado)
    this.updateSelectedRooms(updatedRooms);
  }

  // NUEVO: Método para distribuir habitaciones entre travelers
  distributeRoomsToTravelers(selectedRooms: RoomAvailability[]): void {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      console.log('⚠️ No hay travelers existentes para distribuir habitaciones');
      return;
    }

    // Ordenar travelers: Lead traveler primero, luego por ID
    const sortedTravelers = [...this.existingTravelers].sort((a, b) => {
      if (a.isLeadTraveler && !b.isLeadTraveler) return -1;
      if (!a.isLeadTraveler && b.isLeadTraveler) return 1;
      return a.id - b.id; // Ordenar por ID
    });

    console.log('🎯 === DISTRIBUCIÓN DE HABITACIONES ===');
    console.log('👥 Travelers ordenados:', sortedTravelers.map(t => ({
      id: t.id,
      travelerNumber: t.travelerNumber,
      isLeadTraveler: t.isLeadTraveler
    })));

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

    selectedRooms.forEach(room => {
      const roomQty = room.qty || 0;
      console.log(`🏠 Procesando habitación: ${room.name} (ID: ${room.id}, departureAccommodationId: ${room.id})`);
      console.log(`   - Cantidad seleccionada: ${roomQty}`);
      console.log(`   - Capacidad: ${room.capacity}`);
      console.log(`   - Es compartida: ${room.isShared}`);
      
      for (let roomInstance = 1; roomInstance <= roomQty; roomInstance++) {
        const bedCapacity = room.isShared ? 1 : (room.capacity || 1);
        
        console.log(`   🏠 Instancia ${roomInstance}/${roomQty} - Capacidad de camas: ${bedCapacity}`);
        
        for (let bedNumber = 1; bedNumber <= bedCapacity; bedNumber++) {
          availableBeds.push({
            roomId: room.id,
            roomTkId: room.tkId,
            roomName: room.name || 'Habitación sin nombre',
            departureAccommodationId: room.id, // Este es el departureAccommodationId
            bedNumber: room.isShared ? 1 : bedNumber, // Habitaciones compartidas siempre bed 1
            capacity: bedCapacity,
            isShared: room.isShared || false
          });
          console.log(`     🛏️ Cama ${bedNumber} creada (departureAccommodationId: ${room.id})`);
        }
      }
    });

    console.log('🛏️ Camas disponibles:', availableBeds.length);
    console.log('🛏️ Detalle de camas:', availableBeds);

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
          isShared: assignedBed.isShared
        });
      }
    });

    // Mostrar distribución final
    console.log('🏨 === ASIGNACIÓN FINAL DE HABITACIONES ===');
    roomAssignments.forEach(assignment => {
      const leadIcon = assignment.isLeadTraveler ? '👑' : '👤';
      const sharedInfo = assignment.isShared ? ' (Compartida)' : '';
      console.log(`${leadIcon} Traveler ${assignment.travelerNumber} (ID: ${assignment.travelerId}) → ${assignment.roomName}${sharedInfo} - Cama ${assignment.bedNumber}`);
      console.log(`   📋 departureAccommodationId: ${assignment.departureAccommodationId}`);
      console.log(`   🔑 roomTkId: ${assignment.roomTkId}`);
      console.log(`   🏠 roomId: ${assignment.roomId}`);
    });

    // Verificar si sobran travelers sin habitación
    const unassignedTravelers = sortedTravelers.slice(availableBeds.length);
    if (unassignedTravelers.length > 0) {
      console.log('⚠️ Travelers sin habitación asignada:');
      unassignedTravelers.forEach(traveler => {
        const leadIcon = traveler.isLeadTraveler ? '👑' : '👤';
        console.log(`${leadIcon} Traveler ${traveler.travelerNumber} (ID: ${traveler.id}) - SIN HABITACIÓN`);
      });
    }

    // Resumen estadístico
    console.log('📊 === RESUMEN ===');
    console.log(`Total travelers: ${sortedTravelers.length}`);
    console.log(`Total camas: ${availableBeds.length}`);
    console.log(`Travelers asignados: ${roomAssignments.length}`);
    console.log(`Travelers sin asignar: ${unassignedTravelers.length}`);
    
    // NUEVO: Guardar asignaciones para usar al guardar
    this.currentRoomAssignments = roomAssignments;
    
    // Agrupar por habitación
    const roomGroups = roomAssignments.reduce((groups, assignment) => {
      const key = `${assignment.roomTkId}-${assignment.roomName}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(assignment);
      return groups;
    }, {} as Record<string, typeof roomAssignments>);

    console.log('🏠 === DISTRIBUCIÓN POR HABITACIÓN ===');
    Object.entries(roomGroups).forEach(([roomKey, assignments]) => {
      console.log(`🏠 ${assignments[0].roomName}:`);
      assignments.forEach(assignment => {
        const leadIcon = assignment.isLeadTraveler ? '👑' : '👤';
        console.log(`  ${leadIcon} Traveler ${assignment.travelerNumber} - Cama ${assignment.bedNumber}`);
      });
    });
  }

  // NUEVO: Método para guardar las asignaciones de habitaciones
  async saveRoomAssignments(): Promise<boolean> {
    if (!this.reservationId) {
      console.log('⚠️ No hay reservationId para guardar');
      return false;
    }

    try {
      console.log('💾 === GUARDANDO ASIGNACIONES DE HABITACIONES ===');
      
      // IMPORTANTE: Recargar travelers desde la BD para obtener los más recientes
      console.log('🔄 Recargando travelers desde la BD...');
      const currentTravelers = await this.reservationTravelerService.getByReservationOrdered(this.reservationId).toPromise();
      
      if (!currentTravelers || currentTravelers.length === 0) {
        console.error('❌ No se pudieron obtener travelers actualizados');
        return false;
      }

      console.log('👥 Travelers actuales en BD:', currentTravelers.length);
      console.log('📋 Travelers detalle:', currentTravelers.map(t => ({
        id: t.id,
        travelerNumber: t.travelerNumber,
        isLeadTraveler: t.isLeadTraveler
      })));

      // Actualizar travelers locales
      this.existingTravelers = currentTravelers;

      // Recalcular distribución con travelers actualizados
      const updatedRooms = Object.keys(this.selectedRooms).map((tkId) => {
        const room = this.allRoomsAvailability.find(r => r.tkId === tkId);
        return {
          ...room,
          qty: this.selectedRooms[tkId],
        } as RoomAvailability;
      });

      const selectedRoomsWithQty = updatedRooms.filter(r => r.qty! > 0);
      
      if (selectedRoomsWithQty.length === 0) {
        console.warn('⚠️ No hay habitaciones seleccionadas para asignar');
        return false;
      }

      // Redistribuir con travelers actualizados
      this.distributeRoomsToTravelers(selectedRoomsWithQty);

      if (this.currentRoomAssignments.length === 0) {
        console.warn('⚠️ No se generaron asignaciones');
        return false;
      }

      // Limpiar asignaciones existentes para todos los travelers
      console.log('🗑️ Eliminando asignaciones existentes...');
      const deletePromises = currentTravelers.map(traveler => 
        this.reservationTravelerAccommodationService.deleteByReservationTraveler(traveler.id).toPromise()
      );

      await Promise.all(deletePromises);
      console.log('🗑️ Asignaciones existentes eliminadas');

      // Crear nuevas asignaciones basadas en la distribución actual
      const createPromises: Promise<any>[] = [];

      this.currentRoomAssignments.forEach(assignment => {
        // Buscar el traveler correspondiente en la BD actualizada
        const travelerInDB = currentTravelers.find(t => 
          (t.isLeadTraveler && assignment.isLeadTraveler) ||
          (!t.isLeadTraveler && !assignment.isLeadTraveler && t.travelerNumber === assignment.travelerNumber)
        );

        if (travelerInDB) {
          const createPromise = this.reservationTravelerAccommodationService.create({
            id: 0,
            reservationTravelerId: travelerInDB.id,
            departureAccommodationId: assignment.departureAccommodationId
          }).toPromise();

          createPromises.push(createPromise);
          
          console.log(`✅ Creando asignación: Traveler ${travelerInDB.travelerNumber} (ID: ${travelerInDB.id}) → Room ${assignment.roomName} (accommodationId: ${assignment.departureAccommodationId})`);
        } else {
          console.warn(`⚠️ No se encontró traveler en BD para asignación:`, assignment);
        }
      });

      const results = await Promise.all(createPromises);
      
      console.log('💾 === ASIGNACIONES GUARDADAS EXITOSAMENTE ===');
      console.log(`✅ Total asignaciones creadas: ${results.length}`);
      console.log('📋 Resultados:', results);
      
      return true;

    } catch (error) {
      console.error('❌ Error al guardar asignaciones:', error);
      return false;
    }
  }

  // NUEVO: Método para verificar si hay asignaciones válidas para guardar
  get hasValidAssignments(): boolean {
    return this.currentRoomAssignments.length > 0 && 
           this.currentRoomAssignments.length === this.existingTravelers.length;
  }

  // NUEVO: Método para obtener el resumen de asignaciones
  getAssignmentsSummary(): string {
    if (this.currentRoomAssignments.length === 0) {
      return 'Sin asignaciones de habitaciones';
    }

    const roomGroups = this.currentRoomAssignments.reduce((groups, assignment) => {
      if (!groups[assignment.roomName]) {
        groups[assignment.roomName] = 0;
      }
      groups[assignment.roomName]++;
      return groups;
    }, {} as Record<string, number>);

    const summary = Object.entries(roomGroups)
      .map(([roomName, count]) => `${count}x ${roomName}`)
      .join(', ');

    return summary;
  }

  // IGUAL QUE EN EL EJEMPLO: Actualizar servicio de habitaciones
  updateSelectedRooms(rooms: RoomAvailability[]): void {
    // Simular actualización de servicio
    this.selectedRoomsSource.next(rooms);
    console.log('Habitaciones seleccionadas actualizadas:', rooms);
  }

  // IGUAL QUE EN EL EJEMPLO: Verificar opciones de habitaciones compartidas
  get hasSharedRoomsOption(): boolean {
    return this.allRoomsAvailability.some(room => room.isShared);
  }

  // IGUAL QUE EN EL EJEMPLO: Verificar si hay habitación compartida seleccionada
  get isSharedRoomSelected(): boolean {
    return Object.keys(this.selectedRooms).some((tkId) => {
      const room = this.allRoomsAvailability.find(r => r.tkId === tkId);
      return room && room.isShared && this.selectedRooms[tkId] > 0;
    });
  }

  // IGUAL QUE EN EL EJEMPLO: Método para actualizar desde componente padre
  updateTravelersNumbers(travelersNumbers: { adults: number; childs: number; babies: number }): void {
    // Asegurar que las propiedades no sean undefined
    const safeTravelersNumbers = {
      adults: travelersNumbers.adults || 0,
      childs: travelersNumbers.childs || 0,
      babies: travelersNumbers.babies || 0
    };

    this.travelers = safeTravelersNumbers;
    this.travelersNumbersSource.next(safeTravelersNumbers);
  }

  // IGUAL QUE EN EL EJEMPLO: Método para obtener travelers (si se necesita)
  getTravelers(): IReservationTravelerResponse[] {
    return this.existingTravelers;
  }
}