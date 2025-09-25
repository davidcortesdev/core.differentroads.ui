import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { IReservationTravelerResponse } from '../../../../../../core/services/reservation/reservation-traveler.service';
import { IAgeGroupResponse } from '../../../../../../core/services/agegroup/age-group.service';
import { 
  ReservationTravelerAccommodationService,
  IReservationTravelerAccommodationResponse,
  ReservationTravelerAccommodationCreate
} from '../../../../../../core/services/reservation/reservation-traveler-accommodation.service';
import {
  DepartureAccommodationService,
  IDepartureAccommodationResponse
} from '../../../../../../core/services/departure/departure-accommodation.service';

@Component({
  selector: 'app-info-travelers-room',
  standalone: false,
  templateUrl: './info-travelers-room.component.html',
  styleUrls: ['./info-travelers-room.component.scss'],
})
export class InfoTravelersRoomComponent implements OnInit, OnChanges, OnDestroy {
  @Input() travelers: IReservationTravelerResponse[] = [];
  @Input() ageGroups: IAgeGroupResponse[] = [];
  @Input() reservationId: number | null = null;
  @Input() departureId: number | null = null; // NUEVO: ID del departure para obtener habitaciones

  @Output() roomAssignmentsChange = new EventEmitter<{ [travelerId: number]: number }>();

  // Propiedades para gestión de habitaciones
  roomAssignments: { [travelerId: number]: number } = {}; // travelerId -> roomId
  roomAssignmentsObjects: { [travelerId: number]: IDepartureAccommodationResponse | null } = {}; // travelerId -> roomObject
  availableRooms: IDepartureAccommodationResponse[] = []; // NUEVO: Habitaciones reales del backend
  maxRooms: number = 0;
  selectedRoomsCount: number = 0; // Número de habitaciones seleccionadas
  showRoomAssignment: boolean = false; // Control de visibilidad de la sección

  // Estados de carga
  loading: boolean = false;
  saving: boolean = false;

  // Estado de expansión del componente
  isExpanded: boolean = false;

  // Datos existentes de habitaciones
  existingAccommodations: IReservationTravelerAccommodationResponse[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private messageService: MessageService,
    private reservationTravelerAccommodationService: ReservationTravelerAccommodationService,
    private departureAccommodationService: DepartureAccommodationService
  ) {}

