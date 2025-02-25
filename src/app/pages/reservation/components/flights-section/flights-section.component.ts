import { Component, Input } from '@angular/core';

interface Flight {
  date: string;
  airline: {
    name: string;
    logo: string;
  };
  departure: {
    time: string;
    airport: string;
  };
  arrival: {
    time: string;
    airport: string;
  };
  duration: string;
  flightNumber: string;
  type: 'direct' | 'layover';
  layoverCity?: string;
}

@Component({
  selector: 'app-flights-section',
  standalone: false,
  templateUrl: './flights-section.component.html',
  styleUrls: ['./flights-section.component.scss'],
})
export class FlightsSectionComponent {
  @Input() flights!: Flight[];
}
