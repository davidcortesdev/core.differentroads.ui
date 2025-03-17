import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';

export interface DateOption {
  label: string;
  value: string;
  price: number;
  isGroup: boolean;
  tripType?: string;
  externalID?: string;
}

export interface TagConfig {
  type: string;
  color: 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined;
  value: string;
}

@Component({
  selector: 'app-tour-date-selector',
  standalone: false,
  templateUrl: './tour-date-selector.component.html',
  styleUrls: ['./tour-date-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TourDateSelectorComponent {
  @Input() title: string = '';
  @Input() selectedDate: string = '';
  @Input() tripType: string = '';
  @Input() dateOptions: DateOption[] = [];
  @Input() selectedOption: DateOption = {
    label: '',
    value: '',
    price: 0,
    isGroup: false
  };
  @Input() showPlaceholder: boolean = true;
  @Input() tagsOptions: TagConfig[] = [];

  @Output() dateChange = new EventEmitter<{value: string}>();

  onDateChange(event: {value: string}): void {
    this.dateChange.emit(event);
  }

  getTagConfig(tripType?: string): TagConfig | undefined {
    if (!tripType) return undefined;
    return this.tagsOptions.find((tag) => tag.type === tripType);
  }
}
