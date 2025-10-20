import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, ValidationErrors } from '@angular/forms';
import { IReservationFieldResponse } from '../../../../../../core/services/reservation/reservation-field.service';

@Component({
  selector: 'app-traveler-field',
  standalone: false,
  templateUrl: './traveler-field.component.html',
  styleUrls: ['./traveler-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TravelerFieldComponent implements OnInit, OnChanges {
  @Input() fieldDetails!: IReservationFieldResponse;
  @Input() travelerId!: number;
  @Input() travelerForm!: FormGroup;
  @Input() isMandatory: boolean = false;
  @Input() sexOptions: Array<{ label: string; value: string }> = [];
  @Input() countryOptions: Array<{ name: string; code: string; value: string }> = [];
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;

  @Output() fieldChange = new EventEmitter<string>();
  @Output() phoneFieldChange = new EventEmitter<{ fieldCode: string; event: Event }>();
  @Output() dateFieldChange = new EventEmitter<{ fieldCode: string; value: Date }>();
  @Output() dateFieldBlur = new EventEmitter<string>();

  // Sugerencias filtradas para sexOptions
  filteredSexOptions: Array<{ label: string; value: string }> = [];
  
  // Opción seleccionada actual para el autocomplete de sexo
  sexSelectedOption: { label: string; value: string } | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeSexField();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sexOptions'] || changes['travelerForm']) {
      this.initializeSexField();
    }
  }

  private initializeSexField(): void {
    // Sincronizar el valor del FormControl con sexSelectedOption
    if (this.fieldDetails?.code === 'sex' && this.control) {
      const currentValue = this.control.value;
      if (currentValue && typeof currentValue === 'string') {
        this.sexSelectedOption = this.sexOptions.find(opt => opt.value === currentValue) || null;
      }
    }
  }

  get controlName(): string {
    return `${this.fieldDetails.code}_${this.travelerId}`;
  }

  get control() {
    return this.travelerForm.get(this.controlName);
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

  get placeholder(): string {
    return `Introduce tu ${this.fieldDetails.name.toLowerCase()}`;
  }

  onFieldInput(): void {
    this.fieldChange.emit(this.fieldDetails.code);
  }

  onPhoneInput(event: Event): void {
    this.phoneFieldChange.emit({ fieldCode: this.fieldDetails.code, event });
  }

  onDateSelect(value: Date): void {
    this.dateFieldChange.emit({ fieldCode: this.fieldDetails.code, value });
  }

  onDateBlur(): void {
    this.dateFieldBlur.emit(this.fieldDetails.code);
  }

  filterSexOptions(event: { query: string }): void {
    const query = event.query ? event.query.toLowerCase() : '';
    
    if (!query) {
      // Si no hay query, mostrar todas las opciones
      this.filteredSexOptions = [...this.sexOptions];
    } else {
      // Filtrar opciones que coincidan con el query
      this.filteredSexOptions = this.sexOptions.filter(option => 
        option.label.toLowerCase().includes(query)
      );
    }
    
    this.cdr.markForCheck();
  }

  onSexModelChange(value: { label: string; value: string } | null): void {
    // Sincronizar el objeto seleccionado con el valor string del FormControl
    if (this.control && value && typeof value === 'object' && value.value) {
      this.control.setValue(value.value);
      this.control.markAsDirty();
      this.control.markAsTouched();
      this.control.updateValueAndValidity();
      this.fieldChange.emit(this.fieldDetails.code);
    }
    this.cdr.markForCheck();
  }

  onSexSelect(event: { label: string; value: string }): void {
    // Guardar el valor string (no el objeto) en el FormControl
    if (this.control) {
      this.control.setValue(event.value);
      this.control.markAsDirty();
      this.control.markAsTouched();
      this.control.updateValueAndValidity();
    }
    this.fieldChange.emit(this.fieldDetails.code);
    this.cdr.markForCheck();
  }

  onSexClear(): void {
    // Limpiar el valor del FormControl y la opción seleccionada
    this.sexSelectedOption = null;
    if (this.control) {
      this.control.setValue(null);
      this.control.markAsDirty();
      this.control.markAsTouched();
      this.control.updateValueAndValidity();
    }
    this.fieldChange.emit(this.fieldDetails.code);
    this.cdr.markForCheck();
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
        pattern: () => 'Ingresa un número de teléfono válido. Puede incluir código de país.',
      },
      text: {
        required: () => 'Este campo es obligatorio.',
        minlength: (params) => `Debe tener al menos ${params?.['minLength']} caracteres.`,
        maxlength: (params) => `No puede tener más de ${params?.['maxLength']} caracteres.`,
        pattern: () => 'Ingresa un número de teléfono válido. Puede incluir código de país.',
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
        pattern: () => 'Debe seleccionar Masculino, Femenino u Otro.',
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
}

