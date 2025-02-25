import { Component, Input } from '@angular/core';

interface TravelerInfo {
  name: string;
  email: string;
  phone: string;
  gender: string;
  room: string;
}

@Component({
  selector: 'app-travelers-information-section',
  standalone: false,
  templateUrl: './travelers-information-section.component.html',
  styleUrls: ['./travelers-information-section.component.scss'],
})
export class TravelersInformationSectionComponent {
  @Input() travelers!: TravelerInfo[];
}
