import { Component, Input } from '@angular/core';
import { Flight } from '../../../../../../core/models/tours/flight.model';
import { PricesService } from '../../../../../../core/services/checkout/prices.service';

@Component({
  selector: 'app-flight-itinerary',
  standalone: false,
  templateUrl: './flight-itinerary.component.html',
  styleUrl: './flight-itinerary.component.scss',
})
export class FlightItineraryComponent {
  @Input() flight!: Flight;
  @Input() selectFlight!: (flight: any) => void;
  @Input() isFlightSelected!: (flight: any) => boolean;

  constructor(private pricesService: PricesService) {}

  // Formatea la hora para el pipe `date`
  formatTime(timeString: string): Date {
    if (!timeString) return new Date();
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds);
    return date;
  }

  // Calcula la duración del vuelo para un segmento
  calculateFlightDuration(segment: any): string {
    const departure = this.formatTime(segment.departureTime);
    const arrival = this.formatTime(segment.arrivalTime);
    if (arrival < departure) {
      arrival.setDate(arrival.getDate() + 1); // Handle next day arrival
    }
    const duration = (arrival.getTime() - departure.getTime()) / (1000 * 60); // Duración en minutos
    const hours = Math.floor(duration / 60);
    const minutes = Math.floor(duration % 60);
    return `${hours}h ${minutes}m`;
  }

  getPrice(): number {
    const inboundPrice = this.pricesService.getPriceById(
      this.flight?.inbound?.activityID?.toString(),
      'Adultos'
    );
    const outboundPrice = this.pricesService.getPriceById(
      this.flight?.outbound?.activityID?.toString(),
      'Adultos'
    );
    return inboundPrice + outboundPrice;
  }
}
