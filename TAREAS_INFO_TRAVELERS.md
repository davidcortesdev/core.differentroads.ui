# Tareas del Componente Info-Travelers

## Descripción

El componente `InfoTravelersComponent` necesita mejoras significativas en validaciones de fechas, gestión de actividades en tiempo real y personalización de habitaciones. Este documento detalla todas las tareas necesarias para implementar estas funcionalidades.

## **1. VALIDACIONES AVANZADAS DE FECHAS**

### **Tarea 1.1: Implementar validación de fecha de nacimiento con edad mínima por AgeGroup**
- **Problema**: La fecha de nacimiento no valida la edad mínima según el AgeGroup del viajero
- **Solución**: Crear validador que calcule la fecha máxima permitida basada en la edad mínima del AgeGroup
- **Archivo**: `info-travelers.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Validador para fecha de nacimiento con edad mínima
  private birthdateValidator(ageGroupId: number) {
    return (control: FormControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null; // Si no hay valor, la validación required se encargará
      }

      const ageGroup = this.ageGroups.find(group => group.id === ageGroupId);
      if (!ageGroup || !ageGroup.minAge) {
        return null; // Si no hay AgeGroup o edad mínima, no validar
      }

      let date: Date;
      if (control.value instanceof Date) {
        date = control.value;
      } else if (typeof control.value === 'string') {
        if (control.value.includes('/')) {
          // Formato dd/mm/yyyy
          const parts = control.value.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            date = new Date(year, month, day);
          } else {
            return { invalidDate: true };
          }
        } else {
          date = new Date(control.value);
        }
      } else {
        return { invalidDate: true };
      }

      if (isNaN(date.getTime())) {
        return { invalidDate: true };
      }

      // Calcular fecha máxima permitida (hoy - edad mínima)
      const today = new Date();
      const maxDate = new Date(today.getFullYear() - ageGroup.minAge, today.getMonth(), today.getDate());
      
      if (date > maxDate) {
        return { 
          birthdateTooRecent: true, 
          minAge: ageGroup.minAge,
          maxAllowedDate: this.formatDateToDDMMYYYY(maxDate)
        };
      }

      // No puede ser mayor a hoy
      if (date > today) {
        return { birthdateFuture: true };
      }

      return null;
    };
  }
  ```

### **Tarea 1.2: Implementar validación de fecha de expiración**
- **Problema**: Las fechas de expiración pueden ser anteriores a hoy
- **Solución**: Crear validador que no permita fechas anteriores a hoy
- **Archivo**: `info-travelers.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Validador para fechas de expiración
  private expirationDateValidator() {
    return (control: FormControl): { [key: string]: any } | null => {
      if (!control.value) {
        return null; // Si no hay valor, la validación required se encargará
      }

      let date: Date;
      if (control.value instanceof Date) {
        date = control.value;
      } else if (typeof control.value === 'string') {
        if (control.value.includes('/')) {
          // Formato dd/mm/yyyy
          const parts = control.value.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            date = new Date(year, month, day);
          } else {
            return { invalidDate: true };
          }
        } else {
          date = new Date(control.value);
        }
      } else {
        return { invalidDate: true };
      }

      if (isNaN(date.getTime())) {
        return { invalidDate: true };
      }

      // No puede ser anterior a hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
      date.setHours(0, 0, 0, 0);

      if (date < today) {
        return { expirationDatePast: true };
      }

      return null;
    };
  }
  ```

### **Tarea 1.3: Actualizar getValidatorsForField para usar los nuevos validadores**
- **Problema**: Los validadores actuales no incluyen las validaciones avanzadas de fechas
- **Solución**: Integrar los nuevos validadores según el tipo de campo
- **Archivo**: `info-travelers.component.ts` líneas 425-460
- **Código a modificar**:
  ```typescript
  // MODIFICAR: Actualizar validaciones de fecha
  case 'date':
    // Para campos de fecha, agregar validación de fecha válida
    validators.push(this.dateValidator());
    
    // NUEVO: Validación específica según el código del campo
    if (fieldDetails.code.toLowerCase().includes('birth') || 
        fieldDetails.code.toLowerCase().includes('nacimiento')) {
      // Es fecha de nacimiento, usar validador con edad mínima
      validators.push(this.birthdateValidator(traveler.ageGroupId));
    } else if (fieldDetails.code.toLowerCase().includes('expir') || 
               fieldDetails.code.toLowerCase().includes('venc')) {
      // Es fecha de expiración, usar validador de expiración
      validators.push(this.expirationDateValidator());
    }
    break;
  ```

