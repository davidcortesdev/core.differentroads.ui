# Guardado Automático del Componente Info-Traveler-Form

## 📝 Descripción

El componente `InfoTravelerFormComponent` tiene **guardado automático inteligente** que funciona completamente en segundo plano. Guarda los cambios válidos automáticamente después de 2 segundos de inactividad, sin necesidad de intervención manual del usuario.

---

## ✅ Características Principales

1. **🤖 Guardado Automático**: Guarda cambios después de 2 segundos sin actividad
2. **✅ Validación Previa**: Solo guarda campos que pasen las validaciones
3. **🔍 Detección Inteligente**: Compara valores actuales con valores en BD
4. **👤 Pre-llenado Automático**: Para el lead traveler, carga datos del perfil del usuario
5. **🔔 Notificaciones Discretas**: Toast sutiles cuando guarda automáticamente
6. **🔄 Indicador Visual**: Muestra "Guardando automáticamente..." en el header

---

## 📋 Implementación

### 1. Detección Inteligente de Cambios

El método `hasPendingChanges()` detecta si hay datos para guardar comparando valores actuales con los guardados en la base de datos.

#### Lógica de Detección

```typescript
// Para cada campo con valor:
const currentValue = control.value;  // Valor actual en el formulario
const existingValue = existingTravelerFields[...];  // Valor en BD

// Si hay valor y es diferente al guardado
if (currentValue && currentValue !== existingValue) {
  // ⭐ Solo considerar si el campo es VÁLIDO
  if (control.valid) {
    return true;  // ✅ Hay cambios válidos para guardar
  } else {
    // ❌ Campo inválido, no se guardará
    console.log(`[SKIP-INVALID] ${fieldCode}: inválido`);
  }
}
```

#### Casos que Detecta

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

---

### 2. Guardado Automático (AutoSave) ⭐

El componente guarda automáticamente los cambios después de 2 segundos de inactividad.

#### Funcionamiento

```typescript
// En ngOnInit
initializeAutoSave(): void {
  this.travelerForm.valueChanges
    .pipe(
      debounceTime(2000),        // ⏱️ Espera 2 segundos sin cambios
      distinctUntilChanged(),     // 🔍 Solo si los valores cambiaron realmente
      takeUntil(this.destroy$)
    )
    .subscribe(() => {
      performAutoSave();  // Guarda automáticamente
    });
}
```

#### Características

- ⏱️ **Debounce de 2 segundos**: Espera que el usuario deje de escribir
- 🔍 **Detección de cambios reales**: Solo guarda si los valores cambiaron
- ✅ **Solo campos válidos**: NO guarda campos con errores de validación ⭐
- 🚫 **No interfiere con otros guardados**: Si ya está guardando, espera
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

#### Flujo Completo

```
Usuario escribe "Jaime"
         ↓
travelerForm emite valueChanges
         ↓
autoSave$.next() se dispara
         ↓
debounceTime(2000) - Espera 2 segundos
         ↓
distinctUntilChanged() - Verifica cambios reales
         ↓
performAutoSave()
         ↓
Verifica: ¿hay cambios pendientes? ¿no está guardando ya?
         ↓
autoSaving = true (muestra "Guardando automáticamente...")
         ↓
saveData()
         ↓
collectFormData()  // Solo campos válidos con cambios
         ↓
Para cada campo válido modificado:
  ¿Ya existe en BD?
    → Sí: PUT /ReservationTravelerField/{id} (UPDATE)
    → No: POST /ReservationTravelerField (CREATE)
         ↓
Promise.all(savePromises)  // Guardado paralelo
         ↓
Recargar existingTravelerFields
         ↓
autoSaving = false
         ↓
Toast: "Tus cambios han sido guardados" ✅
```

---

### 3. Validación de Campos Antes del Guardado

#### Lógica en `collectFormData()`

```typescript
const hasValue = currentValue !== '' && currentValue !== null;
const isDifferent = currentValue !== existingValue;
const isValid = control.valid;  // ⭐ NUEVA VERIFICACIÓN

if ((control.dirty || (hasValue && isDifferent)) && isValid) {
  // ✅ Guardar: tiene cambios Y es válido
  formData.push(fieldData);
} else if (!isValid && (control.dirty || (hasValue && isDifferent))) {
  // ❌ NO guardar: tiene cambios pero es inválido
  console.log(`[SKIP-INVALID] ${fieldCode}: inválido`);
}
```

