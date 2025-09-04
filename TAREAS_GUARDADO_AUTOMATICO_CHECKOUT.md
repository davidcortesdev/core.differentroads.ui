# Lista de Tareas: Implementación de Guardado Automático en Checkout V2

## Filosofía del Proyecto
**Objetivo**: Implementar el guardado automático de información en el backend desde el primer momento, sin esperar a que el usuario haga clic en "Continuar". Esto mejorará la experiencia del usuario y evitará pérdida de datos.

## Análisis del Estado Actual

### Componentes Principales Identificados:
1. **checkout-v2.component.ts** - Componente principal que orquesta todo el flujo
2. **selector-traveler.component.ts** - Maneja número de viajeros y ya tiene guardado automático parcial
3. **selector-room.component.ts** - Maneja selección de habitaciones
4. **insurance.component.ts** - Maneja selección de seguros
5. **activities-optionals.component.ts** - Maneja actividades opcionales
6. **info-travelers.component.ts** - Maneja información detallada de viajeros

### Estado Actual del Guardado:
- ✅ **selector-traveler**: Ya implementa guardado automático con `syncTravelersWithReservation()`
- ❌ **selector-room**: Solo guarda al hacer clic en "Continuar"
- ❌ **insurance**: Solo guarda al hacer clic en "Continuar"  
- ❌ **activities-optionals**: Solo guarda al hacer clic en "Continuar"
- ❌ **info-travelers**: Solo guarda al hacer clic en "Continuar"

---

## TAREAS A IMPLEMENTAR

### 1. **Selector de Habitaciones (selector-room.component.ts)**

#### 1.1 Modificar el método `onRoomSpacesChange()`
- **Ubicación**: Línea 573-584
- **Cambio**: Agregar llamada automática a `saveRoomAssignments()` después de emitir cambios
- **Código a agregar**:
```typescript
onRoomSpacesChange(changedRoom: RoomAvailability, newValue: number): void {
  // ... código existente ...
  
  // NUEVO: Guardado automático
  this.saveRoomAssignments().then(success => {
    if (success) {
      console.log('✅ Habitaciones guardadas automáticamente');
    } else {
      console.error('❌ Error al guardar habitaciones automáticamente');
    }
  });
}
```

#### 1.2 Optimizar el método `saveRoomAssignments()`
- **Ubicación**: Línea 726-824
- **Cambio**: Reducir el delay y mejorar el manejo de errores
- **Mejoras**:
  - Reducir chunk size de 5 a 3 para mejor rendimiento
  - Agregar timeout más corto
  - Mejorar logging de errores

### 2. **Selector de Seguros (insurance.component.ts)**

#### 2.1 Modificar el método `toggleInsurance()`
- **Ubicación**: Línea 298-308
- **Cambio**: Agregar guardado automático después de emitir cambios
- **Código a agregar**:
```typescript
toggleInsurance(insurance: IActivityResponse | null): void {
  this.selectedInsurance = insurance;
  this.hasUnsavedChanges = true;
  this.errorMsg = null;
  this.userHasMadeSelection = true;

  // Emitir el cambio al componente padre
  this.emitInsuranceChange();

  // NUEVO: Guardado automático
  this.saveInsuranceAssignments().then(success => {
    if (success) {
      console.log('✅ Seguro guardado automáticamente');
    } else {
      console.error('❌ Error al guardar seguro automáticamente');
    }
  });
}
```

#### 2.2 Optimizar el método `saveInsuranceAssignments()`
- **Ubicación**: Línea 323-400
- **Cambio**: Mejorar el manejo de errores y reducir complejidad
- **Mejoras**:
  - Simplificar la lógica de eliminación
  - Mejorar el manejo de errores específicos
  - Agregar timeout para evitar operaciones muy largas

### 3. **Actividades Opcionales (activities-optionals.component.ts)**

#### 3.1 Modificar los métodos `addActivityToDatabase()` y `removeActivityFromDatabase()`
- **Ubicación**: Líneas 387-490
- **Cambio**: Ya implementan guardado automático, pero mejorar el manejo de errores
- **Mejoras**:
  - Agregar retry logic para operaciones fallidas
  - Mejorar el feedback visual al usuario
  - Optimizar las llamadas paralelas

#### 3.2 Optimizar el método `emitActivitiesChange()`
- **Ubicación**: Línea 502-516
- **Cambio**: Agregar debounce para evitar llamadas excesivas
- **Código a agregar**:
```typescript
private emitActivitiesChangeDebounced = debounce(() => {
  // ... código existente ...
}, 300);
```

### 4. **Información de Viajeros (info-travelers.component.ts)**

