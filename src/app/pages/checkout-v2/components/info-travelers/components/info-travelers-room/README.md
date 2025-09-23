# Info Travelers Room Component

## Descripción
Componente independiente para la gestión y personalización de habitaciones en el proceso de checkout. Permite asignar viajeros a habitaciones específicas con validaciones de seguridad y restricciones.

## Características

### 🏠 **Gestión de Habitaciones**
- Asignación independiente de viajeros a habitaciones
- Cálculo automático de habitaciones disponibles
- Validación de restricciones (máximo 2 personas por habitación)
- Protección para niños (no pueden estar solos)

### 🎯 **Interfaz de Usuario**
- Diseño moderno con PrimeNG v19
- Autocomplete con dropdown para selección de habitaciones
- Resumen visual de asignaciones
- Identificación de viajero líder
- Responsive design

### ⚙️ **Funcionalidades Técnicas**
- Componente completamente independiente
- Comunicación con componente padre via EventEmitter
- Validación en tiempo real
- Manejo de errores con mensajes informativos

## Inputs

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `travelers` | `IReservationTravelerResponse[]` | Lista de viajeros |
| `ageGroups` | `IAgeGroupResponse[]` | Grupos de edad disponibles |
| `reservationId` | `number \| null` | ID de la reserva |

## Outputs

| Evento | Tipo | Descripción |
|--------|------|-------------|
| `roomAssignmentsChange` | `EventEmitter<{ [travelerId: number]: number }>` | Emite cambios en asignaciones de habitaciones |

## Uso

```html
<app-info-travelers-room
  [travelers]="travelers"
  [ageGroups]="ageGroups"
  [reservationId]="reservationId"
  (roomAssignmentsChange)="onRoomAssignmentsChange($event)">
</app-info-travelers-room>
```

## Validaciones

### Restricciones de Habitación
- **Máximo 2 personas por habitación**: Previene sobrepoblación
- **Protección infantil**: Los niños no pueden estar solos en una habitación
- **Asignación única**: Cada viajero solo puede estar en una habitación

### Reglas de Negocio
- Se muestra solo cuando hay 2 o más viajeros
- Cálculo automático de habitaciones necesarias: `Math.ceil(travelers.length / 2)`
- Validación en tiempo real con feedback inmediato

## Estilos

El componente incluye estilos personalizados que se integran con el tema de la aplicación:
- Variables CSS para colores consistentes
- Diseño responsive
- Animaciones suaves
- Integración con PrimeNG components

## Dependencias

- **PrimeNG**: Para componentes de UI (AutoComplete, Toast)
- **Angular Forms**: Para manejo de formularios
- **Angular Common**: Para funcionalidades básicas

## Servicios Utilizados

- `MessageService`: Para mostrar notificaciones de error/éxito

## Ejemplo de Implementación

```typescript
// En el componente padre
onRoomAssignmentsChange(roomAssignments: { [travelerId: number]: number }): void {
  console.log('Asignaciones de habitaciones:', roomAssignments);
  // Procesar las asignaciones...
}
```

## Notas de Desarrollo

- El componente es completamente independiente y no depende de otros componentes
- La lógica de validación está encapsulada dentro del componente
- Los estilos están optimizados para PrimeNG v19
- Compatible con el sistema de temas de la aplicación
