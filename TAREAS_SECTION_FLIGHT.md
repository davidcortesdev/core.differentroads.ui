# TAREAS PARA SECTION-FLIGHT Y FLIGHT-SECTION COMPONENTS

## **FILOSOFÍA DE LOS COMPONENTES**
Los componentes de vuelos deben ser independientes y obtener su información directamente del backend, con la capacidad de mostrar vuelos tanto de TK como del consolidador (Amadeus) de forma unificada.

## **COMPONENTES AFECTADOS**

### **1. SECTION-FLIGHT** (Nueva página de reservas)
- **Archivos**: 
  - `src/app/pages/checkout-v2/components/new-reservation/section-flight/section-flight.component.ts`
  - `src/app/pages/checkout-v2/components/new-reservation/section-flight/section-flight.component.html`
  - `src/app/pages/checkout-v2/components/new-reservation/section-flight/section-flight.component.scss`
- **Selector**: `app-section-flight`
- **Propósito**: Mostrar información detallada de vuelos en la página de reservas

### **2. FLIGHT-SECTION** (Checkout summary)
- **Archivos**:
  - `src/app/pages/checkout-v2/components/flight-section/flight-section.component.ts`
  - `src/app/pages/checkout-v2/components/flight-section/flight-section.component.html`
  - `src/app/pages/checkout-v2/components/flight-section/flight-section.component.scss`
- **Selector**: `app-flight-section-v2`
- **Propósito**: Mostrar resumen de vuelos en el checkout

## **TAREAS PRINCIPALES**

### **Tarea 1: Crear endpoint para información de vuelo seleccionado**
- **Problema**: No existe endpoint que devuelva la información del vuelo seleccionado para una reserva
- **Solución**: Crear endpoint que consulte vuelos de TK y consolidador
- **Archivo**: Backend - Nuevo endpoint
- **Detalles**:
  - Endpoint: `GET /api/FlightSearch/reservation/{reservationId}/selected-flight`
  - Recibir `reservationId` como parámetro
  - Comprobar si hay vuelo seleccionado de TK (campo "flight")
  - Si no hay vuelo de TK, comprobar consolidador usando endpoint existente
  - Devolver objeto estándar de vuelos (mismo formato que selección de vuelos)

### **Tarea 2: Crear endpoint para detalle de escalas**
- **Problema**: No existe endpoint específico para detalles de escalas del vuelo seleccionado
- **Solución**: Crear endpoint que devuelva segmentos detallados del vuelo
- **Archivo**: Backend - Nuevo endpoint
- **Detalles**:
  - Endpoint: `GET /api/FlightSearch/reservation/{reservationId}/flight-details`
  - Recibir `reservationId` como parámetro
  - Obtener vuelo seleccionado (TK o consolidador)
  - Devolver segmentos detallados con escalas, aerolíneas, horarios, etc.

### **Tarea 3: Hacer section-flight independiente**
- **Problema**: El componente depende de `departureId` y no es independiente
- **Solución**: Modificar para usar `reservationId` y obtener datos del backend
- **Archivo**: `src/app/pages/checkout-v2/components/new-reservation/section-flight/section-flight.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Input para reservationId
  @Input() reservationId: number | undefined;

  // NUEVO: Propiedades para gestión de datos
  private destroy$: Subject<void> = new Subject<void>();
  loading: boolean = false;
  error: boolean = false;

  // NUEVO: Cargar información del backend
  private loadSelectedFlight(): void {
    if (!this.reservationId) return;

    this.loading = true;
    this.error = false;

    this.flightsNetService
      .getSelectedFlight(this.reservationId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error = true;
          this.loading = false;
          console.error('Error loading selected flight:', err);
          return EMPTY;
        })
      )
      .subscribe({
        next: (flightData) => {
          this.processSelectedFlight(flightData);
          this.loading = false;
        },
      });
  }
  ```

