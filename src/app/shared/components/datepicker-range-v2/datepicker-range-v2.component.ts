import { Component, Input, Output, EventEmitter, forwardRef, OnInit } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-datepicker-range-v2',
  standalone: false,
  templateUrl: './datepicker-range-v2.component.html',
  styleUrls: ['./datepicker-range-v2.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatepickerRangeV2Component),
      multi: true
    }
  ]
})
export class DatepickerRangeV2Component implements OnInit {
  @Input() label: string = 'Fechas de viaje';
  @Input() inputId: string = 'rangeDateInput';
  @Input() placeholder: string = 'Seleccionar fechas de viaje';
  @Input() minDate: Date = new Date();
  @Input() maxDate: Date = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  })();

  @Output() flexibilityChange = new EventEmitter<number>();
  @Output() datesChange = new EventEmitter<Date[]>();

  // Datos del rango
  rangeDates: Date[] | undefined;
  dateFlexibility: number = 0;

  // Presets de flexibilidad
  datePresets = [
    { label: '±2 días', value: 2 },
    { label: '±3 días', value: 3 },
    { label: '±7 días', value: 7 },
    { label: '±30 días', value: 30 }
  ];

  // ControlValueAccessor
  private onChange: (value: Date[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {}

  ngOnInit(): void {
    // Inicialización del componente
  }

  /**
   * Aplicar flexibilidad de fechas (±X días)
   */
  applyDatePreset(flexibility: number): void {
    this.dateFlexibility = flexibility;
    this.flexibilityChange.emit(flexibility);
  }

  /**
   * Texto de rango seleccionado para previsualizar
   */
  get formattedRange(): string {
    if (!this.rangeDates || this.rangeDates.length === 0) {
      return '';
    }
    const fmt = (d: Date) => d.toLocaleDateString('es-ES');
    if (this.rangeDates.length === 1) {
      return fmt(this.rangeDates[0]);
    }
    return `${fmt(this.rangeDates[0])} - ${fmt(this.rangeDates[1])}`;
  }

  /**
   * Etiqueta de flexibilidad (±X días)
   */
  get flexibilitySuffix(): string {
    return this.dateFlexibility > 0 ? `(±${this.dateFlexibility} días)` : '';
  }

  /**
   * Obtener el número de días del rango seleccionado
   */
  getDaysInRange(): number {
    if (!this.rangeDates || this.rangeDates.length < 2) {
      return 0;
    }
    
    const [start, end] = this.rangeDates;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Manejar cambio de fechas
   */
  onDateChange(): void {
    this.onChange(this.rangeDates || []);
    this.onTouched();
    this.datesChange.emit(this.rangeDates || []);
  }

  /**
   * Limpiar fechas seleccionadas
   */
  clearDates(): void {
    this.rangeDates = undefined;
    this.dateFlexibility = 0;
    this.datesChange.emit([]);
    this.flexibilityChange.emit(0);
    this.onChange([]);
    this.onTouched();
  }

  // ControlValueAccessor implementation
  writeValue(value: Date[]): void {
    this.rangeDates = value && value.length > 0 ? value : undefined;
  }

  registerOnChange(fn: (value: Date[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Implementar si se necesita deshabilitar el componente
  }
}