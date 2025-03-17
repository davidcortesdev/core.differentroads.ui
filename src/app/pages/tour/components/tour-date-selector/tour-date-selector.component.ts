import { Component, EventEmitter, Input, Output } from '@angular/core';

interface DateOption {
  label: string;
  value: string;
  price: number;
  isGroup: boolean;
  tripType?: string;
  externalID?: string;
}

@Component({
  selector: 'app-tour-date-selector',
  standalone: false,
  
  templateUrl: './tour-date-selector.component.html',
  styleUrls: ['./tour-date-selector.component.scss']
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
  @Input() tagsOptions: {
    type: string;
    color: 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined;
    value: string;
  }[] = [];

  @Output() dateChange = new EventEmitter<any>();

  onDateChange(event: any): void {
    this.dateChange.emit(event);
  }

  getTagConfig(tripType: string) {
    return this.tagsOptions.find((tag) => tag.type === tripType);
  }
}
