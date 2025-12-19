# 📋 Validación para el Botón "Continuar" del Checkout

Este documento explica cómo usar el método `isReadyToContinue()` para validar si un viajero está listo antes de permitir continuar al siguiente paso del checkout.

---

## 🎯 Propósito

El método `isReadyToContinue()` permite al componente padre (checkout) verificar si un viajero cumple **todos los requisitos** para continuar:

1. ✅ **Todos los campos obligatorios** están completos y son válidos
2. ✅ **No hay cambios pendientes** (todo está guardado en la base de datos)

---

## 📖 Método Público

### `isReadyToContinue(): boolean`

**Descripción:**
Verifica si el viajero está listo para continuar al siguiente paso del checkout.

**Retorna:**
- `true` → El viajero está listo (campos obligatorios completos, válidos y guardados)
- `false` → El viajero NO está listo (campos inválidos, incompletos o hay cambios sin guardar)

**Signature:**
```typescript
isReadyToContinue(): boolean
```

---

## 🔍 Validaciones que Realiza

### 1. Verifica que el Viajero Esté Cargado

```typescript
if (!this.traveler) {
  return false;
}
```

### 2. Verifica que No Haya Cambios Pendientes

```typescript
if (this.hasPendingChanges()) {
  return false;
}
```

**¿Por qué?** Para garantizar que todos los datos están guardados en la BD antes de continuar.

### 3. Verifica Todos los Campos Obligatorios

Para cada campo obligatorio del viajero, verifica:

| Validación | Descripción | Ejemplo |
|------------|-------------|---------|
| **Control existe** | El FormControl está presente | `name_123` existe en el form |
| **Control válido** | Pasa todas las validaciones (email, pattern, required, etc.) | Email: `user@example.com` ✅ |
| **Control con valor** | No está vacío | Nombre: `"Jaime"` ✅ |

**Si algún campo obligatorio falla, retorna `false`.**

---

## 💻 Uso en el Componente Padre

### Ejemplo 1: Validar al Hacer Click en "Continuar"

```typescript
// info-travelers.component.ts (componente padre)

import { Component, ViewChildren, QueryList } from '@angular/core';
import { InfoTravelerFormComponent } from './components/info-traveler-form/info-traveler-form.component';

@Component({
  selector: 'app-info-travelers',
  templateUrl: './info-travelers.component.html'
})
export class InfoTravelersComponent {
  
  // Obtener referencias a todos los formularios de viajeros
  @ViewChildren(InfoTravelerFormComponent) 
  travelerForms!: QueryList<InfoTravelerFormComponent>;

  /**
   * Validar si todos los viajeros están listos para continuar
   */
  canContinueToNextStep(): boolean {
    // Verificar que haya formularios
    if (!this.travelerForms || this.travelerForms.length === 0) {
      return false;
    }

    // Verificar que TODOS los viajeros estén listos
    const allReady = this.travelerForms.toArray().every(form => {
      const isReady = form.isReadyToContinue();
      return isReady;
    });

    if (allReady) {
    } else {
    }

    return allReady;
  }

  /**
   * Click en el botón "Continuar"
   */
  onContinueClick(): void {
    if (this.canContinueToNextStep()) {
      // ✅ Continuar al siguiente paso
      this.router.navigate(['/checkout/payment']);
    } else {
      // ❌ Mostrar mensaje de error
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Por favor, completa todos los campos obligatorios de los viajeros antes de continuar.',
        life: 5000
      });
    }
  }
}
```

### Ejemplo 2: Habilitar/Deshabilitar Botón "Continuar"

```typescript
// info-travelers.component.html

<div class="checkout-actions">
  <button
    pButton
    type="button"
    label="Continuar"
    icon="pi pi-arrow-right"
    [disabled]="!canContinueToNextStep()"
    (click)="onContinueClick()"
    class="p-button-success">
  </button>
  
  <p *ngIf="!canContinueToNextStep()" class="warning-message">
    <i class="pi pi-exclamation-circle"></i>
    Por favor, completa todos los campos obligatorios de los viajeros.
  </p>
</div>
```

### Ejemplo 3: Validar Viajero Específico

```typescript
// info-travelers.component.ts

/**
 * Validar un viajero específico por su ID
 */
checkSpecificTraveler(travelerId: number): boolean {
  const travelerForm = this.travelerForms
    .toArray()
    .find(form => form.travelerId === travelerId);

  if (!travelerForm) {
    return false;
  }

  return travelerForm.isReadyToContinue();
}
```

---

## 📊 Casos de Uso y Resultados

### Caso 1: Todos los Campos Obligatorios Completos y Guardados ✅

```
Usuario: Lead Traveler (ID: 123)
Campos obligatorios:
  - Nombre: "Jaime" ✅ (válido, guardado)
  - Apellido: "Iserte" ✅ (válido, guardado)
  - Email: "jiserte@differentroads.es" ✅ (válido, guardado)
  - Sexo: "M" ✅ (válido, guardado)

Resultado: isReadyToContinue() → true ✅
Log: [isReadyToContinue] ✅ Viajero listo para continuar
```

### Caso 2: Campo Obligatorio Inválido ❌

```
Usuario: Lead Traveler (ID: 123)
Campos obligatorios:
  - Nombre: "Jaime" ✅
  - Apellido: "Iserte" ✅
  - Email: "email@" ❌ (INVÁLIDO)
  - Sexo: "M" ✅

Resultado: isReadyToContinue() → false ❌
Log: [isReadyToContinue] ❌ Campos obligatorios inválidos: ["email (email inválido)"]
```

### Caso 3: Campo Obligatorio Vacío ❌

