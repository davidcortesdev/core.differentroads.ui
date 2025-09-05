# Documentación de Rutas Standalone

## Descripción

Este documento describe la implementación de rutas standalone que permiten acceder al componente de checkout sin header ni footer, ideal para integraciones externas, iframes o popups.

## Estructura de Rutas

### Rutas Standalone (Sin Header/Footer)
- `/standalone/checkout` - Checkout sin ID de reserva
- `/standalone/checkout/:reservationId` - Checkout con ID de reserva específico

### Rutas Principales (Con Header/Footer)
- Todas las demás rutas mantienen el header y footer normal
- Ejemplos: `/home`, `/tour/:slug`, `/checkout-v2`, etc.

## Arquitectura

### Componentes Creados

#### 1. StandaloneComponent
**Ubicación:** `src/app/layout/standalone/standalone.component.ts`

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-standalone',
  standalone: false,
  template: '<router-outlet></router-outlet>',
  styleUrl: './standalone.component.scss'
})
export class StandaloneComponent {
}
```

**Propósito:** Componente wrapper mínimo que solo renderiza el router-outlet sin header ni footer.

#### 2. MainComponent (Modificado)
**Ubicación:** `src/app/layout/main/main.component.html`

```html
<app-header></app-header>

<router-outlet></router-outlet>

<app-footer></app-footer>
```

**Propósito:** Componente wrapper para rutas principales que incluye header y footer.

### Configuración de Rutas

**Archivo:** `src/app/app-routing.module.ts`

```typescript
const routes: Routes = [
  // Rutas standalone (sin header ni footer) - DEBEN IR PRIMERO
  {
    path: 'standalone',
    component: StandaloneComponent,
    children: [
      { path: 'checkout', component: CheckoutV2Component },
      { path: 'checkout/:reservationId', component: CheckoutV2Component },
    ],
  },
  // Rutas principales (con header y footer)
  {
    path: '',
    component: MainComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      // ... resto de rutas
    ]
  }
];
```

### App Component (Modificado)
**Archivo:** `src/app/app.component.html`

```html
<router-outlet></router-outlet>
```

**Cambio:** Se removió el header y footer del componente principal para que el layout se maneje desde las rutas.

## Flujo de Renderizado

### Rutas Standalone
```
AppComponent
└── router-outlet
    └── StandaloneComponent
        └── router-outlet
            └── CheckoutV2Component
```

### Rutas Principales
```
AppComponent
└── router-outlet
    └── MainComponent
        ├── app-header
        ├── router-outlet
        │   └── [Componente específico]
        └── app-footer
```

## Uso

### Para Desarrolladores

#### Acceder a Checkout Standalone
```typescript
// Navegación programática
this.router.navigate(['/standalone/checkout']);
this.router.navigate(['/standalone/checkout', reservationId]);

// En templates
<a routerLink="/standalone/checkout">Checkout Standalone</a>
<a [routerLink]="['/standalone/checkout', reservationId]">Checkout con ID</a>
```

#### Acceder a Checkout Normal
```typescript
// Navegación programática
this.router.navigate(['/checkout-v2']);
this.router.navigate(['/checkout-v2', reservationId]);

// En templates
<a routerLink="/checkout-v2">Checkout Normal</a>
<a [routerLink]="['/checkout-v2', reservationId]">Checkout con ID</a>
```

### Para Integraciones Externas

#### Iframe
```html
<iframe 
  src="https://tu-dominio.com/standalone/checkout/123"
  width="100%" 
  height="600px"
  frameborder="0">
</iframe>
```

#### Popup/Modal
```javascript
window.open(
  'https://tu-dominio.com/standalone/checkout/123',
  'checkout',
  'width=800,height=600,scrollbars=yes,resizable=yes'
);
```

## Ventajas

1. **Flexibilidad:** Permite usar el checkout en diferentes contextos
2. **Reutilización:** El mismo componente se puede usar con y sin layout
3. **Integración:** Facilita integraciones con sistemas externos
4. **Mantenimiento:** Un solo componente, múltiples presentaciones

## Consideraciones

### Orden de Rutas
- Las rutas standalone **deben ir primero** en la configuración para evitar conflictos con el catch-all (`**`)

### Estilos
- Los estilos del checkout se mantienen igual en ambas versiones
- No se requieren estilos adicionales para el modo standalone

### Funcionalidad
- Toda la funcionalidad del checkout se mantiene intacta
- No hay diferencias en el comportamiento entre las dos versiones

## Archivos Modificados

1. `src/app/app-routing.module.ts` - Configuración de rutas
2. `src/app/app.component.html` - Removido header/footer
3. `src/app/layout/main/main.component.html` - Agregado header/footer
4. `src/app/app.module.ts` - Agregado StandaloneComponent

## Archivos Creados

1. `src/app/layout/standalone/standalone.component.ts`
2. `src/app/layout/standalone/standalone.component.scss`
3. `src/app/layout/standalone/standalone.component.spec.ts`

## Testing

### URLs para Probar

#### Con Header y Footer
- `http://localhost:4200/checkout-v2`
- `http://localhost:4200/checkout-v2/123`

#### Sin Header y Footer
- `http://localhost:4200/standalone/checkout`
- `http://localhost:4200/standalone/checkout/123`

### Verificaciones
- [x] Las rutas standalone no muestran header ni footer
- [x] Las rutas principales muestran header y footer
- [x] La funcionalidad del checkout es idéntica en ambas versiones
- [x] No hay errores en la consola del navegador
- [x] Los estilos se aplican correctamente en ambas versiones

## Mantenimiento

### Agregar Nuevas Rutas Standalone
Para agregar más rutas standalone, simplemente añádelas al array de children del StandaloneComponent:

```typescript
{
  path: 'standalone',
  component: StandaloneComponent,
  children: [
    { path: 'checkout', component: CheckoutV2Component },
    { path: 'checkout/:reservationId', component: CheckoutV2Component },
    // Agregar nuevas rutas aquí
    { path: 'nueva-ruta', component: NuevoComponente },
  ],
}
```

### Modificar el Layout Standalone
Si necesitas agregar elementos al layout standalone (como un header mínimo), modifica el `StandaloneComponent`:

```typescript
template: `
  <div class="standalone-header">
    <!-- Header mínimo si es necesario -->
  </div>
  <router-outlet></router-outlet>
`
```
