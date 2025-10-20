# Guardado Automático del Componente Info-Traveler-Form

## 📝 Descripción

El componente `InfoTravelerFormComponent` ahora tiene **guardado automático inteligente** que guarda los cambios automáticamente después de 2 segundos de inactividad, además de un botón manual para guardar inmediatamente.

## ✅ Implementación

### 1. Botón de Guardado Inteligente

El componente incluye un botón "Guardar datos del viajero" que:

- ✅ Se habilita cuando hay cambios pendientes (`hasPendingChanges()`)
- ✅ Detecta cambios modificados por el usuario (`form.dirty`)
- ✅ Detecta valores diferentes a los guardados en BD (comparación inteligente)
- ✅ Se habilita al cargar datos del perfil del usuario si no están en BD
- ✅ Muestra spinner mientras guarda
- ✅ Muestra mensaje de éxito/error con toast
- ✅ Deshabilita automáticamente cuando no hay cambios

```html
<button
  pButton
  type="button"
  label="Guardar datos del viajero"
  icon="pi pi-save"
  [loading]="savingData"
  [disabled]="!travelerForm.dirty || savingData"
  (click)="saveDataManually()"
  class="p-button-success save-button">
</button>
```

### 2. Detección Inteligente de Cambios

El método `hasPendingChanges()` detecta si hay datos para guardar mediante:

#### Criterio 1: Formulario Dirty
```typescript
if (this.travelerForm.dirty) {
  return true;  // Usuario modificó campos manualmente
}
```

#### Criterio 2: Comparación con BD
```typescript
// Para cada campo con valor:
const currentValue = control.value;  // Valor actual en el formulario
const existingValue = existingTravelerFields[...];  // Valor en BD

if (currentValue && currentValue !== existingValue) {
  return true;  // Hay diferencias con BD
}
```

**Casos que detecta:**

| Escenario | Dirty | Valor Actual | Valor BD | Válido | ¿Guardar? |
|-----------|-------|-------------|----------|--------|-----------|
| Usuario escribe | ✅ Sí | "Jaime" | "" | ✅ Sí | ✅ **Sí** |
| Usuario escribe | ✅ Sí | "Jaime" | "Juan" | ✅ Sí | ✅ **Sí** |
| Cargar del perfil | ❌ No | "Jaime" | "" | ✅ Sí | ✅ **Sí** (diferente) |
| Email inválido | ✅ Sí | "email@" | "" | ❌ No | ❌ **No** (inválido) ⭐ |
| Fecha inválida | ✅ Sí | "99/99/9999" | "" | ❌ No | ❌ **No** (inválido) ⭐ |
| Cargar del perfil | ❌ No | "Jaime" | "Jaime" | ✅ Sí | ❌ No (igual) |
| Sin cambios | ❌ No | "Jaime" | "Jaime" | ✅ Sí | ❌ No |
| Campo vacío | ❌ No | "" | "" | ✅ Sí | ❌ No |

### 3. Guardado Automático (AutoSave) ⭐ NUEVO

El componente ahora guarda automáticamente los cambios después de 2 segundos de inactividad.

#### Funcionamiento:

```typescript
initializeAutoSave() {
  this.travelerForm.valueChanges
    .pipe(
      debounceTime(2000),  // Espera 2 segundos sin cambios
      distinctUntilChanged()  // Solo si los valores cambiaron realmente
    )
    .subscribe(() => {
      performAutoSave();  // Guarda automáticamente
    });
}
```

#### Características:

- ⏱️ **Debounce de 2 segundos**: Espera que el usuario deje de escribir
- 🔍 **Detección de cambios reales**: Solo guarda si los valores cambiaron
- ✅ **Solo campos válidos**: NO guarda campos con errores de validación ⭐
- 🚫 **No interfiere con guardado manual**: Si ya está guardando, espera
- 💾 **Toast sutil**: Notifica discretamente cuando guarda
- 📊 **Logs completos**: Debugging detallado en consola

#### Validación Inteligente ⭐

