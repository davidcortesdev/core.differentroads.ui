import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

interface TourData {
  imageUrl: string;
  title: string;
  rating: number;
  isByDr?: boolean;
  tag?: string;
  description: string;
  price: number;
  availableMonths: string[];
  webSlug: string;
  tripType?: string[];
}

enum TripType {
  Single = 'single',
  Grupo = 'grupo',
  Propios = 'propios'
}

type TripTypeKey = typeof TripType[keyof typeof TripType];

interface TripTypeInfo {
  label: string;
  class: string;
}

@Component({
  selector: 'app-tour-card',
  standalone: false,
  templateUrl: './tour-card.component.html',
  styleUrls: ['./tour-card.component.scss'],
})
export class TourCardComponent {
  @Input() tourData!: TourData;
  @Input() isLargeCard = false;
  @Input() showScalapayPrice = false;

  readonly tripTypeMap: Record<TripTypeKey, TripTypeInfo> = {
    [TripType.Single]: { label: 'S', class: 'trip-type-s' },
    [TripType.Grupo]: { label: 'G', class: 'trip-type-g' },
    [TripType.Propios]: { label: 'P', class: 'trip-type-p' }
  };

  constructor(private router: Router) {}

  getTripTypeLabel(type: string): string {
    const lowerType = type.toLowerCase() as TripTypeKey;
    return this.tripTypeMap[lowerType]?.label || type.charAt(0).toUpperCase();
  }

  getTripTypeClass(type: string): string {
    const lowerType = type.toLowerCase() as TripTypeKey;
    return this.tripTypeMap[lowerType]?.class || '';
  }

  handleTourClick(): void {
    this.router.navigate(['/tour', this.tourData.webSlug]);
  }

  get monthlyPrice(): number {
    return this.tourData.price / 4;
  }
}
