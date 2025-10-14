import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Flight } from '../../models/tours/flight.model';
import { TextsService } from './texts.service';

@Injectable({
  providedIn: 'root',
})
export class FlightsService {
  private selectedFlightSubject = new BehaviorSubject<Flight | null>(null);
  private flightlessOptionSubject = new BehaviorSubject<Flight | null>(null);
  // New subject to track flights for the order
  private orderFlightsSubject = new BehaviorSubject<Flight[]>([]);

  selectedFlight$ = this.selectedFlightSubject.asObservable();
  flightlessOption$ = this.flightlessOptionSubject.asObservable();
  orderFlights$ = this.orderFlightsSubject.asObservable();

  constructor(private textsService: TextsService) {}

  updateSelectedFlight(flight: Flight | null): void {
    this.selectedFlightSubject.next(flight);

    // Update the order flights based on selection
    this.updateOrderFlights(flight);

    // Store selected flight in TextsService
    if (flight) {
      const flightKey = flight.externalID || 'selected';

      // Ensure consistent format regardless of flight source
      const flightToStore = {
        ...flight,
        id: flight.id || flight.externalID,
        externalID: flight.externalID,
      };

      this.textsService.updateText('flights', flightKey, flightToStore);
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

  // New method to update the flights that should be included in the order
  private updateOrderFlights(selectedFlight: Flight | null): void {
    const flightlessOption = this.flightlessOptionSubject.getValue();
    const orderFlights: Flight[] = [];

    console.log('Updating order flights with selected flight:', selectedFlight);
    console.log('Current flightless option:', flightlessOption);

    if (selectedFlight) {
      // If it's an Amadeus flight and we have a flightless option, include both
      if (selectedFlight.source === 'amadeus' && flightlessOption) {
        orderFlights.push(selectedFlight);
        orderFlights.push(flightlessOption);
        console.log(
          'Adding both Amadeus flight and flightless option to order'
        );
      } else {
        // Otherwise just include the selected flight
        orderFlights.push(selectedFlight);
      }
    }

    this.orderFlightsSubject.next(orderFlights);
    console.log('Updated order flights:', orderFlights);
  }

  getSelectedFlight(): Flight | null {
    return this.selectedFlightSubject.getValue();
  }

  // New method to get the flights for the order
  getOrderFlights(): Flight[] {
    return this.orderFlightsSubject.getValue();
  }
}
