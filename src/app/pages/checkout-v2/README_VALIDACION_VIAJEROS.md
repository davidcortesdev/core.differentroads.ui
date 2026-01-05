# 📋 Validación de Viajeros en Checkout

Este documento explica cómo funciona la validación de viajeros cuando el usuario intenta continuar del paso "Viajeros" al paso "Pago" en el checkout.

---

## 🎯 Flujo de Validación

Cuando el usuario hace click en **"Continuar"** en el Step 3 (Viajeros):

```
Usuario hace click en "Continuar"
         ↓
checkAuthAndContinue(3, ...)
         ↓
nextStepWithValidation(3)
         ↓
performStepValidation(3)
         ↓
¿targetStep === 3? (ir a Pago)
  ✅ Sí → Validar viajeros
         ↓
infoTravelers.canContinueToNextStep()
         ↓
¿Todos los viajeros listos?
  ✅ Sí → onActiveIndexChange(3) → Continuar a Pago
  ❌ No → infoTravelers.showValidationError() → Mostrar toast con error específico
```

---

## 💻 Implementación en Checkout

### Código en `performStepValidation()`

```typescript
// Validar datos de viajeros antes de continuar al paso de pago (targetStep === 3)
if (targetStep === 3) {
  if (!this.infoTravelers) {
    console.error('Componente infoTravelers no está disponible');
    this.messageService.add({
      severity: 'error',
      summary: 'Error de inicialización',
      detail: 'El componente de información de viajeros no está disponible.',
      life: 5000,
    });
    return;
  }

  // ✅ Validar que todos los viajeros estén listos para continuar
  const allTravelersReady = this.infoTravelers.canContinueToNextStep();

  if (!allTravelersReady) {
    // ❌ Algunos viajeros no están listos
    
    // Mostrar error específico indicando qué viajeros faltan
    this.infoTravelers.showValidationError();
    
    return; // No continuar al siguiente paso
  }

  // ✅ Todos los viajeros están listos
}

// Navegar al siguiente paso
this.onActiveIndexChange(targetStep);
```

---

## 🔍 Qué Valida

El método `canContinueToNextStep()` verifica para **CADA viajero**:

### 1. Campos Obligatorios Completos

Todos los campos marcados como obligatorios deben tener un valor.

**Ejemplo:**
- Nombre ✅
- Apellido ✅
- Email ✅
- Sexo ✅

### 2. Campos Obligatorios Válidos

Los valores deben pasar todas las validaciones (email válido, patrón correcto, etc.).

**Ejemplo:**
- Email: `user@example.com` ✅ (válido)
- Email: `email@` ❌ (inválido)

### 3. Sin Cambios Pendientes

No debe haber cambios sin guardar (el sistema de autoguardado ya debe haber guardado todo).

**Nota:** El sistema tiene un debounce de 2 segundos, así que si el usuario escribe y hace click en "Continuar" inmediatamente, podría fallar la validación.

---

## 📊 Logs de Debugging

### Caso: Todos los Viajeros Listos ✅

```
=== Validando viajeros antes de continuar al pago ===
=== canContinueToNextStep() INICIADO ===
[canContinueToNextStep] Verificando 3 viajero(s)...
[canContinueToNextStep] ✅ Viajero 1 (ID: 123): LISTO
[canContinueToNextStep] ✅ Viajero 2 (ID: 124): LISTO
[canContinueToNextStep] ✅ Viajero 3 (ID: 125): LISTO
[canContinueToNextStep] ✅ TODOS los viajeros están listos para continuar
✅ Validación de viajeros exitosa: todos los viajeros están listos
→ Navegar al paso de pago
```

### Caso: Algunos Viajeros NO Listos ❌

```
=== Validando viajeros antes de continuar al pago ===
=== canContinueToNextStep() INICIADO ===
[canContinueToNextStep] Verificando 3 viajero(s)...
[canContinueToNextStep] ✅ Viajero 1 (ID: 123): LISTO
[canContinueToNextStep] ❌ Viajero 2 (ID: 124): NO LISTO
  [isReadyToContinue] ❌ Campos obligatorios inválidos: ["email (email inválido)"]
[canContinueToNextStep] ❌ Viajero 3 (ID: 125): NO LISTO
  [isReadyToContinue] ❌ Hay cambios pendientes sin guardar
[canContinueToNextStep] ❌ ALGUNOS viajeros no están listos
❌ Validación de viajeros fallida: no se puede continuar
→ Toast: "Los Pasajeros 2, 3 tienen campos obligatorios incompletos o cambios sin guardar."
→ NO navegar (se queda en el paso de viajeros)
```

---

## 💬 Mensajes de Error al Usuario

El método `showValidationError()` muestra mensajes personalizados:

### 1 Viajero No Listo

```
⚠️ Atención
El Pasajero 2 tiene campos obligatorios incompletos o cambios sin guardar.
```

### Múltiples Viajeros NO Listos

```
⚠️ Atención
Los Pasajeros 1, 3 tienen campos obligatorios incompletos o cambios sin guardar.
```

### Mensaje Genérico (fallback)

```
⚠️ Atención
Por favor, completa todos los campos obligatorios de los viajeros antes de continuar.
```