El guardado automático **NO guardará** campos con errores:

```typescript
// Ejemplos de campos que NO se guardarán automáticamente:
- Email inválido: "email@" ❌
- Teléfono inválido: "abc123" ❌
- Fecha inválida: "99/99/9999" ❌
- Sexo sin seleccionar: null ❌ (si es obligatorio)

// Solo se guardan campos válidos:
- Email válido: "user@example.com" ✅
- Teléfono válido: "+34123456789" ✅
- Fecha válida: "07/10/2025" ✅
- Sexo seleccionado: "M" ✅
```

#### Flujo:

```
Usuario escribe "Jaime"
         ↓
Usuario deja de escribir
         ↓
Espera 2 segundos... ⏱️
         ↓
[AutoSave] Cambios detectados
         ↓
performAutoSave()
         ↓
Guarda en BD automáticamente
         ↓
Toast: "Tus cambios han sido guardados" (2 seg)
         ↓
markAsPristine()
         ↓
Botón "Guardar" se deshabilita
```

#### Indicador Visual:

```html
<span class="autosaving-indicator">
  <i class="pi pi-spin pi-spinner"></i>
  Guardando automáticamente...
</span>
```

Se muestra en el header mientras guarda automáticamente.

### 4. Flujo de Guardado Manual

```typescript
Usuario modifica un campo
         ↓
control.markAsDirty()  // Se marca como modificado
         ↓
Botón "Guardar" se habilita (travelerForm.dirty = true)
         ↓
Usuario hace click en "Guardar datos del viajero"
         ↓
saveDataManually()
         ↓
saveData()
         ↓
collectFormData()  // Solo campos dirty
         ↓
Para cada campo modificado:
  ¿Ya existe en BD?
    → Sí: PUT /ReservationTravelerField/{id} (UPDATE)
    → No: POST /ReservationTravelerField (CREATE)
         ↓
Promise.all(savePromises)  // Guardado paralelo
         ↓
Recargar existingTravelerFields
         ↓
markAsPristine()  // Marcar como no modificado
         ↓
Botón "Guardar" se deshabilita
         ↓
Toast: "Datos guardados correctamente" ✅
```

### 3. Métodos Públicos

#### `saveDataManually(): Promise<void>`

Método público para guardar datos manualmente desde el botón.

**Características:**
- Verifica si hay cambios pendientes
- Muestra toast de éxito/error
- Maneja loading state
- Logging completo

**Uso:**
```typescript
// Se llama desde el template al hacer click en el botón
<button (click)="saveDataManually()">Guardar</button>
```

#### `saveData(): Promise<void>`

Método interno (también puede llamarse desde el padre si es necesario).

**Funcionalidad:**
- Recopila datos dirty
- Crea o actualiza registros en la API
- Recarga datos existentes
- Marca formulario como pristine

### 4. Estados Visuales

El botón tiene 3 estados:

1. **Habilitado** (hay cambios):
   ```
   [Guardar datos del viajero] ← Click para guardar
   ```

2. **Guardando** (loading):
   ```
   [⏳ Guardando...] ← Spinner + deshabilitado
   ```

3. **Sin cambios** (pristine):
   ```
   [Guardar datos del viajero] (deshabilitado)
   ✓ No hay cambios pendientes
   ```

### 5. Logs de Debugging

Al hacer click en "Guardar", la consola muestra:

```
=== saveDataManually() INICIADO ===
=== saveData() INICIADO ===
Datos a guardar: [{reservationTravelerId: 2863, reservationFieldId: 4, value: "M"}, ...]
[UPDATE] Campo ID 4 con valor: "M"
[CREATE] Campo ID 11 con valor: "jiserte@differentroads.es"
Total de campos a guardar: 7
✅ Todos los campos guardados exitosamente
Campos existentes recargados: 7
Formulario marcado como pristine
=== saveData() COMPLETADO ===
=== Datos guardados exitosamente ===
```

### 6. Estructura de Datos

**Formato enviado a la API:**

