# 📖 Uso de la Validación en Info-Travelers

Este documento explica cómo usar los métodos de validación implementados en `InfoTravelersComponent` para verificar si se puede continuar al siguiente paso del checkout.

---

## 🎯 Métodos Disponibles

### 1. `canContinueToNextStep(): boolean`

**Descripción:**
Valida si TODOS los viajeros están listos para continuar al siguiente paso del checkout.

**Retorna:**
- `true` → Todos los viajeros están listos (campos obligatorios completos, válidos y guardados)
- `false` → Algunos viajeros NO están listos

**Uso:**
```typescript
if (this.infoTravelersComponent.canContinueToNextStep()) {
  // ✅ Continuar al siguiente paso
  this.router.navigate(['/checkout/payment']);
} else {
  // ❌ Mostrar error
  this.infoTravelersComponent.showValidationError();
}
```

---

### 2. `getNotReadyTravelers(): { travelerNumber: number; travelerId: number }[]`

**Descripción:**
Obtiene información detallada sobre los viajeros que NO están listos.

**Retorna:**
Array con objetos que contienen:
- `travelerNumber`: Número del viajero (1, 2, 3...)
- `travelerId`: ID del viajero en la base de datos

**Uso:**
```typescript
const notReady = this.infoTravelersComponent.getNotReadyTravelers();
console.log('Viajeros no listos:', notReady);
// Resultado: [{ travelerNumber: 1, travelerId: 123 }, { travelerNumber: 3, travelerId: 125 }]
```

---

### 3. `showValidationError(): void`

**Descripción:**
Muestra un mensaje de error (toast) indicando qué viajeros faltan por completar.

**Mensajes:**
- 1 viajero: "El Pasajero 1 tiene campos obligatorios incompletos o cambios sin guardar."
- Múltiples: "Los Pasajeros 1, 3 tienen campos obligatorios incompletos o cambios sin guardar."
- Todos: "Por favor, completa todos los campos obligatorios de los viajeros antes de continuar."

**Uso:**
```typescript
if (!this.infoTravelersComponent.canContinueToNextStep()) {
  this.infoTravelersComponent.showValidationError();
}
```

---

## 💻 Ejemplos de Uso desde el Componente Padre

### Ejemplo 1: Validar desde el Componente de Checkout Principal

```typescript
// checkout-v2.component.ts

import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { InfoTravelersComponent } from './components/info-travelers/info-travelers.component';

@Component({
  selector: 'app-checkout-v2',
  templateUrl: './checkout-v2.component.html'
})
export class CheckoutV2Component {
  
  @ViewChild(InfoTravelersComponent)
  infoTravelersComponent!: InfoTravelersComponent;

  constructor(private router: Router) {}

  /**
   * Click en el botón "Continuar" del checkout
   */
  onContinueClick(): void {
    console.log('=== Validando viajeros antes de continuar ===');

    // Verificar que todos los viajeros estén listos
    if (this.infoTravelersComponent.canContinueToNextStep()) {
      // ✅ Todos los viajeros están listos, continuar
      console.log('✅ Validación exitosa, continuando al siguiente paso');
      this.router.navigate(['/checkout/payment']);
    } else {
      // ❌ Algunos viajeros no están listos, mostrar error
      console.log('❌ Validación fallida, mostrando error');
      this.infoTravelersComponent.showValidationError();
    }
  }
}
```

```html
<!-- checkout-v2.component.html -->

<div class="checkout-container">
  <!-- Componente de viajeros -->
  <app-info-travelers
    [departureId]="departureId"
    [reservationId]="reservationId"
    [itineraryId]="itineraryId">
  </app-info-travelers>

  <!-- Botón de continuar -->
  <div class="checkout-actions">
    <button
      pButton
      type="button"
      label="Continuar al Pago"
      icon="pi pi-arrow-right"
      (click)="onContinueClick()"
      class="p-button-success">
    </button>
  </div>
</div>
```

---

### Ejemplo 2: Validar con Mensaje Personalizado

