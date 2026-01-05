# Validaciones del Componente Info-Travelers

## Descripción

El componente `InfoTravelersComponent` ahora incluye validaciones completas para todos los campos del formulario de viajeros. Las validaciones se aplican en tiempo real y previenen que el usuario avance si no se completan los campos obligatorios correctamente.

## ✅ SOLUCIÓN IMPLEMENTADA

### Validación con Toast Informativo

El componente ahora **BLOQUEA** el avance al paso 4 (pago) si los campos obligatorios no están completados:

1. **Validación Automática**: Cuando se hace clic en "Continuar" en el paso 3, se ejecuta automáticamente `validateFormAndShowToast()`
2. **Toast Informativo**: Si hay campos faltantes, se muestra un toast con la lista específica de campos obligatorios que faltan
3. **Bloqueo de Avance**: El formulario NO permite continuar al paso 4 hasta que todos los campos obligatorios estén completados

### Flujo de Validación

```typescript
// En checkout-v2.component.ts
private async saveTravelersData(): Promise<boolean> {
  if (!this.infoTravelers) {
    return true;
  }

  try {
    // PRIMERO: Validar campos obligatorios
    if (!this.infoTravelers.validateFormAndShowToast()) {
      return false; // BLOQUEA el avance
    }

    // SEGUNDO: Si pasa la validación, guardar datos
    await this.infoTravelers.saveAllTravelersData();
    return true;
  } catch (error) {
    return false;
  }
}
```

### Debugging Implementado

Se han agregado logs detallados para verificar el funcionamiento:

```typescript
// En checkout-v2.component.ts

// En info-travelers.component.ts
```

## Validaciones Implementadas

### 1. Validación de Email
- **Patrón**: Utiliza `Validators.email` de Angular
- **Mensaje de error**: "Ingresa un correo electrónico válido"
- **Campo obligatorio**: Sí

### 2. Validación de Teléfono
- **Patrón**: `/^(\+\d{1,3})?\s?\d{6,14}$/`
- **Formato aceptado**: 
  - Números de 6-14 dígitos
  - Puede incluir código de país (+34, +57, etc.)
  - Espacios opcionales
- **Mensaje de error**: "Ingresa un número de teléfono válido. Puede incluir código de país"
- **Campo obligatorio**: Según configuración

### 3. Validación de Fechas
- **Validador personalizado**: `dateValidator()`
- **Formatos aceptados**:
  - dd/mm/yyyy
  - YYYY-MM-DD (ISO)
  - Objeto Date de JavaScript
- **Mensaje de error**: "Fecha inválida"
- **Campo obligatorio**: Según configuración

### 4. Validación de Campos de Texto
- **Mínimo**: 2 caracteres
- **Máximo**: 100 caracteres
- **Mensajes de error**: Personalizados con longitudes específicas

### 5. Validación de Campos Numéricos
- **Mínimo**: 0
- **Máximo**: 999999
- **Mensajes de error**: Personalizados con valores específicos

### 6. Validación de Sexo
- **Patrón**: `/^[MF]$/`
- **Valores aceptados**: M (Masculino), F (Femenino)
- **Mensaje de error**: "Debe seleccionar un sexo"

### 7. Validación de País
- **Patrón**: `/^[A-Z]{2}$/`
- **Formato**: Código de país de 2 letras (ES, CO, etc.)
- **Mensaje de error**: "Debe seleccionar un país"

### 8. Validación de Campos Obligatorios
- **Validación**: `Validators.required`
- **Mensaje de error**: "Este campo es obligatorio"
- **Aplicación**: Solo a campos marcados como obligatorios según la configuración

## 🆕 Funcionalidades Implementadas

### Toast Informativo Automático
- **Método**: `showMissingFieldsToast()`
- **Descripción**: Muestra un toast con la lista de campos faltantes
- **Uso**: Se ejecuta automáticamente cuando se intenta avanzar sin completar campos obligatorios
- **Ejemplo de mensaje**: "Por favor completa los siguientes campos obligatorios: Nombre (Viajero 1), Email (Viajero 1)"

### Validación Mejorada
- **Método**: `validateFormAndShowToast()`
- **Descripción**: Valida el formulario y muestra toast si hay errores
- **Retorna**: `boolean` - true si es válido, false si hay errores
- **Bloquea**: El avance al siguiente paso si hay campos faltantes

### Debugging
- **Método**: `logFieldTypesForDebugging()`
- **Descripción**: Muestra en consola información sobre tipos de campos
- **Uso**: Se ejecuta automáticamente al cargar los datos

## Uso del Componente

### En el Template Padre

```html
<app-info-travelers
  [departureId]="departureId"
  [reservationId]="reservationId"
  [itineraryId]="itineraryId"
  (activitiesAssignmentChange)="onActivitiesChange($event)"
  (formValidityChange)="onFormValidityChange($event)">
</app-info-travelers>
```

### En el Componente Padre

