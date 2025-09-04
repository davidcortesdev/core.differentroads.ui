# Lista de Tareas: Selector Room - Guardado Automático y Mejoras

## Filosofía del Proyecto
**Objetivo**: Implementar el guardado automático de información en el backend desde el primer momento, sin esperar a que el usuario haga clic en "Continuar". Esto mejorará la experiencia del usuario y evitará pérdida de datos.

## Análisis del Estado Actual del Selector Room

### ✅ **Lo que ya funciona correctamente:**
- **Carga de habitaciones desde el backend**: Ya obtiene datos de `DepartureAccommodationService`
- **Validación de plazas**: Ya valida que las habitaciones seleccionadas no excedan el número de viajeros
- **Distribución de habitaciones**: Ya tiene lógica para distribuir habitaciones entre viajeros
- **Comunicación con componente padre**: Ya emite eventos `roomsSelectionChange`

### ❌ **Problemas identificados que necesitan corrección:**

## **TAREAS PRIORITARIAS**

### **1. GUARDADO AUTOMÁTICO AL SELECCIONAR HABITACIONES**

#### **Tarea 1.1: Implementar guardado inmediato en onRoomSpacesChange()**
- **Problema**: No se guarda automáticamente cuando se seleccionan habitaciones
- **Solución**: Llamar a `saveRoomAssignments()` con debounce para evitar interferir con la selección del usuario
- **Archivo**: `selector-room.component.ts` líneas 572-584
- **Código a modificar**:
  ```typescript
  onRoomSpacesChange(changedRoom: RoomAvailability, newValue: number): void {
    if (newValue === 0) {
      delete this.selectedRooms[changedRoom.tkId];
    } else {
      this.selectedRooms[changedRoom.tkId] = newValue;
    }

    // NUEVO: Guardar con debounce para no interferir con la selección del usuario
    this.debouncedSave();

    this.updateRooms();
  }
  ```

#### **Tarea 1.2: Añadir indicador de guardado en la interfaz**
- **Problema**: No hay feedback visual cuando se está guardando
- **Solución**: Mostrar spinner o mensaje de "Guardando..." en el HTML
- **Archivo**: `selector-room.component.html`
- **Código a añadir**:
  ```html
  <div class="room-selector" [class.saving]="saving">
    <!-- Contenido existente -->
  </div>
  
  <!-- Indicador de guardado -->
  <div *ngIf="saving" class="saving-indicator">
    <i class="pi pi-spin pi-spinner"></i>
    <span>Guardando habitaciones...</span>
  </div>
  ```

### **2. CARGA INDEPENDIENTE DE VIAJEROS**

#### **Tarea 2.1: Crear método para cargar viajeros independientemente**
- **Problema**: Depende del componente `selector-traveler` para obtener viajeros
- **Solución**: Crear método propio para cargar viajeros desde `ReservationTravelerService`
- **Archivo**: `selector-room.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Propiedad para controlar el estado de carga
  loadingTravelers: boolean = false;
  travelersError: string | null = null;

  // NUEVO: Método para cargar viajeros independientemente
  private async loadTravelersIndependently(): Promise<IReservationTravelerResponse[]> {
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
  ```

#### **Tarea 2.2: Modificar initializeComponent() para cargar viajeros independientemente**
- **Problema**: La carga de viajeros está mezclada con otros datos
- **Solución**: Separar la carga de viajeros y hacerla independiente
- **Archivo**: `selector-room.component.ts` líneas 172-216
- **Código a modificar**:
  ```typescript
  async initializeComponent(): Promise<void> {
    if (!this.departureId) return;

    try {
      // Cargar datos básicos en paralelo
      const [accommodations, types] = await Promise.all([
        this.departureAccommodationService.getByDeparture(this.departureId!).toPromise(),
        this.departureAccommodationTypeService.getAll().toPromise(),
      ]);

      this.processBasicData(accommodations || [], types || []);

      // Cargar precios y viajeros en paralelo
      const [prices, travelers] = await Promise.all([
        this.departureAccommodationPriceService.getByDeparture(this.departureId!).toPromise(),
        this.loadTravelersIndependently(), // NUEVO: Carga independiente
      ]);

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
  ```