### **Tarea 1.4: Actualizar mensajes de error para las nuevas validaciones**
- **Problema**: No hay mensajes específicos para las nuevas validaciones de fecha
- **Solución**: Añadir mensajes de error personalizados
- **Archivo**: `info-travelers.component.ts` líneas 155-192
- **Código a añadir**:
  ```typescript
  // NUEVO: Mensajes de error para validaciones avanzadas de fechas
  date: {
    required: 'Esta fecha es obligatoria.',
    invalidDate: 'Fecha inválida.',
    pastDate: 'La fecha debe ser anterior a hoy.',
    futureDate: 'La fecha debe ser posterior a hoy.',
    birthdateTooRecent: 'La fecha de nacimiento no puede ser posterior a {maxAllowedDate}. La edad mínima para este grupo es {minAge} años.',
    birthdateFuture: 'La fecha de nacimiento no puede ser futura.',
    expirationDatePast: 'La fecha de expiración no puede ser anterior a hoy.'
  },
  ```

### **Tarea 1.6: Configurar DatePicker con locale inglés (temporal)**
- **Problema**: El DatePicker debe mostrar en inglés temporalmente hasta configurar el locale global
- **Solución**: No alterar de momento el datepicker
- **Archivo**: `info-travelers.component.html` líneas 196-209 y 330-339


### **Tarea 1.5: Actualizar getErrorMessage para manejar las nuevas validaciones**
- **Problema**: El método getErrorMessage no maneja las nuevas validaciones de fecha
- **Solución**: Añadir casos para las nuevas validaciones
- **Archivo**: `info-travelers.component.ts` líneas 1815-1850
- **Código a añadir**:
  ```typescript
  // NUEVO: Casos para validaciones avanzadas de fechas
  } else if (errorKey === 'birthdateTooRecent' && errors[errorKey]?.minAge && errors[errorKey]?.maxAllowedDate) {
    message = message.replace('{minAge}', errors[errorKey].minAge);
    message = message.replace('{maxAllowedDate}', errors[errorKey].maxAllowedDate);
  } else if (errorKey === 'birthdateFuture') {
    message = 'La fecha de nacimiento no puede ser futura.';
  } else if (errorKey === 'expirationDatePast') {
    message = 'La fecha de expiración no puede ser anterior a hoy.';
  }
  ```

## **2. GESTIÓN DE ACTIVIDADES EN TIEMPO REAL**

### **Tarea 2.1: Implementar guardado automático de selección de actividades**
- **Problema**: Las actividades se seleccionan pero no se guardan hasta hacer clic en continuar
- **Solución**: Guardar inmediatamente cuando se cambia el toggle de una actividad
- **Archivo**: `info-travelers.component.ts` líneas 1324-1350
- **Código a modificar**:
  ```typescript
  // MODIFICAR: onActivityToggleChange para guardado inmediato
  onActivityToggleChange(
    travelerId: number,
    activityId: number,
    isSelected: boolean
  ): void {
    const activityName = this.getActivityName(activityId);

    if (activityName) {
      const activityPrice = this.getActivityPrice(travelerId, activityId) || 0;

      if (isSelected) {
        // NUEVO: Guardar inmediatamente al seleccionar
        this.createActivityAssignmentImmediate(
          travelerId,
          activityId,
          activityName,
          activityPrice
        );
      } else {
        // NUEVO: Eliminar inmediatamente al deseleccionar
        this.removeActivityAssignmentImmediate(
          travelerId,
          activityId,
          activityName,
          activityPrice
        );
      }
    }
  }
  ```

