# TAREAS PARA SUMMARY-TABLE COMPONENT

## **FILOSOFÍA DEL COMPONENTE**
El componente `summary-table` debe ser independiente y obtener su información directamente del backend, igual que `summary-info`, pero con la capacidad de actualizarse automáticamente cuando el padre notifique cambios en cualquier componente del checkout.

## **TAREAS PRINCIPALES**

### **Tarea 1: Hacer el componente independiente**
- **Problema**: El componente depende de inputs del padre para mostrar información
- **Solución**: Obtener información directamente del backend usando el mismo endpoint que `summary-info`
- **Archivo**: `summary-table.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Input para reservationId
  @Input() reservationId: number | undefined;

  // NUEVO: Propiedades para gestión de datos
  private destroy$: Subject<void> = new Subject<void>();
  loading: boolean = false;
  error: boolean = false;
  reservationSummary: IReservationSummaryResponse | undefined;

  // NUEVO: Inyectar servicios necesarios
  constructor(
    private reservationService: ReservationService,
    private messageService: MessageService,
    private pointsCalculator: PointsCalculatorService
  ) {}

  // NUEVO: Cargar información del backend
  private loadReservationSummary(): void {
    if (!this.reservationId) return;

    this.loading = true;
    this.error = false;

    this.reservationService
      .getSummary(this.reservationId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error = true;
          this.loading = false;
          console.error('Error fetching reservation summary:', err);
          return EMPTY;
        })
      )
      .subscribe({
        next: (summary: IReservationSummaryResponse) => {
          this.reservationSummary = summary;
          this.updateSummaryData(summary);
          this.loading = false;
        },
      });
  }
  ```

### **Tarea 2: Convertir datos del backend al formato del componente**
- **Problema**: Los datos del backend tienen formato diferente al esperado por el componente
- **Solución**: Transformar los datos de `ReservationSummaryItem[]` a `SummaryItem[]`
- **Archivo**: `summary-table.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Transformar datos del backend al formato del componente
  private updateSummaryData(summary: IReservationSummaryResponse): void {
    this.summary = summary.items?.map(item => ({
      description: item.description,
      qty: item.quantity,
      value: item.amount,
      isDiscount: item.description?.toLowerCase().includes('descuento') || false
    })) || [];

    // Actualizar totales
    this.subtotal = summary.subtotalAmount || 0;
    this.total = summary.totalAmount || 0;
  }

  // NUEVO: Getters para datos del backend
  get isAuthenticated(): boolean {
    // Implementar lógica para verificar autenticación
    return true; // Placeholder
  }

  get selectedFlight(): any {
    // Implementar lógica para obtener vuelo seleccionado
    return null; // Placeholder
  }
  ```

### **Tarea 3: Implementar escucha de actualizaciones del padre**
- **Problema**: El componente no se actualiza cuando otros componentes del checkout guardan información
- **Solución**: Escuchar eventos del padre para recargar información
- **Archivo**: `summary-table.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Input para escuchar actualizaciones
  @Input() refreshTrigger: any = null;

  // NUEVO: Método para recargar información
  refreshSummary(): void {
    if (this.reservationId) {
      this.loadReservationSummary();
    }
  }

  // NUEVO: Escuchar cambios en refreshTrigger
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reservationId'] && this.reservationId) {
      this.loadReservationSummary();
    }
    
    if (changes['refreshTrigger'] && this.refreshTrigger) {
      this.refreshSummary();
    }
  }
  ```

### **Tarea 4: Añadir estados de carga y error**
- **Problema**: No hay feedback visual durante la carga o errores
- **Solución**: Añadir indicadores de carga y manejo de errores
- **Archivo**: `summary-table.component.html`
- **Código a añadir**:
  ```html
  <!-- NUEVO: Estados de carga y error -->
  <div class="loading-container" *ngIf="loading">
    <p-progressSpinner styleClass="summary-loader"></p-progressSpinner>
    <p>Cargando resumen del pedido...</p>
  </div>

  <div *ngIf="error && !loading" class="error-container">
    <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: #f05a4c"></i>
    <p>Error al cargar el resumen del pedido</p>
    <p-button 
      label="Reintentar" 
      icon="pi pi-refresh" 
      size="small"
      (click)="refreshSummary()">
    </p-button>
  </div>

  <!-- Contenido existente con *ngIf="!loading && !error" -->
  <div class="order-summary" [ngClass]="customClass" *ngIf="!loading && !error">
    <!-- ... contenido existente ... -->
  </div>
  ```

