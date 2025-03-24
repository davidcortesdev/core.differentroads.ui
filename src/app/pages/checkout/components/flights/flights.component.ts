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

  // Add property to store tour destination
  tourDestination: any = { nombre: '', codigo: '' };

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

        // Extract destination information from the first valid flight
        this.extractTourDestination();

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

  // Improved method to extract destination information from flights
  extractTourDestination(): void {
    if (this.flights && this.flights.length > 0) {
      // First try to find a flight that isn't the flightless option
      const validFlight = this.flights.find(
        (flight) =>
          flight.name &&
          !flight.name.toLowerCase().includes('sin ') &&
          flight.outbound &&
          flight.outbound.segments &&
          flight.outbound.segments.length > 0
      );

      if (validFlight && validFlight.outbound.segments.length > 0) {
        // Get the last segment's arrival city as the tour destination
        const lastSegment =
          validFlight.outbound.segments[
            validFlight.outbound.segments.length - 1
          ];

        if (lastSegment) {
          // Extract destination information
          const destinationCity = lastSegment.arrivalCity || '';
          const destinationCode = lastSegment.arrivalIata || '';

          console.log('Extracted tour destination:', {
            city: destinationCity,
            code: destinationCode,
          });

          // Format the destination name nicely if possible
          let formattedName = destinationCity + ' - ' + destinationCode;
          if (destinationCode === 'OSL') {
            formattedName = 'Noruega - Oslo Gardemoen';
          }

          this.tourDestination = {
            nombre: formattedName,
            codigo: destinationCode,
          };

          console.log('Set tour destination:', this.tourDestination);
        }
      } else {
        console.warn(
          'No valid flight found with segments to extract destination'
        );
      }
    }

    // If no destination was found, use a default
    if (!this.tourDestination.codigo) {
      this.tourDestination = {
        nombre: 'Noruega - Oslo Gardemoen',
        codigo: 'OSL',
      };
      console.log('Using default tour destination:', this.tourDestination);
    }
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