```typescript
interface ReservationTravelerFieldCreate {
  id: 0,
  reservationTravelerId: number,  // ID del viajero (ej: 2863)
  reservationFieldId: number,     // ID del campo (ej: 4 para "sex")
  value: string                   // Valor del campo (ej: "M")
}
```

**Ejemplos de valores guardados:**

| Campo | reservationFieldId | value |
|-------|-------------------|-------|
| Nombre | 1 | "Jaime" |
| Apellidos | 13 | "Iserte Navarro" |
| Email | 11 | "jiserte@differentroads.es" |
| Sexo | 4 | "M" |
| Teléfono | 12 | "123456789" |
| Fecha nacimiento | 5 | "07/10/2025" |
| DNI | 2 | "94604611a" |

### 7. Toasts Informativos

- ✅ **Éxito**: "Los datos del viajero han sido guardados correctamente"
- ℹ️ **Sin cambios**: "No hay cambios pendientes para guardar"
- ❌ **Error**: "No se pudieron guardar los datos del viajero. Por favor, intenta nuevamente."

## 🔧 Integración con Componente Padre

### El componente padre NO necesita gestionar el guardado

El componente es ahora autónomo. El padre solo necesita:

```typescript
// checkout-v2.component.ts o info-travelers.component.ts

// YA NO ES NECESARIO:
// ❌ await this.infoTravelerForm.saveData();
// ❌ this.saveAllTravelersData();

// El usuario guarda manualmente con el botón del componente
```

### Si el padre necesita validar antes de avanzar de paso:

```typescript
// Verificar que NO haya cambios pendientes
if (this.infoTravelerForm.travelerForm.dirty) {
  this.messageService.add({
    severity: 'warn',
    summary: 'Cambios sin guardar',
    detail: 'Tienes cambios sin guardar. Haz click en "Guardar datos del viajero"',
    life: 5000
  });
  return false;
}
```

## 🗑️ Código a ELIMINAR de checkout-v2.component.ts

**Buscar y eliminar estos métodos si existen:**

1. `saveTravelersData()` - Ya no es necesario
2. Cualquier llamada a `infoTravelers.saveAllTravelersData()`
3. Lógica de guardado automático en validaciones de paso

**Buscar este tipo de código:**

```typescript
// ❌ ELIMINAR esto:
private async saveTravelersData(): Promise<boolean> {
  if (!this.infoTravelers) {
    return true;
  }
  
  await this.infoTravelers.saveAllTravelersData();
  return true;
}

// ❌ ELIMINAR llamadas como esta:
await this.saveTravelersData();
```

## 📊 Ventajas del Guardado Autónomo

1. ✅ **Control del usuario**: El usuario decide cuándo guardar
2. ✅ **Feedback inmediato**: Toast de confirmación al guardar
3. ✅ **Menos errores**: No hay guardado automático que falle silenciosamente
4. ✅ **Debugging fácil**: Logs completos del proceso de guardado
5. ✅ **Componente independiente**: No depende del padre para guardar
6. ✅ **Estado visual claro**: El usuario sabe si hay cambios pendientes

## 🎯 Comportamiento del Usuario

1. Usuario entra al formulario de viajeros
2. Modifica campos (nombre, email, sexo, etc.)
3. Botón "Guardar" se habilita automáticamente
4. Usuario hace click en "Guardar datos del viajero"
5. Se muestra spinner en el botón
6. Se guardan todos los cambios en la API
7. Toast de éxito: "Datos guardados correctamente"
8. Botón se deshabilita (no hay cambios pendientes)
9. Usuario puede modificar más campos y repetir el proceso

## ⚠️ Notas Importantes

- El método `saveData()` sigue siendo público por si el componente padre necesita forzar un guardado
- El botón solo guarda el viajero actual, no todos los viajeros de la reserva
- Los datos solo se guardan si el formulario tiene cambios (`dirty = true`)
- Las fechas se convierten automáticamente a formato DD/MM/YYYY antes de guardar
- El sexo se guarda como "M" o "F" (ya normalizado)

