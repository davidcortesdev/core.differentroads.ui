import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Flight } from '../../models/tours/flight.model';

@Injectable({
  providedIn: 'root',
})
export class FlightsService {
  private selectedFlightSource = new BehaviorSubject<Flight | null>(null);
  selectedFlight$ = this.selectedFlightSource.asObservable();

  updateSelectedFlight(flight: Flight | null) {
    this.selectedFlightSource.next(flight);
  }
}