### **Tarea 2.2: Crear métodos de guardado inmediato para actividades**
- **Problema**: Los métodos actuales no están optimizados para guardado inmediato
- **Solución**: Crear métodos específicos para guardado inmediato con feedback visual
- **Archivo**: `info-travelers.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Propiedades para controlar el estado de guardado de actividades
  private savingActivities: { [key: string]: boolean } = {};

  // NUEVO: Crear asignación de actividad con guardado inmediato
  private createActivityAssignmentImmediate(
    travelerId: number,
    activityId: number,
    activityName: string,
    activityPrice: number
  ): void {
    const key = `${travelerId}_${activityId}`;
    
    if (this.savingActivities[key]) {
      return;
    }

    this.savingActivities[key] = true;

    const isCurrentlyAssigned = this.isTravelerActivityAssigned(travelerId, activityId);
    const wasDeletedFromDB = this.deletedFromDB[travelerId]?.[activityId];

    if (isCurrentlyAssigned && !wasDeletedFromDB) {
      this.savingActivities[key] = false;
      this.activitiesAssignmentChange.emit({
        travelerId,
        activityId,
        isAssigned: true,
        activityName,
        activityPrice,
      });
      return;
    }

    const activity = this.optionalActivities.find((a) => a.id === activityId);
    if (!activity) {
      this.savingActivities[key] = false;
      return;
    }

    const isActivityPack = activity.type === 'pack';

    if (isActivityPack) {
      const activityPackData = {
        id: 0,
        reservationTravelerId: travelerId,
        activityPackId: activityId,
      };

      this.reservationTravelerActivityPackService
        .create(activityPackData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.savingActivities[key] = false;
            
            if (wasDeletedFromDB) {
              const existingPackIndex = this.travelerActivityPacks[travelerId]?.findIndex(
                (pack) => pack.activityPackId === activityId
              );

              if (existingPackIndex !== -1 && existingPackIndex !== undefined) {
                this.travelerActivityPacks[travelerId][existingPackIndex] = response;
              } else {
                if (!this.travelerActivityPacks[travelerId]) {
                  this.travelerActivityPacks[travelerId] = [];
                }
                this.travelerActivityPacks[travelerId].push(response);
              }
            } else {
              if (!this.travelerActivityPacks[travelerId]) {
                this.travelerActivityPacks[travelerId] = [];
              }
              this.travelerActivityPacks[travelerId].push(response);
            }

            if (this.deletedFromDB[travelerId]?.[activityId]) {
              delete this.deletedFromDB[travelerId][activityId];
            }

            this.activitiesAssignmentChange.emit({
              travelerId,
              activityId,
              isAssigned: true,
              activityName,
              activityPrice,
            });

          },
          error: (error) => {
            this.savingActivities[key] = false;
            console.error('❌ Error guardando actividad:', error);
            
            // Revertir UI en caso de error
            this.activitiesAssignmentChange.emit({
              travelerId,
              activityId,
              isAssigned: false,
              activityName,
              activityPrice,
            });
          },
        });
    } else {
      const activityData = {
        id: 0,
        reservationTravelerId: travelerId,
        activityId: activityId,
      };

      this.reservationTravelerActivityService
        .create(activityData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.savingActivities[key] = false;
            
            if (wasDeletedFromDB) {
              const existingActivityIndex = this.travelerActivities[travelerId]?.findIndex(
                (activity) => activity.activityId === activityId
              );

              if (existingActivityIndex !== -1 && existingActivityIndex !== undefined) {
                this.travelerActivities[travelerId][existingActivityIndex] = response;
              } else {
                if (!this.travelerActivities[travelerId]) {
                  this.travelerActivities[travelerId] = [];
                }
                this.travelerActivities[travelerId].push(response);
              }
            } else {
              if (!this.travelerActivities[travelerId]) {
                this.travelerActivities[travelerId] = [];
              }
              this.travelerActivities[travelerId].push(response);
            }

            if (this.deletedFromDB[travelerId]?.[activityId]) {
              delete this.deletedFromDB[travelerId][activityId];
            }

            this.activitiesAssignmentChange.emit({
              travelerId,
              activityId,
              isAssigned: true,
              activityName,
              activityPrice,
            });

          },
          error: (error) => {
            this.savingActivities[key] = false;
            console.error('❌ Error guardando actividad:', error);
            
            // Revertir UI en caso de error
            this.activitiesAssignmentChange.emit({
              travelerId,
              activityId,
              isAssigned: false,
              activityName,
              activityPrice,
            });
          },
        });
    }
  }

  // NUEVO: Eliminar asignación de actividad con guardado inmediato
  private removeActivityAssignmentImmediate(
    travelerId: number,
    activityId: number,
    activityName: string,
    activityPrice: number
  ): void {
    const key = `${travelerId}_${activityId}`;
    
    if (this.savingActivities[key]) {
      return;
    }

    this.savingActivities[key] = true;

    const individualActivities = this.travelerActivities[travelerId] || [];
    const individualActivity = individualActivities.find(
      (activity) => activity.activityId === activityId
    );

    const activityPacks = this.travelerActivityPacks[travelerId] || [];
    const activityPack = activityPacks.find(
      (pack) => pack.activityPackId === activityId
    );

    if (individualActivity) {
      this.reservationTravelerActivityService
        .delete(individualActivity.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.savingActivities[key] = false;
            
            if (!this.deletedFromDB[travelerId]) {
              this.deletedFromDB[travelerId] = {};
            }
            this.deletedFromDB[travelerId][activityId] = true;

            this.activitiesAssignmentChange.emit({
              travelerId,
              activityId,
              isAssigned: false,
              activityName,
              activityPrice,
            });

          },
          error: (error) => {
            this.savingActivities[key] = false;
            console.error('❌ Error eliminando actividad:', error);
          },
        });
    } else if (activityPack) {
      this.reservationTravelerActivityPackService
        .delete(activityPack.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.savingActivities[key] = false;
            
            if (!this.deletedFromDB[travelerId]) {
              this.deletedFromDB[travelerId] = {};
            }
            this.deletedFromDB[travelerId][activityId] = true;

            this.activitiesAssignmentChange.emit({
              travelerId,
              activityId,
              isAssigned: false,
              activityName,
              activityPrice,
            });

          },
          error: (error) => {
            this.savingActivities[key] = false;
            console.error('❌ Error eliminando actividad:', error);
          },
        });
    } else {
      this.savingActivities[key] = false;
      this.activitiesAssignmentChange.emit({
        travelerId,
        activityId,
        isAssigned: false,
        activityName,
        activityPrice,
      });
    }
  }
  ```

