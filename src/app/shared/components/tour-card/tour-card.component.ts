import { Component, Input, ChangeDetectionStrategy, OnInit } from '@angular/core';
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
  Propios = 'propios',
  Fit = 'fit'
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
export class TourCardComponent implements OnInit {
  @Input() tourData!: TourData;
  @Input() isLargeCard = false;
  @Input() showScalapayPrice = false;

  readonly tripTypeMap: Record<TripTypeKey, TripTypeInfo> = {
    [TripType.Single]: { label: 'S', class: 'trip-type-s' },
    [TripType.Grupo]: { label: 'G', class: 'trip-type-g' },
    [TripType.Propios]: { label: 'P', class: 'trip-type-p' },
    [TripType.Fit]: { label: 'F', class: 'trip-type-f' }
  };

  monthlyPrice = 0;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Pre-calculate monthly price to avoid recalculation in template
    this.monthlyPrice = this.calculateMonthlyPrice();
  }

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

  private calculateMonthlyPrice(): number {
    return this.tourData.price / 4;
  }
}