### **3. VALIDACIÓN DE NIÑOS SOLOS EN HABITACIONES**

#### **Tarea 3.1: Crear método para validar asignaciones de niños**
- **Problema**: No hay validación específica para evitar que los niños queden solos
- **Solución**: Crear validación que asegure que los niños siempre estén acompañados por adultos
- **Archivo**: `selector-room.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Método para validar que no queden niños solos
  private validateChildrenAssignments(): { isValid: boolean; errorMessage: string } {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      return { isValid: true, errorMessage: '' };
    }

    // Obtener viajeros por grupos de edad
    const adults = this.existingTravelers.filter(t => this.isAdultTraveler(t));
    const children = this.existingTravelers.filter(t => this.isChildTraveler(t));

    if (children.length === 0) {
      return { isValid: true, errorMessage: '' };
    }

    // Verificar que hay suficientes adultos para acompañar a los niños
    if (adults.length === 0) {
      return { 
        isValid: false, 
        errorMessage: 'Debe haber al menos un adulto para acompañar a los niños.' 
      };
    }

    // Verificar que cada niño tenga un adulto asignado en la misma habitación
    const invalidAssignments = this.currentRoomAssignments.filter(assignment => {
      const traveler = this.existingTravelers.find(t => t.id === assignment.travelerId);
      if (!traveler || !this.isChildTraveler(traveler)) {
        return false;
      }

      // Buscar si hay un adulto en la misma habitación
      const hasAdultInSameRoom = this.currentRoomAssignments.some(otherAssignment => {
        if (otherAssignment.travelerId === assignment.travelerId) {
          return false;
        }
        
        const otherTraveler = this.existingTravelers.find(t => t.id === otherAssignment.travelerId);
        return otherAssignment.roomId === assignment.roomId && 
               otherTraveler && 
               this.isAdultTraveler(otherTraveler);
      });

      return !hasAdultInSameRoom;
    });

    if (invalidAssignments.length > 0) {
      return { 
        isValid: false, 
        errorMessage: 'Los niños no pueden estar solos en una habitación. Deben estar acompañados por un adulto.' 
      };
    }

    return { isValid: true, errorMessage: '' };
  }

  // NUEVO: Métodos auxiliares para identificar tipos de viajeros
  private isAdultTraveler(traveler: IReservationTravelerResponse): boolean {
    // Implementar lógica para identificar adultos basada en ageGroup
    // Esto dependerá de cómo se identifiquen los grupos de edad en tu sistema
    return true; // Placeholder - implementar según tu lógica
  }

  private isChildTraveler(traveler: IReservationTravelerResponse): boolean {
    // Implementar lógica para identificar niños basada en ageGroup
    return false; // Placeholder - implementar según tu lógica
  }
  ```

#### **Tarea 3.2: Integrar validación en el proceso de distribución**
- **Problema**: La validación no se aplica durante la distribución de habitaciones
- **Solución**: Aplicar la validación antes de guardar las asignaciones
- **Archivo**: `selector-room.component.ts` líneas 647-723
- **Código a modificar**:
  ```typescript
  distributeRoomsToTravelers(selectedRooms: RoomAvailability[]): void {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      return;
    }

    // ... código existente de distribución ...

    // NUEVO: Validar asignaciones de niños antes de guardar
    this.currentRoomAssignments = roomAssignments;
    
    const validation = this.validateChildrenAssignments();
    if (!validation.isValid) {
      this.errorMsg = validation.errorMessage;
      this.currentRoomAssignments = []; // Limpiar asignaciones inválidas
      return;
    }

    this.errorMsg = null; // Limpiar errores si la validación es exitosa
  }
  ```

