# Lista de Tareas: Selector Traveler - Optimización y Mejoras

## Filosofía del Proyecto
**Objetivo**: Implementar el guardado automático de información en el backend desde el primer momento, sin esperar a que el usuario haga clic en "Continuar". Esto mejorará la experiencia del usuario y evitará pérdida de datos.

## Análisis del Estado Actual del Selector Traveler

### ❌ **Problemas identificados:**

1. **Datos de AgeGroup hardcodeados**: Los componentes están puestos "a piñón" en lugar de usar los datos reales del backend
2. **Falta optimización con ngFor**: Se repite código innecesariamente para cada tipo de viajero
3. **p-inputNumber sin min/max**: No tiene validaciones de rango configuradas
4. **Tiempos de espera innecesarios**: Hay delays que se pueden eliminar

## **TAREAS PRIORITARIAS**

### **1. OPTIMIZACIÓN CON NG-FOR DINÁMICO**

#### **Tarea 1.1: Crear estructura de datos dinámica para AgeGroups**
- **Problema**: Los componentes están hardcodeados para Adultos/Niños/Bebés
- **Solución**: Crear array dinámico basado en los AgeGroups reales del backend
- **Archivo**: `selector-traveler.component.ts`
- **Código a añadir**:
  ```typescript
  // Nueva propiedad para manejar los tipos de viajeros dinámicamente
  travelerTypes: Array<{
    key: 'adults' | 'childs' | 'babies';
    label: string;
    ageGroup: IAgeGroupResponse;
    min: number;
    max: number;
  }> = [];
  ```

#### **Tarea 1.2: Refactorizar HTML para usar ngFor**
- **Problema**: Código repetitivo para cada tipo de viajero
- **Solución**: Usar ngFor con la estructura dinámica
- **Archivo**: `selector-traveler.component.html`
- **Código a reemplazar**:
  ```html
  <!-- Reemplazar todo el contenido hardcodeado con: -->
  <div class="traveler-selector-wrap" *ngIf="!loading && !loadingAgeGroups">
    <div
      class="traveler-selector-wrap-item"
      *ngFor="let travelerType of travelerTypes; trackBy: trackByTravelerType"
    >
      <div class="traveler-selector-wrap-item-group">
        <span class="traveler-selector-wrap-item-name">{{ travelerType.label }}</span>
        <span class="traveler-selector-wrap-item-description">
          ({{ travelerType.ageGroup.lowerLimitAge }} a {{ travelerType.ageGroup.upperLimitAge }} años)
        </span>
      </div>
      <p-inputNumber
        [(ngModel)]="travelersNumbers[travelerType.key]"
        (ngModelChange)="handlePassengers($event, travelerType.key)"
        [showButtons]="true"
        buttonLayout="horizontal"
        spinnerMode="horizontal"
        [min]="travelerType.min"
        [max]="travelerType.max"
        placeholder="0"
        [disabled]="loading"
      >
        <ng-template #incrementbuttonicon>
          <span class="pi pi-chevron-up"></span>
        </ng-template>
        <ng-template #decrementbuttonicon>
          <span class="pi pi-chevron-down"></span>
        </ng-template>
      </p-inputNumber>
    </div>
  </div>
  ```

#### **Tarea 1.3: Crear método para mapear AgeGroups a tipos de viajeros**
- **Problema**: La lógica de mapeo está dispersa y es compleja
- **Solución**: Centralizar en un método específico
- **Archivo**: `selector-traveler.component.ts`
- **Código a añadir**:
  ```typescript
  private buildTravelerTypesFromAgeGroups(): void {
    if (!this.ageGroups || this.ageGroups.length === 0) {
      this.travelerTypes = [];
      return;
    }

    this.travelerTypes = this.ageGroups.map((ageGroup) => {
      const name = ageGroup.name.toLowerCase();
      
      // Determinar el tipo de viajero basado en el AgeGroup
      let key: 'adults' | 'childs' | 'babies';
      let label: string;
      let min: number;
      
      if (
        name.includes('adult') ||
        name.includes('adulto') ||
        ageGroup.lowerLimitAge >= 12
      ) {
        key = 'adults';
        label = 'Adultos';
        min = 1; // Mínimo 1 adulto
      } else if (
        name.includes('child') ||
        name.includes('niño') ||
        name.includes('menor') ||
        (ageGroup.lowerLimitAge >= 3 && ageGroup.upperLimitAge <= 11)
      ) {
        key = 'childs';
        label = 'Niños';
        min = 0;
      } else if (
        name.includes('baby') ||
        name.includes('bebé') ||
        name.includes('infant') ||
        ageGroup.upperLimitAge <= 2
      ) {
        key = 'babies';
        label = 'Bebés';
        min = 0;
      } else {
        // Fallback para grupos no reconocidos
        key = 'adults';
        label = ageGroup.name;
        min = 0;
      }

      return {
        key,
        label,
        ageGroup,
        min,
        max: 20 // Máximo razonable
      };
    });
  }
  ```

