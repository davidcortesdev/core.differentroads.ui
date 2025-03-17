import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';

export interface DateOption {
  id: number;
  label: string;
  value: string;
  price: number;
  isGroup: boolean;
  tripType?: string;
  externalID?: string;
  itineraryId?: number;
  itineraryName?: string;
  dayOne?: string;
}

export enum TripType {
  Single = 'single',
  Grupo = 'grupo',
  Private = 'private',
}

type TripTypeKey = (typeof TripType)[keyof typeof TripType];

export interface TripTypeInfo {
  label: string;
  class: string;
  fullName: string;
}

@Component({
  selector: 'app-tour-date-selector',
  standalone: false,
  templateUrl: './tour-date-selector.component.html',
  styleUrls: ['./tour-date-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TourDateSelectorComponent implements OnInit {
  @Input() title: string = '';
  @Input() selectedDate: string = '';
  @Input() tripType: string = '';
  @Input() dateOptions: DateOption[] = [];
  @Input() selectedOption: DateOption = {
    id: 0,
    label: '',
    value: '',
    price: 0,
    isGroup: false,
  };
  @Input() showPlaceholder: boolean = true;

  @Output() dateChange = new EventEmitter<{ value: string }>();

  readonly tripTypeMap: Record<TripTypeKey, TripTypeInfo> = {
    [TripType.Single]: {
      label: 'S',
      class: 'trip-type-s',
      fullName: 'Single',
    },
    [TripType.Grupo]: {
      label: 'G',
      class: 'trip-type-g',
      fullName: 'Grupo',
    },
    [TripType.Private]: {
      label: 'P',
      class: 'trip-type-p',
      fullName: 'Privado',
    },
  };

  ngOnInit(): void {
    // Removed console.log for production
  }

  onDateChange(event: { value: string }): void {
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

  getTripTypeFullName(type: string): string {
    if (!type) return '';
    const lowerType = type.toLowerCase() as TripTypeKey;
    return this.tripTypeMap[lowerType]?.fullName || type;
  }

  get hasMultipleItineraries(): boolean {
    if (!this.dateOptions || this.dateOptions.length === 0) {
      return false;
    }

    const uniqueItineraryIds = new Set(
      this.dateOptions
        .filter((option) => option.itineraryId)
        .map((option) => option.itineraryId)
    );

    return uniqueItineraryIds.size > 1;
  }

  /**
   * Checks if the provided trip type is 'single'
   * @param type The trip type to check
   * @returns True if the trip type is 'single', false otherwise
   */
  isSingleTripType(type: string | undefined): boolean {
    if (!type) return false;
    return type.toLowerCase() === TripType.Single;
  }
}
