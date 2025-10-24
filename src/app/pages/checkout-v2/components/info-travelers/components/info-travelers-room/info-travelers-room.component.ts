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
  IReservationTravelerAccommodationResponse} from '../../../../../../core/services/reservation/reservation-traveler-accommodation.service';
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

  @Output() dataUpdated = new EventEmitter<void>();

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
    this.initializeRoomAssignment();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['travelers'] && this.travelers) {
      this.initializeRoomAssignment();
    }
    if (changes['departureId'] && this.departureId) {
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
    if (!this.travelers || this.travelers.length === 0) {
      this.showRoomAssignment = false;
      return;
    }

    // Cargar habitaciones disponibles desde el backend
    this.loadAvailableRooms();
    
    // Mostrar la sección de habitaciones si hay más de 1 viajero
    this.showRoomAssignment = this.travelers.length > 1;

    // Cargar asignaciones existentes de habitaciones
    this.loadExistingRoomAssignments();
  }

  /**
   * Cargar habitaciones disponibles desde el backend
   */
  private loadAvailableRooms(): void {
    if (!this.departureId) {
      this.calculateFallbackRooms();
      return;
    }

    this.loading = true;

    this.departureAccommodationService.getByDeparture(this.departureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rooms) => {
          this.availableRooms = rooms || [];
          this.maxRooms = this.availableRooms.length;
          this.loading = false;
        },
        error: (error) => {
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
    this.maxRooms = Math.ceil(this.travelers.length / 2); // Máximo 2 personas por habitación
    
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
  }

  /**
   * Manejar búsqueda de habitaciones para autocomplete
   */
  onRoomSearch(event: any): void {
    // Filtrar habitaciones disponibles basado en la búsqueda
    const query = event.query ? event.query.toLowerCase() : '';
    
    // Filtrar habitaciones que coincidan con la búsqueda
    const filteredRooms = this.availableRooms.filter(room => 
      room.name.toLowerCase().includes(query) ||
      room.description.toLowerCase().includes(query)
    );
    
    // Actualizar las sugerencias
    event.suggestions = filteredRooms;
  }

  /**
   * Manejar cambio de asignación de habitación
   */
  onRoomAssignmentChange(travelerId: number, event: any): void {
    // Para p-dropdown, el evento.value contiene el objeto seleccionado
    const selectedRoom = event && event.value ? event.value : event;
    const roomId = selectedRoom ? selectedRoom.id : null;
    
    // Actualizar tanto el objeto como el ID (SIN VALIDAR)
    this.roomAssignmentsObjects[travelerId] = selectedRoom;
    
    if (roomId) {
      this.roomAssignments[travelerId] = roomId;
    } else {
      // Si no hay habitación seleccionada, limpiar
      delete this.roomAssignments[travelerId];
      this.roomAssignmentsObjects[travelerId] = null;
    }
    
    // Emitir evento para notificar al componente padre (sin guardar automáticamente)
    this.dataUpdated.emit();
  }

  /**
   * Validar asignación de habitación
   */
  private validateRoomAssignment(travelerId: number, roomId: number): boolean {
    // Buscar la habitación seleccionada
    const selectedRoom = this.availableRooms.find(room => room.id === roomId);
    if (!selectedRoom) {
      return false;
    }
    
    // Contar cuántos viajeros ya están en esta habitación
    const travelersInRoom = Object.values(this.roomAssignments).filter(assignedRoomId => assignedRoomId === roomId).length;
    
    // Verificar que no exceda la capacidad de la habitación
    if (travelersInRoom >= selectedRoom.capacity) {
      return false;
    }
    
    // Verificar que no haya niños solos en habitaciones
    const traveler = this.travelers.find(t => t.id === travelerId);
    if (traveler && this.isChildTraveler(traveler)) {
      const otherTravelersInRoom = this.travelers.filter(t => 
        t.id !== travelerId && 
        this.roomAssignments[t.id] === roomId
      );
      
      // Si hay otros viajeros en la habitación, verificar que al menos uno sea adulto
      if (otherTravelersInRoom.length > 0) {
        const hasAdultInRoom = otherTravelersInRoom.some(t => !this.isChildTraveler(t));
        if (!hasAdultInRoom) {
          return false;
        }
      }
    }
    
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
    const totalTravelers = this.travelers.length;
    const assignedTravelers = Object.keys(this.roomAssignments).length;
    
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
        } else {
          // HABITACIONES COMPARTIDAS (Twin, Double, Triple): Los viajeros comparten la misma habitación física
          const sharedRoomInstances = 1; // Solo 1 habitación física compartida
          const totalSpacesForShared = sharedRoomInstances * roomCapacity; // 1 × 2 = 2 espacios
          
          totalRoomSpaces += totalSpacesForShared;
        }
      }
    });
    
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
    
    return { isValid: true, message: 'Asignaciones válidas' };
  }

  /**
   * Validar asignaciones de niños
   */
  private validateChildrenAssignments(): { isValid: boolean; message: string } {
    const children = this.travelers.filter(t => this.isChildTraveler(t));
    
    if (children.length === 0) {
      return { isValid: true, message: '' };
    }
    
    // Verificar que cada niño tenga un adulto en la misma habitación
    for (const child of children) {
      const childRoomId = this.roomAssignments[child.id];
      
      if (childRoomId) {
        const otherTravelersInRoom = this.travelers.filter(t => 
          t.id !== child.id && 
          this.roomAssignments[t.id] === childRoomId
        );
        
        const hasAdultInRoom = otherTravelersInRoom.some(t => !this.isChildTraveler(t));
        
        if (!hasAdultInRoom) {
          return {
            isValid: false,
            message: `El niño ${child.travelerNumber} no puede estar solo en una habitación. Debe estar acompañado por un adulto.`
          };
        }
      }
    }
    
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
  }

  /**
   * Guardar asignaciones de habitaciones (solo cuando se presiona el botón)
   */
  private saveRoomAssignments(): void {
    if (this.saving) {
      return; // Evitar múltiples guardados simultáneos
    }

    this.saving = true;

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
          
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Asignaciones de habitaciones guardadas correctamente',
            life: 3000,
          });

          // Emitir evento para notificar al componente padre
          this.dataUpdated.emit();
        },
        error: (error) => {
          this.saving = false;
          
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
    // Primero: Buscar si ya existe una asignación para este viajero
    return this.reservationTravelerAccommodationService.getByReservationTraveler(travelerId)
      .pipe(
        switchMap(existingAccommodations => {
          if (existingAccommodations && existingAccommodations.length > 0) {
            // Existe una o más asignaciones
            if (existingAccommodations.length === 1) {
              // Solo una asignación, actualizarla usando PUT
              const existingAccommodation = existingAccommodations[0];
              
              const updateData = {
                id: existingAccommodation.id,
                reservationTravelerId: travelerId,
                departureAccommodationId: roomId
              };
              
              return this.reservationTravelerAccommodationService.update(existingAccommodation.id, updateData);
            } else {
              // Múltiples asignaciones, limpiar todas y crear una nueva
              return this.reservationTravelerAccommodationService.deleteByReservationTraveler(travelerId)
                .pipe(
                  switchMap(() => {
                    const createData = {
                      id: 0, // Se asigna en el backend
                      reservationTravelerId: travelerId,
                      departureAccommodationId: roomId
                    };
                    
                    return this.reservationTravelerAccommodationService.create(createData);
                  })
                );
            }
          } else {
            // No existe asignación, crear una nueva usando POST
            const createData = {
              id: 0, // Se asigna en el backend
              reservationTravelerId: travelerId,
              departureAccommodationId: roomId
            };
            
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
    const validation = this.validateGlobalRoomAssignments();
    if (validation.isValid) {
      this.saveRoomAssignments();
    } else {
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
  }
}
