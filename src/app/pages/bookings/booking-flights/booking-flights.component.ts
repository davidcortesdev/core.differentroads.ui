import { Component, Input, OnInit } from '@angular/core';

// Interfaces para los datos de vuelos
export interface FlightSegment {
  departureDate: string;
  departureTime: string;
  departureAirport: string;
  departureCode: string;
  arrivalTime: string;
  arrivalAirport: string;
  arrivalCode: string;
}

export interface FlightDirection {
  date: string;
  segments: FlightSegment[];
  stops: number;
}

export interface FlightsData {
  outbound: FlightDirection;
  inbound: FlightDirection;
}

@Component({
  selector: 'app-booking-flights',
  templateUrl: './booking-flights.component.html',
  styleUrls: ['./booking-flights.component.scss'],
  standalone: false,
})
export class BookingFlightsComponent implements OnInit {
  @Input() flightsData!: FlightsData;

  constructor() {}

  ngOnInit(): void {}
}
