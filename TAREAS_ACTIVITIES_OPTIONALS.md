# Lista de Tareas: Activities Optionals - Guardado Automático y Mejoras

## Filosofía del Proyecto
**Objetivo**: Implementar el guardado automático de información en el backend desde el primer momento, sin esperar a que el usuario haga clic en "Continuar". Esto mejorará la experiencia del usuario y evitará pérdida de datos.

## Análisis del Estado Actual del Activities Optionals

### ✅ **Lo que ya funciona correctamente:**
- **Carga de actividades desde el backend**: Ya obtiene datos de `ActivityService`
- **Carga de precios**: Ya carga precios por grupos de edad
- **Interfaz de selección**: Ya tiene botones para añadir/eliminar actividades
- **Comunicación con componente padre**: Ya emite eventos `activitiesSelectionChange`

### ❌ **Problemas identificados que necesitan corrección:**

## **TAREAS PRIORITARIAS**

### **1. GUARDADO AUTOMÁTICO AL SELECCIONAR ACTIVIDADES**

#### **Tarea 1.1: Implementar guardado inmediato en toggleActivity()**
- **Problema**: No se guarda automáticamente cuando se seleccionan actividades
- **Solución**: Llamar a `saveActivityToAllTravelers()` inmediatamente después de la selección
- **Archivo**: `activities-optionals.component.ts` líneas 367-382
- **Código a modificar**:
  ```typescript
  toggleActivity(item: ActivityWithPrice): void {
    if (this.addedActivities.has(item.id)) {
      // Actualizar UI inmediatamente
      this.addedActivities.delete(item.id);
      // Eliminar de BD inmediatamente
      this.removeActivityFromAllTravelers(item);
    } else {
      // Actualizar UI inmediatamente
      this.addedActivities.add(item.id);
      // Guardar en BD inmediatamente
      this.addActivityToAllTravelers(item);
    }

    // Emitir cambios inmediatamente
    this.emitActivitiesChange();
  }
  ```

#### **Tarea 1.2: Crear método para guardar actividad en todos los viajeros**
- **Problema**: El guardado actual es complejo y no está optimizado
- **Solución**: Crear método específico para guardar en todos los viajeros (sin cache, siempre obtiene datos frescos)
- **Archivo**: `activities-optionals.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Propiedades para controlar el estado de guardado
  private saving: boolean = false;

  // NUEVO: Método para añadir actividad a todos los viajeros
  private addActivityToAllTravelers(item: ActivityWithPrice): void {
    if (!this.reservationId || this.saving) return;

    this.saving = true;

    // SIEMPRE obtener viajeros frescos (sin cache)
    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          if (travelers.length === 0) {
            this.saving = false;
            this.saveCompleted.emit({
              component: 'activities-optionals',
              success: false,
              error: 'No hay viajeros en la reserva'
            });
            return;
          }

          // Crear todas las asignaciones en paralelo
          const savePromises = travelers.map(traveler => {
            if (item.type === 'act') {
              return this.reservationTravelerActivityService.create({
                id: 0,
                reservationTravelerId: traveler.id,
                activityId: item.id,
              }).toPromise();
            } else if (item.type === 'pack') {
              return this.reservationTravelerActivityPackService.create({
                id: 0,
                reservationTravelerId: traveler.id,
                activityPackId: item.id,
              }).toPromise();
            }
            return Promise.resolve(null);
          });

          Promise.all(savePromises)
            .then(() => {
              this.saving = false;
              
              // NUEVO: Emitir evento de guardado exitoso (sin datos, el padre se encarga)
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: true
              });

            })
            .catch(error => {
              this.saving = false;
              console.error('❌ Error guardando actividad:', error);
              
              // Revertir UI en caso de error
              this.addedActivities.delete(item.id);
              this.emitActivitiesChange();
              
              // NUEVO: Emitir evento de error
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: false,
                error: 'Error al guardar la actividad'
              });
            });
        },
        error: (error) => {
          this.saving = false;
          console.error('❌ Error obteniendo viajeros:', error);
          
          // Revertir UI en caso de error
          this.addedActivities.delete(item.id);
          this.emitActivitiesChange();
          
          this.saveCompleted.emit({
            component: 'activities-optionals',
            success: false,
            error: 'Error al obtener viajeros'
          });
        }
      });
  }
  ```

