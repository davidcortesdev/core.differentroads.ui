# Tareas: Implementar Autocomplete en Hero Section V2

## Resumen
Implementar un componente de autocomplete en el hero section v2 que se conecte al endpoint `/api/Tour/autocomplete` para buscar sugerencias de tours en tiempo real mientras el usuario escribe.

## Estado Actual
- El componente `hero-section-v2` actualmente usa un `input` simple con `[(ngModel)]="destinationInput"`
- PrimeNG `AutoCompleteModule` ya está importado en `app.module.ts`
- Existen ejemplos de implementación de autocomplete en otros componentes del proyecto

## Tareas a Realizar

### 1. Crear Servicio TourAutocompleteService
**Archivo:** `src/app/core/services/tour/tour-autocomplete.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TourAutocompleteResult {
  id: number;
  name: string;
  destination?: string;
  country?: string;
  // Agregar otros campos según la respuesta del endpoint
}

@Injectable({
  providedIn: 'root'
})
export class TourAutocompleteService {
  private readonly API_URL = `${environment.toursApiUrl}/Tour/autocomplete`;

  constructor(private http: HttpClient) {}

  /**
   * Buscar sugerencias de tours para autocomplete
   * @param query Término de búsqueda
   * @returns Observable con array de resultados
   */
  searchTours(query: string): Observable<TourAutocompleteResult[]> {
    const params = new HttpParams().set('query', query);
    
    return this.http.get<TourAutocompleteResult[]>(this.API_URL, {
      params
    });
  }
}
```

### 2. Actualizar Hero Section V2 Component
**Archivo:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.ts`

#### Cambios en imports:
```typescript
import { TourAutocompleteService, TourAutocompleteResult } from '../../../../core/services/tour/tour-autocomplete.service';
```

#### Nuevas propiedades:
```typescript
// Autocomplete properties
filteredTours: TourAutocompleteResult[] = [];
selectedTour: TourAutocompleteResult | null = null;
isLoadingAutocomplete: boolean = false;
```

#### Nuevo método para autocomplete:
```typescript
/**
 * Buscar tours para autocomplete
 * @param event Evento del componente p-autocomplete
 */
searchTours(event: { query: string }): void {
  const query = event.query.trim();
  
  if (query.length < 2) {
    this.filteredTours = [];
    return;
  }

  this.isLoadingAutocomplete = true;
  
  this.tourAutocompleteService.searchTours(query).subscribe({
    next: (tours) => {
      this.filteredTours = tours;
      this.isLoadingAutocomplete = false;
    },
    error: (error) => {
      console.error('Error searching tours:', error);
      this.filteredTours = [];
      this.isLoadingAutocomplete = false;
    }
  });
}

/**
 * Manejar selección de tour
 * @param tour Tour seleccionado
 */
onTourSelect(tour: TourAutocompleteResult): void {
  this.selectedTour = tour;
  this.destinationInput = tour.name; // Mantener compatibilidad con el input original
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

  // ... resto del método sin cambios
}
```

#### Inyectar servicio en constructor:
```typescript
constructor(
  // ... servicios existentes
  private tourAutocompleteService: TourAutocompleteService
) {}
```

### 3. Actualizar Template HTML
**Archivo:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.html`

#### Reemplazar input text por p-autocomplete:
```html
<!-- ANTES: -->
<input
  pInputText
  id="destionationInput"
  autocomplete="off"
  placeholder="Pais, Ciudad, Ofertas, Destinos, todo lo que se te ocurra..."
  class="input-text radius firstElement"
  fluid="true"
  [(ngModel)]="destinationInput"
  (keyup.enter)="searchTrips()"
/>

<!-- DESPUÉS: -->
<p-autocomplete
  id="destionationInput"
  [(ngModel)]="selectedTour"
  [suggestions]="filteredTours"
  (completeMethod)="searchTours($event)"
  (onSelect)="onTourSelect($event)"
  field="name"
  [minLength]="2"
  [delay]="300"
  [forceSelection]="false"
  [showClear]="true"
  placeholder="Pais, Ciudad, Ofertas, Destinos, todo lo que se te ocurra..."
  [loading]="isLoadingAutocomplete"
  styleClass="input-text radius firstElement"
  appendTo="body"
  (keyup.enter)="searchTrips()"
>
  <!-- Template personalizado para mostrar información adicional -->
  <ng-template pTemplate="item" let-tour>
    <div class="tour-suggestion">
      <div class="tour-name">{{ tour.name }}</div>
      <div class="tour-destination" *ngIf="tour.destination">
        {{ tour.destination }}
      </div>
    </div>
  </ng-template>
</p-autocomplete>
```

