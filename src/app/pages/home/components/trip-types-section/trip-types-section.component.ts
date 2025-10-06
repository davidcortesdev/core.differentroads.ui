import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface TripType {
  title: string;
  description: string;
  class: string;
  value: string;
}

@Component({
  selector: 'app-trip-types-section',
  standalone: false,
  templateUrl: './trip-types-section.component.html',
  styleUrls: ['./trip-types-section.component.scss'],
})
export class TripTypesSectionComponent {
  tripTypes: TripType[] = [
    {
      title: 'En grupo',
      description: 'Viajes para todos: solos, con amigos o en pareja',
      class: 'group',
      value: 'Grupo',
    },
    {
      title: 'Singles',
      description: 'Viaja solo y conoce a gente nueva',
      class: 'singles',
      value: 'Singles',
    },
    {
      title: 'Privados',
      description: 'Viajes a medida para ti y los tuyos',
      class: 'private',
      value: 'private',
    },
  ];

  constructor(
    private router: Router
  ) {}

  navigateToTripType(type: string): void {
    this.router.navigate(['/tours'], {
      queryParams: { tripType: type },
    });
  }
}
