import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, ValidationErrors, AbstractControl } from '@angular/forms';
import { IReservationFieldResponse } from '../../../../../../core/services/reservation/reservation-field.service';
import { IPhonePrefixResponse } from '../../../../../../core/services/masterdata/phone-prefix.service';

@Component({
  selector: 'app-traveler-field',
  standalone: false,
  templateUrl: './traveler-field.component.html',
  styleUrls: ['./traveler-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TravelerFieldComponent implements OnChanges {
  @Input() fieldDetails!: IReservationFieldResponse;
  @Input() travelerId!: number;
  @Input() travelerForm!: FormGroup;
  @Input() isMandatory: boolean = false;
  @Input() sexOptions: Array<{ label: string; value: string }> = [];
  @Input() countryOptions: Array<{ name: string; code: string; value: string }> = [];
  @Input() phonePrefixOptions: IPhonePrefixResponse[] = [];
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;

  @Output() fieldChange = new EventEmitter<string>();
  @Output() phoneFieldChange = new EventEmitter<{ fieldCode: string; event: Event }>();
  @Output() dateFieldChange = new EventEmitter<{ fieldCode: string; value: Date }>();
  @Output() dateFieldBlur = new EventEmitter<string>();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    // No necesitamos hacer nada aquí - el getter prefixControl obtendrá el control directamente
  }

  get controlName(): string {
    return `${this.fieldDetails.code}_${this.travelerId}`;
  }

  get control() {
    return this.travelerForm?.get(this.controlName) || null;
  }

  get prefixControl(): AbstractControl | null {
    // Obtener el control directamente del formulario sin cache
    // Esto evita problemas de sincronización cuando el formulario se recrea
    if (this.fieldDetails?.code === 'phone' && this.travelerForm && this.travelerId) {
      return this.travelerForm.get(`phonePrefix_${this.travelerId}`) || null;
    }
    return null;
  }

  get fieldValue(): string | Date | null {
    return this.control?.value || null;
  }

  get hasError(): boolean {
    return this.control ? this.control.invalid && (this.control.dirty || this.control.touched) : false;
  }

  get errors(): ValidationErrors | null {
    return this.control?.errors || null;
  }

  /**
   * Obtiene los errores del prefijo telefónico
   */
  get prefixErrors(): ValidationErrors | null {
    return this.prefixControl?.errors || null;
  }

  /**
   * Verifica si el prefijo tiene errores
   */
  get hasPrefixError(): boolean {
    return this.prefixControl ? this.prefixControl.invalid && (this.prefixControl.dirty || this.prefixControl.touched) : false;
  }

  get validationState(): 'valid' | 'invalid' | 'empty' | 'untouched' {
    if (!this.control) {
      return 'untouched';
    }

    if (!this.control.touched && !this.control.dirty) {
      return 'untouched';
    }

    if (!this.control.value || this.control.value === '') {
      return 'empty';
    }

    return this.control.valid ? 'valid' : 'invalid';
  }

  get isRequiredEmpty(): boolean {
    return this.isMandatory && !this.fieldValue;
  }

  /**
   * Verifica si el prefijo telefónico es obligatorio (mismo que el teléfono)
   */
  get isPrefixMandatory(): boolean {
    return this.isMandatory; // El prefijo es obligatorio si el teléfono es obligatorio
  }

  get placeholder(): string {
    return `Introduce tu ${this.fieldDetails.name.toLowerCase()}`;
  }

  onFieldInput(): void {
    this.fieldChange.emit(this.fieldDetails.code);
  }

  onPhoneInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement | null;
    if (inputEl) {
      // Limitar a 14 dígitos (sin contar espacios u otros caracteres)
      const digitsOnly = inputEl.value.replace(/\D/g, '').slice(0, 14);
      inputEl.value = digitsOnly;
      // Mantener sincronizado el FormControl con el valor normalizado
      this.control?.setValue(digitsOnly);
    }
    this.phoneFieldChange.emit({ fieldCode: this.fieldDetails.code, event });
  }

  onDateSelect(value: Date): void {
    this.dateFieldChange.emit({ fieldCode: this.fieldDetails.code, value });
  }

  onDateBlur(): void {
    this.dateFieldBlur.emit(this.fieldDetails.code);
  }

  onPrefixChange(): void {
    this.cdr.markForCheck(); // Forzar detección de cambios para OnPush
    this.fieldChange.emit('phonePrefix');
  }

  getErrorMessage(errors: ValidationErrors | null): string {
    if (!errors) return '';

    const errorMessages: { [key: string]: { [key: string]: (params?: Record<string, unknown>) => string } } = {
      email: {
        required: () => 'El correo electrónico es requerido.',
        email: () => 'Ingresa un correo electrónico válido.',
      },
      phone: {
        required: () => 'El teléfono es requerido.',
        pattern: () => 'Ingresa un número de teléfono válido.',
      },
      text: {
        required: () => 'Este campo es obligatorio.',
        minlength: (params) => `Debe tener al menos ${params?.['minLength']} caracteres.`,
        maxlength: (params) => `No puede tener más de ${params?.['maxLength']} caracteres.`,
        pattern: () => 'Ingresa un número de teléfono válido.',
      },
      number: {
        required: () => 'Este campo es obligatorio.',
        min: (params) => `El valor mínimo es ${params?.['min']}.`,
        max: (params) => `El valor máximo es ${params?.['max']}.`,
      },
      date: {
        required: () => 'Esta fecha es obligatoria.',
        invalidDate: () => 'Fecha inválida.',
        pastDate: () => 'La fecha debe ser anterior a hoy.',
        futureDate: () => 'La fecha debe ser posterior a hoy.',
        birthdateTooRecent: () => 'La fecha de nacimiento no puede ser posterior a la fecha máxima permitida. La edad mínima para este grupo no corresponde.',
        birthdateFuture: () => 'La fecha de nacimiento no puede ser futura.',
        expirationDatePast: () => 'La fecha de expiración no puede ser anterior a hoy.'
      },
      sex: {
        required: () => 'Debe seleccionar un sexo.',
        pattern: () => 'Debe seleccionar Masculino o Femenino.',
      },
      country: {
        required: () => 'Debe seleccionar un país.',
      },
      required: {
        required: () => 'Este campo es obligatorio.',
      },
    };

    const fieldType = this.fieldDetails.code === 'phone' ? 'phone' : this.fieldDetails.fieldType;
    const typeMessages = errorMessages[fieldType] || errorMessages['required'];

    for (const errorKey in errors) {
      const messageFunction = typeMessages[errorKey];
      if (messageFunction) {
        const params = errors[errorKey] as Record<string, unknown>;
        return messageFunction(params);
      }
    }

    return 'Campo inválido';
  }

  /**
   * Obtiene el mensaje de error para el prefijo telefónico
   */
  getPrefixErrorMessage(errors: ValidationErrors | null): string {
    if (!errors) return '';

    // Para el prefijo, usar mensajes similares a los del teléfono
    const errorMessages: { [key: string]: (params?: Record<string, unknown>) => string } = {
      required: () => 'El prefijo telefónico es requerido.',
      pattern: () => 'Ingresa un prefijo telefónico válido.',
    };

    for (const errorKey in errors) {
      const messageFunction = errorMessages[errorKey];
      if (messageFunction) {
        const params = errors[errorKey] as Record<string, unknown>;
        return messageFunction(params);
      }
    }

    return 'Prefijo inválido';
  }
}

