import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Flight } from '../../../core/models/tours/flight.model';

@Component({
  selector: 'app-booking-flights',
  templateUrl: './booking-flights.component.html',
  styleUrls: ['./booking-flights.component.scss'],
  standalone: false,
})
export class BookingFlightsComponent implements OnInit, OnChanges {
  @Input() flight!: Flight; // Recibe el vuelo seleccionado
  
  constructor() {}
  
  ngOnInit(): void {
    this.validateFlightData();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['flight']) {
      console.log('Flight data changed:', this.flight);
      this.validateFlightData();
    }
  }
  
  private validateFlightData(): void {
    if (!this.flight) {
      console.error('Flight data is undefined or null');
      return;
    }
    
    console.log('Flight data received:', {
      id: this.flight.id,
      externalID: this.flight.externalID,
      outboundSegments: this.flight.outbound?.segments?.length || 0,
      inboundSegments: this.flight.inbound?.segments?.length || 0
    });
    
    // Validar que los segmentos tengan la información necesaria
    if (this.flight.outbound?.segments?.length) {
      const firstSegment = this.flight.outbound.segments[0];
      console.log('First outbound segment:', {
        departureCity: firstSegment.departureCity,
        arrivalCity: firstSegment.arrivalCity,
        flightNumber: firstSegment.flightNumber
      });
    }
    
    if (this.flight.inbound?.segments?.length) {
      const firstSegment = this.flight.inbound.segments[0];
      console.log('First inbound segment:', {
        departureCity: firstSegment.departureCity,
        arrivalCity: firstSegment.arrivalCity,
        flightNumber: firstSegment.flightNumber
      });
    }
  }
}