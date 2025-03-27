import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Flight } from '../../models/tours/flight.model';
import { TextsService } from './texts.service';

@Injectable({
  providedIn: 'root',
})
export class FlightsService {
  private selectedFlightSubject = new BehaviorSubject<Flight | null>(null);
  private flightlessOptionSubject = new BehaviorSubject<Flight | null>(null);

  selectedFlight$ = this.selectedFlightSubject.asObservable();
  flightlessOption$ = this.flightlessOptionSubject.asObservable();

  constructor(private textsService: TextsService) {}

  updateSelectedFlight(flight: Flight | null): void {
    this.selectedFlightSubject.next(flight);

    // Store selected flight in TextsService
    if (flight) {
      const flightKey = flight.externalID || 'selected';
      this.textsService.updateText('flights', flightKey, flight);
    } else {
      this.textsService.clearCategory('flights');
    }
  }

  updateFlightlessOption(flight: Flight | null): void {
    this.flightlessOptionSubject.next(flight);

    // Store flightless option in TextsService
    if (flight) {
      this.textsService.updateText('flights', 'flightless', flight);
    }
  }

  getSelectedFlight(): Flight | null {
    return this.selectedFlightSubject.getValue();
  }
}
