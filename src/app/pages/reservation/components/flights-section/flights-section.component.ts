import { Component, Input } from '@angular/core';
import { Flight } from '../../../../core/models/reservation/reservation.model';

@Component({
  selector: 'app-flights-section',
  standalone: false,
  templateUrl: './flights-section.component.html',
  styleUrls: ['./flights-section.component.scss'],
})
export class FlightsSectionComponent {
  @Input() flights: Flight[] = [];

  // Method to format time string to Date object
  formatTime(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    return date;
  }

  // Method to calculate flight duration
  calculateFlightDuration(departureTime: string, arrivalTime: string): string {
    const departure = this.formatTime(departureTime);
    const arrival = this.formatTime(arrivalTime);
    if (arrival < departure) {
      arrival.setDate(arrival.getDate() + 1);
    }
    const duration = (arrival.getTime() - departure.getTime()) / (1000 * 60);
    const hours = Math.floor(duration / 60);
    const minutes = Math.floor(duration % 60);
    return `${hours}h ${minutes}m`;
  }
}