### **Tarea 4: Adaptar section-flight para usar datos unificados**
- **Problema**: El componente está diseñado para datos de TK, necesita soportar consolidador
- **Solución**: Adaptar para usar objeto estándar de vuelos
- **Archivo**: `section-flight.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Procesar vuelo seleccionado unificado
  private processSelectedFlight(flightData: any): void {
    if (!flightData) {
      this.formattedFlights = null;
      return;
    }

    // El objeto ya viene en formato estándar
    this.formattedFlights = {
      outbound: flightData.outbound ? this.formatUnifiedFlight(flightData.outbound) : null,
      inbound: flightData.inbound ? this.formatUnifiedFlight(flightData.inbound) : null,
    };
  }

  // NUEVO: Formatear vuelo unificado (TK o consolidador)
  private formatUnifiedFlight(flight: any): FormattedFlight {
    return {
      date: flight.departureDate || '',
      departureTime: this.formatTime(flight.departureTime),
      arrivalTime: this.formatTime(flight.arrivalTime),
      departureAirport: `${flight.departureCity} (${flight.departureIata})`,
      arrivalAirport: `${flight.arrivalCity} (${flight.arrivalIata})`,
      duration: flight.duration || 'N/A',
      hasStops: flight.segments && flight.segments.length > 1,
      stops: flight.segments ? flight.segments.length - 1 : 0,
      segments: flight.segments ? this.formatSegments(flight.segments) : [],
      isNextDay: this.isNextDay(flight.departureTime, flight.arrivalTime),
    };
  }
  ```

### **Tarea 5: Hacer flight-section independiente con escucha de actualizaciones**
- **Problema**: El componente depende de inputs del padre y no se actualiza automáticamente
- **Solución**: Obtener datos del backend y escuchar eventos de actualización
- **Archivo**: `src/app/pages/checkout-v2/components/flight-section/flight-section.component.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Input para reservationId y refreshTrigger
  @Input() reservationId: number | undefined;
  @Input() refreshTrigger: any = null;

  // NUEVO: Propiedades para gestión de datos
  private destroy$: Subject<void> = new Subject<void>();
  loading: boolean = false;
  error: boolean = false;
  flightPack: any = null;

  // NUEVO: Cargar información del backend
  private loadFlightPack(): void {
    if (!this.reservationId) return;

    this.loading = true;
    this.error = false;

    this.flightsNetService
      .getSelectedFlight(this.reservationId)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          this.error = true;
          this.loading = false;
          console.error('Error loading flight pack:', err);
          return EMPTY;
        })
      )
      .subscribe({
        next: (flightData) => {
          this.flightPack = flightData;
          this.loading = false;
        },
      });
  }

  // NUEVO: Escuchar cambios en refreshTrigger
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reservationId'] && this.reservationId) {
      this.loadFlightPack();
    }
    
    if (changes['refreshTrigger'] && this.refreshTrigger) {
      this.refreshFlightPack();
    }
  }

  // NUEVO: Método para recargar información
  refreshFlightPack(): void {
    if (this.reservationId) {
      console.log('🔄 Actualizando información de vuelos...');
      this.loadFlightPack();
    }
  }
  ```

### **Tarea 6: Añadir estados de carga y error a ambos componentes**
- **Problema**: No hay feedback visual durante la carga o errores
- **Solución**: Añadir indicadores de carga y manejo de errores
- **Archivos**: 
  - `src/app/pages/checkout-v2/components/new-reservation/section-flight/section-flight.component.html`
  - `src/app/pages/checkout-v2/components/flight-section/flight-section.component.html`
- **Código a añadir**:
  ```html
  <!-- NUEVO: Estados de carga y error para section-flight -->
  <div class="loading-state" *ngIf="loading">
    <i class="pi pi-spin pi-spinner"></i>
    <span>Cargando información de vuelos...</span>
  </div>

  <div *ngIf="error && !loading" class="error-container">
    <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: #f05a4c"></i>
    <p>Error al cargar la información de vuelos</p>
    <p-button 
      label="Reintentar" 
      icon="pi pi-refresh" 
      size="small"
      (click)="loadSelectedFlight()">
    </p-button>
  </div>

  <!-- NUEVO: Estados de carga y error para flight-section -->
  <div class="loading-state" *ngIf="loading">
    <i class="pi pi-spin pi-spinner"></i>
    <span>Cargando información de vuelos...</span>
  </div>

  <div *ngIf="error && !loading" class="error-container">
    <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: #f05a4c"></i>
    <p>Error al cargar la información de vuelos</p>
    <p-button 
      label="Reintentar" 
      icon="pi pi-refresh" 
      size="small"
      (click)="refreshFlightPack()">
    </p-button>
  </div>
  ```

