import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { TourComponent } from '../../tour.component';
import { TourDataService } from '../../../../core/services/tour-data.service';
import { Subscription } from 'rxjs';

export interface Departure {
  name: string;
  departureDate: Date;
  returnDate: Date;
  destination?: string;
  flights?: string;
  flightID: string;
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
  styleUrls: ['./tour-departures.component.scss'],
})
export class TourDeparturesComponent implements OnInit, OnDestroy {
  departures: Departure[] = [];
  filteredDepartures: Departure[] = [];
  selectedCity: string = '';

  // Propiedades para pasajeros (incluye bebés pero no se usarán para el precio)
  travelers = {
    adults: 1,
    children: 0,
    babies: 0,
  };

  // Emitir cambios en la selección de pasajeros (solo adultos y niños)
  @Output() passengerChange = new EventEmitter<{
    adults: number;
    children: number;
  }>();

  passengerText: string = '1 Adulto'; // Valor inicial

  // Nueva propiedad para el panel de pasajeros
  showPassengersPanel: boolean = false;

  // Navegación de mes
  currentMonth: Date = new Date();
  monthName: string = '';
  year: number = 0;

  private cities: string[] = [];
  filteredCities: string[] = [];

  // Para manejar las suscripciones
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService,
    private tourComponent: TourComponent,
    private tourDataService: TourDataService
  ) {}

  filterCities(event: { query: string }): void {
    const query = event.query.toLowerCase();
    this.filteredCities = this.cities.filter((city) =>
      city.toLowerCase().includes(query)
    );
  }

  // Métodos para el selector de pasajeros
  togglePassengersPanel(event: Event): void {
    this.showPassengersPanel = !this.showPassengersPanel;
    event.stopPropagation();
  }

  updatePassengers(
    type: 'adults' | 'children' | 'babies',
    change: number
  ): void {
    if (type === 'adults') {
      this.travelers.adults = Math.max(1, this.travelers.adults + change);
    } else if (type === 'children') {
      this.travelers.children = Math.max(0, this.travelers.children + change);
    } else if (type === 'babies') {
      this.travelers.babies = Math.max(0, this.travelers.babies + change);
    }

    this.tourDataService.updateSelectedTravelers(this.travelers);
    this.updatePassengerText();
  }

  applyPassengers(): void {
    this.showPassengersPanel = false;

    // Emitir cambio de pasajeros al aplicar (solo adultos y niños)
    this.passengerChange.emit({
      adults: this.travelers.adults,
      children: this.travelers.children,
      // No enviamos los bebés para el cálculo del precio
    });
  }

  updatePassengerText(): void {
    const parts = [];

    if (this.travelers.adults > 0) {
      parts.push(
        `${this.travelers.adults} ${
          this.travelers.adults === 1 ? 'Adulto' : 'Adultos'
        }`
      );
    }

    if (this.travelers.children > 0) {
      parts.push(
        `${this.travelers.children} ${
          this.travelers.children === 1 ? 'Niño' : 'Niños'
        }`
      );
    }

    if (this.travelers.babies > 0) {
      parts.push(
        `${this.travelers.babies} ${
          this.travelers.babies === 1 ? 'Bebé' : 'Bebés'
        }`
      );
    }

    this.passengerText = parts.join(', ');
  }

  addToCart(departure: Departure): void {
    // Antes de redirigir, actualizamos la información en el servicio compartido
    const selectedDate = new Date(departure.departureDate);
    const returnDate = new Date(departure.returnDate);

    // Formatear las fechas para mostrar en el header
    const dateString = `${selectedDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    })} - ${returnDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    })}`;

    // Actualizar la información compartida

    this.tourDataService.updateSelectedDateInfo(
      departure.externalID,
      departure.flightID
    );

    this.tourDataService.updateSelectedTravelers(this.travelers);

    // Emitir información de pasajeros (solo adultos y niños)
    this.passengerChange.emit({
      adults: this.travelers.adults,
      children: this.travelers.children,
    });

    // Continuar con la redirección
    //this.tourComponent.createOrderAndRedirect(departure);
  }

  filterDepartures(): void {
    this.filteredDepartures = this.departures.filter(
      (departure) =>
        departure.destination === this.selectedCity ||
        departure.flights === this.selectedCity
    );

    // Actualizar el servicio con la ciudad seleccionada
    this.tourDataService.updateDepartureCity(this.selectedCity);

    // Si hay salidas filtradas, actualizar el precio base
    if (this.filteredDepartures.length > 0) {
      this.tourDataService.updateBasePrice(this.filteredDepartures[0].price);
    }

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

    // Actualizar precios con la primera salida filtrada si existe
    if (this.filteredDepartures.length > 0) {
      this.tourDataService.updateBasePrice(this.filteredDepartures[0].price);
    }
  }

  ngOnInit() {
    this.updateMonthDisplay();
    this.updatePassengerText(); // Inicializa el texto de pasajeros

    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.loadTourData(slug);
      }
    });

    // Emitir la información inicial de pasajeros
    setTimeout(() => {
      this.passengerChange.emit({
        adults: this.travelers.adults,
        children: this.travelers.children,
      });
      this.tourDataService.updateSelectedTravelers(this.travelers);
    }, 0);
  }

  ngOnDestroy() {
    // Limpieza de suscripciones
    this.subscriptions.unsubscribe();
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
                name: period.name,
                departureDate: new Date(period.dayOne),
                returnDate: new Date(period.returnDate),
                destination: flight.name,
                flightID: `${flight.activityID}`,
                flights: flight.name,
                price:
                  tour.basePrice +
                  (period.basePrice || 0) +
                  (flight.prices || 0),
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
        this.setCheapestCityAsDefault();
        this.filterDepartures();
        this.filterDeparturesByMonth(); // Filtrar por el mes actual

        // Si ya tenemos datos disponibles, actualizar el servicio compartido
        // con la información de la primera salida recomendada
        if (this.filteredDepartures.length > 0) {
          const recommendedDeparture = this.filteredDepartures[0];

          // Actualizar la información compartida con los datos iniciales

          this.tourDataService.updateSelectedDateInfo(
            recommendedDeparture.externalID,
            recommendedDeparture.flightID
          );
        }
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
}