### **Tarea 2.3: Añadir indicador visual de guardado en actividades**
- **Problema**: No hay feedback visual cuando se está guardando una actividad
- **Solución**: Mostrar spinner o estado de carga en los toggles
- **Archivo**: `info-travelers.component.html` líneas 375-405
- **Código a modificar**:
  ```html
  <!-- MODIFICAR: Añadir indicador de guardado en actividades -->
  <div class="activity-item" style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0;">
    <div class="activity-info">
      <h5><strong>{{ getActivityName(travelerActivity.activityId) }}</strong></h5>
    </div>
    <div class="activity-toggle-container">
      <p-progressSpinner 
        *ngIf="isSavingActivity(traveler.id, travelerActivity.activityId)"
        styleClass="activity-saving-spinner"
        [style]="{ width: '20px', height: '20px' }">
      </p-progressSpinner>
      <p-toggleSwitch 
        *ngIf="!isSavingActivity(traveler.id, travelerActivity.activityId)"
        [ngModel]="true"
        [disabled]="isSavingActivity(traveler.id, travelerActivity.activityId)"
        (ngModelChange)="onActivityToggleChange(traveler.id, travelerActivity.activityId, $event)"
        [ngModelOptions]="{standalone: true}">
      </p-toggleSwitch>
    </div>
  </div>
  ```

### **Tarea 2.4: Crear método para verificar si se está guardando una actividad**
- **Problema**: No hay forma de verificar si una actividad se está guardando
- **Solución**: Crear método que consulte el estado de guardado
- **Archivo**: `info-travelers.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Verificar si se está guardando una actividad específica
  isSavingActivity(travelerId: number, activityId: number): boolean {
    const key = `${travelerId}_${activityId}`;
    return !!this.savingActivities[key];
  }
  ```

## **3. PERSONALIZACIÓN DE HABITACIONES**

> **⚠️ IMPORTANTE**: Esta funcionalidad debe implementarse **DESPUÉS** de completar todas las demás tareas del componente. La personalización de habitaciones es una funcionalidad adicional que se añadirá al final.