```typescript
export class CheckoutV2Component {
  @ViewChild(InfoTravelersComponent) infoTravelers!: InfoTravelersComponent;
  isFormValid: boolean = false;

  onFormValidityChange(isValid: boolean): void {
    this.isFormValid = isValid;
  }

  // El método saveTravelersData ya incluye la validación automática
  private async saveTravelersData(): Promise<boolean> {
    if (!this.infoTravelers) {
      return true;
    }

    try {
      // Validación automática con toast
      if (!this.infoTravelers.validateFormAndShowToast()) {
        return false; // BLOQUEA el avance
      }

      await this.infoTravelers.saveAllTravelersData();
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

## Métodos Públicos Disponibles

### 1. `isFormValid(): boolean`
Verifica si todos los formularios de viajeros son válidos.

### 2. `areAllMandatoryFieldsCompleted(): boolean`
Verifica si todos los campos obligatorios están completados.

### 3. `getMissingFieldsList(): string[]`
Retorna una lista de campos faltantes con el formato "Campo (Viajero X)".

### 4. `markAllFieldsAsTouched(): void`
Marca todos los campos como touched para mostrar errores.

### 5. `hasFieldError(travelerId: number, fieldCode: string): boolean`
Verifica si un campo específico tiene errores.

### 6. `getFieldErrors(travelerId: number, fieldCode: string): any`
Obtiene los errores de un campo específico.

### 7. `getErrorMessage(fieldCode: string, errors: any): string`
Obtiene el mensaje de error formateado para un campo.

### 🆕 8. `showMissingFieldsToast(): void`
Muestra un toast informativo con la lista de campos faltantes.

### 🆕 9. `validateFormAndShowToast(): boolean`
Valida el formulario y muestra toast si hay errores. Retorna true si es válido.

### 🆕 10. `getValidationDebugInfo(): any`
Obtiene información detallada de validación para debugging.

### 🆕 11. `logFieldTypesForDebugging(): void`
Muestra en consola información sobre tipos de campos disponibles.

### 🆕 12. `testToast(): void`
Método de prueba para verificar que el toast funciona correctamente.

## Eventos Emitidos

### `formValidityChange: EventEmitter<boolean>`
Se emite cada vez que cambia la validez del formulario completo.

### `activitiesAssignmentChange: EventEmitter<{...}>`
Se emite cuando cambia la asignación de actividades (existente).

## Ejemplo de Implementación Completa

```typescript
export class CheckoutV2Component {
  @ViewChild(InfoTravelersComponent) infoTravelers!: InfoTravelersComponent;
  
  isFormValid: boolean = false;
  missingFields: string[] = [];

  onFormValidityChange(isValid: boolean): void {
    this.isFormValid = isValid;
    if (!isValid) {
      this.missingFields = this.infoTravelers.getMissingFieldsList();
    }
  }

  // La validación se ejecuta automáticamente en saveTravelersData
  // No necesitas hacer nada más aquí
}
```

## Estilos CSS

Los errores se muestran con las clases de PrimeNG:
- `.p-invalid`: Se aplica a campos con errores
- `.p-error`: Se aplica a los mensajes de error

```scss
.p-invalid {
  border-color: #f44336 !important;
}

