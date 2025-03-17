import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, OnInit } from '@angular/core';

export interface DateOption {
  label: string;
  value: string;
  price: number;
  isGroup: boolean;
  tripType?: string;
  externalID?: string;
}

export enum TripType {
  Single = 'single',
  Grupo = 'grupo',
  Private = 'private'
}

type TripTypeKey = typeof TripType[keyof typeof TripType];

export interface TripTypeInfo {
  label: string;
  class: string;
}

@Component({
  selector: 'app-tour-date-selector',
  standalone: false,
  templateUrl: './tour-date-selector.component.html',
  styleUrls: ['./tour-date-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TourDateSelectorComponent implements OnInit {
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

  @Output() dateChange = new EventEmitter<{value: string}>();

  readonly tripTypeMap: Record<TripTypeKey, TripTypeInfo> = {
    [TripType.Single]: { label: 'S', class: 'trip-type-s' },
    [TripType.Grupo]: { label: 'G', class: 'trip-type-g' },
    [TripType.Private]: { label: 'P', class: 'trip-type-p' }
  };

  ngOnInit(): void {
    // Inicialización si es necesaria
  }

  onDateChange(event: {value: string}): void {
    this.dateChange.emit(event);
  }

  getTripTypeLabel(type: string): string {
    if (!type) return '';
    const lowerType = type.toLowerCase() as TripTypeKey;
    return this.tripTypeMap[lowerType]?.label || type.charAt(0).toUpperCase();
  }

  getTripTypeClass(type: string): string {
    if (!type) return '';
    const lowerType = type.toLowerCase() as TripTypeKey;
    return this.tripTypeMap[lowerType]?.class || '';
  }
}