### **Tarea 3.1: Crear interfaz independiente para gestión de habitaciones**
- **Problema**: No existe funcionalidad para personalizar habitaciones
- **Solución**: Crear sistema independiente de asignación de habitaciones entre viajeros (sin depender de otros componentes)
- **Archivo**: `info-travelers.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Propiedades para gestión de habitaciones (INDEPENDIENTE)
  roomAssignments: { [travelerId: number]: number } = {}; // travelerId -> roomNumber
  availableRooms: number[] = [];
  maxRooms: number = 0;
  selectedRoomsCount: number = 0; // Número de habitaciones seleccionadas

  // NUEVO: Cargar información de habitaciones de forma independiente
  private loadRoomInformation(): void {
    if (!this.reservationId) return;

    // Obtener información de habitaciones directamente del backend
    // NO depender de otros componentes
    this.loadSelectedRoomsFromBackend();
  }

  // NUEVO: Cargar habitaciones seleccionadas desde el backend
  private loadSelectedRoomsFromBackend(): void {
    // Implementar llamada directa al servicio de habitaciones
    // Esto debe ser independiente de selector-room
    this.calculateAvailableRooms();
  }

  // NUEVO: Calcular habitaciones disponibles de forma independiente
  private calculateAvailableRooms(): void {
    // Calcular basado en el número de viajeros y habitaciones seleccionadas
    // Obtener información directamente del backend, no de otros componentes
    this.maxRooms = Math.ceil(this.travelers.length / 2); // Máximo 2 personas por habitación
    this.availableRooms = Array.from({ length: this.maxRooms }, (_, i) => i + 1);
  }
  ```

### **Tarea 3.2: Crear componente de selección de habitaciones con PrimeNG v19**
- **Problema**: No hay interfaz para seleccionar habitaciones
- **Solución**: Añadir sección de habitaciones en el template usando PrimeNG v19
- **Archivo**: `info-travelers.component.html`
- **Código a añadir**:
  ```html
  <!-- NUEVO: Sección de personalización de habitaciones -->
  <div class="room-assignment-section" *ngIf="showRoomAssignment">
    <h4>Personalización de habitaciones</h4>
    <p class="room-assignment-description">
      Asigna a cada viajero a una habitación específica. Puedes cambiar estas asignaciones en cualquier momento.
    </p>
    
    <div class="room-assignment-grid">
      <div *ngFor="let traveler of travelers" class="traveler-room-assignment">
        <div class="traveler-info">
          <i class="pi pi-user"></i>
          <span>{{ getAgeGroupName(traveler.ageGroupId) }} {{ traveler.travelerNumber }}</span>
          <span *ngIf="traveler.isLeadTraveler" class="lead-traveler-badge">(Líder)</span>
        </div>
        
        <div class="room-selector">
          <label>Habitación:</label>
          <!-- NUEVO: Usar p-autocomplete con dropdown según PrimeNG v19 -->
          <p-autocomplete
            [(ngModel)]="roomAssignments[traveler.id]"
            [suggestions]="availableRooms"
            [dropdown]="true"
            [forceSelection]="true"
            (completeMethod)="onRoomSearch($event)"
            (onSelect)="onRoomAssignmentChange(traveler.id, $event)"
            placeholder="Seleccionar habitación"
            [ngModelOptions]="{standalone: true}">
          </p-autocomplete>
        </div>
      </div>
    </div>
    
    <div class="room-summary" *ngIf="getRoomSummary().length > 0">
      <h5>Resumen de habitaciones:</h5>
      <div *ngFor="let roomInfo of getRoomSummary()" class="room-info">
        <strong>Habitación {{ roomInfo.roomNumber }}:</strong>
        <span *ngFor="let traveler of roomInfo.travelers; let last = last">
          {{ getAgeGroupName(traveler.ageGroupId) }} {{ traveler.travelerNumber }}<span *ngIf="!last">, </span>
        </span>
      </div>
    </div>
  </div>
  ```