#### 4.1 Modificar los métodos de cambio de campos
- **Ubicación**: Líneas 1678-1706
- **Cambio**: Agregar guardado automático con debounce
- **Código a agregar**:
```typescript
private saveFieldDebounced = debounce((fieldData: ReservationTravelerFieldCreate) => {
  this.saveSingleField(fieldData);
}, 1000);

private saveSingleField(fieldData: ReservationTravelerFieldCreate): void {
  // Implementar guardado individual de campo
}
```

#### 4.2 Crear método `saveSingleField()`
- **Nuevo método**: Para guardar campos individuales sin recargar todo
- **Funcionalidad**:
  - Verificar si el campo ya existe
  - Crear o actualizar según corresponda
  - Manejar errores específicos

### 5. **Componente Principal (checkout-v2.component.ts)**

#### 5.1 Modificar el método `updateOrderSummary()`
- **Ubicación**: Línea 1142-1361
- **Cambio**: Agregar actualización automática del resumen en el backend
- **Código a agregar**:
```typescript
// Al final del método updateOrderSummary()
this.updateSummaryInBackend();
```

#### 5.2 Crear método `updateSummaryInBackend()`
- **Nuevo método**: Para actualizar el resumen en el backend
- **Funcionalidad**:
  - Llamar al endpoint de actualización de resumen
  - Manejar errores de red
  - Logging de operaciones

#### 5.3 Modificar el método `persistSummaryToLocalStorage()`
- **Ubicación**: Línea 1382-1405
- **Cambio**: Agregar llamada al backend después de persistir localmente
- **Mejora**: Sincronizar con el backend inmediatamente

### 6. **Servicios y Endpoints**

#### 6.1 Crear servicio `SummaryUpdateService`
- **Nuevo archivo**: `src/app/core/services/summary-update.service.ts`
- **Funcionalidad**:
  - Método para actualizar resumen en backend
  - Manejo de errores y retry logic
  - Cache de operaciones pendientes

#### 6.2 Identificar endpoint de actualización de resumen
- **Tarea**: Encontrar o crear endpoint para actualizar resumen
- **Ubicación**: Backend API
- **Funcionalidad**: Recibir y procesar cambios de resumen

### 7. **Optimizaciones Generales**

#### 7.1 Implementar debounce en todos los componentes
- **Objetivo**: Evitar llamadas excesivas al backend
- **Implementación**: Usar `debounceTime` de RxJS
- **Tiempo recomendado**: 300-500ms

#### 7.2 Mejorar manejo de errores
- **Objetivo**: Proporcionar feedback claro al usuario
- **Implementación**:
  - Toast messages para errores
  - Retry automático para errores de red
  - Logging detallado para debugging

#### 7.3 Implementar indicadores de guardado
- **Objetivo**: Mostrar al usuario que los datos se están guardando
- **Implementación**:
  - Spinner en componentes
  - Estado de "guardando..." en botones
  - Iconos de estado en campos

### 8. **Testing y Validación**

#### 8.1 Crear tests unitarios
- **Archivos**: `*.component.spec.ts`
- **Cobertura**: Métodos de guardado automático
- **Casos**: Éxito, error, timeout, retry

#### 8.2 Crear tests de integración
- **Objetivo**: Verificar flujo completo de guardado
- **Escenarios**: Cambios múltiples, errores de red, desconexión

#### 8.3 Validación manual
- **Casos de prueba**:
  - Cambios rápidos en múltiples campos
  - Pérdida de conexión durante guardado
  - Recarga de página durante guardado
  - Navegación entre steps

---

## ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. **Fase 1**: Implementar guardado automático en selector-room
2. **Fase 2**: Implementar guardado automático en insurance
3. **Fase 3**: Optimizar activities-optionals (ya tiene guardado parcial)
4. **Fase 4**: Implementar guardado automático en info-travelers
5. **Fase 5**: Crear servicio de actualización de resumen
6. **Fase 6**: Implementar actualización automática del resumen
7. **Fase 7**: Optimizaciones y mejoras de UX
8. **Fase 8**: Testing y validación

---

## CONSIDERACIONES TÉCNICAS

### Performance
- Usar debounce para evitar llamadas excesivas
- Implementar retry logic para errores de red
- Cache local para operaciones pendientes

### UX/UI
- Indicadores visuales de guardado
- Mensajes de error claros
- Prevención de pérdida de datos

### Backend
- Endpoints optimizados para actualizaciones frecuentes
- Manejo de concurrencia
- Logging de operaciones

### Monitoreo
- Métricas de guardado automático
- Alertas por errores frecuentes
- Dashboard de estado del sistema

---

## NOTAS ADICIONALES

- **selector-traveler** ya implementa guardado automático correctamente
- El resumen del pedido se actualiza localmente pero no se sincroniza con el backend automáticamente
- Necesitamos identificar el endpoint correcto para actualizar el resumen en el backend
- Considerar implementar un sistema de cola para operaciones de guardado en caso de alta concurrencia
