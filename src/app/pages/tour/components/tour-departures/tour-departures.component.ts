import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { TourComponent } from '../../tour.component';

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
  externalID: string;
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
  selectedCity: string = '';
  readonly priceFrom: number = 1500;
  readonly travelers = {
    adults: 1,
    children: 2,
  } as const;

  private cities: string[] = [];
  filteredCities: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService,
    private tourComponent: TourComponent
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
    this.tourComponent.createOrderAndRedirect(departure);
  }

  filterDepartures(): void {
    this.filteredDepartures = this.departures.filter(
      (departure) =>
        departure.destination === this.selectedCity ||
        departure.flights === this.selectedCity
    );
    console.log('filteredDepartures', this.filteredDepartures);
  }

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.loadTourData(slug);
      }
    });

    // Mock data - Replace with actual API call
    this.departures = [];

    // Initialize filtered departures with the cheapest option
    this.filteredDepartures = this.departures;
    this.setCheapestCityAsDefault();

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
                externalID: `${period.externalID}`,
              };
            })
            .filter((departure) => departure !== null)
        );

        this.cities = [
          ...new Set(
            this.departures
              .map((departure) => departure.destination)
              .filter((destination): destination is string => !!destination)
          ),
        ];

        console.log('departures', this.departures);
        console.log('cities', this.cities);

        this.setCheapestCityAsDefault();
        this.filterDepartures();
      });
  }

  private setCheapestCityAsDefault() {
    if (this.departures.length > 0) {
      const cheapestDepartures = this.departures.filter(
        (departure) =>
          departure.price === Math.min(...this.departures.map((d) => d.price))
      );
      const preferredDeparture = cheapestDepartures.find((departure) =>
        departure.destination?.toLowerCase().includes('sin')
      );
      this.selectedCity =
        preferredDeparture?.destination ||
        cheapestDepartures[0].destination ||
        '';

      // Ensure the cheapest city is the first in the list of cities
      this.cities = [
        this.selectedCity,
        ...this.cities.filter((city) => city !== this.selectedCity),
      ];
    }
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