### **Tarea 5: Actualizar template para usar datos del backend**
- **Problema**: El template usa métodos que no están adaptados a los datos del backend
- **Solución**: Simplificar métodos para trabajar con datos transformados
- **Archivo**: `summary-table.component.ts`
- **Código a añadir**:
  ```typescript
  // MODIFICAR: Simplificar métodos para datos transformados
  getDescription(item: SummaryItem): string {
    return item.description || '';
  }

  getQuantity(item: SummaryItem): number {
    return item.qty || 1;
  }

  getValue(item: SummaryItem): number | undefined {
    return item.value !== undefined ? item.value : undefined;
  }

  isDiscount(item: SummaryItem): boolean {
    return item.isDiscount || false;
  }

  calculateTotal(item: SummaryItem): number {
    const qty = this.getQuantity(item);
    const value = this.getValue(item);
    return value !== null && value !== undefined ? value * qty : 0;
  }
  ```

### **Tarea 6: Añadir imports necesarios**
- **Problema**: Faltan imports para los nuevos servicios y funcionalidades
- **Solución**: Añadir imports necesarios
- **Archivo**: `summary-table.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Imports necesarios
  import { Subject, takeUntil, catchError, EMPTY } from 'rxjs';
  import { MessageService } from 'primeng/api';
  import { ReservationService, IReservationSummaryResponse } from '../../core/services/reservation/reservation.service';
  import { OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
  ```

## **INTEGRACIÓN CON COMPONENTE PADRE**

El componente padre (`checkout-v2`) deberá:

1. **Pasar reservationId** al componente
2. **Emitir eventos de actualización** cuando cualquier componente guarde información
3. **Escuchar eventos de guardado** de todos los componentes hijos

### **Ejemplo de implementación en el componente padre:**

```html
<!-- En checkout-v2.component.html -->
<app-summary-table
  [reservationId]="reservationId"
  [refreshTrigger]="summaryRefreshTrigger"
  [showTitle]="true"
  [showPointsSection]="true"
  [showTotalSection]="true"
  [showFlightSection]="true">
</app-summary-table>
```

```typescript
// En checkout-v2.component.ts
summaryRefreshTrigger: any = null;

// NUEVO: Método para actualizar resumen
updateOrderSummary(): void {
  this.summaryRefreshTrigger = { timestamp: Date.now() };
}

// NUEVO: Escuchar eventos de guardado de componentes hijos
onSaveCompleted(event: { component: string; success: boolean; data?: any; error?: string }) {
  if (event.success) {
    this.updateOrderSummary();
  } else {
    console.error(`❌ Error en guardado de ${event.component}:`, event.error);
  }
}
```

## **BENEFICIOS ESPERADOS**

- ✅ **Independencia total**: No depende de inputs del padre para datos
- ✅ **Actualización automática**: Se recarga cuando cualquier componente guarda información
- ✅ **Consistencia de datos**: Usa el mismo endpoint que `summary-info`
- ✅ **Feedback visual**: Indicadores de carga y error
- ✅ **Manejo de errores**: Recuperación automática y manual
- ✅ **Performance**: Carga eficiente de datos del backend

## **NOTAS IMPORTANTES**

1. **Mismo endpoint**: Usar `reservationService.getSummary()` como `summary-info`
2. **Transformación de datos**: Convertir `ReservationSummaryItem[]` a `SummaryItem[]`
3. **Escucha de actualizaciones**: Reaccionar a cambios en `refreshTrigger`
4. **Estados de UI**: Mostrar carga, error y contenido correctamente
5. **Limpieza de recursos**: Usar `takeUntil(destroy$)` para evitar memory leaks
6. **Consistencia**: Mantener la misma funcionalidad que `summary-info`

## **ARCHIVOS AFECTADOS**

- `src/app/components/summary-table/summary-table.component.ts`
- `src/app/components/summary-table/summary-table.component.html`
- `src/app/components/summary-table/summary-table.component.scss`
- `src/app/pages/checkout-v2/checkout-v2.component.ts` (integración)
- `src/app/pages/checkout-v2/checkout-v2.component.html` (integración)

## **PRIORIDAD DE IMPLEMENTACIÓN**

1. **Alta**: Hacer el componente independiente
2. **Alta**: Implementar escucha de actualizaciones del padre
3. **Media**: Añadir estados de carga y error
4. **Media**: Actualizar template para datos del backend
5. **Baja**: Optimizaciones y mejoras de UX
