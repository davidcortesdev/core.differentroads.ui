import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-trip-types-section',
  standalone: false,
  templateUrl: './trip-types-section.component.html',
  styleUrls: ['./trip-types-section.component.scss'],
})
export class TripTypesSectionComponent {
  constructor(private router: Router) {}

  navigateToTripType(type: string): void {
    this.router.navigate(['/tours'], {
      queryParams: { tripType: type },
    });
  }
}