### **2. ELIMINAR TIEMPOS DE ESPERA**

#### **Tarea 2.1: Eliminar debounce y guardar inmediatamente**
- **Problema**: Hay delays innecesarios en el guardado
- **Solución**: Guardar inmediatamente sin debounce
- **Archivo**: `selector-traveler.component.ts`
- **Código a modificar**:
  ```typescript
  handlePassengers(value: number, type: 'adults' | 'childs' | 'babies'): void {
    // Validación inmediata
    if (value < 0) {
      value = 0;
    }

    // Validar que los adultos no sean menos que 1 si es el único tipo con pasajeros
    if (type === 'adults' && value === 0) {
      const totalOthers = this.travelersNumbers.childs + this.travelersNumbers.babies;
      if (totalOthers === 0) {
        value = 1; // Forzar al menos 1 adulto si no hay otros pasajeros
      }
    }

    this.travelersNumbers[type] = value;

    // Validar que haya suficientes adultos para los menores
    if (
      this.travelersNumbers.adults <
      this.travelersNumbers.childs + this.travelersNumbers.babies
    ) {
      this.adultsErrorMsg =
        'La cantidad de niños y bebés debe ser menor o igual a la de adultos.';
    } else {
      this.adultsErrorMsg = '';
    }

    // Emitir cambios para el componente de habitaciones
    this.travelersNumbersChange.emit(this.travelersNumbers);

    // GUARDAR INMEDIATAMENTE - Sin debounce
    if (this.reservationId && !this.adultsErrorMsg) {
      this.syncTravelersWithReservation();
    }
  }
  ```

#### **Tarea 2.2: Optimizar carga de datos**
- **Problema**: Múltiples llamadas secuenciales al backend
- **Solución**: Usar forkJoin para cargar datos en paralelo
- **Archivo**: `selector-traveler.component.ts`
- **Código a modificar**:
  ```typescript
  ngOnInit() {
    // Cargar todos los datos en paralelo si ya tenemos los IDs
    if (this.departureId && this.reservationId) {
      this.loadAllDataInParallel();
    } else if (this.departureId) {
      this.loadDepartureData();
      this.loadDeparturePriceSupplements();
    } else if (this.reservationId) {
      this.loadExistingTravelers();
      this.loadReservationData();
    }
  }

  private loadAllDataInParallel(): void {
    this.loading = true;
    
    const requests = [
      this.departureService.getById(this.departureId!),
      this.reservationService.getById(this.reservationId!),
      this.reservationTravelerService.getByReservationOrdered(this.reservationId!),
      this.departurePriceSupplementService.getByDeparture(this.departureId!)
    ];

    forkJoin(requests).subscribe({
      next: ([departure, reservation, travelers, supplements]) => {
        this.departureData = departure;
        this.reservationData = reservation;
        this.existingTravelers = travelers;
        this.totalExistingTravelers = travelers.length;
        this.departurePriceSupplements = supplements || [];
        
        // Cargar AgeGroups y procesar todo
        this.loadAgeGroupsFromSupplements();
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Error al cargar los datos iniciales.';
        this.loading = false;
        console.error('Error loading initial data:', error);
      }
    });
  }
  ```

### **3. MEJORAR VALIDACIONES**

#### **Tarea 3.1: Añadir validaciones min/max en p-inputNumber**
- **Problema**: No hay validaciones de rango en los inputs
- **Solución**: Configurar min y max dinámicamente
- **Archivo**: `selector-traveler.component.html` (ya incluido en Tarea 1.2)
- **Código**: `[min]="travelerType.min"` y `[max]="travelerType.max"`

#### **Tarea 3.2: Mejorar validación de adultos mínimos**
- **Problema**: La validación actual no es suficientemente robusta
- **Solución**: Validar en tiempo real con feedback visual
- **Archivo**: `selector-traveler.component.ts`
- **Código a añadir**:
  ```typescript
  private validateAdultsMinimum(): boolean {
    const totalMinors = this.travelersNumbers.childs + this.travelersNumbers.babies;
    const adults = this.travelersNumbers.adults;
    
    if (adults === 0 && totalMinors > 0) {
      this.adultsErrorMsg = 'Debe haber al menos 1 adulto para acompañar a los menores.';
      return false;
    }
    
    if (adults < totalMinors) {
      this.adultsErrorMsg = 'La cantidad de adultos debe ser mayor o igual a la de menores.';
      return false;
    }
    
    this.adultsErrorMsg = '';
    return true;
  }
  ```

### **4. OPTIMIZAR RENDIMIENTO**

#### **Tarea 4.1: Implementar trackBy para ngFor**
- **Problema**: Angular recrea elementos innecesariamente
- **Solución**: Añadir trackBy function
- **Archivo**: `selector-traveler.component.ts`
- **Código a añadir**:
  ```typescript
  trackByTravelerType(index: number, item: any): string {
    return item.key;
  }
  ```