```typescript
// checkout-v2.component.ts

onContinueClick(): void {
  if (!this.infoTravelersComponent.canContinueToNextStep()) {
    // Obtener viajeros no listos
    const notReady = this.infoTravelersComponent.getNotReadyTravelers();
    
    // Crear mensaje personalizado
    let message = 'Completa los datos de: ';
    const travelerNames = notReady.map(t => `Pasajero ${t.travelerNumber}`).join(', ');
    message += travelerNames;

    // Mostrar mensaje personalizado
    this.messageService.add({
      severity: 'error',
      summary: 'Datos Incompletos',
      detail: message,
      life: 5000
    });

    // Scroll al primer viajero no listo
    this.scrollToTraveler(notReady[0].travelerNumber);
    
    return;
  }

  // Continuar
  this.router.navigate(['/checkout/payment']);
}

private scrollToTraveler(travelerNumber: number): void {
  const element = document.getElementById(`traveler-${travelerNumber}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
```

---

### Ejemplo 3: Habilitar/Deshabilitar Botón en Tiempo Real

```typescript
// checkout-v2.component.ts

export class CheckoutV2Component implements AfterViewInit {
  
  @ViewChild(InfoTravelersComponent)
  infoTravelersComponent!: InfoTravelersComponent;

  canContinue: boolean = false;

  ngAfterViewInit(): void {
    // Suscribirse a cambios en los datos de viajeros
    this.infoTravelersComponent.dataUpdated
      .subscribe(() => {
        // Esperar un tick para que el autoguardado termine
        setTimeout(() => {
          this.canContinue = this.infoTravelersComponent.canContinueToNextStep();
          console.log(`[canContinue] actualizado: ${this.canContinue}`);
        }, 2500); // 2.5s para dar tiempo al debounce (2s) + guardado
      });
  }
}
```

```html
<!-- checkout-v2.component.html -->

<button
  pButton
  type="button"
  label="Continuar al Pago"
  icon="pi pi-arrow-right"
  [disabled]="!canContinue"
  (click)="onContinueClick()"
  class="p-button-success">
</button>

<p *ngIf="!canContinue" class="warning-message">
  <i class="pi pi-exclamation-circle"></i>
  Por favor, completa todos los campos obligatorios de los viajeros.
</p>
```

---

### Ejemplo 4: Validar Antes de Guardar la Reserva

```typescript
// checkout-v2.component.ts

async saveReservation(): Promise<void> {
  // 1. Validar que todos los viajeros estén listos
  if (!this.infoTravelersComponent.canContinueToNextStep()) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Completa los datos de los viajeros antes de guardar la reserva.',
      life: 5000
    });
    return;
  }

  // 2. Mostrar loading
  this.savingReservation = true;

  try {
    // 3. Guardar reserva
    await this.reservationService.save(this.reservationId);

    // 4. Éxito
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Reserva guardada correctamente',
      life: 3000
    });

    // 5. Continuar al siguiente paso
    this.router.navigate(['/checkout/payment']);
  } catch (error) {
    console.error('Error al guardar reserva:', error);
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo guardar la reserva',
      life: 5000
    });
  } finally {
    this.savingReservation = false;
  }
}
```

---

## 📊 Logs de Debugging

Al llamar a `canContinueToNextStep()`, verás logs detallados en la consola:

### Caso: Todos los Viajeros Listos ✅

```
=== canContinueToNextStep() INICIADO ===
[canContinueToNextStep] Verificando 3 viajero(s)...
[canContinueToNextStep] ✅ Viajero 1 (ID: 123): LISTO
[canContinueToNextStep] ✅ Viajero 2 (ID: 124): LISTO
[canContinueToNextStep] ✅ Viajero 3 (ID: 125): LISTO
[canContinueToNextStep] ✅ TODOS los viajeros están listos para continuar
```

### Caso: Algunos Viajeros NO Listos ❌

```
=== canContinueToNextStep() INICIADO ===
[canContinueToNextStep] Verificando 3 viajero(s)...
[canContinueToNextStep] ✅ Viajero 1 (ID: 123): LISTO
[canContinueToNextStep] ❌ Viajero 2 (ID: 124): NO LISTO
[canContinueToNextStep] ❌ Viajero 3 (ID: 125): NO LISTO
[canContinueToNextStep] ❌ ALGUNOS viajeros no están listos
```

### Logs Detallados de Cada Viajero

Cada viajero que NO esté listo mostrará logs adicionales desde `isReadyToContinue()`:

```
[isReadyToContinue] ❌ Campos obligatorios inválidos: ["email (email inválido)", "phone (patrón inválido)"]
```

o

```
[isReadyToContinue] ❌ Campos obligatorios faltantes: ["surname (vacío)", "birthdate (vacío)"]
```

o

```
[isReadyToContinue] ❌ Hay cambios pendientes sin guardar
```

---

## 🎯 Flujo Completo de Validación

```
Usuario hace click en "Continuar al Pago"
         ↓
