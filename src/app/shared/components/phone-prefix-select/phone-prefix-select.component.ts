import { Component, Input, Output, EventEmitter, forwardRef, ChangeDetectorRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IPhonePrefixResponse, PhonePrefixService } from '../../../core/services/masterdata/phone-prefix.service';

@Component({
  selector: 'app-phone-prefix-select',
  standalone: false,
  templateUrl: './phone-prefix-select.component.html',
  styleUrls: ['./phone-prefix-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhonePrefixSelectComponent),
      multi: true
    }
  ]
})
export class PhonePrefixSelectComponent implements ControlValueAccessor {
  @Input() phonePrefixOptions: IPhonePrefixResponse[] = [];
  @Input() placeholder: string = 'Seleccione prefijo';
  @Input() showClear: boolean = true;
  @Input() filter: boolean = true;
  @Input() disabled: boolean = false;
  @Input() styleClass: string = 'prefix-select';
  @Input() errorClass: string = '';
  @Input() filterBy: string = 'name,prefix,code,isoCode2';

  @Output() prefixChange = new EventEmitter<string | null>();

  selectedValue: string | null = null;
  selectedPrefix: IPhonePrefixResponse | null = null;

  private onChange = (value: string | null) => {};
  private onTouched = () => {};

  constructor(
    private phonePrefixService: PhonePrefixService,
    private cdr: ChangeDetectorRef
  ) {}

  writeValue(value: string | null): void {
    this.selectedValue = value;
    this.updateSelectedPrefix();
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  onValueChange(event: any): void {
    const value = event?.value || event || null;
    this.selectedValue = value;
    this.updateSelectedPrefix();
    this.onChange(value);
    this.onTouched();
    this.prefixChange.emit(value);
    this.cdr.markForCheck();
  }

  private updateSelectedPrefix(): void {
    if (this.selectedValue && this.phonePrefixOptions.length > 0) {
      this.selectedPrefix = this.phonePrefixOptions.find(p => p.prefix === this.selectedValue) || null;
    } else {
      this.selectedPrefix = null;
    }
  }

  getCountryFlag(isoCode: string): string {
    return this.phonePrefixService.getCountryFlag(isoCode);
  }

  getSelectedPrefix(): IPhonePrefixResponse | null {
    return this.selectedPrefix;
  }
}