#### Tipos de Validaciones

| Campo | Validación | Ejemplo Válido | Ejemplo Inválido |
|-------|-----------|----------------|------------------|
| **Email** | Email válido | user@example.com | email@ |
| **Teléfono** | Patrón `/^(\+\d{1,3})?\s?\d{6,14}$/` | +34123456789 | abc123 |
| **Sexo** | Patrón `/^(M\|F)$/` | M, F | X, null |
| **Fecha nacimiento** | Edad mínima/máxima por grupo | 07/10/2025 | 99/99/9999 |
| **Fecha expiración** | No puede ser pasada | 01/01/2026 | 01/01/2020 |
| **País** | Código 2 letras `/^[A-Z]{2}$/` | ES, FR, IT | España |
| **Obligatorios** | `Validators.required` | "Jaime" | "", null |
| **Texto** | Min 2, Max 50 caracteres | "Jaime" | "J" |

---

### 4. Métodos Principales

#### `saveData(): Promise<void>`

Método interno que ejecuta el guardado automático.

**Funcionalidad:**
- Recopila solo campos válidos con cambios
- Crea o actualiza registros en la API
- Recarga datos existentes
- Muestra toast discreto de éxito
- Logging completo para debugging

```typescript
async saveData(): Promise<void> {
  // 1. Recopilar campos válidos con cambios
  const formData = this.collectFormData();
  
  // 2. Guardar en paralelo
  await Promise.all(
    formData.map(data => this.service.createOrUpdate(data))
  );
  
  // 3. Recargar datos
  await this.loadTravelerFieldsData();
  
  // 4. Notificar
  this.messageService.add({
    severity: 'success',
    summary: 'Éxito',
    detail: 'Tus cambios han sido guardados'
  });
}
```

#### `performAutoSave(): Promise<void>`

Método que ejecuta el guardado automático con validaciones previas.

**Características:**
- Verifica que no esté guardando actualmente
- Verifica que haya cambios pendientes
- Solo guarda campos válidos
- Muestra indicador visual de "Guardando automáticamente..."
- Muestra toast de éxito/error

```typescript
async performAutoSave(): Promise<void> {
  // Verificaciones previas
  if (this.savingData || this.autoSaving) return;
  if (!this.hasPendingChanges()) return;

  // Mostrar indicador
  this.autoSaving = true;

  try {
    await this.saveData();
  } catch (error) {
    console.error('[performAutoSave] Error:', error);
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudieron guardar los cambios automáticamente'
    });
  } finally {
    this.autoSaving = false;
  }
}
```

#### `initializeAutoSave(): void`

Configura el guardado automático con debounce.

```typescript
initializeAutoSave(): void {
  this.travelerForm.valueChanges
    .pipe(
      debounceTime(2000),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    )
    .subscribe(() => {
      this.autoSave$.next();
    });

  this.autoSave$
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.performAutoSave();
    });
}
```

---

### 5. Estados Visuales

#### Guardando Automáticamente

Cuando el componente está guardando automáticamente, muestra un indicador en el header:

```html
<span *ngIf="autoSaving" class="autosaving-indicator">
  <i class="pi pi-spin pi-spinner"></i>
  Guardando automáticamente...
</span>
```

**Aspecto:**
```
🔵 Guardando automáticamente... ← Aparece en el header
```

#### Notificaciones Toast

**Éxito:**
```
Toast: "Tus cambios han sido guardados" ✅
```

**Error:**
```
Toast: "Error al guardar los datos del viajero" ❌
```

---

### 6. Logs de Debugging

El sistema incluye logging completo para facilitar el debugging:

#### Al Guardar Automáticamente

```
[performAutoSave] Iniciando guardado automático...
[saveData] Guardando datos del viajero...
[collectFormData] Recopilando datos modificados...

[INCLUIR] name: actual="Jaime" vs BD="" (dirty: true, hasValue: true, isDifferent: true, valid: true)
[INCLUIR] email: actual="user@example.com" vs BD="" (dirty: true, hasValue: true, isDifferent: true, valid: true)
[SKIP-INVALID] phone: actual="abc123" (campo inválido, no se guardará)
[SKIP] birthdate: actual="07/10/2025" vs BD="07/10/2025" (sin cambios)

[saveData] Guardando 2 campos modificados...
[saveData] ✅ Datos guardados exitosamente
```

