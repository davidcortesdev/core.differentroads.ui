import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-flight-management',
  standalone: false,
  
  templateUrl: './flight-management.component.html',
  styleUrl: './flight-management.component.scss'
})
export class FlightManagementComponent {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
}
