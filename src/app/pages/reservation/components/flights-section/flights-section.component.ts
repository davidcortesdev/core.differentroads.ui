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

  // Getter to filter out flights with 'sin ' in the airline name
  get filteredFlights(): Flight[] {
    return this.flights.filter(
      (flight) =>
        !flight.airline.name.toLowerCase().includes('sin ') &&
        !flight.airline.name.toLowerCase().includes('sinvue')
    );
  }

  // For simplicity, if we don't have a way to distinguish outbound vs inbound flights,
  // we'll assume they're split evenly, with outbound flights coming first, then inbound
  get outboundFlights(): Flight[] {
    // We'll assume the first half (or slightly more) of the flights are outbound
    if (this.filteredFlights.length <= 1) {
      return this.filteredFlights;
    }

    return this.filteredFlights.slice(
      0,
      Math.ceil(this.filteredFlights.length / 2)
    );
  }

  get inboundFlights(): Flight[] {
    // We'll assume the second half of the flights are inbound
    if (this.filteredFlights.length <= 1) {
      return [];
    }

    return this.filteredFlights.slice(
      Math.ceil(this.filteredFlights.length / 2)
    );
  }

  // Check if we have both outbound and inbound flights
  get hasRoundTrip(): boolean {
    return this.filteredFlights.length > 1;
  }

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
