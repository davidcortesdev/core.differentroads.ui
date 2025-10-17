# Additional Info Component

Componente reutilizable para mostrar botones de acciones del presupuesto (guardar, descargar, compartir).

## Descripción

Este componente proporciona una interfaz con tres acciones principales:
- **Guardar presupuesto**: Guarda el presupuesto en el perfil del usuario
- **Descargar presupuesto**: Envía por email un PDF con la información del presupuesto
- **Compartir presupuesto**: Permite compartir el presupuesto con otras personas

## Uso

```html
<app-additional-info
  [existingOrder]="order"
  [tourName]="'Nombre del tour'"
  [periodName]="'Periodo seleccionado'"
  [periodDates]="'01/01/2024 - 10/01/2024'"
  [selectedFlight]="selectedFlight"
  [travelersSelected]="{ adults: 2, childs: 1, babies: 0 }"
  [periodID]="'period-123'"
  [isAuthenticated]="true"
  [infoCards]="[]"
>
</app-additional-info>
```

## Inputs

| Input | Tipo | Descripción |
|-------|------|-------------|
| `existingOrder` | `Order \| null` | Orden existente para modo actualización (checkout) |
| `tourName` | `string` | Nombre del tour |
| `periodName` | `string` | Nombre del periodo seleccionado |
| `periodDates` | `string` | Fechas del periodo |
| `selectedFlight` | `any` | Vuelo seleccionado |
| `travelersSelected` | `any` | Viajeros seleccionados (adults, childs, babies) |
| `periodID` | `string` | ID del periodo |
| `isAuthenticated` | `boolean` | Estado de autenticación del usuario |
| `infoCards` | `any[]` | Tarjetas de información adicional (opcional) |

## Servicio

El componente utiliza `AdditionalInfoService` para manejar la lógica de negocio:

### Métodos principales del servicio:

- `getUserEmail()`: Obtiene el email del usuario autenticado
- `isAuthenticated()`: Verifica si el usuario está autenticado
- `saveNewBudget(userEmail)`: Guarda un nuevo presupuesto
- `updateExistingBudget(existingOrder, userEmail)`: Actualiza un presupuesto existente
- `trackContactForm(userEmail, location)`: Dispara evento de analytics
- `showSuccess(message)`: Muestra mensaje de éxito
- `showError(message)`: Muestra mensaje de error
- `showInfo(message)`: Muestra mensaje de información

## Pendiente de implementación (TODO)

### En el servicio (`additional-info.service.ts`):

1. **saveNewBudget()**: Implementar lógica real para crear nueva orden
   - Conectar con el servicio de órdenes correspondiente
   - Obtener información del periodo, viajeros y precios
   - Crear la orden en el backend

2. **updateExistingBudget()**: Implementar lógica real para actualizar orden
   - Conectar con el servicio de órdenes correspondiente
   - Actualizar el estado de la orden a 'Budget'
   - Actualizar el propietario de la orden

### En el componente HTML:

⚠️ **IMPORTANTE**: Los modales NO están implementados actualmente. Los métodos están configurados pero falta el HTML.

1. **Modal de Login** (para `handleSaveTrip()` cuando no autenticado):
   ```html
   <app-login-modal
     [visible]="loginDialogVisible"
     (close)="closeLoginModal()"
     (login)="navigateToLogin()"
     (register)="navigateToRegister()"
   ></app-login-modal>
   ```

2. **Modal de compartir/descargar presupuesto** (para `handleInviteFriend()` y `handleDownloadTrip()`):
   ```html
   <p-dialog
     [(visible)]="visible"
     [modal]="true"
     [breakpoints]="dialogBreakpoints"
     [style]="dialogStyle"
     (onHide)="handleCloseModal()"
   >
     <!-- Aquí debería ir el componente app-budget-dialog o similar -->
     <p>Modal de compartir/descargar presupuesto</p>
   </p-dialog>
   ```

3. **Toast para notificaciones** (ya funciona vía servicio):
   ```html
   <p-toast position="top-right"></p-toast>
   ```

**Estado actual**: Los métodos muestran mensajes de toast informativos indicando que los modales están pendientes de implementación.

### Ejemplo de HTML completo (cuando los módulos estén importados):

```html
<div class="additional-info">
  <div class="tour-additional-info-container">
    <!-- Botones de acciones -->
    ...
  </div>

  <!-- Toast para notificaciones -->
  <p-toast position="top-right"></p-toast>
  
  <!-- Modal de login -->
  <app-login-modal
    [visible]="loginDialogVisible"
    (close)="closeLoginModal()"
    (login)="navigateToLogin()"
    (register)="navigateToRegister()"
  >
  </app-login-modal>
  
  <!-- Modal de presupuesto -->
  <p-dialog
    [(visible)]="visible"
    [modal]="true"
    (onHide)="handleCloseModal()"
  >
    <app-budget-dialog
      [visible]="visible"
      [shouldClearFields]="shouldClearFields"
      [tourName]="tourName"
      [periodName]="periodName"
      [isShareMode]="isShareMode"
      (close)="handleCloseModal()"
    ></app-budget-dialog>
  </p-dialog>
</div>
```

## Notas de implementación

- El componente está preparado para trabajar en dos modos:
  - **Modo creación**: Desde la página de detalle del tour (sin `existingOrder`)
  - **Modo actualización**: Desde el checkout (con `existingOrder`)
  
- Los métodos `handleSaveTrip()`, `handleDownloadTrip()` y `handleInviteFriend()` están implementados y listos para usar
  
- Los estilos están optimizados para responsive design (desktop, tablet, mobile)

## Dependencias

El componente requiere los siguientes módulos/servicios:
- `AuthenticateService` - Para autenticación
- `AnalyticsService` - Para tracking
- `MessageService` (PrimeNG) - Para notificaciones
- Router (Angular) - Para navegación

## Próximos pasos

1. Declarar el componente en el módulo correspondiente
2. Implementar los métodos TODO en el servicio
3. Agregar los modales necesarios al HTML
4. Conectar con los servicios de backend reales
5. Probar en contexto de tour-v2 y checkout-v2