---

## 🎯 Casos de Uso

### Caso 1: Usuario Completa Todos los Datos ✅

```
1. Usuario rellena Viajero 1: Nombre, Apellido, Email, Sexo ✅
2. Usuario rellena Viajero 2: Nombre, Apellido, Email, Sexo ✅
3. Sistema guarda automáticamente (2s debounce)
4. Usuario hace click en "Continuar"
5. ✅ Validación exitosa → Navegar a Pago
```

### Caso 2: Usuario Deja Campos Vacíos ❌

```
1. Usuario rellena Viajero 1: Nombre, Apellido, Email, Sexo ✅
2. Usuario NO rellena Viajero 2 ❌
3. Usuario hace click en "Continuar"
4. ❌ Validación fallida
5. Toast: "El Pasajero 2 tiene campos obligatorios incompletos..."
6. Usuario se queda en el paso de viajeros
```

### Caso 3: Usuario Escribe Datos Inválidos ❌

```
1. Usuario rellena Viajero 1: Nombre, Apellido, Email válido, Sexo ✅
2. Usuario rellena Viajero 2: Nombre, "email@" (inválido), Sexo ✅
3. Sistema NO guarda el email inválido
4. Usuario hace click en "Continuar"
5. ❌ Validación fallida
6. Toast: "El Pasajero 2 tiene campos obligatorios incompletos..."
7. Usuario ve campo email en rojo con mensaje de error
```

### Caso 4: Usuario Click Rápido (Debounce) ⚠️

```
1. Usuario escribe datos de Viajero 1
2. Usuario hace click en "Continuar" INMEDIATAMENTE (< 2s)
3. Sistema detecta cambios pendientes sin guardar
4. ❌ Validación fallida
5. Toast: "El Pasajero 1 tiene... cambios sin guardar."
6. Usuario espera 2s más
7. Sistema guarda automáticamente
8. Usuario hace click en "Continuar" nuevamente
9. ✅ Validación exitosa → Navegar a Pago
```

---

## ⚙️ Configuración

### Referencias en Checkout

```typescript
// checkout-v2.component.ts

@ViewChild('infoTravelers') infoTravelers!: InfoTravelersComponent;
```

### HTML del Step de Viajeros

```html
<!-- checkout-v2.component.html -->

<div *ngSwitchCase="2">
  <app-info-travelers
    [departureId]="departureId"
    [reservationId]="reservationId"
    [itineraryId]="itineraryId"
    #infoTravelers>
  </app-info-travelers>

  <div class="flight-buttons">
    <p-button
      label="Continuar"
      icon="pi pi-arrow-right"
      iconPos="right"
      (onClick)="checkAuthAndContinue(3, onActiveIndexChange.bind(this), false)">
    </p-button>
  </div>
</div>
```

---

## ✅ Ventajas de Esta Implementación

1. ✅ **Validación Robusta**: No permite avanzar sin datos completos y válidos
2. ✅ **Mensajes Específicos**: Indica exactamente qué viajeros tienen problemas
3. ✅ **UX Mejorada**: El usuario sabe qué debe corregir
4. ✅ **Logs Completos**: Facilita el debugging en producción
5. ✅ **Integración Limpia**: No requiere eventos ni subscripciones complejas
6. ✅ **Type-Safe**: TypeScript verifica los tipos en tiempo de compilación

---

## 🔧 Troubleshooting

### Problema: "Componente infoTravelers no está disponible"

**Causa:** El componente no se ha renderizado aún.

**Solución:** Verificar que el step 2 (Viajeros) se haya visitado al menos una vez antes de intentar validar.

### Problema: "Hay cambios pendientes sin guardar"

**Causa:** El usuario hizo click muy rápido antes de que el autoguardado (2s debounce) terminara.

**Solución:** Esperar a que el sistema guarde automáticamente o mostrar mensaje al usuario: "Guardando cambios, espera un momento..."

### Problema: Validación pasa pero datos no están en BD

**Causa:** El método `isReadyToContinue()` no verifica correctamente `hasPendingChanges()`.

**Solución:** Revisar la lógica de `hasPendingChanges()` en `info-traveler-form.component.ts`.

---

## 📚 Documentación Relacionada

- `info-travelers/README_USO_VALIDACION.md` - Uso detallado del método de validación
- `info-traveler-form/README_VALIDACION_CHECKOUT.md` - Validación a nivel de formulario individual
- `info-traveler-form/README_GUARDADO_AUTONOMO.md` - Sistema de guardado automático

---

## 🚀 Resumen

**El checkout valida automáticamente los viajeros antes de continuar al pago:**

```typescript
const allReady = this.infoTravelers.canContinueToNextStep();

if (allReady) {
  // ✅ Continuar a Pago
} else {
  // ❌ Mostrar error y quedarse en Viajeros
  this.infoTravelers.showValidationError();
}
```

**El usuario solo puede continuar si:**
- ✅ Todos los campos obligatorios están completos
- ✅ Todos los campos obligatorios son válidos
- ✅ No hay cambios pendientes (todo guardado en BD)

**¡Listo!** 🎉

