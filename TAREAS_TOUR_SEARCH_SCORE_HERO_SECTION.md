# Tareas: Implementar Búsqueda de Tours con Score y Relevancia

## Resumen
Implementar un servicio para realizar búsquedas de tours usando el endpoint `/api/Tour/search-with-score` que devuelve resultados ordenados por relevancia y adaptar el componente de tours para mostrar los resultados desde la nueva base de datos MySQL.

## Estado Actual
- El componente `tours.component` actualmente usa `ToursService` con endpoint CMS (`/data/cms/collections/es/tours`)
- Se usa `tour-card` en el componente actual y `tour-card-v2` en home-v2
- El hero section v2 buscará tours usando el nuevo endpoint con score y relevancia
- Los parámetros de búsqueda se pasarán desde el hero section al componente de tours

## Referencias Técnicas
- [Endpoint Guide - Búsqueda detallada con score](https://github.com/Different-Roads/core.differentroads.tour/blob/develop/ENDPOINTS_GUIDE.md#3-b%C3%BAsqueda-detallada-con-score-y-coincidencias)
- Componente `tour-card-v2` usado en home-v2
- Modelo `TourDataV2` para la estructura de datos

## Tareas a Realizar

### 1. Crear Servicio TourSearchService
**Archivo:** `src/app/core/services/tour/tour-search.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TourSearchFilters {
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  tripType?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'departure_date';
}

export interface TourSearchResult {
  id: number;
  name: string;
  description: string;
  country: string;
  continent: string;
  price: number;
  imageUrl: string;
  webSlug: string;
  externalID: string;
  tourType: string;
  rating: number;
  score: number;
  matches: {
    destination?: string[];
    description?: string[];
    tags?: string[];
  };
  departureDates?: string[];
  nextDepartureDate?: string;
  itineraryDaysCount?: number;
  itineraryDaysText?: string;
  availableMonths?: string[];
  marketingSeasonTag?: string;
  isVisibleOnWeb: boolean;
  isBookable: boolean;
}

export interface TourSearchResponse {
  data: TourSearchResult[];
  totalCount: number;
  hasMore: boolean;
  searchTime: number;
  filters: {
    priceRange: {
      min: number;
      max: number;
    };
    countries: string[];
    continents: string[];
    tourTypes: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class TourSearchService {
  private readonly API_URL = `${environment.toursApiUrl}/Tour/search-with-score`;

  constructor(private http: HttpClient) {}

  /**
   * Buscar tours con score y relevancia
   * @param filters Filtros de búsqueda
   * @returns Observable con resultados ordenados por relevancia
   */
  searchTours(filters: TourSearchFilters): Observable<TourSearchResponse> {
    let params = new HttpParams();

    // Agregar parámetros de búsqueda
    if (filters.destination) {
      params = params.set('destination', filters.destination);
    }
    if (filters.departureDate) {
      params = params.set('departureDate', filters.departureDate);
    }
    if (filters.returnDate) {
      params = params.set('returnDate', filters.returnDate);
    }
    if (filters.tripType) {
      params = params.set('tripType', filters.tripType);
    }
    if (filters.minPrice) {
      params = params.set('minPrice', filters.minPrice.toString());
    }
    if (filters.maxPrice) {
      params = params.set('maxPrice', filters.maxPrice.toString());
    }
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }
    if (filters.offset) {
      params = params.set('offset', filters.offset.toString());
    }
    if (filters.sortBy) {
      params = params.set('sortBy', filters.sortBy);
    }

    return this.http.get<TourSearchResponse>(this.API_URL, {
      params
    });
  }

  /**
   * Buscar tours con paginación
   * @param filters Filtros de búsqueda
   * @param page Página actual
   * @param pageSize Tamaño de página
   * @returns Observable con resultados paginados
   */
  searchToursPaginated(
    filters: TourSearchFilters, 
    page: number = 1, 
    pageSize: number = 12
  ): Observable<TourSearchResponse> {
    const offset = (page - 1) * pageSize;
    
    return this.searchTours({
      ...filters,
      limit: pageSize,
      offset
    });
  }
}
```

### 2. Actualizar ToursComponent para Usar Nuevo Servicio
**Archivo:** `src/app/shared/components/tours/tours.component.ts`

#### Cambios en imports:
```typescript
import { TourSearchService, TourSearchFilters, TourSearchResult } from '../../../core/services/tour/tour-search.service';
import { TourDataV2 } from '../tour-card-v2/tour-card-v2.model';
```

#### Nuevas propiedades:
```typescript
// Nuevas propiedades para búsqueda con score
useScoreSearch: boolean = false;
searchFilters: TourSearchFilters = {};
totalResults: number = 0;
hasMoreResults: boolean = false;
currentPage: number = 1;
pageSize: number = 12;
isLoading: boolean = false;
```

#### Actualizar constructor:
```typescript
constructor(
  private readonly toursService: ToursService,
  private readonly tourSearchService: TourSearchService, // Nuevo servicio
  private readonly route: ActivatedRoute,
  private readonly analyticsService: AnalyticsService,
  private readonly authService: AuthenticateService
) {}
```

#### Nuevo método para búsqueda con score:
```typescript
/**
 * Cargar tours usando el nuevo endpoint con score
 */
loadToursWithScore(): void {
  this.isLoading = true;
  
  this.tourSearchService.searchToursPaginated(
    this.searchFilters,
    this.currentPage,
    this.pageSize
  ).pipe(
    catchError((error: Error) => {
      console.error('Error loading tours with score:', error);
      this.isLoading = false;
      return of({
        data: [],
        totalCount: 0,
        hasMore: false,
        searchTime: 0,
        filters: {
          priceRange: { min: 0, max: 0 },
          countries: [],
          continents: [],
          tourTypes: []
        }
      });
    })
  ).subscribe((response: any) => {
    this.isLoading = false;
    this.totalResults = response.totalCount;
    this.hasMoreResults = response.hasMore;
    
    // Convertir resultados a formato TourDataV2
    this.displayedTours = this.convertSearchResultsToTourData(response.data);
    
    // Actualizar filtros disponibles
    this.updateFilterOptions(response.filters);
    
    // Disparar evento de analytics
    if (response.data && response.data.length > 0) {
      this.trackViewItemList(response.data);
    }
    
    // Emitir tours al componente padre
    this.toursLoaded.emit(this.displayedTours);
  });
}

/**
 * Convertir resultados de búsqueda a formato TourDataV2
 */
private convertSearchResultsToTourData(results: TourSearchResult[]): TourDataV2[] {
  return results.map((tour: TourSearchResult) => ({
    imageUrl: tour.imageUrl || '',
    title: tour.name || '',
    description: this.formatTourDescription(tour),
    rating: tour.rating || 5,
    tag: tour.marketingSeasonTag || '',
    price: tour.price || 0,
    availableMonths: tour.availableMonths || [],
    isByDr: tour.tourType !== 'FIT',
    webSlug: tour.webSlug || '',
    externalID: tour.externalID,
    tripType: [tour.tourType],
    departureDates: tour.departureDates || [],
    nextDepartureDate: tour.nextDepartureDate || '',
    itineraryDaysCount: tour.itineraryDaysCount || 0,
    itineraryDaysText: tour.itineraryDaysText || '',
    // Campos adicionales para analytics
    score: tour.score,
    matches: tour.matches
  }));
}

/**
 * Formatear descripción del tour
 */
private formatTourDescription(tour: TourSearchResult): string {
  if (tour.itineraryDaysText) {
    return tour.itineraryDaysText;
  }
  
  if (tour.country && tour.itineraryDaysCount) {
    return `${tour.country} en: ${tour.itineraryDaysCount} días`;
  }
  
  return tour.description || '';
}

/**
 * Actualizar opciones de filtros desde la respuesta
 */
private updateFilterOptions(filters: any): void {
  // Actualizar opciones de países
  if (filters.countries) {
    this.countryOptions = filters.countries.map((country: string) => ({
      name: country.toUpperCase(),
      value: country
    }));
  }
  
  // Actualizar opciones de tipos de tour
  if (filters.tourTypes) {
    this.tripTypeOptions = filters.tourTypes.map((type: string) => ({
      name: type.toUpperCase(),
      value: type
    }));
  }
  
  // Actualizar opciones de precios
  if (filters.priceRange) {
    this.priceOptions = this.generatePriceOptions(filters.priceRange.min, filters.priceRange.max);
  }
}

/**
 * Generar opciones de precios basadas en el rango
 */
private generatePriceOptions(minPrice: number, maxPrice: number): { name: string; value: string }[] {
  const options = [];
  const ranges = [
    { min: 0, max: 1000, label: 'Menos de $1000' },
    { min: 1000, max: 3000, label: '$1000 - $3000' },
    { min: 3000, max: maxPrice, label: '+ $3000' }
  ];
  
  ranges.forEach(range => {
    if (range.max <= maxPrice && range.min >= minPrice) {
      options.push({
        name: range.label,
        value: `${range.min}-${range.max}`
      });
    }
  });
  
  return options;
}
```

#### Actualizar método loadTours:
```typescript
loadTours() {
  // Determinar qué método usar según el contexto
  if (this.useScoreSearch) {
    this.loadToursWithScore();
  } else {
    this.loadToursLegacy();
  }
}

/**
 * Método legacy para mantener compatibilidad
 */
private loadToursLegacy(): void {
  const filters = {
    destination: this.destination,
    minDate: this.minDate ? this.minDate.toISOString() : '',
    maxDate: this.maxDate ? this.maxDate.toISOString() : '',
    tourType: this.tourType,
    price: this.selectedPriceOption,
    tourSeason: this.selectedSeasonOption,
    month: this.selectedMonthOption,
    sort: this.selectedOrderOption,
    ...(this.selectedTagOption.length > 0 && {
      tags: this.selectedTagOption,
    }),
  };

  this.toursService
    .getFilteredToursList(filters)
    .pipe(
      catchError((error: Error) => {
        return [];
      })
    )
    .subscribe((tours: any) => {
      // ... código existente sin cambios
    });
}
```

#### Nuevos métodos para filtros:
```typescript
/**
 * Aplicar filtros de búsqueda con score
 */
applyScoreSearchFilters(filters: TourSearchFilters): void {
  this.searchFilters = { ...filters };
  this.currentPage = 1;
  this.loadToursWithScore();
}

/**
 * Cargar más resultados (paginación)
 */
loadMoreResults(): void {
  if (this.hasMoreResults && !this.isLoading) {
    this.currentPage++;
    this.loadToursWithScore();
  }
}

/**
 * Cambiar orden de resultados
 */
onOrderChange(): void {
  if (this.useScoreSearch) {
    // Mapear opciones de orden a sortBy
    const sortMapping: { [key: string]: string } = {
      'next-departures': 'departure_date',
      'min-price': 'price_asc',
      'max-price': 'price_desc',
      'relevance': 'relevance'
    };
    
    this.searchFilters.sortBy = sortMapping[this.selectedOrderOption] as any;
    this.currentPage = 1;
    this.loadToursWithScore();
  } else {
    this.trackFilterOrder();
    this.loadTours();
  }
}
```

### 3. Actualizar Template HTML
**Archivo:** `src/app/shared/components/tours/tours.component.html`

#### Agregar indicador de carga y botón "Cargar más":
```html
<!-- Tours list section -->
<div class="tours-list">
  <!-- Indicador de carga -->
  <div *ngIf="isLoading" class="loading-indicator">
    <p-progressSpinner [style]="{'width': '50px', 'height': '50px'}" strokeWidth="4"></p-progressSpinner>
    <p>Cargando tours...</p>
  </div>

  <p-dataView #dv [value]="displayedTours" [layout]="layout" *ngIf="!isLoading">
    <ng-template let-tours #grid>
      <div class="grid">
        <div
          *ngFor="let tour of displayedTours; let i = index"
          class="col-12 sm:col-6 lg:col-3"
        >
          <!-- Usar tour-card-v2 para consistencia con home-v2 -->
          <app-tour-card-v2
            [tourData]="tour"
            [showScalapayPrice]="true"
            [itemListId]="getListId()"
            [itemListName]="getListName()"
            [index]="i + 1"
          ></app-tour-card-v2>
        </div>
      </div>
    </ng-template>
  </p-dataView>

  <!-- Botón Cargar más -->
  <div class="load-more-section" *ngIf="hasMoreResults && !isLoading">
    <p-button 
      label="Cargar más tours" 
      icon="pi pi-plus" 
      (click)="loadMoreResults()"
      styleClass="p-button-outlined"
    ></p-button>
  </div>

  <!-- Mensaje cuando no hay resultados -->
  <div class="no-results" *ngIf="displayedTours.length === 0 && !isLoading">
    <p>No se encontraron tours que coincidan con tus criterios de búsqueda.</p>
    <p-button 
      label="Limpiar filtros" 
      icon="pi pi-refresh" 
      (click)="clearFilters()"
      styleClass="p-button-text"
    ></p-button>
  </div>
</div>
```

### 4. Actualizar Estilos SCSS
**Archivo:** `src/app/shared/components/tours/tours.component.scss`

#### Agregar estilos para nuevos elementos:
```scss
// Indicador de carga
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  
  p {
    color: var(--text-color-secondary);
    font-size: 1.1rem;
  }
}

// Sección de cargar más
.load-more-section {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
  
  .p-button {
    min-width: 200px;
  }
}

// Mensaje de no resultados
.no-results {
  text-align: center;
  padding: 3rem;
  
  p {
    color: var(--text-color-secondary);
    font-size: 1.1rem;
    margin-bottom: 1rem;
  }
  
  .p-button {
    margin-top: 1rem;
  }
}

// Mejoras para el grid
.tours-list {
  ::ng-deep {
    .p-dataview {
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        margin: 0;
        padding: 0;
        
        // Responsive adjustments
        @media (max-width: 768px) {
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        
        @media (max-width: 480px) {
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }
      }
    }
  }
}

// Mejoras para filtros
.tours-filters {
  .filter-box {
    min-width: 12rem;
    
    // Mejorar responsive
    @media (max-width: 768px) {
      min-width: 10rem;
    }
  }
}
```

### 5. Actualizar Hero Section V2 para Pasar Parámetros
**Archivo:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.ts`

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

  // Agregar parámetro para usar búsqueda con score
  queryParams.useScoreSearch = 'true';

  // Disparar evento search antes de navegar
  this.trackSearch(queryParams);

  this.router.navigate(['/tours'], { queryParams });
}
```

### 6. Testing y Validación

#### Casos de prueba:
1. **Búsqueda básica:** Probar con destino, fechas y tipo de viaje
2. **Orden por relevancia:** Verificar que los resultados se ordenan por score
3. **Paginación:** Probar "Cargar más" y navegación entre páginas
4. **Filtros:** Probar filtros de precio, país, tipo de tour
5. **Responsive:** Verificar en diferentes tamaños de pantalla
6. **Performance:** Medir tiempo de respuesta del endpoint
7. **Analytics:** Verificar que se disparan eventos correctamente

#### Validaciones:
- El endpoint responde correctamente
- Los resultados se ordenan por relevancia
- La paginación funciona
- Los filtros se aplican correctamente
- El diseño responsive se mantiene
- No hay errores en consola
- La funcionalidad legacy se mantiene

## Consideraciones Técnicas

### Performance:
- Implementar paginación para evitar cargar todos los resultados
- Usar loading states para mejor UX
- Considerar implementar caché de resultados

### Compatibilidad:
- Mantener la funcionalidad legacy para casos existentes
- Usar `tour-card-v2` para consistencia con home-v2
- Asegurar que los filtros existentes sigan funcionando

### Analytics:
- Disparar eventos correctos para la nueva búsqueda
- Incluir información de score en los eventos
- Mantener compatibilidad con eventos existentes

## Archivos a Modificar

1. **Nuevo:** `src/app/core/services/tour/tour-search.service.ts`
2. **Modificar:** `src/app/shared/components/tours/tours.component.ts`
3. **Modificar:** `src/app/shared/components/tours/tours.component.html`
4. **Modificar:** `src/app/shared/components/tours/tours.component.scss`
5. **Modificar:** `src/app/pages/home-v2/components/hero-section-v2/hero-section-v2.component.ts`

## Dependencias

- ✅ HttpClient (ya configurado)
- ✅ FormsModule (ya importado)
- ✅ PrimeNG DataViewModule (ya importado)
- ✅ PrimeNG ProgressSpinnerModule (ya importado)
- 🔄 TourSearchService (nuevo)

## Referencias

- [Endpoint Guide - Búsqueda con Score](https://github.com/Different-Roads/core.differentroads.tour/blob/develop/ENDPOINTS_GUIDE.md#3-b%C3%BAsqueda-detallada-con-score-y-coincidencias)
- Componente `tour-card-v2` y modelo `TourDataV2`
- Servicio `ToursService` existente para compatibilidad

## Notas Adicionales

- El componente debe mantener la funcionalidad existente
- Considerar implementar caché de resultados para mejorar performance
- Evaluar la posibilidad de mostrar información de score en la UI
- Mantener consistencia visual con el diseño existente
- Los filtros pueden ser configurables desde un servicio
