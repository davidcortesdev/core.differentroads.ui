import { Component, Input } from '@angular/core';
import {
  Flight,
  FlightSegment,
} from '../../../../core/models/tours/flight.model';

@Component({
  selector: 'app-flights-section',
  standalone: false,
  templateUrl: './flights-section.component.html',
  styleUrls: ['./flights-section.component.scss'],
})
export class FlightsSectionComponent {
  @Input() flights: Flight[] = [];

  // New adapter for template format - provides flight data in the format expected by the template
  get formattedFlights() {
    if (!this.flights || this.flights.length === 0) {
      return null;
    }

    // Use the first flight in the array
    const flight = this.flights[0];

    return {
      outbound: flight.outbound ? this.formatFlightInfo(flight.outbound) : null,
      inbound: flight.inbound ? this.formatFlightInfo(flight.inbound) : null,
    };
  }

  // Helper method to format flight info from segments
  private formatFlightInfo(flightData: {
    date: string;
    segments: FlightSegment[];
    name: string;
  }) {
    // Check if flight name contains "sinvue" or "sin vue"
    if (
      flightData.name &&
      (flightData.name.toLowerCase().includes('sinvue') ||
        flightData.name.toLowerCase().includes('sin vue'))
    ) {
      return null;
    }

    if (!flightData || !flightData.segments || flightData.segments.length === 0)
      return null;

    const segments = flightData.segments;
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    // Define if it has stops
    const hasStops = segments.length > 1;
    const stops = segments.length - 1;

    // Calculate stopover city if applicable
    let stopCity = '';
    if (hasStops && segments.length > 1) {
      // Use arrival city of first segment as stopover
      stopCity = segments[0].arrivalCity;
    }

    return {
      departureTime: firstSegment.departureTime,
      arrivalTime: lastSegment.arrivalTime,
      date: flightData.date,
      departureAirport: `${firstSegment.departureCity} (${firstSegment.departureIata})`,
      arrivalAirport: `${lastSegment.arrivalCity} (${lastSegment.arrivalIata})`,
      duration: this.calculateFlightDuration(
        firstSegment.departureTime,
        lastSegment.arrivalTime
      ),
      hasStops: hasStops,
      stops: stops,
      stopCity: stopCity,
      segments: segments.map((segment) => ({
        airline: segment.airline,
        flightNumber: segment.flightNumber,
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
        departureCity: segment.departureCity,
        arrivalCity: segment.arrivalCity,
        departureIata: segment.departureIata,
        arrivalIata: segment.arrivalIata,
      })),
    };
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