#### **Tarea 1.3: Crear método para eliminar actividad de todos los viajeros**
- **Problema**: La eliminación actual es compleja y no está optimizada
- **Solución**: Crear método específico para eliminar de todos los viajeros (sin cache, siempre obtiene datos frescos)
- **Archivo**: `activities-optionals.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Método para eliminar actividad de todos los viajeros
  private removeActivityFromAllTravelers(item: ActivityWithPrice): void {
    if (!this.reservationId || this.saving) return;

    this.saving = true;

    // SIEMPRE obtener viajeros frescos (sin cache)
    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          if (travelers.length === 0) {
            this.saving = false;
            this.saveCompleted.emit({
              component: 'activities-optionals',
              success: false,
              error: 'No hay viajeros en la reserva'
            });
            return;
          }

          // Obtener todas las asignaciones existentes en paralelo
          const getAssignmentsPromises = travelers.map(traveler => {
            if (item.type === 'act') {
              return this.reservationTravelerActivityService
                .getByReservationTraveler(traveler.id)
                .toPromise()
                .then(activities => activities.filter(a => a.activityId === item.id));
            } else if (item.type === 'pack') {
              return this.reservationTravelerActivityPackService
                .getByReservationTraveler(traveler.id)
                .toPromise()
                .then(packs => packs.filter(p => p.activityPackId === item.id));
            }
            return Promise.resolve([]);
          });

          Promise.all(getAssignmentsPromises)
            .then(assignmentsArrays => {
              // Aplanar todas las asignaciones
              const allAssignments = assignmentsArrays.flat();
              
              if (allAssignments.length === 0) {
                this.saving = false;
                this.saveCompleted.emit({
                  component: 'activities-optionals',
                  success: true
                });
                return;
              }

              // Eliminar todas las asignaciones en paralelo
              const deletePromises = allAssignments.map(assignment => {
                if (item.type === 'act') {
                  return this.reservationTravelerActivityService.delete(assignment.id).toPromise();
                } else if (item.type === 'pack') {
                  return this.reservationTravelerActivityPackService.delete(assignment.id).toPromise();
                }
                return Promise.resolve(null);
              });

              return Promise.all(deletePromises);
            })
            .then(() => {
              this.saving = false;
              
              // NUEVO: Emitir evento de guardado exitoso (sin datos, el padre se encarga)
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: true
              });

            })
            .catch(error => {
              this.saving = false;
              console.error('❌ Error eliminando actividad:', error);
              
              // Revertir UI en caso de error
              this.addedActivities.add(item.id);
              this.emitActivitiesChange();
              
              // NUEVO: Emitir evento de error
              this.saveCompleted.emit({
                component: 'activities-optionals',
                success: false,
                error: 'Error al eliminar la actividad'
              });
            });
        },
        error: (error) => {
          this.saving = false;
          console.error('❌ Error obteniendo viajeros:', error);
          
          // Revertir UI en caso de error
          this.addedActivities.add(item.id);
          this.emitActivitiesChange();
          
          this.saveCompleted.emit({
            component: 'activities-optionals',
            success: false,
            error: 'Error al obtener viajeros'
          });
        }
      });
  }
  ```

### **2. EVENTOS DE COMUNICACIÓN**

#### **Tarea 2.1: Añadir evento de guardado exitoso al componente padre**
- **Problema**: El componente padre no sabe cuándo se ha completado un guardado
- **Solución**: Añadir evento `@Output()` para notificar guardados exitosos (sin datos, el padre se encarga)
- **Archivo**: `activities-optionals.component.ts` líneas 64-68
- **Código a añadir**:
  ```typescript
  // NUEVO: Output para notificar guardado exitoso al componente padre
  @Output() saveCompleted = new EventEmitter<{
    component: 'activities-optionals';
    success: boolean;
    error?: string;
  }>();
  ```

#### **Tarea 2.2: Añadir mensaje informativo sobre selección por usuario**
- **Problema**: No se informa al usuario que puede elegir por usuario en el paso 3
- **Solución**: Añadir mensaje informativo en la interfaz
- **Archivo**: `activities-optionals.component.html`
- **Código a añadir**:
  ```html
  <div class="step">
    <div class="step-title">Agrega actividades</div>
    <div class="step-description">
      <i class="pi pi-info-circle"></i>También puedes añadirlas después desde tu perfil
    </div>
    <!-- NUEVO: Mensaje informativo sobre selección por usuario -->
    <div class="step-info" *ngIf="saving || hasSelectedActivities">
      <i class="pi pi-check-circle" *ngIf="!saving"></i>
      <i class="pi pi-spin pi-spinner" *ngIf="saving"></i>
      <span *ngIf="saving">Guardando actividades...</span>
      <span *ngIf="!saving && hasSelectedActivities">
        ✅ Actividades guardadas. Podrás elegir por usuario en el paso 3 de viajeros.
      </span>
    </div>
  </div>
  ```

