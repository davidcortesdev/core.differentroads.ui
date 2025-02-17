import { Component, OnInit } from '@angular/core';

export interface Departure {
  departureDate: Date;
  returnDate: Date;
  destination: string;
  flights: string;
  price: number;
  originalPrice: number;
  discount: number;
  group: boolean;
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

  private readonly cities: string[] = [
    'Sin vuelos',
    'Madrid',
    'Barcelona',
    'Valencia',
    'Bilbao',
    'Sevilla',
  ];
  filteredCities: string[] = [];

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

  // Add new method to filter departures by city
  filterDeparturesByCity(): void {
    if (this.selectedCity === 'Sin vuelos') {
      this.filteredDepartures = this.departures.filter(
        (departure) => departure.flights === 'Sin vuelos'
      );
    } else {
      this.filteredDepartures = this.departures.filter(
        (departure) => departure.destination === this.selectedCity
      );
    }
    console.log('vuelosFiltrado', this.filteredDepartures);
  }

  // Update ngOnInit with more mock data
  ngOnInit() {
    // Mock data - Replace with actual API call
    this.departures = [
      {
        departureDate: new Date('2024-06-01'),
        returnDate: new Date('2024-06-12'),
        destination: '',
        flights: 'Sin vuelos',
        price: 2745,
        originalPrice: 2945,
        discount: 10,
        group: true,
        waitingList: false,
        status: 'available',
      },
      {
        departureDate: new Date('2024-06-15'),
        returnDate: new Date('2024-06-26'),
        destination: '',
        flights: 'Sin vuelos',
        price: 2699,
        originalPrice: 2899,
        discount: 8,
        group: true,
        waitingList: false,
        status: 'available',
      },
      {
        departureDate: new Date('2024-07-01'),
        returnDate: new Date('2024-07-12'),
        destination: 'Valencia',
        flights: 'Valencia',
        price: 2945,
        originalPrice: 3245,
        discount: 10,
        group: true,
        waitingList: false,
        status: 'available',
      },
      {
        departureDate: new Date('2024-07-15'),
        returnDate: new Date('2024-07-26'),
        destination: 'Bilbao',
        flights: 'Bilbao',
        price: 3045,
        originalPrice: 3345,
        discount: 12,
        group: true,
        waitingList: false,
        status: 'available',
      },
      {
        departureDate: new Date('2024-08-01'),
        returnDate: new Date('2024-08-12'),
        destination: 'Sevilla',
        flights: 'Sevilla',
        price: 2899,
        originalPrice: 3199,
        discount: 18,
        group: true,
        waitingList: false,
        status: 'available',
      },
      {
        departureDate: new Date('2024-08-15'),
        returnDate: new Date('2024-08-26'),
        destination: 'Madrid',
        flights: 'Madrid',
        price: 3399,
        originalPrice: 3699,
        discount: 15,
        group: true,
        waitingList: true,
        status: 'available',
      },
      {
        departureDate: new Date('2024-09-01'),
        returnDate: new Date('2024-09-12'),
        destination: 'Barcelona',
        flights: 'Barcelona',
        price: 3199,
        originalPrice: 3499,
        discount: 12,
        group: true,
        waitingList: false,
        status: 'available',
      },
      {
        departureDate: new Date('2024-09-15'),
        returnDate: new Date('2024-09-26'),
        destination: 'Valencia',
        flights: 'Valencia',
        price: 2799,
        originalPrice: 3099,
        discount: 15,
        group: true,
        waitingList: false,
        status: 'complete',
      },
    ];
    console.log('salidas', this.departures);
    // Initialize filtered departures with "Sin vuelos" options
    this.filteredDepartures = this.departures.filter(
      (departure) => departure.flights === 'Sin vuelos'
    );
  }
}