checkoutComponent.onContinueClick()
         ↓
infoTravelersComponent.canContinueToNextStep()
         ↓
¿Hay formularios de viajeros cargados?
  ❌ No → return false
  ✅ Sí → Continuar
         ↓
Para cada formulario de viajero:
  form.isReadyToContinue()
         ↓
  ¿Viajero listo?
    ❌ No → Log "Viajero X: NO LISTO"
    ✅ Sí → Log "Viajero X: LISTO"
         ↓
¿TODOS los viajeros están listos?
  ✅ Sí → 
    Log "TODOS los viajeros están listos"
    return true
    → Continuar al siguiente paso
  ❌ No → 
    Log "ALGUNOS viajeros no están listos"
    return false
    → showValidationError()
    → Toast con mensaje de error
```

---

## ⚠️ Consideraciones Importantes

### 1. Timing del Guardado Automático

El guardado automático tiene un **debounce de 2 segundos**. Si el usuario hace click en "Continuar" justo después de escribir:

```typescript
// ❌ MAL: Validar inmediatamente después de escribir
usuario.escribe("Jaime");
this.canContinueToNextStep(); // ← Puede retornar false (cambios pendientes)

// ✅ BIEN: Esperar al guardado automático
usuario.escribe("Jaime");
setTimeout(() => {
  this.canContinueToNextStep(); // ← Retorna true (ya guardado)
}, 2500); // 2s de debounce + 500ms de margen
```

**Recomendación:** Validar solo al hacer click en "Continuar", no antes.

### 2. Sin Formularios Cargados

Si llamas a `canContinueToNextStep()` antes de que los formularios estén cargados, retornará `false`:

```typescript
ngOnInit(): void {
  // ❌ Demasiado pronto, los formularios aún no están cargados
  this.canContinueToNextStep(); // → false
}

ngAfterViewInit(): void {
  // ✅ Los formularios ya están cargados
  this.canContinueToNextStep(); // → true/false según estado real
}
```

### 3. Performance

El método `canContinueToNextStep()` itera sobre todos los formularios. Evita llamarlo en:

- ❌ `valueChanges` de formularios (muchas ejecuciones)
- ❌ Getters en el template (ejecuta en cada change detection)
- ✅ Click en botón "Continuar" (una sola vez)
- ✅ Después de eventos específicos (`dataUpdated`)

---

## 📋 Checklist para Implementación

Al integrar la validación en tu componente padre, verifica:

- [ ] Importar `ViewChild` de `@angular/core`
- [ ] Obtener referencia con `@ViewChild(InfoTravelersComponent)`
- [ ] Llamar a `canContinueToNextStep()` en el método de continuar
- [ ] Llamar a `showValidationError()` si la validación falla
- [ ] Logs de debugging en consola para troubleshooting
- [ ] Manejo de caso sin formularios cargados
- [ ] Considerar timing del guardado automático (2s debounce)
- [ ] Tests unitarios para los nuevos métodos

---

## ✅ Resumen

**Para validar y continuar:**

```typescript
// En el componente de checkout
@ViewChild(InfoTravelersComponent)
infoTravelersComponent!: InfoTravelersComponent;

onContinueClick(): void {
  if (this.infoTravelersComponent.canContinueToNextStep()) {
    // ✅ Continuar
    this.router.navigate(['/checkout/payment']);
  } else {
    // ❌ Mostrar error
    this.infoTravelersComponent.showValidationError();
  }
}
```

**¡Eso es todo!** 🚀

El sistema validará automáticamente:
1. ✅ Todos los campos obligatorios completos
2. ✅ Todos los campos obligatorios válidos
3. ✅ No hay cambios pendientes (todo guardado en BD)