#### **Tarea 4.2: Añadir evento de guardado exitoso al componente padre**
- **Problema**: El componente padre no sabe cuándo se ha completado un guardado de viajeros
- **Solución**: Añadir evento `@Output()` para notificar guardados exitosos
- **Archivo**: `selector-traveler.component.ts` líneas 44-49
- **Código a añadir**:
  ```typescript
  // NUEVO: Output para notificar guardado exitoso al componente padre
  @Output() saveCompleted = new EventEmitter<{
    component: 'selector-traveler';
    success: boolean;
    data?: any;
    error?: string;
  }>();
  ```

#### **Tarea 4.3: Optimizar recarga de datos**
- **Problema**: Se recargan datos innecesariamente
- **Solución**: Solo recargar cuando sea estrictamente necesario
- **Archivo**: `selector-traveler.component.ts`
- **Código a modificar**:
  ```typescript
  private async syncTravelersWithReservation(): Promise<void> {
    if (!this.reservationId || this.saving) {
      return;
    }

    const newTotal = this.totalPassengers;
    const currentTotal = this.totalExistingTravelers;

    // Solo sincronizar si hay cambios reales
    if (newTotal === currentTotal) {
      return;
    }

    this.saving = true;
    this.saveStatusChange.emit({ saving: true });

    try {
      // Lógica de sincronización optimizada
      if (newTotal > currentTotal) {
        await this.createAdditionalTravelers(newTotal - currentTotal);
      } else {
        await this.removeExcessTravelers(currentTotal - newTotal);
      }

      // Actualizar solo los datos necesarios
      await this.updateReservationTotalPassengers();
      
      // Recargar solo si es necesario
      if (this.needsDataReload) {
        await this.reloadTravelers();
        this.needsDataReload = false;
      }

      this.saveStatusChange.emit({ saving: false, success: true });
      
      // NUEVO: Emitir evento de guardado exitoso al componente padre
      this.saveCompleted.emit({
        component: 'selector-traveler',
        success: true,
        data: {
          travelersNumbers: this.travelersNumbers,
          totalPassengers: this.totalPassengers,
          existingTravelers: this.existingTravelers
        }
      });
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      this.saveStatusChange.emit({
        saving: false,
        success: false,
        error: 'Error al sincronizar travelers',
      });
      
      // NUEVO: Emitir evento de error al componente padre
      this.saveCompleted.emit({
        component: 'selector-traveler',
        success: false,
        error: error.message || 'Error al sincronizar travelers'
      });
    } finally {
      this.saving = false;
    }
  }
  ```

## **ORDEN DE IMPLEMENTACIÓN RECOMENDADO**

1. **Tarea 1.1**: Crear estructura de datos dinámica (base)
2. **Tarea 1.3**: Crear método de mapeo de AgeGroups (lógica)
3. **Tarea 1.2**: Refactorizar HTML con ngFor (interfaz)
4. **Tarea 2.1**: Eliminar debounce (guardado inmediato)
5. **Tarea 2.2**: Optimizar carga de datos (rendimiento)
6. **Tarea 3.1**: Añadir validaciones min/max (validación)
7. **Tarea 3.2**: Mejorar validación de adultos (robustez)
8. **Tarea 4.1**: Implementar trackBy (optimización)
9. **Tarea 4.2**: Añadir evento de guardado exitoso (comunicación)
10. **Tarea 4.3**: Optimizar recarga de datos (rendimiento)

## **ARCHIVOS A MODIFICAR**

- `src/app/pages/checkout-v2/components/selector-traveler/selector-traveler.component.ts`
- `src/app/pages/checkout-v2/components/selector-traveler/selector-traveler.component.html`
- `src/app/pages/checkout-v2/components/selector-traveler/selector-traveler.component.scss` (si es necesario para nuevos estilos)

## **INTEGRACIÓN CON COMPONENTE PADRE**

El componente padre (`checkout-v2`) deberá:

1. **Escuchar el evento `travelersNumbersChange`** para actualizar habitaciones cuando cambien los viajeros
2. **Escuchar el evento `saveStatusChange`** para mostrar el estado de guardado
3. **Escuchar el evento `saveCompleted`** para saber cuándo se ha completado un guardado exitoso

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

- ✅ **Datos reales del backend**: Los AgeGroups se mostrarán exactamente como vienen del servidor
- ✅ **Código más limpio**: Eliminación de código repetitivo con ngFor
- ✅ **Validaciones robustas**: min/max configurados dinámicamente
- ✅ **Guardado inmediato**: Sin delays innecesarios
- ✅ **Mejor rendimiento**: Carga paralela y optimizaciones
- ✅ **Mantenibilidad**: Código más fácil de mantener y extender
- ✅ **Comunicación clara**: El componente padre sabe cuándo se completan los guardados