### 4. Actualizar Estilos SCSS
**Archivo:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.scss`

#### Agregar estilos para autocomplete:
```scss
// Estilos para el autocomplete
::ng-deep {
  .p-autocomplete {
    width: 100%;
    
    .p-autocomplete-input {
      border-radius: 0;
      font-size: var(--font-sm);
      
      &.radius {
        border-radius: 50px 0px 0px 50px;
      }
    }
    
    .p-autocomplete-panel {
      z-index: var(--z-index-dropdown) !important;
      max-height: 300px;
      overflow-y: auto;
      
      .tour-suggestion {
        padding: 0.5rem;
        
        .tour-name {
          font-weight: 500;
          color: var(--text-color);
        }
        
        .tour-destination {
          font-size: 0.875rem;
          color: var(--text-color-secondary);
          margin-top: 0.25rem;
        }
      }
    }
  }
}

// Responsive adjustments
@media screen and (max-width: 992px) {
  ::ng-deep .p-autocomplete {
    .p-autocomplete-input {
      border-radius: var(--radius);
      
      &.radius {
        border-radius: var(--radius);
      }
    }
  }
}

@media screen and (max-width: 480px) {
  ::ng-deep .p-autocomplete {
    .p-autocomplete-input {
      height: var(--input-h-mob);
      font-size: var(--font-xs) !important;
    }
  }
}
```

### 5. Verificar Configuración del Endpoint
Basado en la documentación del endpoint `/api/Tour/autocomplete`:

- **URL:** `${environment.toursApiUrl}/Tour/autocomplete`
- **Método:** GET
- **Parámetro:** `query` (string)
- **Respuesta:** Array de objetos con información de tours

### 6. Testing y Validación

#### Casos de prueba:
1. **Búsqueda básica:** Escribir 2+ caracteres y verificar que aparecen sugerencias
2. **Selección:** Seleccionar una sugerencia y verificar que se actualiza el input
3. **Búsqueda en blanco:** Limpiar el input y verificar comportamiento
4. **Sin resultados:** Buscar término inexistente y verificar mensaje apropiado
5. **Responsive:** Probar en diferentes tamaños de pantalla
6. **Navegación:** Verificar que la búsqueda funciona correctamente al navegar

#### Validaciones:
- El endpoint responde correctamente
- Las sugerencias se muestran en tiempo real
- La selección funciona correctamente
- El diseño responsive se mantiene
- No hay errores en consola
- La funcionalidad de búsqueda existente se mantiene

## Consideraciones Técnicas

### Performance:
- Implementar debounce (300ms) para evitar llamadas excesivas al API
- Usar `minLength="2"` para evitar búsquedas con muy pocos caracteres
- Implementar loading state para mejor UX

### Accesibilidad:
- Mantener el `id` del input para labels
- Asegurar navegación por teclado
- Implementar ARIA labels apropiados

### Compatibilidad:
- Mantener la funcionalidad existente de `destinationInput`
- Asegurar que `searchTrips()` funcione con ambos tipos de entrada
- Mantener compatibilidad con los estilos existentes

## Archivos a Modificar

1. **Nuevo:** `src/app/core/services/tour/tour-autocomplete.service.ts`
2. **Modificar:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.ts`
3. **Modificar:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.html`
4. **Modificar:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.scss`

## Dependencias

- ✅ PrimeNG AutoCompleteModule (ya importado)
- ✅ HttpClient (ya configurado)
- ✅ FormsModule (ya importado)
- 🔄 TourAutocompleteService (nuevo)

## Referencias

- [Documentación PrimeNG Autocomplete](https://primeng.org/autocomplete)
- [Endpoint Guide](https://github.com/Different-Roads/core.differentroads.tour/blob/develop/ENDPOINTS_GUIDE.md)
- Ejemplos existentes en el proyecto:
  - `flight-search.component.html`
  - `specific-search.component.html`
  - `tour-departures.component.html`

## Notas Adicionales

- El componente debe mantener la funcionalidad existente
- Considerar implementar caché de resultados para mejorar performance
- Evaluar la posibilidad de mostrar información adicional en las sugerencias (precio, duración, etc.)
- Mantener consistencia visual con el diseño existente