### **4. DETECCIÓN DE CAMBIOS EN SELECTOR-TRAVELER**

#### **Tarea 4.1: Crear método para recargar información cuando cambien los viajeros**
- **Problema**: No detecta cambios en el componente `selector-traveler`
- **Solución**: Crear método público para recargar datos y reasignar habitaciones
- **Archivo**: `selector-room.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Método público para recargar cuando cambien los viajeros
  async reloadOnTravelersChange(): Promise<void> {
    console.log('🔄 Recargando habitaciones por cambio de viajeros...');
    
    try {
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
      this.distributeRoomsToTravelers(selectedRoomsWithQty as RoomAvailability[]);
    }
  }
  ```

#### **Tarea 4.2: Añadir evento de salida para notificar cambios al componente padre**
- **Problema**: El componente padre no sabe cuándo recargar ni cuándo se ha completado un guardado
- **Solución**: Añadir eventos `@Output()` para notificar cambios y guardados exitosos
- **Archivo**: `selector-room.component.ts` líneas 65-68
- **Código a añadir**:
  ```typescript
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
  ```

### **5. OPTIMIZACIONES DE RENDIMIENTO**

#### **Tarea 5.1: Implementar debounce para evitar múltiples guardados**
- **Problema**: Se puede ejecutar múltiples guardados rápidamente al añadir/quitar habitaciones
- **Solución**: Añadir debounce de 500ms para el guardado (responsabilidad del componente)
- **Archivo**: `selector-room.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Propiedades para debounce
  private saveTimeout: any;
  private saving: boolean = false;

  // NUEVO: Método con debounce para guardar (responsabilidad del componente)
  private debouncedSave(): void {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saving = true;
      this.saveStatusChange.emit({ saving: true });
      
      this.saveRoomAssignments().then(success => {
        this.saving = false;
        if (success) {
          console.log('✅ Habitaciones guardadas correctamente');
          this.saveStatusChange.emit({ saving: false, success: true });
          this.errorMsg = null; // Limpiar errores
          
          // NUEVO: Emitir evento de guardado exitoso al componente padre
          this.saveCompleted.emit({
            component: 'selector-room',
            success: true,
            data: {
              selectedRooms: this.selectedRooms,
              assignments: this.currentRoomAssignments
            }
          });
        } else {
          console.error('❌ Error guardando habitaciones');
          this.errorMsg = 'Error al guardar las habitaciones. Inténtalo de nuevo.';
          this.saveStatusChange.emit({ saving: false, success: false, error: 'Error al guardar' });
          
          // NUEVO: Emitir evento de error al componente padre
          this.saveCompleted.emit({
            component: 'selector-room',
            success: false,
            error: 'Error al guardar las habitaciones'
          });
        }
      }).catch(error => {
        this.saving = false;
        console.error('❌ Error en guardado:', error);
        this.errorMsg = 'Error al guardar las habitaciones. Inténtalo de nuevo.';
        this.saveStatusChange.emit({ saving: false, success: false, error: 'Error al guardar' });
        
        // NUEVO: Emitir evento de error al componente padre
        this.saveCompleted.emit({
          component: 'selector-room',
          success: false,
          error: error.message || 'Error al guardar las habitaciones'
        });
      });
    }, 500); // 500ms para dar tiempo al usuario de hacer múltiples selecciones
  }
  ```