### **Tarea 3.3: Implementar lógica de asignación de habitaciones independiente**
- **Problema**: No hay lógica para manejar las asignaciones de habitaciones
- **Solución**: Crear métodos independientes para gestionar las asignaciones (sin depender de otros componentes)
- **Archivo**: `info-travelers.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Manejar búsqueda de habitaciones para autocomplete
  onRoomSearch(event: any): void {
    // Filtrar habitaciones disponibles basado en la búsqueda
    const query = event.query.toLowerCase();
    this.availableRooms = Array.from({ length: this.maxRooms }, (_, i) => i + 1)
      .filter(room => room.toString().includes(query));
  }

  // NUEVO: Manejar cambio de asignación de habitación
  onRoomAssignmentChange(travelerId: number, selectedRoom: any): void {
    const roomNumber = selectedRoom ? selectedRoom : null;
    
    // Validar que no haya conflictos
    if (roomNumber && this.validateRoomAssignment(travelerId, roomNumber)) {
      this.roomAssignments[travelerId] = roomNumber;
      this.saveRoomAssignments();
    } else if (roomNumber) {
      // Revertir selección si hay conflicto
      this.roomAssignments[travelerId] = null;
      this.messageService.add({
        severity: 'warn',
        summary: 'Asignación inválida',
        detail: 'No se puede asignar a esta habitación. Verifica las restricciones.',
        life: 3000,
      });
    }
  }

  // NUEVO: Validar asignación de habitación
  private validateRoomAssignment(travelerId: number, roomNumber: number): boolean {
    // Verificar que no haya más de 2 personas por habitación
    const travelersInRoom = Object.values(this.roomAssignments).filter(room => room === roomNumber).length;
    if (travelersInRoom >= 2) {
      return false;
    }

    // Verificar que no haya niños solos en habitaciones
    const traveler = this.travelers.find(t => t.id === travelerId);
    if (traveler && this.isChildTraveler(traveler)) {
      const otherTravelerInRoom = this.travelers.find(t => 
        t.id !== travelerId && 
        this.roomAssignments[t.id] === roomNumber
      );
      
      if (otherTravelerInRoom && this.isChildTraveler(otherTravelerInRoom)) {
        return false; // No permitir dos niños solos
      }
    }

    return true;
  }

  // NUEVO: Verificar si un viajero es niño
  private isChildTraveler(traveler: IReservationTravelerResponse): boolean {
    const ageGroup = this.ageGroups.find(group => group.id === traveler.ageGroupId);
    return ageGroup ? ageGroup.maxAge < 18 : false;
  }

  // NUEVO: Obtener resumen de habitaciones
  getRoomSummary(): Array<{ roomNumber: number; travelers: IReservationTravelerResponse[] }> {
    const summary: Array<{ roomNumber: number; travelers: IReservationTravelerResponse[] }> = [];
    
    Object.entries(this.roomAssignments).forEach(([travelerId, roomNumber]) => {
      if (roomNumber) {
        let roomInfo = summary.find(r => r.roomNumber === roomNumber);
        if (!roomInfo) {
          roomInfo = { roomNumber, travelers: [] };
          summary.push(roomInfo);
        }
        
        const traveler = this.travelers.find(t => t.id === parseInt(travelerId));
        if (traveler) {
          roomInfo.travelers.push(traveler);
        }
      }
    });

    return summary.sort((a, b) => a.roomNumber - b.roomNumber);
  }

  // NUEVO: Guardar asignaciones de habitaciones
  private saveRoomAssignments(): void {
    // Aquí se implementaría la lógica para guardar las asignaciones
    // Esto debería integrarse con el servicio de habitaciones
    
    // Emitir evento para notificar al componente padre
    this.roomAssignmentsChange.emit(this.roomAssignments);
  }
  ```

### **Tarea 3.4: Añadir evento para cambios en asignaciones de habitaciones**
- **Problema**: El componente padre no sabe cuándo cambian las asignaciones
- **Solución**: Añadir evento de salida
- **Archivo**: `info-travelers.component.ts` líneas 86-94
- **Código a añadir**:
  ```typescript
  // NUEVO: Output para cambios en asignaciones de habitaciones
  @Output() roomAssignmentsChange = new EventEmitter<{ [travelerId: number]: number }>();
  ```