  ngOnInit(): void {
    console.log('🎯 ngOnInit ejecutado');
    this.initializeRoomAssignment();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 ngOnChanges detectado:', changes);
    
    if (changes['travelers'] && this.travelers) {
      console.log('👥 Cambio en viajeros detectado');
      this.initializeRoomAssignment();
    }
    if (changes['departureId'] && this.departureId) {
      console.log('🏨 Cambio en departureId detectado:', this.departureId);
      this.loadAvailableRooms();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializar la asignación de habitaciones
   */
  private initializeRoomAssignment(): void {
    console.log('🚀 Inicializando asignación de habitaciones');
    console.log('👥 Viajeros recibidos:', this.travelers);
    console.log('👥 Cantidad de viajeros:', this.travelers ? this.travelers.length : 0);
    console.log('🏨 departureId:', this.departureId);
    console.log('📋 reservationId:', this.reservationId);
    
    // Log detallado de age groups
    console.log('👥 Age Groups detallados:', this.ageGroups.map(ag => ({
      id: ag.id,
      name: ag.name,
      lowerLimitAge: ag.lowerLimitAge,
      upperLimitAge: ag.upperLimitAge,
      isChild: (ag.upperLimitAge || 0) < 18
    })));
    
    if (!this.travelers || this.travelers.length === 0) {
      console.log('❌ No hay viajeros, ocultando sección de habitaciones');
      this.showRoomAssignment = false;
      return;
    }

    // Cargar habitaciones disponibles desde el backend
    this.loadAvailableRooms();
    
    // Mostrar la sección de habitaciones si hay más de 1 viajero
    this.showRoomAssignment = this.travelers.length > 1;
    console.log('👁️ Mostrar sección de habitaciones:', this.showRoomAssignment);

    // Cargar asignaciones existentes de habitaciones
    this.loadExistingRoomAssignments();
  }

  /**
   * Cargar habitaciones disponibles desde el backend
   */
  private loadAvailableRooms(): void {
    if (!this.departureId) {
      console.warn('🚨 No departureId provided, using fallback room calculation');
      this.calculateFallbackRooms();
      return;
    }

    console.log('🏨 Cargando habitaciones para departureId:', this.departureId);
    this.loading = true;

    this.departureAccommodationService.getByDeparture(this.departureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rooms) => {
          console.log('📥 Respuesta del servicio getByDeparture:', rooms);
          console.log('📊 Tipo de respuesta:', typeof rooms);
          console.log('📊 Es array:', Array.isArray(rooms));
          console.log('📊 Cantidad de habitaciones:', rooms ? rooms.length : 0);
          
          this.availableRooms = rooms || [];
          this.maxRooms = this.availableRooms.length;
          this.loading = false;
          
          // Log detallado de cada habitación
          console.log('🏨 Habitaciones procesadas:');
          this.availableRooms.forEach((room, index) => {
            console.log(`  ${index + 1}. ID: ${room.id}`);
            console.log(`     Nombre: ${room.name}`);
            console.log(`     Descripción: ${room.description}`);
            console.log(`     Capacidad: ${room.capacity}`);
            console.log(`     tkId: ${room.tkId}`);
            console.log(`     departureId: ${room.departureId}`);
            console.log(`     accommodationTypeId: ${room.accommodationTypeId}`);
            console.log(`     Notas: ${room.notes}`);
            console.log('     ---');
          });
          
          console.log('✅ Habitaciones cargadas exitosamente:', this.availableRooms.length);
        },
        error: (error) => {
          console.error('❌ Error al cargar habitaciones:', error);
          console.error('❌ Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            url: error.url
          });
          this.loading = false;
          this.calculateFallbackRooms(); // Fallback si falla la carga
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar las habitaciones desde el servidor. Usando configuración básica.',
            life: 3000,
          });
        }
      });
  }

  /**
   * Calcular habitaciones de fallback si no se puede cargar desde el backend
   */
  private calculateFallbackRooms(): void {
    console.log('🔄 Usando habitaciones de fallback');
    console.log('👥 Número de viajeros:', this.travelers.length);
    
    this.maxRooms = Math.ceil(this.travelers.length / 2); // Máximo 2 personas por habitación
    console.log('🏨 Número máximo de habitaciones calculado:', this.maxRooms);
    
    // Crear habitaciones básicas como fallback
    this.availableRooms = Array.from({ length: this.maxRooms }, (_, i) => ({
      id: i + 1,
      name: `Habitación ${i + 1}`,
      description: `Habitación estándar ${i + 1}`,
      tkId: `room_${i + 1}`,
      departureId: this.departureId || 0,
      accommodationTypeId: 1,
      capacity: 2,
      notes: ''
    }));
    
    console.log('🏨 Habitaciones de fallback creadas:');
    this.availableRooms.forEach((room, index) => {
      console.log(`  ${index + 1}. ID: ${room.id}`);
      console.log(`     Nombre: ${room.name}`);
      console.log(`     Descripción: ${room.description}`);
      console.log(`     Capacidad: ${room.capacity}`);
      console.log(`     tkId: ${room.tkId}`);
      console.log('     ---');
    });
  }

  /**
   * Manejar búsqueda de habitaciones para autocomplete
   */
  onRoomSearch(event: any): void {
    console.log('🔍 onRoomSearch ejecutado:', event);
    
    // Filtrar habitaciones disponibles basado en la búsqueda
    const query = event.query ? event.query.toLowerCase() : '';
    console.log('🔍 Query de búsqueda:', query);
    
    // Filtrar habitaciones que coincidan con la búsqueda
    const filteredRooms = this.availableRooms.filter(room => 
      room.name.toLowerCase().includes(query) ||
      room.description.toLowerCase().includes(query)
    );
    
    console.log('🔍 Habitaciones filtradas:', filteredRooms.length);
    
    // Actualizar las sugerencias
    event.suggestions = filteredRooms;
  }

  /**
   * Manejar cambio de asignación de habitación
   */
  onRoomAssignmentChange(travelerId: number, event: any): void {
    console.log('🔄 onRoomAssignmentChange ejecutado:', { travelerId, event });
    
    // Para p-dropdown, el evento.value contiene el objeto seleccionado
    const selectedRoom = event && event.value ? event.value : event;
    const roomId = selectedRoom ? selectedRoom.id : null;
    const roomName = selectedRoom ? selectedRoom.name : 'Sin habitación';
    
    console.log('🏨 Habitación seleccionada:', { roomId, roomName, selectedRoom });
    
    // Actualizar tanto el objeto como el ID (SIN VALIDAR)
    this.roomAssignmentsObjects[travelerId] = selectedRoom;
    
    if (roomId) {
      this.roomAssignments[travelerId] = roomId;
      console.log('✅ Asignación aplicada (sin validar):', { travelerId, roomId, roomName });
    } else {
      // Si no hay habitación seleccionada, limpiar
      console.log('🧹 Limpiando asignación...');
      delete this.roomAssignments[travelerId];
      this.roomAssignmentsObjects[travelerId] = null;
    }
    
    // Emitir evento para notificar al componente padre (sin guardar automáticamente)
    this.roomAssignmentsChange.emit(this.roomAssignments);
  }

  /**
   * Validar asignación de habitación
   */
  private validateRoomAssignment(travelerId: number, roomId: number): boolean {
    console.log('🔍 Validando asignación:', { travelerId, roomId });
    
    // Buscar la habitación seleccionada
    const selectedRoom = this.availableRooms.find(room => room.id === roomId);
    if (!selectedRoom) {
      console.log('❌ Habitación no encontrada');
      return false;
    }
    
    console.log('🏨 Habitación seleccionada:', { name: selectedRoom.name, capacity: selectedRoom.capacity });
    
    // Contar cuántos viajeros ya están en esta habitación
    const travelersInRoom = Object.values(this.roomAssignments).filter(assignedRoomId => assignedRoomId === roomId).length;
    console.log('👥 Viajeros actualmente en esta habitación:', travelersInRoom);
    
    // Verificar que no exceda la capacidad de la habitación
    if (travelersInRoom >= selectedRoom.capacity) {
      console.log('❌ Habitación llena, capacidad:', selectedRoom.capacity);
      return false;
    }
    
    // Verificar que no haya niños solos en habitaciones
    const traveler = this.travelers.find(t => t.id === travelerId);
    if (traveler && this.isChildTraveler(traveler)) {
      console.log('👶 Validando asignación de niño');
      
      const otherTravelersInRoom = this.travelers.filter(t => 
        t.id !== travelerId && 
        this.roomAssignments[t.id] === roomId
      );
      
      // Si hay otros viajeros en la habitación, verificar que al menos uno sea adulto
      if (otherTravelersInRoom.length > 0) {
        const hasAdultInRoom = otherTravelersInRoom.some(t => !this.isChildTraveler(t));
        if (!hasAdultInRoom) {
          console.log('❌ Niño no puede estar solo con otros niños');
          return false;
        }
      }
    }
    
    console.log('✅ Asignación válida');
    return true;
  }

  /**
   * Verificar si un viajero es niño
   */
  private isChildTraveler(traveler: IReservationTravelerResponse): boolean {
    const ageGroup = this.ageGroups.find(group => group.id === traveler.ageGroupId);
    
    // Lógica corregida: 
    // - Si upperLimitAge es null, es adulto (no tiene límite superior)
    // - Si upperLimitAge existe y es <= 15, es niño
    // - Si upperLimitAge existe y es > 15, es adulto
    let isChild = false;
    
    if (ageGroup) {
      if (ageGroup.upperLimitAge === null || ageGroup.upperLimitAge === undefined) {
        // No tiene límite superior = Adulto
        isChild = false;
      } else if (ageGroup.upperLimitAge <= 15) {
        // Tiene límite superior <= 15 = Niño
        isChild = true;
      } else {
        // Tiene límite superior > 15 = Adulto
        isChild = false;
      }
    }
    
    console.log('👶 Verificando si es niño:', {
      travelerId: traveler.id,
      travelerNumber: traveler.travelerNumber,
      ageGroupId: traveler.ageGroupId,
      ageGroup: ageGroup,
      upperLimitAge: ageGroup?.upperLimitAge,
      isChild: isChild,
      logic: ageGroup?.upperLimitAge === null || ageGroup?.upperLimitAge === undefined ? 'Adulto (sin límite)' : 
             (ageGroup?.upperLimitAge || 0) <= 15 ? 'Niño (≤15)' : 'Adulto (>15)'
    });
    
    return isChild;
  }

  /**
   * Obtener resumen de habitaciones
   */
  getRoomSummary(): Array<{ roomId: number; roomName: string; travelers: IReservationTravelerResponse[] }> {
    const summary: Array<{ roomId: number; roomName: string; travelers: IReservationTravelerResponse[] }> = [];
    
    Object.entries(this.roomAssignments).forEach(([travelerId, roomId]) => {
      if (roomId) {
        // Buscar información de la habitación
        const room = this.availableRooms.find(r => r.id === roomId);
        const roomName = room ? room.name : `Habitación ${roomId}`;
        
        let roomInfo = summary.find(r => r.roomId === roomId);
        if (!roomInfo) {
          roomInfo = { roomId, roomName, travelers: [] };
          summary.push(roomInfo);
        }
        
        const traveler = this.travelers.find(t => t.id === parseInt(travelerId));
        if (traveler) {
          roomInfo.travelers.push(traveler);
        }
      }
    });

    return summary.sort((a, b) => a.roomId - b.roomId);
  }

  /**
   * Validar asignaciones globales de habitaciones
   */
  validateGlobalRoomAssignments(): { isValid: boolean; message: string } {
    console.log('🔍 Validando asignaciones globales de habitaciones');
    
    const totalTravelers = this.travelers.length;
    const assignedTravelers = Object.keys(this.roomAssignments).length;
    
    console.log('👥 Total viajeros:', totalTravelers);
    console.log('🏨 Viajeros asignados:', assignedTravelers);
    
    // Verificar que todos los viajeros tengan habitación asignada
    if (assignedTravelers < totalTravelers) {
      return {
        isValid: false,
        message: `Faltan asignar ${totalTravelers - assignedTravelers} viajero(s) a habitaciones.`
      };
    }
    
    // Calcular el total de espacios de habitación utilizados
    const roomSummary = this.getRoomSummary();
    let totalRoomSpaces = 0;
    
    // Validar capacidades de habitaciones compartidas primero
    for (const roomInfo of roomSummary) {
      const room = this.availableRooms.find(r => r.id === roomInfo.roomId);
      if (room) {
        const travelersInRoom = roomInfo.travelers.length;
        const roomCapacity = room.capacity;
        
        // Solo validar capacidad para habitaciones compartidas (no individuales)
        const isIndividualRoom = room.name.toLowerCase().includes('individual') || roomCapacity === 1;
        
        if (!isIndividualRoom && travelersInRoom > roomCapacity) {
          console.log(`❌ ${room.name} (ID: ${roomInfo.roomId}): ${travelersInRoom} viajeros exceden la capacidad de ${roomCapacity}`);
          return {
            isValid: false,
            message: `La habitación ${room.name} tiene capacidad para ${roomCapacity} personas, pero se han asignado ${travelersInRoom} viajeros.`
          };
        }
      }
    }
    
    // Calcular espacios totales después de validar capacidades
    roomSummary.forEach(roomInfo => {
      const room = this.availableRooms.find(r => r.id === roomInfo.roomId);
      if (room) {
        const travelersInRoom = roomInfo.travelers.length;
        const roomCapacity = room.capacity;
        
        // Determinar si es habitación individual o compartida basado en el nombre o capacidad
        const isIndividualRoom = room.name.toLowerCase().includes('individual') || roomCapacity === 1;
        
        if (isIndividualRoom) {
          // HABITACIONES INDIVIDUALES: Cada viajero necesita su propia habitación física
          // Si 3 viajeros eligen Individual, necesitan 3 habitaciones individuales separadas
          const individualRoomInstances = travelersInRoom; // 1 instancia por viajero
          const totalSpacesForIndividual = individualRoomInstances * roomCapacity; // 3 × 1 = 3 espacios
          
          totalRoomSpaces += totalSpacesForIndividual;
          console.log(`🏨 ${room.name} (ID: ${roomInfo.roomId}): ${travelersInRoom} viajeros en ${individualRoomInstances} habitaciones individuales separadas, capacidad ${roomCapacity} cada una = ${totalSpacesForIndividual} espacios`);
        } else {
          // HABITACIONES COMPARTIDAS (Twin, Double, Triple): Los viajeros comparten la misma habitación física
          const sharedRoomInstances = 1; // Solo 1 habitación física compartida
          const totalSpacesForShared = sharedRoomInstances * roomCapacity; // 1 × 2 = 2 espacios
          
          totalRoomSpaces += totalSpacesForShared;
          console.log(`🏨 ${room.name} (ID: ${roomInfo.roomId}): ${travelersInRoom} viajeros compartiendo 1 habitación, capacidad ${roomCapacity} = ${totalSpacesForShared} espacios`);
        }
      }
    });
    
    console.log('📊 Total espacios de habitación:', totalRoomSpaces);
    console.log('👥 Total viajeros:', totalTravelers);
    
    // Verificar que la capacidad total de las habitaciones no exceda el número de viajeros
    // Nota: totalRoomSpaces representa la suma de todas las capacidades de las habitaciones seleccionadas
    if (totalRoomSpaces > totalTravelers) {
      return {
        isValid: false,
        message: `La capacidad total de las habitaciones seleccionadas (${totalRoomSpaces} espacios) excede la cantidad de viajeros (${totalTravelers}). Cada viajero debe ocupar exactamente 1 espacio. Por favor, ajuste las asignaciones de habitaciones.`
      };
    }
    
    // Verificar que no haya niños solos
    const childValidation = this.validateChildrenAssignments();
    if (!childValidation.isValid) {
      return childValidation;
    }
    
    console.log('✅ Validación global exitosa');
    return { isValid: true, message: 'Asignaciones válidas' };
  }

  /**
   * Validar asignaciones de niños
   */
  private validateChildrenAssignments(): { isValid: boolean; message: string } {
    console.log('👶 Iniciando validación de niños...');
    console.log('👥 Todos los viajeros:', this.travelers.map(t => ({
      id: t.id,
      travelerNumber: t.travelerNumber,
      ageGroupId: t.ageGroupId
    })));
    
    const children = this.travelers.filter(t => this.isChildTraveler(t));
    console.log('👶 Niños detectados:', children.map(c => ({
      id: c.id,
      travelerNumber: c.travelerNumber,
      ageGroupId: c.ageGroupId
    })));
    
    if (children.length === 0) {
      console.log('✅ No hay niños, validación exitosa');
      return { isValid: true, message: '' };
    }
    
    // Verificar que cada niño tenga un adulto en la misma habitación
    for (const child of children) {
      const childRoomId = this.roomAssignments[child.id];
      console.log(`👶 Validando niño ${child.travelerNumber} en habitación ${childRoomId}`);
      
      if (childRoomId) {
        const otherTravelersInRoom = this.travelers.filter(t => 
          t.id !== child.id && 
          this.roomAssignments[t.id] === childRoomId
        );
        
        console.log(`👥 Otros viajeros en la misma habitación:`, otherTravelersInRoom.map(t => ({
          id: t.id,
          travelerNumber: t.travelerNumber,
          isChild: this.isChildTraveler(t)
        })));
        
        const hasAdultInRoom = otherTravelersInRoom.some(t => !this.isChildTraveler(t));
        console.log(`👨‍👩‍👧‍👦 ¿Hay adulto en la habitación?`, hasAdultInRoom);
        
        if (!hasAdultInRoom) {
          console.log(`❌ Niño ${child.travelerNumber} sin adulto en la habitación`);
          return {
            isValid: false,
            message: `El niño ${child.travelerNumber} no puede estar solo en una habitación. Debe estar acompañado por un adulto.`
          };
        }
      }
    }
    
    console.log('✅ Validación de niños exitosa');
    return { isValid: true, message: '' };
  }

  /**
   * Cargar asignaciones existentes de habitaciones desde el backend
   */
  private loadExistingRoomAssignments(): void {
    if (!this.travelers || this.travelers.length === 0) {
      return;
    }

    this.loading = true;

    // Obtener todas las asignaciones de habitaciones para los viajeros
    const accommodationRequests = this.travelers.map(traveler =>
      this.reservationTravelerAccommodationService.getByReservationTraveler(traveler.id)
    );

    forkJoin(accommodationRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (accommodationArrays) => {
          // Flatten the arrays and store existing accommodations
          this.existingAccommodations = accommodationArrays.flat();
          
          // Mapear las asignaciones existentes al formato roomAssignments
          this.mapExistingAccommodationsToRoomAssignments();
          
          this.loading = false;
          console.log('Asignaciones de habitaciones cargadas:', this.roomAssignments);
        },
        error: (error) => {
          console.error('Error al cargar asignaciones de habitaciones:', error);
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar las asignaciones de habitaciones existentes',
            life: 5000,
          });
        }
      });
  }

  /**
   * Mapear las acomodaciones existentes al formato de roomAssignments
   */
  private mapExistingAccommodationsToRoomAssignments(): void {
    this.roomAssignments = {};
    this.roomAssignmentsObjects = {};
    
    // Mapear departureAccommodationId (que es el ID de la habitación) a roomAssignments
    this.existingAccommodations.forEach(accommodation => {
      const roomId = accommodation.departureAccommodationId;
      this.roomAssignments[accommodation.reservationTravelerId] = roomId;
      
      // Buscar el objeto de habitación correspondiente
      const roomObject = this.availableRooms.find(room => room.id === roomId);
      this.roomAssignmentsObjects[accommodation.reservationTravelerId] = roomObject || null;
    });
    
    console.log('Asignaciones mapeadas desde backend:', this.roomAssignments);
    console.log('Objetos de habitaciones mapeados:', this.roomAssignmentsObjects);
  }

  /**
   * Guardar asignaciones de habitaciones (solo cuando se presiona el botón)
   */
  private saveRoomAssignments(): void {
    if (this.saving) {
      return; // Evitar múltiples guardados simultáneos
    }

    this.saving = true;
    console.log('💾 Guardando asignaciones de habitaciones:', this.roomAssignments);
    
    // Log detallado de lo que se va a enviar al backend
    console.log('📋 Resumen de asignaciones a enviar:');
    const roomSummary = this.getRoomSummary();
    roomSummary.forEach(roomInfo => {
      const room = this.availableRooms.find(r => r.id === roomInfo.roomId);
      const travelersInRoom = roomInfo.travelers;
      const isIndividualRoom = room?.name.toLowerCase().includes('individual') || room?.capacity === 1;
      
      if (isIndividualRoom) {
        console.log(`  🏨 ${room?.name}: ${travelersInRoom.length} habitaciones individuales separadas`);
        travelersInRoom.forEach(traveler => {
          console.log(`    - Viajero ${traveler.travelerNumber} (ID: ${traveler.id}) → Habitación individual separada`);
        });
      } else {
        console.log(`  🏨 ${room?.name}: 1 habitación compartida para ${travelersInRoom.length} viajeros`);
        travelersInRoom.forEach(traveler => {
          console.log(`    - Viajero ${traveler.travelerNumber} (ID: ${traveler.id}) → Comparte habitación con otros`);
        });
      }
    });

    // NUEVA LÓGICA: Agrupar por habitación y tipo para evitar duplicados
    const saveOperations: any[] = [];
    
    // Primero: Limpiar todas las asignaciones existentes
    const cleanupOperations = this.travelers.map(traveler => 
      this.reservationTravelerAccommodationService.deleteByReservationTraveler(traveler.id)
    );
    
    // Ejecutar limpieza primero
    forkJoin(cleanupOperations)
      .pipe(
        switchMap(() => {
          // Segundo: Crear nuevas asignaciones agrupadas por habitación
          const roomSummary = this.getRoomSummary();
          const createOperations: any[] = [];
          
          roomSummary.forEach(roomInfo => {
            const room = this.availableRooms.find(r => r.id === roomInfo.roomId);
            const travelersInRoom = roomInfo.travelers;
            const isIndividualRoom = room?.name.toLowerCase().includes('individual') || room?.capacity === 1;
            
            if (isIndividualRoom) {
              // HABITACIONES INDIVIDUALES: Crear una asignación por cada viajero
              travelersInRoom.forEach(traveler => {
                const createData = {
                  id: 0,
                  reservationTravelerId: traveler.id,
                  departureAccommodationId: roomInfo.roomId
                };
                console.log(`📤 Creando asignación individual:`, createData);
                createOperations.push(this.reservationTravelerAccommodationService.create(createData));
              });
            } else {
              // HABITACIONES COMPARTIDAS: Crear asignaciones para todos los viajeros
              // El backend deberá interpretar que múltiples viajeros con el mismo departureAccommodationId
              // están compartiendo la misma habitación física
              travelersInRoom.forEach(traveler => {
                const createData = {
                  id: 0,
                  reservationTravelerId: traveler.id,
                  departureAccommodationId: roomInfo.roomId
                };
                console.log(`📤 Creando asignación compartida:`, createData);
                createOperations.push(this.reservationTravelerAccommodationService.create(createData));
              });
            }
          });
          
          return forkJoin(createOperations);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (results) => {
          this.saving = false;
          console.log('✅ Asignaciones de habitaciones guardadas exitosamente:', results);
          
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Asignaciones de habitaciones guardadas correctamente',
            life: 3000,
          });

          // Emitir evento para notificar al componente padre
          this.roomAssignmentsChange.emit(this.roomAssignments);
        },
        error: (error) => {
          this.saving = false;
          console.error('❌ Error al guardar asignaciones de habitaciones:', error);
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al guardar las asignaciones de habitaciones',
            life: 5000,
          });
        }
      });
  }

  /**
   * Actualizar o crear asignación de habitación para un viajero
   * Primero busca si existe una asignación, luego actualiza o crea según corresponda
   */
  private updateOrCreateRoomAssignment(travelerId: number, roomId: number) {
    // Buscar información de la habitación para logging
    const room = this.availableRooms.find(r => r.id === roomId);
    const roomName = room ? room.name : `Habitación ${roomId}`;
    
    // Primero: Buscar si ya existe una asignación para este viajero
    return this.reservationTravelerAccommodationService.getByReservationTraveler(travelerId)
      .pipe(
        switchMap(existingAccommodations => {
          if (existingAccommodations && existingAccommodations.length > 0) {
            // Existe una o más asignaciones
            if (existingAccommodations.length === 1) {
              // Solo una asignación, actualizarla usando PUT
              const existingAccommodation = existingAccommodations[0];
              console.log(`Actualizando asignación existente ID: ${existingAccommodation.id} para viajero ${travelerId} a ${roomName} (ID: ${roomId})`);
              
              const updateData = {
                id: existingAccommodation.id,
                reservationTravelerId: travelerId,
                departureAccommodationId: roomId
              };
              
              console.log(`📤 Actualizando en backend:`, updateData);
              return this.reservationTravelerAccommodationService.update(existingAccommodation.id, updateData);
            } else {
              // Múltiples asignaciones, limpiar todas y crear una nueva
              console.log(`Múltiples asignaciones encontradas para viajero ${travelerId}, limpiando y creando nueva para ${roomName}`);
              
              return this.reservationTravelerAccommodationService.deleteByReservationTraveler(travelerId)
                .pipe(
                  switchMap(() => {
                    const createData = {
                      id: 0, // Se asigna en el backend
                      reservationTravelerId: travelerId,
                      departureAccommodationId: roomId
                    };
                    
                    console.log(`📤 Creando nueva asignación después de limpiar:`, createData);
                    return this.reservationTravelerAccommodationService.create(createData);
                  })
                );
            }
          } else {
            // No existe asignación, crear una nueva usando POST
            console.log(`Creando nueva asignación para viajero ${travelerId} a ${roomName} (ID: ${roomId})`);
            
            const createData = {
              id: 0, // Se asigna en el backend
              reservationTravelerId: travelerId,
              departureAccommodationId: roomId
            };
            
            console.log(`📤 Enviando al backend:`, createData);
            return this.reservationTravelerAccommodationService.create(createData);
          }
        })
      );
  }

  /**
   * Obtener nombre del grupo de edad por ID
   */
  getAgeGroupName(ageGroupId: number): string {
    const ageGroup = this.ageGroups.find((group) => group.id === ageGroupId);
    return ageGroup ? ageGroup.name : 'Adulto';
  }

  /**
   * Método público para recargar las asignaciones de habitaciones
   * Útil para cuando el componente padre necesita refrescar los datos
   */
  reloadRoomAssignments(): void {
    if (this.travelers && this.travelers.length > 0) {
      this.loadExistingRoomAssignments();
    }
  }

  /**
   * Verificar si hay asignaciones pendientes de guardar
   */
  hasUnsavedChanges(): boolean {
    return this.saving;
  }

  /**
   * Obtener el estado de carga
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Obtener el objeto de habitación seleccionado para un viajero
   */
  getSelectedRoomForTraveler(travelerId: number): IDepartureAccommodationResponse | null {
    return this.roomAssignmentsObjects[travelerId] || null;
  }

  /**
   * Validar y actualizar asignaciones manualmente
   */
  validateAndUpdateAssignments(): void {
    console.log('🔍 Validando y actualizando asignaciones manualmente');
    
    const validation = this.validateGlobalRoomAssignments();
    if (validation.isValid) {
      console.log('✅ Validación exitosa, guardando asignaciones...');
      this.saveRoomAssignments();
    } else {
      console.log('❌ Validación fallida:', validation.message);
      this.messageService.add({
        severity: 'error',
        summary: 'Asignaciones inválidas',
        detail: validation.message,
        life: 5000,
      });
    }
  }

  /**
   * Toggle del estado de expansión del componente
   */
  toggleExpansion(): void {
    this.isExpanded = !this.isExpanded;
    console.log('🏨 Estado de expansión de habitaciones:', this.isExpanded);
  }
}
