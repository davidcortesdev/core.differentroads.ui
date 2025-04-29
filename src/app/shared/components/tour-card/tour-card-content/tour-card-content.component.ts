import { Component, Input, Output, EventEmitter } from '@angular/core';

interface TourContentData {
  price: number;
  availableMonths: string[];
  tripType?: string[];
  webSlug: string;
}

@Component({
  selector: 'app-tour-card-content',
  standalone: false,
  templateUrl: './tour-card-content.component.html',
  styleUrls: ['./tour-card-content.component.scss'],
})
export class TourCardContentComponent {
  @Input() tourData!: TourContentData;
  @Input() showScalapayPrice = false;
  @Input() isLargeCard = false;
  @Input() scalapayWidgetId = '';
  @Output() tourClick = new EventEmitter<void>();

  readonly tripTypeMap: Record<string, { label: string, class: string }> = {
    'single': { label: 'S', class: 'trip-type-s' },
    'grupo': { label: 'G', class: 'trip-type-g' },
    'propios': { label: 'P', class: 'trip-type-p' },
    'fit': { label: 'F', class: 'trip-type-f' }
  };

  // Método para filtrar los tipos de viaje (solo S, G, P)
  getFilteredTripTypes(): string[] {
    if (!this.tourData.tripType) return [];
    return this.tourData.tripType.filter(type => {
      const lowerType = type.toLowerCase();
      return lowerType === 'single' || lowerType === 'grupo' || lowerType === 'propios';
    });
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
}