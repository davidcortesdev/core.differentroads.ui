# Flight Item Component

## Descripción
El componente `FlightItemComponent` es un componente reutilizable que muestra la información detallada de un paquete de vuelos, incluyendo itinerarios, precios y opciones de selección.

## Características
- Muestra información completa del vuelo (origen, destino, horarios, aerolíneas)
- Integración con el componente de escalas (`app-flight-stops`)
- Formateo de precios con el pipe `currencyFormat`
- Botón de selección con estados visuales
- Diseño responsive para móvil, tablet y desktop
- Soporte para múltiples vuelos por paquete (ida y vuelta)

## Uso

### Template
```html
<app-flight-item
  [flightPack]="flightPack"
  [selectedFlight]="selectedFlight"
  [flightDetails]="flightDetails"
  (flightSelected)="onFlightSelected($event)"
></app-flight-item>
```

### Componente TypeScript
```typescript
export class MyComponent {
  flightPack: IFlightPackDTO | null = null;
  selectedFlight: IFlightPackDTO | null = null;
  flightDetails: Map<number, IFlightDetailDTO> = new Map();

  onFlightSelected(flightPack: IFlightPackDTO): void {
    // Manejar la selección del vuelo
    this.selectedFlight = flightPack;
  }
}
```

## Inputs

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `flightPack` | `IFlightPackDTO \| null` | Paquete de vuelos a mostrar |
| `selectedFlight` | `IFlightPackDTO \| null` | Vuelo actualmente seleccionado |
| `flightDetails` | `Map<number, IFlightDetailDTO>` | Detalles de los vuelos (aerolíneas, etc.) |

## Outputs

| Evento | Tipo | Descripción |
|--------|------|-------------|
| `flightSelected` | `EventEmitter<IFlightPackDTO>` | Emitido cuando se selecciona un vuelo |

## Dependencias
- `IFlightPackDTO` y `IFlightDetailDTO` de `FlightsNetService`
- `app-flight-stops` para mostrar información de escalas
- `currencyFormat` pipe para formateo de precios
- PrimeNG Button component (`p-button`)

## Estilos
El componente incluye estilos completos con:
- Diseño responsive (mobile, tablet, desktop)
- Variables CSS personalizables
- Estados visuales para botones seleccionados
- Animaciones y transiciones

## Ejemplo de implementación completa

```typescript
// En el componente padre
export class FlightListComponent {
  flightPacks: IFlightPackDTO[] = [];
  selectedFlight: IFlightPackDTO | null = null;
  flightDetails: Map<number, IFlightDetailDTO> = new Map();

  ngOnInit(): void {
    this.loadFlights();
  }

  loadFlights(): void {
    // Cargar vuelos desde el servicio
    this.flightsService.getFlights().subscribe(flights => {
      this.flightPacks = flights;
      // Cargar detalles de cada vuelo
      this.flightPacks.forEach(pack => {
        pack.flights.forEach(flight => {
          this.loadFlightDetails(flight.id);
        });
      });
    });
  }

  onFlightSelected(flightPack: IFlightPackDTO): void {
    this.selectedFlight = flightPack;
    // Lógica adicional de selección
  }
}
```

```html
<!-- En el template del componente padre -->
<div class="flights-container">
  <app-flight-item
    *ngFor="let flightPack of flightPacks"
    [flightPack]="flightPack"
    [selectedFlight]="selectedFlight"
    [flightDetails]="flightDetails"
    (flightSelected)="onFlightSelected($event)"
  ></app-flight-item>
</div>
``` 