### **3. MEJORAS EN LA INTERFAZ DE USUARIO**

#### **Tarea 3.1: Añadir indicador de guardado en la interfaz**
- **Problema**: No hay feedback visual cuando se está guardando
- **Solución**: Mostrar spinner o mensaje de "Guardando..." en el HTML
- **Archivo**: `activities-optionals.component.scss`
- **Código a añadir**:
  ```scss
  .step-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: #f0f9ff;
    border: 1px solid #0ea5e9;
    border-radius: 8px;
    font-size: 0.875rem;
    color: #0369a1;
    margin-top: 0.5rem;

    i {
      font-size: 1rem;
    }

    &.saving {
      background-color: #fef3c7;
      border-color: #f59e0b;
      color: #92400e;
    }
  }
  ```

#### **Tarea 3.2: Usar loading de PrimeNG en botones durante el guardado**
- **Problema**: Los botones no muestran estado de carga durante el guardado
- **Solución**: Usar la propiedad `loading` de PrimeNG para mostrar spinner
- **Archivo**: `activities-optionals.component.html`
- **Código a modificar**:
  ```html
  <p-button
    class="dataview-buy-button"
    [label]="isActivityAdded(item) ? 'Eliminar' : 'Añadir'"
    [rounded]="true"
    [loading]="saving"
    [disabled]="saving"
    [styleClass]="isActivityAdded(item) ? 'added-button' : ''"
    (click)="toggleActivity(item)"
  />
  ```

### **4. OPTIMIZACIONES DE RENDIMIENTO**

#### **Tarea 4.1: Implementar debounce para evitar múltiples guardados**
- **Problema**: Se puede ejecutar múltiples guardados rápidamente
- **Solución**: Añadir debounce de 300ms para el guardado
- **Archivo**: `activities-optionals.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Propiedad para debounce
  private saveTimeout: any;

  // NUEVO: Método con debounce para guardar
  private debouncedSave(item: ActivityWithPrice, action: 'add' | 'remove'): void {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      if (action === 'add') {
        this.addActivityToAllTravelers(item);
      } else {
        this.removeActivityFromAllTravelers(item);
      }
    }, 300);
  }

  // MODIFICAR toggleActivity para usar debounce
  toggleActivity(item: ActivityWithPrice): void {
    if (this.addedActivities.has(item.id)) {
      // Actualizar UI inmediatamente
      this.addedActivities.delete(item.id);
      // Eliminar de BD con debounce
      this.debouncedSave(item, 'remove');
    } else {
      // Actualizar UI inmediatamente
      this.addedActivities.add(item.id);
      // Guardar en BD con debounce
      this.debouncedSave(item, 'add');
    }

    // Emitir cambios inmediatamente
    this.emitActivitiesChange();
  }
  ```

#### **Tarea 4.2: Garantizar guardado correcto en todos los escenarios**
- **Problema**: Necesitamos asegurar que el guardado funcione correctamente en todos los casos
- **Solución**: Implementar lógica robusta que maneje añadir, quitar y volver a añadir
- **Archivo**: `activities-optionals.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Método para verificar si hay operaciones pendientes
  private hasPendingOperations(): boolean {
    return this.saving;
  }

  // NUEVO: Método para limpiar operaciones pendientes
  private clearPendingOperations(): void {
    clearTimeout(this.saveTimeout);
  }

  // MODIFICAR toggleActivity para manejar operaciones pendientes
  toggleActivity(item: ActivityWithPrice): void {
    // Si hay operaciones pendientes, no permitir nuevas
    if (this.hasPendingOperations()) {
      return;
    }

    if (this.addedActivities.has(item.id)) {
      // Actualizar UI inmediatamente
      this.addedActivities.delete(item.id);
      // Eliminar de BD con debounce
      this.debouncedSave(item, 'remove');
    } else {
      // Actualizar UI inmediatamente
      this.addedActivities.add(item.id);
      // Guardar en BD con debounce
      this.debouncedSave(item, 'add');
    }

    // Emitir cambios inmediatamente
    this.emitActivitiesChange();
  }
  ```

### **5. VALIDACIONES Y MANEJO DE ERRORES**