#### **Tarea 5.2: Optimizar la distribución de habitaciones con validación de adultos**
- **Problema**: La distribución puede ser ineficiente y no garantiza que haya al menos un adulto por habitación
- **Solución**: Optimizar el algoritmo de distribución asegurando que siempre haya al menos un adulto por habitación
- **Archivo**: `selector-room.component.ts` líneas 647-723
- **Código a modificar**:
  ```typescript
  // OPTIMIZADO: Distribución con garantía de al menos un adulto por habitación
  distributeRoomsToTravelers(selectedRooms: RoomAvailability[]): void {
    if (!this.existingTravelers || this.existingTravelers.length === 0) {
      return;
    }

    // Separar viajeros por tipo
    const adults = this.existingTravelers.filter(t => this.isAdultTraveler(t));
    const children = this.existingTravelers.filter(t => this.isChildTraveler(t));

    // VALIDACIÓN CRÍTICA: Debe haber al menos un adulto
    if (adults.length === 0) {
      this.errorMsg = 'Debe haber al menos un adulto para asignar habitaciones.';
      this.currentRoomAssignments = [];
      return;
    }

    // Ordenar: Lead traveler primero, luego adultos, luego niños
    const sortedTravelers = [
      ...adults.filter(t => t.isLeadTraveler),
      ...adults.filter(t => !t.isLeadTraveler),
      ...children
    ];

    // Crear camas disponibles optimizadas
    const availableBeds = this.createAvailableBeds(selectedRooms);

    // Distribuir de manera optimizada garantizando al menos un adulto por habitación
    this.currentRoomAssignments = this.optimizedDistributionWithAdults(sortedTravelers, availableBeds, adults);

    // Validar asignaciones
    const validation = this.validateChildrenAssignments();
    if (!validation.isValid) {
      this.errorMsg = validation.errorMessage;
      this.currentRoomAssignments = [];
    } else {
      this.errorMsg = null;
    }
  }

  // NUEVO: Método para distribución optimizada con garantía de adultos
  private optimizedDistributionWithAdults(
    sortedTravelers: IReservationTravelerResponse[],
    availableBeds: any[],
    adults: IReservationTravelerResponse[]
  ): any[] {
    const assignments: any[] = [];
    const usedBeds = new Set<number>();
    const adultsPerRoom = new Map<number, number>(); // roomId -> count of adults

    // Primera pasada: asignar al menos un adulto por habitación
    adults.forEach(adult => {
      const availableBed = availableBeds.find(bed => 
        !usedBeds.has(bed.roomId) && 
        !assignments.some(a => a.travelerId === adult.id)
      );
      
      if (availableBed) {
        assignments.push({
          travelerId: adult.id,
          travelerNumber: adult.travelerNumber,
          isLeadTraveler: adult.isLeadTraveler,
          roomId: availableBed.roomId,
          roomTkId: availableBed.roomTkId,
          roomName: availableBed.roomName,
          departureAccommodationId: availableBed.departureAccommodationId,
          bedNumber: availableBed.bedNumber,
          isShared: availableBed.isShared,
        });
        
        usedBeds.add(availableBed.roomId);
        adultsPerRoom.set(availableBed.roomId, (adultsPerRoom.get(availableBed.roomId) || 0) + 1);
      }
    });

    // Segunda pasada: asignar el resto de viajeros (niños y adultos restantes)
    const remainingTravelers = sortedTravelers.filter(t => 
      !assignments.some(a => a.travelerId === t.id)
    );

    remainingTravelers.forEach(traveler => {
      // Buscar habitación con adultos ya asignados
      const roomWithAdults = assignments.find(a => 
        adultsPerRoom.get(a.roomId) > 0 && 
        !usedBeds.has(a.roomId)
      );

      if (roomWithAdults) {
        // Asignar a habitación con adultos
        const roomId = roomWithAdults.roomId;
        const availableBed = availableBeds.find(bed => 
          bed.roomId === roomId && 
          !assignments.some(a => a.travelerId === traveler.id)
        );

        if (availableBed) {
          assignments.push({
            travelerId: traveler.id,
            travelerNumber: traveler.travelerNumber,
            isLeadTraveler: traveler.isLeadTraveler,
            roomId: availableBed.roomId,
            roomTkId: availableBed.roomTkId,
            roomName: availableBed.roomName,
            departureAccommodationId: availableBed.departureAccommodationId,
            bedNumber: availableBed.bedNumber,
            isShared: availableBed.isShared,
          });
        }
      }
    });

    return assignments;
  }
  ```

