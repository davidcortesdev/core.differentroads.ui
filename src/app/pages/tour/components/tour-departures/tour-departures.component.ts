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
  selectedCity: string = '';
  readonly priceFrom: number = 1500;
  readonly travelers = {
    adults: 1,
    children: 2,
  } as const;

  // Navegación de mes
  currentMonth: Date = new Date();
  monthName: string = '';
  year: number = 0;

  private cities: string[] = [];
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

  filterDepartures(): void {
    this.filteredDepartures = this.departures.filter(
      (departure) =>
        departure.destination === this.selectedCity ||
        departure.flights === this.selectedCity
    );
    console.log('filteredDepartures', this.filteredDepartures);
  }

  // Métodos para la navegación del mes
  updateMonthDisplay(): void {
    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    this.monthName = months[this.currentMonth.getMonth()];
    // Mantenemos el año en la propiedad pero no lo mostramos en la interfaz
    this.year = this.currentMonth.getFullYear();
  }

  previousMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.updateMonthDisplay();
    this.filterDeparturesByMonth();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.updateMonthDisplay();
    this.filterDeparturesByMonth();
  }

  filterDeparturesByMonth(): void {
    const startOfMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      1
    );
    const endOfMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      0
    );

    this.filteredDepartures = this.departures.filter((departure) => {
      const departureDate = new Date(departure.departureDate);
      return departureDate >= startOfMonth && departureDate <= endOfMonth;
    });
  }

  ngOnInit() {
    this.updateMonthDisplay();

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
        this.filterDeparturesByMonth(); // Filtrar por el mes actual
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
