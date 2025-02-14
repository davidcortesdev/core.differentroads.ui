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
  selectedCity: string = 'Todos los vuelos';
  readonly priceFrom: number = 1500;
  readonly travelers = {
    adults: 1,
    children: 2,
  } as const;

  private readonly cities: string[] = ['Todos los vuelos', 'Madrid', 'Barcelona', 'Valencia'];
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

  ngOnInit() {
    // Mock data - Replace with actual API call
    this.departures = [
      {
        departureDate: new Date('2024-06-01'),
        returnDate: new Date('2024-06-12'),
        destination: '',
        flights: 'Sin vuelos',
        price: 3145,
        originalPrice: 3445,
        discount: 20,
        group: true,
        waitingList: true,
        status: 'available',
      },
      {
        departureDate: new Date('2024-06-04'),
        returnDate: new Date('2024-06-15'),
        destination: 'Barcelona',
        flights: 'Barcelona',
        price: 3145,
        originalPrice: 3445,
        discount: 20,
        group: true,
        waitingList: false,
        status: 'available',
      },
      {
        departureDate: new Date('2024-06-04'),
        returnDate: new Date('2024-06-15'),
        destination: 'Madrid',
        flights: 'Madrid',
        price: 3145,
        originalPrice: 3445,
        discount: 20,
        group: true,
        waitingList: false,
        status: 'available',
      },
      {
        departureDate: new Date('2024-06-04'),
        returnDate: new Date('2024-06-15'),
        destination: 'Madrid',
        flights: 'Madrid',
        price: 3145,
        originalPrice: 3445,
        discount: 20,
        group: true,
        waitingList: true,
        status: 'available',
      },
      {
        departureDate: new Date('2024-07-01'),
        returnDate: new Date('2024-07-12'),
        destination: '',
        flights: 'Sin vuelos',
        price: 3145,
        originalPrice: 3145,
        discount: 0,
        group: true,
        waitingList: false,
        status: 'complete',
      },
    ];
  }
}