#### **Tarea 5.1: Mejorar manejo de errores**
- **Problema**: Los errores se muestran en consola pero no al usuario
- **Solución**: Mostrar mensajes de error en la interfaz
- **Archivo**: `activities-optionals.component.html`
- **Código a añadir**:
  ```html
  <!-- Mensaje de error -->
  <div *ngIf="errorMessage" class="error-message">
    <i class="pi pi-exclamation-triangle"></i>
    <p>{{ errorMessage }}</p>
  </div>
  ```

#### **Tarea 5.2: Añadir validación de reserva**
- **Problema**: No se valida que exista una reserva antes de guardar
- **Solución**: Añadir validación en los métodos de guardado
- **Archivo**: `activities-optionals.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Validar que existe reserva y viajeros
  private validateReservation(): boolean {
    if (!this.reservationId) {
      this.errorMessage = 'No hay reserva seleccionada';
      return false;
    }
    return true;
  }

  // MODIFICAR métodos de guardado para incluir validación
  private addActivityToAllTravelers(item: ActivityWithPrice): void {
    if (!this.validateReservation() || this.saving) return;
    // ... resto del código
  }
  ```

## **ORDEN DE IMPLEMENTACIÓN RECOMENDADO**

1. **Tarea 2.1**: Añadir eventos de comunicación (base)
2. **Tarea 1.2**: Crear método para guardar en todos los viajeros (funcionalidad principal)
3. **Tarea 1.3**: Crear método para eliminar de todos los viajeros (funcionalidad principal)
4. **Tarea 1.1**: Implementar guardado inmediato (integración)
5. **Tarea 3.1**: Añadir indicador de guardado (UX)
6. **Tarea 3.2**: Deshabilitar botones durante guardado (UX)
7. **Tarea 2.2**: Añadir mensaje informativo (comunicación)
8. **Tarea 4.1**: Implementar debounce (optimización)
9. **Tarea 4.2**: Optimizar carga de viajeros (rendimiento)
10. **Tarea 5.1**: Mejorar manejo de errores (robustez)
11. **Tarea 5.2**: Añadir validación de reserva (seguridad)

## **ARCHIVOS A MODIFICAR**

- `src/app/pages/checkout-v2/components/activities-optionals/activities-optionals.component.ts`
- `src/app/pages/checkout-v2/components/activities-optionals/activities-optionals.component.html`
- `src/app/pages/checkout-v2/components/activities-optionals/activities-optionals.component.scss`

## **INTEGRACIÓN CON COMPONENTE PADRE**

El componente padre (`checkout-v2`) deberá:

1. **Escuchar el evento `activitiesSelectionChange`** para actualizar el resumen
2. **Escuchar el evento `saveCompleted`** para saber cuándo se ha completado un guardado exitoso

### **Ejemplo de implementación en el componente padre:**

```html
<!-- En checkout-v2.component.html -->
<app-activities-optionals
  [itineraryId]="itineraryId"
  [departureId]="departureId"
  [reservationId]="reservationId"
  (activitiesSelectionChange)="onActivitiesSelectionChange($event)"
  (saveCompleted)="onSaveCompleted($event)"
  #activitiesSelector>
</app-activities-optionals>
```

```typescript
// En checkout-v2.component.ts
onSaveCompleted(event: { component: string; success: boolean; error?: string }) {
  if (event.success) {
    // El padre se encarga de obtener la información por su cuenta
    this.updateOrderSummary();
  } else {
    console.error(`❌ Error en guardado de ${event.component}:`, event.error);
    // Mostrar error al usuario si es necesario
  }
}
```

## **BENEFICIOS ESPERADOS**

- ✅ **Guardado automático**: Las actividades se guardan inmediatamente al seleccionarlas
- ✅ **Guardado para todos**: Se guarda automáticamente para todos los viajeros de la reserva
- ✅ **Loading de PrimeNG**: Botones muestran spinner durante el guardado usando [PrimeNG Button Loading](https://primeng.org/button#loading)
- ✅ **Responsabilidad del componente**: El componente se encarga de obtener y guardar toda la información
- ✅ **Sin cache**: Siempre obtiene datos frescos del backend para garantizar consistencia
- ✅ **Guardado robusto**: Funciona correctamente en todos los escenarios (añadir, quitar, volver a añadir)
- ✅ **Feedback claro**: El usuario sabe que puede elegir por usuario en el paso 3
- ✅ **Comunicación simple**: El padre solo escucha el evento de guardado, se encarga de obtener datos por su cuenta
- ✅ **Mejor UX**: Indicadores visuales de guardado y mensajes informativos
- ✅ **Rendimiento optimizado**: Debounce para evitar múltiples guardados
- ✅ **Manejo robusto de errores**: Feedback claro al usuario en caso de problemas