#### En `hasPendingChanges()`

```
[hasPendingChanges] Diferencias válidas encontradas: 
  ["name: \"Jaime\" !== \"\"", "email: \"user@example.com\" !== \"\""]

[hasPendingChanges] Campos inválidos (no se guardarán): 
  ["phone: inválido", "birthdate: inválido"]
```

---

## 🎯 Flujos de Usuario Completos

### Flujo 1: Usuario Modifica Campos (Todos Válidos)

```
Usuario escribe nombre: "Jaime" ✅
Usuario escribe email: "user@example.com" ✅
Usuario selecciona sexo: "Masculino" (guarda "M") ✅
         ↓
Espera 2 segundos sin actividad...
         ↓
AutoSave: Muestra "Guardando automáticamente..."
         ↓
Guarda 3 campos en BD
         ↓
Toast: "Tus cambios han sido guardados" ✅
```

### Flujo 2: Usuario Modifica Campos (Algunos Inválidos)

```
Usuario escribe email: "email@" ❌ (inválido)
Usuario escribe nombre: "Jaime" ✅
Usuario selecciona sexo: "Masculino" ✅
         ↓
Espera 2 segundos...
         ↓
AutoSave: Solo guarda "nombre" y "sexo"
         ↓
Email NO se guarda (se muestra error en rojo)
         ↓
Toast: "Tus cambios han sido guardados" (solo los válidos)
         ↓
Usuario corrige email: "user@example.com" ✅
         ↓
Espera 2 segundos...
         ↓
AutoSave: Ahora sí guarda el email ✅
```

### Flujo 3: Lead Traveler (Pre-llenado Automático)

```
Componente se monta con isLeadTraveler = true
         ↓
loadAllData()
         ↓
getUserDataForField() para cada campo
         ↓
Campos se pre-rellenan automáticamente:
  - Nombre: "Jaime" (del perfil)
  - Apellido: "Iserte Navarro"
  - Email: "jiserte@differentroads.es"
  - Teléfono: "123456789"
  - Sexo: "M" (normalizado de "Masculino")
         ↓
Espera 2 segundos...
         ↓
AutoSave: Guarda automáticamente en BD
         ↓
Toast: "Tus cambios han sido guardados" ✅
```

---

## 🔧 Configuración

### Variables de Estado

```typescript
// Guardado
savingData: boolean = false;      // Guardado general
autoSaving: boolean = false;      // Guardado automático específico

// RxJS
private autoSave$ = new Subject<void>();
private destroy$ = new Subject<void>();
```

### Inicialización

```typescript
ngOnInit(): void {
  this.loadAllData();
  this.initializeAutoSave();  // ⭐ Configurar guardado automático
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

---

## ✅ Ventajas del Sistema

1. **✅ Integridad de Datos**: Solo datos válidos llegan a la BD
2. **✅ Experiencia de Usuario**: No necesita hacer click en "Guardar"
3. **✅ Feedback Visual**: Indicador de "Guardando automáticamente..."
4. **✅ No Bloquea**: Campos válidos se guardan aunque haya inválidos
5. **✅ Guardado Parcial**: Guarda lo que puede, deja lo inválido para después
6. **✅ Logs Claros**: Debugging fácil con logs detallados
7. **✅ Pre-llenado Inteligente**: Lead traveler obtiene datos del perfil
8. **✅ Performance**: Debounce evita llamadas innecesarias a la API

---

## 📊 Resumen de la Implementación

El componente `InfoTravelerFormComponent` ahora es:

- 🤖 **Completamente Autónomo**: Guarda automáticamente sin intervención
- ✅ **Inteligente**: Solo guarda campos válidos
- 🔍 **Eficiente**: Detecta cambios reales vs BD
- 👤 **Contextual**: Pre-llena datos del perfil del lead traveler
- 🔔 **Informativo**: Notifica discretamente cuando guarda
- 📊 **Debuggeable**: Logs completos para troubleshooting

**¡El usuario solo necesita escribir y el componente hace el resto!** 🚀
