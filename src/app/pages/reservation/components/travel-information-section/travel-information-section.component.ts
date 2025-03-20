import { Component, Input } from '@angular/core';
import { TripDetails } from '../../../../core/models/reservation/reservation.model';

@Component({
  selector: 'app-travel-information-section',
  standalone: false,
  templateUrl: './travel-information-section.component.html',
  styleUrls: ['./travel-information-section.component.scss'],
})
export class TravelInformationSectionComponent {
  @Input() tripDetails!: TripDetails;
}