### **Tarea 3.5: Añadir estilos para la sección de habitaciones**
- **Problema**: No hay estilos para la nueva sección de habitaciones
- **Solución**: Añadir estilos CSS
- **Archivo**: `info-travelers.component.scss`
- **Código a añadir**:
  ```scss
  // NUEVO: Estilos para personalización de habitaciones
  .room-assignment-section {
    margin-top: 2rem;
    padding: 1.5rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;

    h4 {
      margin: 0 0 1rem 0;
      color: var(--background-azul);
      font-size: 1.1rem;
      font-weight: 600;
    }

    .room-assignment-description {
      margin: 0 0 1.5rem 0;
      color: #6c757d;
      font-size: 0.9rem;
    }

    .room-assignment-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .traveler-room-assignment {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background-color: white;
        border-radius: 6px;
        border: 1px solid #dee2e6;

        .traveler-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          i {
            color: var(--background-azul);
          }

          .lead-traveler-badge {
            background-color: #007bff;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
          }
        }

        .room-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          label {
            margin: 0;
            font-weight: 500;
            color: var(--background-azul);
          }
        }
      }
    }

    .room-summary {
      margin-top: 1.5rem;
      padding: 1rem;
      background-color: white;
      border-radius: 6px;
      border: 1px solid #dee2e6;

      h5 {
        margin: 0 0 1rem 0;
        color: var(--background-azul);
        font-size: 1rem;
        font-weight: 600;
      }

      .room-info {
        margin-bottom: 0.5rem;
        padding: 0.5rem;
        background-color: #f8f9fa;
        border-radius: 4px;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  // NUEVO: Estilos para indicador de guardado de actividades
  .activity-toggle-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .activity-saving-spinner {
      margin: 0;
    }
  }
  ```

## **4. INTEGRACIÓN Y OPTIMIZACIONES**

### **Tarea 4.1: Mantener independencia del componente**
- **Problema**: El componente debe ser completamente independiente
- **Solución**: NO depender de otros componentes, obtener datos directamente del backend
- **Archivo**: `info-travelers.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Propiedades para mantener independencia
  // NO usar @Input() de otros componentes
  // Obtener toda la información directamente del backend

  // NUEVO: Cargar información de habitaciones de forma independiente
  private loadRoomDataIndependently(): void {
    if (!this.reservationId) return;

    // Obtener información de habitaciones directamente del backend
    // NO depender de selector-room ni otros componentes
    this.loadSelectedRoomsFromBackend();
  }

  // NUEVO: Cargar habitaciones seleccionadas desde el backend
  private loadSelectedRoomsFromBackend(): void {
    // Implementar llamada directa al servicio de habitaciones
    // Esto debe ser independiente de cualquier otro componente
    this.calculateAvailableRooms();
  }
  ```

### **Tarea 4.2: Añadir validaciones de habitaciones**
- **Problema**: Faltan validaciones específicas para las asignaciones de habitaciones
- **Solución**: Implementar validaciones completas
- **Archivo**: `info-travelers.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Validar todas las asignaciones de habitaciones
  validateAllRoomAssignments(): boolean {
    const errors: string[] = [];

    // Verificar que todos los viajeros tengan habitación asignada
    this.travelers.forEach(traveler => {
      if (!this.roomAssignments[traveler.id]) {
        errors.push(`El viajero ${traveler.travelerNumber} no tiene habitación asignada`);
      }
    });

    // Verificar que no haya más de 2 personas por habitación
    const roomCounts: { [roomNumber: number]: number } = {};
    Object.values(this.roomAssignments).forEach(roomNumber => {
      if (roomNumber) {
        roomCounts[roomNumber] = (roomCounts[roomNumber] || 0) + 1;
        if (roomCounts[roomNumber] > 2) {
          errors.push(`La habitación ${roomNumber} tiene más de 2 personas asignadas`);
        }
      }
    });

    // Verificar que no haya niños solos
    this.travelers.forEach(traveler => {
      if (this.isChildTraveler(traveler)) {
        const roomNumber = this.roomAssignments[traveler.id];
        if (roomNumber) {
          const otherTravelersInRoom = this.travelers.filter(t => 
            t.id !== traveler.id && 
            this.roomAssignments[t.id] === roomNumber
          );
          
          if (otherTravelersInRoom.length === 0) {
            errors.push(`El viajero ${traveler.travelerNumber} (niño) no puede estar solo en la habitación ${roomNumber}`);
          } else if (otherTravelersInRoom.every(t => this.isChildTraveler(t))) {
            errors.push(`No puede haber solo niños en la habitación ${roomNumber}`);
          }
        }
      }
    });

    if (errors.length > 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Errores en asignación de habitaciones',
        detail: errors.join('. '),
        life: 5000,
      });
      return false;
    }

    return true;
  }
  ```

