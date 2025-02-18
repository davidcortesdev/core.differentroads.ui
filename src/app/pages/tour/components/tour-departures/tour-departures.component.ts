import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';

export interface Departure {
  departureDate: Date;
  returnDate: Date;
  destination?: string;
  flights?: string;
  price: number;
  originalPrice: number;
  discount: number;
  group?: string;
  waitingList: boolean;
  status: DepartureStatus;
}

export type DepartureStatus = 'available' | 'complete';

@Component({
  selector: 'app-tour-departures',
  standalone: false,
  templateUrl: './tour-departures.component.html',
  styleUrl: './tour-departures.component.scss',
})
export class TourDeparturesComponent implements OnInit {
  departures: Departure[] = [];
  filteredDepartures: Departure[] = [];
  selectedCity: string = 'Sin vuelos';
  readonly priceFrom: number = 1500;
  readonly travelers = {
    adults: 1,
    children: 2,
  } as const;

  private cities: string[] = ['Sin vuelos'];
  filteredCities: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService
  ) {}

  filterCities(event: { query: string }): void {
    const query = event.query.toLowerCase();
    this.filteredCities = this.cities.filter((city) =>
      city.toLowerCase().includes(query)
    );
  }
  formatPrice(price?: number): string {
    return price ? `${price.toFixed(0)}€` : '0€';
  }

  addToCart(departure: Departure): void {
    // TODO: Implement cart service
    console.log('Adding to cart:', departure);
  }

  // Unified method to filter departures by city or flight
  filterDepartures(): void {
    if (this.selectedCity === 'Sin vuelos') {
      this.filteredDepartures = this.departures.filter(
        (departure) => departure.flights === 'Sin vuelos'
      );
    } else {
      this.filteredDepartures = this.departures.filter(
        (departure) =>
          departure.destination === this.selectedCity ||
          departure.flights === this.selectedCity
      );
    }
    console.log('filteredDepartures', this.filteredDepartures);
  }

  // Update ngOnInit with more mock data
  ngOnInit() {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.loadTourData(slug);
      }
    });

    // Mock data - Replace with actual API call
    this.departures = [];

    // Initialize filtered departures with "Sin vuelos" options
    this.filteredDepartures = this.departures.filter(
      (departure) => departure.flights === 'Sin vuelos'
    );

    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.loadTourData(slug);
      }
    });
  }

  private loadTourData(slug: string) {
    this.toursService
      .getTourDetailBySlug(slug, ['activePeriods', 'basePrice'])
      .subscribe((tour) => {
        const uniquePeriods = new Set<string>();
        this.departures = tour.activePeriods.flatMap((period) =>
          period.flights
            .map((flight) => {
              const periodKey = `${period.dayOne}-${flight.name}`;
              if (uniquePeriods.has(periodKey)) {
                return null;
              }
              uniquePeriods.add(periodKey);
              return {
                departureDate: new Date(period.dayOne),
                returnDate: new Date(period.returnDate),
                destination: flight.name,
                flights: flight.name,
                price: tour.basePrice + (flight.prices || 0),
                originalPrice: tour.basePrice + 200,
                discount: 10,
                group: period.tripType || 'Grupo',
                waitingList: false,
                status: 'available' as DepartureStatus,
              };
            })
            .filter((departure) => departure !== null)
        );

        this.cities = [
          'Sin vuelos',
          ...new Set(
            this.departures
              .map((departure) => departure.destination)
              .filter(
                (destination): destination is string =>
                  !!destination && destination !== 'Sin vuelos'
              )
          ),
        ];

        this.filteredDepartures = this.departures.filter(
          (departure) => departure.flights === 'Sin vuelos'
        );
      });
  }

  getUniqueFlights(): string[] {
    const flightSet = new Set<string>();
    this.departures.forEach((departure) => {
      if (departure.flights) {
        flightSet.add(departure.flights);
      }
    });
    return Array.from(flightSet);
  }
}
