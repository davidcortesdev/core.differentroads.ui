import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Flight } from '../../models/tours/flight.model';

@Injectable({
  providedIn: 'root',
})
export class FlightsService {
  private selectedFlightSubject = new BehaviorSubject<Flight | null>(null);
  private flightlessOptionSubject = new BehaviorSubject<Flight | null>(null);

  selectedFlight$ = this.selectedFlightSubject.asObservable();
  flightlessOption$ = this.flightlessOptionSubject.asObservable();

  constructor() {}

  updateSelectedFlight(flight: Flight | null): void {
    this.selectedFlightSubject.next(flight);
  }

  updateFlightlessOption(flight: Flight | null): void {
    this.flightlessOptionSubject.next(flight);
  }
}