### **Tarea 4.3: Añadir método para mostrar/ocultar sección de habitaciones**
- **Problema**: La sección de habitaciones debe ser opcional
- **Solución**: Añadir control de visibilidad
- **Archivo**: `info-travelers.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Propiedad para controlar visibilidad de habitaciones
  showRoomAssignment: boolean = false;

  // NUEVO: Toggle para mostrar/ocultar sección de habitaciones
  toggleRoomAssignment(): void {
    this.showRoomAssignment = !this.showRoomAssignment;
    
    if (this.showRoomAssignment) {
      this.loadRoomInformation();
    }
  }
  ```

## **5. ARCHIVOS A MODIFICAR**

- `src/app/pages/checkout-v2/components/info-travelers/info-travelers.component.ts`
- `src/app/pages/checkout-v2/components/info-travelers/info-travelers.component.html`
- `src/app/pages/checkout-v2/components/info-travelers/info-travelers.component.scss`

## **INTEGRACIÓN CON COMPONENTE PADRE**

El componente padre (`checkout-v2`) deberá:

1. **Escuchar el evento `roomAssignmentsChange`** para actualizar las asignaciones de habitaciones
2. **NO proporcionar información de habitaciones** - el componente es independiente
3. **Manejar solo los eventos** emitidos por el componente

### **Ejemplo de implementación en el componente padre:**

```html
<!-- En checkout-v2.component.html -->
<app-info-travelers
  [departureId]="departureId"
  [reservationId]="reservationId"
  [itineraryId]="itineraryId"
  (activitiesAssignmentChange)="onActivitiesChange($event)"
  (roomAssignmentsChange)="onRoomAssignmentsChange($event)"
  (formValidityChange)="onFormValidityChange($event)"
  #infoTravelers>
</app-info-travelers>
```

```typescript
// En checkout-v2.component.ts
onRoomAssignmentsChange(assignments: { [travelerId: number]: number }) {
  // El componente es independiente, no necesita sincronización externa
  this.updateOrderSummary(); // Solo actualizar resumen si es necesario
}
```

## **BENEFICIOS ESPERADOS**

- ✅ **Validaciones avanzadas de fechas**: Fechas de nacimiento con edad mínima por AgeGroup y fechas de expiración válidas
- ✅ **Gestión de actividades en tiempo real**: Guardado inmediato sin esperar al botón continuar
- ✅ **Personalización de habitaciones**: Asignación flexible de viajeros a habitaciones específicas (implementar DESPUÉS)
- ✅ **Validaciones de habitaciones**: Prevención de conflictos y asignaciones inválidas
- ✅ **Feedback visual**: Indicadores de carga y estados de guardado
- ✅ **Componente independiente**: No depende de otros componentes, obtiene datos directamente del backend
- ✅ **Experiencia de usuario mejorada**: Interfaz intuitiva y responsiva
- ✅ **PrimeNG v19**: Uso correcto de componentes según la versión actual

## **NOTAS IMPORTANTES**

1. **Validaciones de fecha**: Las validaciones se basan en la configuración de AgeGroups del backend
2. **Guardado inmediato**: Las actividades se guardan automáticamente al cambiar el toggle
3. **Habitaciones**: La personalización es opcional, se implementa DESPUÉS de completar las demás tareas
4. **Independencia**: El componente NO depende de otros componentes, es completamente autónomo
5. **Validaciones robustas**: Previene asignaciones inválidas y conflictos
6. **Performance**: Optimizado para manejar múltiples operaciones simultáneas
7. **DatePicker temporal**: Configurado en inglés con domingo como primer día hasta configurar locale global
8. **PrimeNG v19**: Uso de [p-autocomplete con dropdown](https://v19.primeng.org/autocomplete#dropdown) según la versión actual
