import { Component } from '@angular/core';

@Component({
  selector: 'app-tour-header',
  standalone: false,
  templateUrl: './tour-header.component.html',
  styleUrls: ['./tour-header.component.scss']
})
export class TourHeaderComponent {
  tour = {
    name: 'Ruta esencial por sus fiordos icónicos',
    country: 'Noruega',
    basePrice: 2499,
    rating: 4.7,
    reviewCount: 200,
    activePeriods: [{
      days: 8,
      startDate: '2024-06-01',
      endDate: '2024-09-30'
    }]
  };

  getDuration(days: number | undefined): string {
    if (!days) return '';
    return `${days} días, ${days - 1} noches`;
  }
}
