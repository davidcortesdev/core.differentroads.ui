import { Component, Input, OnInit } from '@angular/core';
import { PeriodsService } from '../../../../core/services/periods.service';
import { FlightsService } from '../../../../core/services/checkout/flights.service';
import { Flight } from '../../../../core/models/tours/flight.model';
import { PriceData } from '../../../../core/models/commons/price-data.model';
import { Order } from '../../../../core/models/orders/order.model';

@Component({
  selector: 'app-flights',
  standalone: false,
  templateUrl: './flights.component.html',
  styleUrl: './flights.component.scss',
})
export class FlightsComponent implements OnInit {
  @Input() orderDetails: Order | null = null;

  selectedFlight: Flight | null = null;
  flights: Flight[] = [];
  filteredFlights: Flight[] = [];
  searchedFlights: Flight[] = []; // New property to store search results
  flightlessOption: Flight | null = null;
  showFlightSearch: boolean = false; // Add this property

  constructor(
    private periodsService: PeriodsService,
    private flightsService: FlightsService
  ) {}

  ngOnInit(): void {
    if (this.orderDetails) {
      const periodID = this.orderDetails.periodID;
      this.periodsService.getFlights(periodID).subscribe((flights) => {
        this.flights = flights;
        console.log('Flights:', this.flights);

        this.filteredFlights = this.flights
          .filter(
            (flight) =>
              flight.name && !flight.name.toLowerCase().includes('sin ')
          )
          .map((flight) => {
            return {
              ...flight,
              price: this.calculateTotalPrice(flight),
              priceData: this.calculateTotalPriceData(flight),
            };
          });

        const flightless = this.flights.find(
          (flight) => flight.name && flight.name.toLowerCase().includes('sin ')
        );
        this.flightlessOption = flightless || null;

        // Share the flightless option with the service
        this.flightsService.updateFlightlessOption(this.flightlessOption);

        // Automatically select the flightless option when initialized
        // This makes it available for the stepper button
        if (!this.selectedFlight && this.flightlessOption) {
          this.selectFlight(this.flightlessOption);
        }
      });
    }

    this.flightsService.selectedFlight$.subscribe((flight) => {
      this.selectedFlight = flight;
    });
  }

  // Maneja los cambios en los vuelos filtrados desde el componente de búsqueda
  onFilteredFlightsChange(mockFlights: any[]): void {
    // Aquí adaptas los datos mockeados al formato de Flight que espera tu componente
    this.searchedFlights = mockFlights.map((mockFlight) => {
      // Convertir el MockFlight a Flight
      const flight: any = {
        externalID: mockFlight.id,
        name: mockFlight.name,
        outbound: {
          ...mockFlight.outbound,
          // Asegúrate de mapear correctamente a la estructura que espera el componente flight-itinerary
          prices: mockFlight.outbound.prices,
        },
        inbound: {
          ...mockFlight.inbound,
          // Asegúrate de mapear correctamente a la estructura que espera el componente flight-itinerary
          prices: mockFlight.inbound.prices,
        },
        price: mockFlight.price,
        hasHandBaggage: mockFlight.hasHandBaggage,
        hasCheckedBaggage: mockFlight.hasCheckedBaggage,
      };

      return {
        ...flight,
        price: this.calculateTotalPrice(flight),
        priceData: this.calculateTotalPriceData(flight),
      };
    });
  }

  // Calcula el precio total para adultos
  calculateTotalPrice(flight: any): number {
    const outboundPrice =
      flight.outbound.prices.find((p: any) => p.age_group_name === 'Adultos')
        ?.value || 0;
    const inboundPrice =
      flight.inbound.prices.find((p: any) => p.age_group_name === 'Adultos')
        ?.value || 0;
    return outboundPrice + inboundPrice;
  }

  calculateTotalPriceData(flight: Flight): PriceData[] | undefined {
    const outboundPriceData = flight.outbound.prices;
    const inboundPriceData = flight.inbound.prices;
    const priceData = outboundPriceData?.map((price: PriceData) => {
      return {
        ...price,
        value:
          price.value +
          (inboundPriceData?.filter(
            (p: PriceData) => p.age_group_name === price.age_group_name
          )[0]?.value || 0),
      };
    });
    return priceData;
  }

  // Selecciona un vuelo
  selectFlight(flight: Flight | null): void {
    if (!flight) {
      flight = this.flightlessOption;
    }
    this.selectedFlight = flight;
    this.flightsService.updateSelectedFlight(flight); // Update selected flight in FlightsService
  }

  // Verifica si un vuelo está seleccionado
  isFlightSelected(flight: any): boolean {
    return this.selectedFlight?.externalID === flight.externalID;
  }

  // Add this method to toggle flight search visibility
  toggleFlightSearch(): void {
    this.showFlightSearch = !this.showFlightSearch;
  }
}