### **Tarea 7: Actualizar servicios para nuevos endpoints**
- **Problema**: Los servicios no tienen métodos para los nuevos endpoints
- **Solución**: Añadir métodos para obtener vuelo seleccionado y detalles
- **Archivo**: `flightsNet.service.ts`
- **Código a añadir**:
  ```typescript
  // NUEVO: Obtener vuelo seleccionado para una reserva
  getSelectedFlight(reservationId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reservation/${reservationId}/selected-flight`);
  }

  // NUEVO: Obtener detalles de vuelo seleccionado
  getSelectedFlightDetails(reservationId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reservation/${reservationId}/flight-details`);
  }
  ```

## **INTEGRACIÓN CON COMPONENTE PADRE**

El componente padre (`checkout-v2`) deberá:

1. **Pasar reservationId** a ambos componentes
2. **Emitir eventos de actualización** cuando cualquier componente guarde información
3. **Escuchar eventos de guardado** de todos los componentes hijos

### **Ejemplo de implementación en el componente padre:**

```html
<!-- En checkout-v2.component.html -->
<app-section-flight
  [reservationId]="reservationId"
  [refreshTrigger]="summaryRefreshTrigger">
</app-section-flight>

<app-flight-section-v2
  [reservationId]="reservationId"
  [refreshTrigger]="summaryRefreshTrigger">
</app-flight-section-v2>
```

```typescript
// En checkout-v2.component.ts
summaryRefreshTrigger: any = null;

// NUEVO: Método para actualizar información de vuelos
updateFlightInformation(): void {
  console.log('🔄 Actualizando información de vuelos...');
  this.summaryRefreshTrigger = { timestamp: Date.now() };
}

// NUEVO: Escuchar eventos de guardado de componentes hijos
onSaveCompleted(event: { component: string; success: boolean; data?: any; error?: string }) {
  if (event.success) {
    console.log(`✅ Guardado exitoso en ${event.component}`);
    this.updateFlightInformation();
  } else {
    console.error(`❌ Error en guardado de ${event.component}:`, event.error);
  }
}
```

## **BENEFICIOS ESPERADOS**

- ✅ **Independencia total**: Ambos componentes obtienen datos directamente del backend
- ✅ **Unificación de datos**: Mismo formato para vuelos de TK y consolidador
- ✅ **Actualización automática**: Se recargan cuando cualquier componente guarda información
- ✅ **Consistencia**: Mismo comportamiento que otros componentes del checkout
- ✅ **Feedback visual**: Indicadores de carga y error
- ✅ **Manejo de errores**: Recuperación automática y manual

## **NOTAS IMPORTANTES**

1. **Endpoints del backend**: Crear dos nuevos endpoints para vuelo seleccionado y detalles
2. **Formato unificado**: Usar el mismo objeto estándar que la selección de vuelos
3. **Detección automática**: Comprobar TK primero, luego consolidador
4. **Escucha de actualizaciones**: Reaccionar a cambios en `refreshTrigger`
5. **Estados de UI**: Mostrar carga, error y contenido correctamente
6. **Limpieza de recursos**: Usar `takeUntil(destroy$)` para evitar memory leaks

## **ARCHIVOS AFECTADOS**

- Backend - Nuevos endpoints de vuelos
- `src/app/pages/checkout-v2/components/new-reservation/section-flight/section-flight.component.ts`
- `src/app/pages/checkout-v2/components/new-reservation/section-flight/section-flight.component.html`
- `src/app/pages/checkout-v2/components/new-reservation/section-flight/section-flight.component.scss`
- `src/app/pages/checkout-v2/components/flight-section/flight-section.component.ts`
- `src/app/pages/checkout-v2/components/flight-section/flight-section.component.html`
- `src/app/pages/checkout-v2/components/flight-section/flight-section.component.scss`
- `src/app/services/flightsNet.service.ts`
- `src/app/pages/checkout-v2/checkout-v2.component.ts` (integración)
- `src/app/pages/checkout-v2/checkout-v2.component.html` (integración)

## **PRIORIDAD DE IMPLEMENTACIÓN**

1. **Alta**: Crear endpoints del backend
2. **Alta**: Hacer section-flight independiente
3. **Alta**: Hacer app-flight-section-v2 independiente con escucha
4. **Media**: Añadir estados de carga y error
5. **Media**: Actualizar servicios para nuevos endpoints
6. **Baja**: Optimizaciones y mejoras de UX