.p-error {
  color: #f44336;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
```

## Toast Configuration

El componente incluye un toast configurado en la posición `top-right`:

```html
<p-toast position="top-right"></p-toast>
```

Los toasts se muestran automáticamente cuando:
- Se intenta avanzar sin completar campos obligatorios
- Se llama al método `showMissingFieldsToast()`

## Notas Importantes

1. **Validación en tiempo real**: Los errores se muestran automáticamente cuando el usuario interactúa con los campos.

2. **Campos obligatorios dinámicos**: Los campos se marcan como obligatorios según la configuración de la API.

3. **Validación de fechas**: Soporta múltiples formatos de fecha y valida que sean fechas válidas.

4. **Mensajes personalizados**: Los mensajes de error están en español y son específicos para cada tipo de validación.

5. **Compatibilidad**: Las validaciones son compatibles con el patrón de validación usado en otros componentes del proyecto.

6. **Toast automático**: Se muestra automáticamente un toast informativo cuando faltan campos obligatorios.

7. **Debugging**: Incluye métodos para debugging y logging de tipos de campos.

8. **BLOQUEO DE AVANCE**: El componente padre ahora bloquea el avance al paso 4 si hay campos obligatorios faltantes.

## Console Logs para Debugging

El componente automáticamente muestra en consola información detallada sobre el proceso de validación:

```
=== DEBUG: performStepValidation iniciado para targetStep: 3
Validando paso 3 (info-travelers)...
=== DEBUG: saveTravelersData iniciado ===
Validando campos obligatorios...
=== DEBUG: validateFormAndShowToast iniciado ===
Formulario válido: false
Formulario NO válido, marcando campos como touched...
Mostrando toast de campos faltantes...
=== DEBUG: showMissingFieldsToast iniciado ===
Campos faltantes: ["Nombre (Viajero 1)", "Email (Viajero 1)"]
Mensaje del toast: Por favor completa los siguientes campos obligatorios: Nombre (Viajero 1), Email (Viajero 1)
Toast agregado al MessageService
=== DEBUG: showMissingFieldsToast terminado ===
=== DEBUG: validateFormAndShowToast terminado ===
Resultado de saveTravelersData: false
Validación falló, NO continuando al siguiente paso
```

Esto ayuda a identificar exactamente dónde falla el proceso de validación y por qué no se avanza al siguiente paso.

## Cómo Probar

1. **Ve al paso 3** (Viajeros)
2. **Deja algunos campos obligatorios vacíos** (como Nombre, Email, etc.)
3. **Haz clic en "Continuar"**
4. **Deberías ver**:
   - Un toast con la lista de campos faltantes
   - Los campos vacíos marcados en rojo con mensajes de error
   - El formulario NO avanza al paso 4
5. **Completa todos los campos obligatorios**
6. **Haz clic en "Continuar" nuevamente**
7. **Ahora debería avanzar** al paso 4 sin problemas

## Troubleshooting

Si el botón "Continuar" no está validando:

1. **Verifica la consola del navegador** para ver los logs de debugging
2. **Asegúrate de que el componente `infoTravelers` esté cargado** correctamente
3. **Verifica que el `MessageService` esté inyectado** en ambos componentes
4. **Confirma que el toast esté configurado** en ambos templates

Los logs de debugging te ayudarán a identificar exactamente dónde está el problema.

## 🆕 Solución para Campos de Teléfono

### Problema Identificado
El usuario reportó que los campos de teléfono permitían caracteres de letras a pesar de ser campos "numéricos". Esto se debía a que:

1. **Los campos de teléfono usaban `pInputText`** (que renderiza como `type="text"`)
2. **No había filtrado de entrada** para prevenir caracteres no numéricos
3. **La validación solo ocurría después del input**, no durante

### Solución Implementada

#### 1. Nuevo Tipo de Campo Específico
Se agregó manejo específico para `fieldType === 'phone'` en el template HTML:

```html
<div class="form-column form-field half-width" *ngIf="fieldDetails.fieldType === 'phone'">
  <label>{{ fieldDetails.name }}*</label>
  <input 
    pInputText 
    type="tel" 
    [formControlName]="fieldDetails.code + '_' + traveler.id"
    [placeholder]="'Introduce tu ' + fieldDetails.name.toLowerCase()"
    [ngClass]="{ 'p-invalid': hasFieldError(traveler.id, fieldDetails.code) }"
    (input)="onPhoneFieldChange(traveler.id, fieldDetails.code, $event)" />
  <small *ngIf="hasFieldError(traveler.id, fieldDetails.code)" class="p-error">
    {{ getErrorMessage(fieldDetails.code, getFieldErrors(traveler.id, fieldDetails.code)) }}
  </small>
</div>
```

#### 2. Método de Filtrado en Tiempo Real
Se implementó `onPhoneFieldChange()` que filtra caracteres no permitidos:

```typescript
onPhoneFieldChange(travelerId: number, fieldCode: string, event: any): void {
  const input = event.target as HTMLInputElement;
  // Filtrar solo números, +, espacios y guiones
  const filteredValue = input.value.replace(/[^\d+\s-]/g, '');
  input.value = filteredValue;
  
  // Actualizar el control del formulario
  const controlName = `${fieldCode}_${travelerId}`;
  const control = this.travelerForms.controls
    .find((form) => form instanceof FormGroup && form.get(controlName))
    ?.get(controlName);

  if (control) {
    control.setValue(filteredValue);
    control.markAsDirty();
    control.markAsTouched();
    this.emitFormValidity();
  }
}
```

#### 3. Caracteres Permitidos
- **Números**: 0-9
- **Símbolo +**: Para códigos de país
- **Espacios**: Para separación
- **Guiones**: Para separación opcional

#### 4. Método de Debugging
Se agregó `debugPhoneFieldTypes()` para verificar qué campos son de tipo teléfono:

```typescript
debugPhoneFieldTypes(): void {
  this.departureReservationFields.forEach((field) => {
    const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
    if (fieldDetails && fieldDetails.code.toLowerCase().includes('phone')) {
    }
  });
}
```

### Resultado
- **Los campos de teléfono ahora filtran automáticamente** caracteres no numéricos
- **Se usa `type="tel"`** para mejor experiencia en móviles
- **La validación funciona en tiempo real** durante la entrada
- **Se mantiene la validación de patrón** para formato correcto

### Cómo Probar
1. **Ve a un campo de teléfono** en el formulario de viajeros
2. **Intenta escribir letras** - deberían ser filtradas automáticamente
3. **Escribe un número válido** como "+34 123 456 789"
4. **Verifica que solo se permitan** números, +, espacios y guiones

