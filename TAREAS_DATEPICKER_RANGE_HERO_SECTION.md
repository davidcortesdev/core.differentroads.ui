# Tareas: Implementar DatePicker Range con Dos Meses y Button Bar

## Resumen
Implementar un DatePicker en modo rango en el hero section v2 que muestre dos meses, permita selección de rango de fechas y incluya una barra de botones con presets de días (±3, ±7, ±14, ±30 días).

## Estado Actual
- El componente `hero-section-v2` actualmente usa dos `p-datepicker` separados para ida (`departureDate`) y vuelta (`returnDate`)
- PrimeNG `DatePickerModule` ya está importado en `app.module.ts`
- Los datepickers actuales están configurados con `[showIcon]="false"` y placeholders

## Referencias Técnicas
- [PrimeNG DatePicker Range](https://v19.primeng.org/datepicker#range)
- [PrimeNG DatePicker Button Bar](https://v19.primeng.org/datepicker#buttonbar)
- [PrimeNG DatePicker Multiple Months](https://v19.primeng.org/datepicker#multiple)
- [Endpoint Guide](https://github.com/Different-Roads/core.differentroads.tour/blob/develop/ENDPOINTS_GUIDE.md)

## Tareas a Realizar

### 1. Actualizar Hero Section V2 Component
**Archivo:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.ts`

#### Nuevas propiedades para DatePicker Range:
```typescript
// DatePicker Range properties
rangeDates: Date[] = [];
datePresets = [
  { label: '±3 días', value: 3 },
  { label: '±7 días', value: 7 },
  { label: '±14 días', value: 14 },
  { label: '±30 días', value: 30 }
];
```

#### Nuevos métodos para DatePicker Range:
```typescript
/**
 * Manejar selección de rango de fechas
 * @param event Evento del datepicker con array de fechas
 */
onRangeSelect(event: Date[]): void {
  this.rangeDates = event;
  if (event && event.length >= 2) {
    this.departureDate = event[0];
    this.returnDate = event[1];
  } else if (event && event.length === 1) {
    this.departureDate = event[0];
    this.returnDate = null;
  } else {
    this.departureDate = null;
    this.returnDate = null;
  }
}

/**
 * Aplicar preset de días desde la fecha de ida
 * @param days Número de días a sumar/restar
 */
applyDatePreset(days: number): void {
  if (this.departureDate) {
    const departure = new Date(this.departureDate);
    const returnDate = new Date(departure);
    returnDate.setDate(departure.getDate() + days);
    
    this.rangeDates = [departure, returnDate];
    this.returnDate = returnDate;
  }
}

/**
 * Aplicar preset de días desde hoy
 * @param days Número de días a sumar/restar desde hoy
 */
applyPresetFromToday(days: number): void {
  const today = new Date();
  const departure = new Date(today);
  departure.setDate(today.getDate() + days);
  
  const returnDate = new Date(departure);
  returnDate.setDate(departure.getDate() + Math.abs(days));
  
  this.rangeDates = [departure, returnDate];
  this.departureDate = departure;
  this.returnDate = returnDate;
}

/**
 * Limpiar fechas seleccionadas
 */
clearDates(): void {
  this.rangeDates = [];
  this.departureDate = null;
  this.returnDate = null;
}

/**
 * Obtener fecha mínima (hoy)
 */
get minDate(): Date {
  return new Date();
}

/**
 * Obtener fecha máxima (1 año desde hoy)
 */
get maxDate(): Date {
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  return maxDate;
}
```

#### Actualizar método searchTrips:
```typescript
searchTrips(): void {
  const queryParams: TripQueryParams = {};

  // Usar el tour seleccionado o el texto del input
  const destination = this.selectedTour?.name || this.destinationInput;
  
  if (destination) {
    queryParams.destination = destination.trim();
  }

  // Usar fechas del rango
  if (this.rangeDates && this.rangeDates.length >= 2) {
    queryParams.departureDate = this.rangeDates[0].toISOString().split('T')[0];
    queryParams.returnDate = this.rangeDates[1].toISOString().split('T')[0];
  } else if (this.departureDate) {
    queryParams.departureDate = this.departureDate.toISOString().split('T')[0];
    if (this.returnDate) {
      queryParams.returnDate = this.returnDate.toISOString().split('T')[0];
    }
  }

  if (this.selectedTripType) {
    queryParams.tripType = this.selectedTripType.toString().trim();
  }

  // Disparar evento search antes de navegar
  this.trackSearch(queryParams);

  this.router.navigate(['/tours'], { queryParams });
}
```

### 2. Actualizar Template HTML
**Archivo:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.html`

#### Reemplazar los dos datepickers por uno solo en modo range:
```html
<!-- ANTES: Dos datepickers separados -->
<div class="input-sm">
  <p-iftaLabel>
    <p-datepicker
      [(ngModel)]="departureDate"
      [showIcon]="false"
      id="departureDateInput"
      fluid="true"
      placeholder="DD/MM/AAAA"
    >
    </p-datepicker>
    <label for="departureDateInput" class="label">Ida</label>
  </p-iftaLabel>
</div>
<div class="input-sm">
  <p-iftaLabel>
    <p-datepicker
      [(ngModel)]="returnDate"
      [showIcon]="false"
      id="returnDateInput"
      fluid="true"
      placeholder="DD/MM/AAAA"
    >
    </p-datepicker>
    <label for="returnDateInput" class="label">Vuelta</label>
  </p-iftaLabel>
</div>

<!-- DESPUÉS: Un datepicker en modo range -->
<div class="input-range">
  <p-iftaLabel>
    <p-datepicker
      [(ngModel)]="rangeDates"
      selectionMode="range"
      [showIcon]="false"
      [numberOfMonths]="2"
      [showButtonBar]="true"
      [minDate]="minDate"
      [maxDate]="maxDate"
      [readonlyInput]="true"
      id="rangeDateInput"
      fluid="true"
      placeholder="Seleccionar fechas"
      (onSelect)="onRangeSelect($event)"
      appendTo="body"
      styleClass="range-datepicker"
    >
      <!-- Template personalizado para la barra de botones -->
      <ng-template #buttonbar let-clickCallBack="clickCallBack">
        <div class="date-presets">
          <button 
            type="button" 
            class="preset-btn" 
            *ngFor="let preset of datePresets"
            (click)="applyDatePreset(preset.value)"
          >
            {{ preset.label }}
          </button>
          <button 
            type="button" 
            class="preset-btn today-btn"
            (click)="applyPresetFromToday(0)"
          >
            Hoy
          </button>
          <button 
            type="button" 
            class="preset-btn clear-btn"
            (click)="clearDates()"
          >
            Limpiar
          </button>
        </div>
      </ng-template>
    </p-datepicker>
    <label for="rangeDateInput" class="label">Fechas de viaje</label>
  </p-iftaLabel>
</div>
```

### 3. Actualizar Estilos SCSS
**Archivo:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.scss`

#### Agregar estilos para el datepicker range:
```scss
// Estilos para el datepicker range
.input-range {
  flex: 1;
  min-width: 18rem; // Más ancho para mostrar dos meses
}

// Estilos personalizados para el datepicker
::ng-deep {
  .range-datepicker {
    width: 100%;
    
    .p-datepicker {
      z-index: var(--z-index-dropdown) !important;
      width: auto;
      min-width: 600px; // Asegurar espacio para dos meses
      
      .p-datepicker-panel {
        padding: 1rem;
      }
      
      // Estilos para dos meses
      .p-datepicker-calendar-container {
        display: flex;
        gap: 1rem;
        
        .p-datepicker-calendar {
          flex: 1;
        }
      }
      
      // Estilos para la barra de botones personalizada
      .p-datepicker-buttonbar {
        padding: 1rem;
        border-top: 1px solid var(--border-color);
        margin-top: 1rem;
        
        .date-presets {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          
          .preset-btn {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border-color);
            background-color: var(--surface-card);
            color: var(--text-color);
            border-radius: var(--radius);
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            
            &:hover {
              background-color: var(--primary-color);
              color: var(--primary-color-text);
              border-color: var(--primary-color);
            }
            
            &.today-btn {
              background-color: var(--primary-color);
              color: var(--primary-color-text);
              border-color: var(--primary-color);
              
              &:hover {
                background-color: var(--primary-color-hover);
              }
            }
            
            &.clear-btn {
              background-color: var(--red-500);
              color: white;
              border-color: var(--red-500);
              
              &:hover {
                background-color: var(--red-600);
              }
            }
          }
        }
      }
      
      // Estilos para fechas seleccionadas en rango
      .p-datepicker-calendar {
        .p-datepicker-date {
          &.p-datepicker-date-range-start,
          &.p-datepicker-date-range-end {
            background-color: var(--primary-color);
            color: var(--primary-color-text);
          }
          
          &.p-datepicker-date-range {
            background-color: var(--primary-color-light);
            color: var(--primary-color-text);
          }
        }
      }
    }
  }
}

// Responsive adjustments
@media screen and (max-width: 992px) {
  .input-range {
    flex: 0 0 100%;
    min-width: auto;
    margin-bottom: 10px;
  }
  
  ::ng-deep .range-datepicker {
    .p-datepicker {
      min-width: 100%;
      width: 100%;
      
      .p-datepicker-calendar-container {
        flex-direction: column;
        gap: 0.5rem;
      }
      
      .p-datepicker-buttonbar {
        .date-presets {
          .preset-btn {
            flex: 1;
            min-width: 80px;
          }
        }
      }
    }
  }
}

@media screen and (max-width: 480px) {
  .input-range {
    margin-bottom: 6px;
  }
  
  ::ng-deep .range-datepicker {
    .p-datepicker {
      .p-datepicker-buttonbar {
        .date-presets {
          .preset-btn {
            font-size: 0.75rem;
            padding: 0.375rem 0.75rem;
          }
        }
      }
    }
  }
}

// Ajustes para el layout del hero form
.hero-form {
  .input-range {
    // En desktop, ocupar el espacio de los dos datepickers anteriores
    @media screen and (min-width: 993px) {
      flex: 1;
      min-width: 18rem;
    }
  }
}

// Asegurar que el datepicker se muestre correctamente
@media screen and (min-width: 993px) {
  .hero-form {
    .input-lg {
      flex: 1.5;
      min-width: 12rem;
    }

    .input-md {
      flex: 0.8;
      min-width: 9rem;
    }

    .input-range {
      flex: 1.2; // Más espacio para el datepicker range
      min-width: 18rem;
    }

    .input-sm {
      flex: 0.6;
      min-width: 7rem;
    }
  }
}
```

### 4. Configuración Adicional

#### Variables CSS para el tema:
```scss
:host {
  // ... variables existentes ...
  
  // Nuevas variables para el datepicker range
  --datepicker-range-bg: var(--surface-card);
  --datepicker-range-border: var(--border-color);
  --datepicker-range-hover: var(--primary-color-light);
  --datepicker-range-selected: var(--primary-color);
  --preset-btn-bg: var(--surface-card);
  --preset-btn-hover: var(--primary-color);
  --preset-btn-text: var(--text-color);
  --preset-btn-text-hover: var(--primary-color-text);
}
```

### 5. Testing y Validación

#### Casos de prueba:
1. **Selección de rango:** Seleccionar fecha de ida y vuelta
2. **Presets de días:** Probar cada preset (±3, ±7, ±14, ±30 días)
3. **Preset "Hoy":** Verificar que selecciona desde hoy
4. **Limpiar fechas:** Verificar que borra la selección
5. **Fechas mínimas/máximas:** Probar límites de fechas
6. **Responsive:** Verificar en diferentes tamaños de pantalla
7. **Navegación:** Verificar que la búsqueda funciona con el rango

#### Validaciones:
- El datepicker muestra dos meses correctamente
- La selección de rango funciona
- Los presets aplican correctamente
- El diseño se adapta a diferentes pantallas
- No hay errores en consola
- La funcionalidad de búsqueda se mantiene

## Consideraciones Técnicas

### Performance:
- Usar `[readonlyInput]="true"` para evitar problemas de entrada manual
- Implementar `[minDate]` y `[maxDate]` para limitar selección
- Usar `appendTo="body"` para evitar problemas de z-index

### UX/UI:
- Mostrar dos meses para mejor visualización
- Presets intuitivos para selección rápida
- Botones claros y accesibles
- Diseño responsive

### Compatibilidad:
- Mantener la funcionalidad existente
- Asegurar que `searchTrips()` funcione con el nuevo rango
- Mantener compatibilidad con los estilos existentes

## Archivos a Modificar

1. **Modificar:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.ts`
2. **Modificar:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.html`
3. **Modificar:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.scss`

## Dependencias

- ✅ PrimeNG DatePickerModule (ya importado)
- ✅ FormsModule (ya importado)
- ✅ ReactiveFormsModule (ya importado)

## Referencias

- [PrimeNG DatePicker Range](https://v19.primeng.org/datepicker#range)
- [PrimeNG DatePicker Button Bar](https://v19.primeng.org/datepicker#buttonbar)
- [PrimeNG DatePicker Multiple Months](https://v19.primeng.org/datepicker#multiple)
- [Endpoint Guide](https://github.com/Different-Roads/core.differentroads.tour/blob/develop/ENDPOINTS_GUIDE.md)

## Notas Adicionales

- El componente debe mantener la funcionalidad existente
- Considerar implementar validación de fechas
- Evaluar la posibilidad de mostrar información adicional (precios, disponibilidad)
- Mantener consistencia visual con el diseño existente
- Los presets pueden ser configurables desde un servicio