```
Usuario: Adult (ID: 124)
Campos obligatorios:
  - Nombre: "María" ✅
  - Apellido: "" ❌ (VACÍO)
  - Sexo: "F" ✅

Resultado: isReadyToContinue() → false ❌
Log: [isReadyToContinue] ❌ Campos obligatorios faltantes: ["surname (vacío)"]
```

### Caso 4: Cambios Pendientes Sin Guardar ❌

```
Usuario: Lead Traveler (ID: 123)
Campos obligatorios: Todos completos y válidos ✅
Pero:
  - Usuario acaba de escribir "Nuevo apellido"
  - Cambio aún no se guardó automáticamente (debounce de 2s)

Resultado: isReadyToContinue() → false ❌
Log: [isReadyToContinue] ❌ Hay cambios pendientes sin guardar
```

**Solución:** Esperar 2 segundos a que el autoguardado se ejecute, o llamar al método después de asegurar que todo esté guardado.

---

## 🔧 Logs de Debugging

El método incluye logs detallados para facilitar el debugging:

### Log: Viajero Listo ✅

```
[isReadyToContinue] ✅ Viajero listo para continuar
```

### Log: Sin Viajero Cargado ❌

```
[isReadyToContinue] ❌ No hay viajero cargado
```

### Log: Cambios Pendientes ❌

```
[isReadyToContinue] ❌ Hay cambios pendientes sin guardar
```

### Log: Campos Obligatorios Inválidos ❌

```
[isReadyToContinue] ❌ Campos obligatorios inválidos: 
  [
    "email (email inválido)",
    "phone (patrón inválido)",
    "birthdate (valor mínimo no alcanzado)"
  ]
```

### Log: Campos Obligatorios Faltantes ❌

```
[isReadyToContinue] ❌ Campos obligatorios faltantes:
  [
    "surname (vacío)",
    "nationality (vacío)"
  ]
```

---

## ⚡ Consideraciones de Performance

### Cuándo Llamar al Método

| Momento | ¿Llamar? | Razón |
|---------|----------|-------|
| Al hacer click en "Continuar" | ✅ **Sí** | Validación puntual antes de avanzar |
| En cada `valueChanges` del form | ❌ **No** | Muy costoso, muchas llamadas |
| En un getter del template | ⚠️ **Cuidado** | Se ejecuta en cada change detection |
| Con botón `[disabled]` binding | ⚠️ **Cuidado** | Evaluar si la performance es aceptable |

### Recomendación

**Opción 1 (Recomendada):** Validar solo al hacer click

```typescript
onContinueClick(): void {
  if (this.canContinueToNextStep()) {
    // Continuar
  } else {
    // Mostrar error
  }
}
```

**Opción 2:** Cachear el resultado y actualizar solo cuando sea necesario

```typescript
export class InfoTravelersComponent {
  private _allTravelersReady: boolean = false;

  updateValidationStatus(): void {
    this._allTravelersReady = this.travelerForms
      .toArray()
      .every(form => form.isReadyToContinue());
  }

  get allTravelersReady(): boolean {
    return this._allTravelersReady;
  }

  // Llamar después de cada guardado automático
  onTravelerDataUpdated(): void {
    this.updateValidationStatus();
  }
}
```

---

## 🎯 Flujo Completo de Validación

```
Usuario hace click en "Continuar"
         ↓
canContinueToNextStep()
         ↓
Para cada formulario de viajero:
  form.isReadyToContinue()
         ↓
  ¿Viajero cargado?
    ❌ No → return false
    ✅ Sí → Continuar
         ↓
  ¿Hay cambios pendientes?
    ✅ Sí → return false
    ❌ No → Continuar
         ↓
  Para cada campo obligatorio:
    ¿Control existe?
      ❌ No → return false
      ✅ Sí → Continuar
         ↓
    ¿Control válido?
      ❌ No → return false
      ✅ Sí → Continuar
         ↓
    ¿Control con valor?
      ❌ No → return false
      ✅ Sí → Continuar
         ↓
  return true (viajero OK)
         ↓
¿Todos los viajeros retornaron true?
  ✅ Sí → Continuar al siguiente paso
  ❌ No → Mostrar mensaje de error
```

---

## 📋 Checklist para el Componente Padre

Al implementar la validación en el componente padre, verifica:

- [ ] Obtener referencias a los formularios con `@ViewChildren(InfoTravelerFormComponent)`
- [ ] Iterar sobre todos los viajeros con `.every()` o `.some()`
- [ ] Llamar a `form.isReadyToContinue()` para cada viajero
- [ ] Manejar el caso de arrays vacíos (sin viajeros)
- [ ] Mostrar mensaje de error si la validación falla
- [ ] Logs de debugging para troubleshooting
- [ ] Considerar performance si se usa en bindings de template

---

## ✅ Ventajas de Este Enfoque

1. ✅ **Simple**: Un solo método que el padre llama directamente
2. ✅ **Síncrono**: No requiere eventos ni subscripciones
3. ✅ **Validación Completa**: Verifica campos obligatorios Y estado de guardado
4. ✅ **Logs Detallados**: Facilita el debugging
5. ✅ **Type-Safe**: TypeScript verifica el tipo de retorno
6. ✅ **Flexible**: El padre decide cuándo llamar al método
7. ✅ **Performance**: Solo se ejecuta cuando se necesita

---

## 🚀 Resumen

**Para validar si puedes continuar al siguiente paso:**

```typescript
// En el componente padre
const allTravelersReady = this.travelerForms
  .toArray()
  .every(form => form.isReadyToContinue());

if (allTravelersReady) {
  // ✅ Continuar
} else {
  // ❌ Mostrar error
}
```

**Eso es todo!** 🎉

