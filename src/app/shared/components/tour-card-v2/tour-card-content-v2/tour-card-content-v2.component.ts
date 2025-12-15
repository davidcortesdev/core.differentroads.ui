import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { TourDataV2 } from '../tour-card-v2.model';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-tour-card-content-v2',
  standalone: false,
  templateUrl: './tour-card-content-v2.component.html',
  styleUrls: ['./tour-card-content-v2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TourCardContentV2Component implements OnInit {
  @Input() tourData!: TourDataV2;
  @Input() showScalapayPrice = false;
  @Input() isLargeCard = false;
  @Output() tourClick = new EventEmitter<void>();

  // Exponer environment para el template
  readonly environment = environment;

  // Generar ID único para el widget de Scalapay
  readonly widgetId = `scalapay-amount-${Math.random().toString(36).substr(2, 9)}`;

  // Getter para el selector del widget
  get amountSelector(): string {
    return `["#${this.widgetId}"]`;
  }

  filteredTripTypes: string[] = [];

  readonly tripTypeMap: Record<string, { label: string; class: string }> = {
    single: { label: 'S', class: 'trip-type-s' },
    grupo: { label: 'G', class: 'trip-type-g' },
    propios: { label: 'P', class: 'trip-type-p' },
    fit: { label: 'F', class: 'trip-type-f' },
  };

  ngOnInit(): void {
    this.updateFilteredTripTypes();
  }

  private updateFilteredTripTypes(): void {
    if (!this.tourData.tripType) {
      this.filteredTripTypes = [];
      return;
    }

    this.filteredTripTypes = this.tourData.tripType.filter((type) => {
      const lowerType = type.toLowerCase();
      return (
        lowerType === 'single' ||
        lowerType === 'grupo' ||
        lowerType === 'propios'
      );
    });
  }

  getFilteredTripTypes(): string[] {
    return this.filteredTripTypes;
  }

  getTripTypeLabel(type: string): string {
    const lowerType = type.toLowerCase();
    return this.tripTypeMap[lowerType]?.label || type.charAt(0).toUpperCase();
  }

  getTripTypeClass(type: string): string {
    const lowerType = type.toLowerCase();
    return this.tripTypeMap[lowerType]?.class || '';
  }

  handleTourClick(): void {
    this.tourClick.emit();
  }
  get limitedMonths(): string[] {
    // En mobile, mostrar máximo 4 meses
    const isMobile = window.innerWidth <= 768;
    if (isMobile && this.tourData.availableMonths?.length > 4) {
        return this.tourData.availableMonths.slice(0, 4);
    }
    return this.tourData.availableMonths || [];
  }
}
