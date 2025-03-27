import { Component, Input, OnInit } from '@angular/core';
import { Flight } from '../../../core/models/tours/flight.model';


@Component({
  selector: 'app-booking-flights',
  templateUrl: './booking-flights.component.html',
  styleUrls: ['./booking-flights.component.scss'],
  standalone: false,
})
export class BookingFlightsComponent implements OnInit {
  @Input() flight!: Flight; // Recibe el vuelo seleccionado

  constructor() {}

  ngOnInit(): void {
    console.log("vuelos", this.flight);
  }
}
