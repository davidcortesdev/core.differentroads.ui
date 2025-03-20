import { Component, Input } from '@angular/core';
import { TravelerInfo } from '../../../../core/models/reservation/reservation.model';

@Component({
  selector: 'app-travelers-information-section',
  standalone: false,
  templateUrl: './travelers-information-section.component.html',
  styleUrls: ['./travelers-information-section.component.scss'],
})
export class TravelersInformationSectionComponent {
  @Input() travelers: TravelerInfo[] = [];
}
