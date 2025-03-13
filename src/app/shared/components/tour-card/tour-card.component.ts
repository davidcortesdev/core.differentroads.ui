import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tour-card',
  standalone: false,
  templateUrl: './tour-card.component.html',
  styleUrls: ['./tour-card.component.scss'],
})
export class TourCardComponent {
  @Input() tourData!: {
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
  };
  getTripTypeLabel(type: string): string {
    switch (type.toLowerCase()) {
      case 'single':
        return 'S';
      case 'grupo':
        return 'G';
      case 'propios':
        return 'P';
      default:
        return type.charAt(0).toUpperCase();
    }
  }

  getTripTypeClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'single':
        return 'trip-type-s';
      case 'grupo':
        return 'trip-type-g';
      case 'propios':
        return 'trip-type-p';
      default:
        return '';
    }
  }

  @Input() isLargeCard: boolean = false;
  @Input() showScalapayPrice: boolean = false;

  constructor(private router: Router) {}

  handleTourClick() {
    this.router.navigate(['/tour', this.tourData.webSlug]);
  }

  get monthlyPrice(): number {
    return this.tourData.price / 4;
  }
}
