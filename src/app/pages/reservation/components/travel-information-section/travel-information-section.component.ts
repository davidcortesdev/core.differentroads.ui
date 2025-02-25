import { Component, Input } from '@angular/core';

interface TripDetails {
  destination: string;
  period: string;
  travelers: string;
}

@Component({
  selector: 'app-travel-information-section',
  standalone: false,
  templateUrl: './travel-information-section.component.html',
  styleUrls: ['./travel-information-section.component.scss'],
})
export class TravelInformationSectionComponent {
  @Input() tripDetails!: TripDetails;
}