## **ORDEN DE IMPLEMENTACIÓN RECOMENDADO**

1. **Tarea 2.1**: Crear método para cargar viajeros independientemente (base)
2. **Tarea 2.2**: Modificar initializeComponent() (carga independiente)
3. **Tarea 5.1**: Implementar debounce (optimización crítica)
4. **Tarea 1.1**: Implementar guardado inmediato con debounce (funcionalidad principal)
5. **Tarea 1.2**: Añadir indicador de guardado (UX)
6. **Tarea 5.2**: Optimizar distribución con garantía de adultos (validación crítica)
7. **Tarea 3.1**: Crear validación de niños solos (validación adicional)
8. **Tarea 3.2**: Integrar validación en distribución (aplicación)
9. **Tarea 4.1**: Crear método de recarga (comunicación)
10. **Tarea 4.2**: Añadir eventos de salida (integración)

## **ARCHIVOS A MODIFICAR**

- `src/app/pages/checkout-v2/components/selector-room/selector-room.component.ts`
- `src/app/pages/checkout-v2/components/selector-room/selector-room.component.html`
- `src/app/pages/checkout-v2/components/selector-room/selector-room.component.scss` (para estilos del indicador de guardado)

## **INTEGRACIÓN CON COMPONENTE PADRE**

El componente padre (`checkout-v2`) deberá:

1. **Escuchar el evento `travelersChanged`** para recargar habitaciones cuando cambien los viajeros
2. **Escuchar el evento `saveStatusChange`** para mostrar el estado de guardado
3. **Escuchar el evento `saveCompleted`** para saber cuándo se ha completado un guardado exitoso
4. **Llamar a `reloadOnTravelersChange()`** cuando detecte cambios en `selector-traveler`

### **Ejemplo de implementación en el componente padre:**

```html
<!-- En checkout-v2.component.html -->
<app-selector-traveler 
  [departureId]="departureId"
  [reservationId]="reservationId"
  [availableTravelers]="['Adultos', 'Niños', 'Bebés']"
  (travelersNumbersChange)="onTravelersNumbersChange($event)"
  (saveCompleted)="onSaveCompleted($event)"
  #travelerSelector>
</app-selector-traveler>

<app-selector-room 
  [departureId]="departureId"
  [reservationId]="reservationId"
  (roomsSelectionChange)="onRoomsSelectionChange($event)"
  (saveCompleted)="onSaveCompleted($event)"
  #roomSelector>
</app-selector-room>
```

```typescript
// En checkout-v2.component.ts
onSaveCompleted(event: { component: string; success: boolean; data?: any; error?: string }) {
  if (event.success) {
    console.log(`✅ Guardado exitoso en ${event.component}:`, event.data);
    // Actualizar resumen del pedido si es necesario
    this.updateOrderSummary();
  } else {
    console.error(`❌ Error en guardado de ${event.component}:`, event.error);
    // Mostrar error al usuario si es necesario
  }
}
```

## **BENEFICIOS ESPERADOS**

- ✅ **Guardado automático**: Las habitaciones se guardan automáticamente con debounce (500ms)
- ✅ **Responsabilidad del componente**: El componente se encarga de su propio guardado
- ✅ **No interferencia**: El debounce evita interferir con la selección del usuario
- ✅ **Independencia**: No depende del componente `selector-traveler` para cargar viajeros
- ✅ **Validación robusta**: Siempre hay al menos un adulto por habitación
- ✅ **Validación de niños**: Los niños nunca quedan solos en habitaciones
- ✅ **Comunicación fluida**: Se recarga automáticamente cuando cambian los viajeros
- ✅ **Mejor UX**: Indicadores visuales de guardado y validación
- ✅ **Rendimiento optimizado**: Debounce y distribución eficiente con garantías de seguridad
