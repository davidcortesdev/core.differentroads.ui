import { Component, Input, OnInit } from '@angular/core';
import { PeriodsService } from '../../../../core/services/periods.service';
import { FlightsService } from '../../../../core/services/checkout/flights.service';
import { Flight } from '../../../../core/models/tours/flight.model';
import { PriceData } from '../../../../core/models/commons/price-data.model';
import { Order } from '../../../../core/models/orders/order.model';
import { AuthenticateService } from '../../../../core/services/auth-service.service';
import { Router } from '@angular/router';
import { Period } from '../../../../core/models/tours/period.model';

@Component({
  selector: 'app-flights',
  standalone: false,
  templateUrl: './flights.component.html',
  styleUrl: './flights.component.scss',
})
export class FlightsComponent implements OnInit {
  @Input() orderDetails: Order | null = null;
  @Input() periodData: Period | null = null;

  selectedFlight: Flight | null = null;
  flights: Flight[] = [];
  filteredFlights: Flight[] = [];
  searchedFlights: Flight[] = []; // New property to store search results
  flightlessOption: Flight | null = null;
  showFlightSearch: boolean = false; // Add this property

  // Add property to store tour destination
  tourDestination: any = { nombre: '', codigo: '' };

  // Update property for login modal visibility to match PrimeNG dialog approach
  loginDialogVisible: boolean = false;

  constructor(
    private periodsService: PeriodsService,
    private flightsService: FlightsService,
    private authService: AuthenticateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.orderDetails) {
      const periodID = this.orderDetails.periodID;
      const dayOne = this.periodData?.dayOne || null;
      const returnDate = this.periodData?.returnDate || null;

      this.periodsService.getFlights(periodID).subscribe((flights) => {
        this.flights = flights;
        console.log('Flights:', this.flights);

        // Extract destination information from the first valid flight
        this.extractTourDestination();

        // Pass dayOne and returnDate to the FlightSearchComponent
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
              dayOne, // Add dayOne
              returnDate, // Add returnDate
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
    // Log received data for debugging
    console.log('Received flights from search:', mockFlights);

    if (!mockFlights || mockFlights.length === 0) {
      this.searchedFlights = [];
      return;
    }

    // Aquí adaptas los datos al formato de Flight que espera tu componente
    this.searchedFlights = mockFlights
      .map((flight) => {
        if (!flight) return null;

        // Ensure the flight object has the correct structure
        return {
          ...flight,
          // Make sure price data is properly structured
          price: this.calculateTotalPrice(flight),
          priceData: this.calculateTotalPriceData(flight),
        };
      })
      .filter((flight) => flight !== null); // Filter out any null values

    console.log('Transformed flights for display:', this.searchedFlights);

    // If we receive exactly one flight, it means the user selected a specific flight
    // in the flight search component, so we should automatically select it
    if (
      this.searchedFlights.length === 1 &&
      this.searchedFlights[0].source === 'amadeus'
    ) {
      console.log(
        'Auto-selecting flight from search:',
        this.searchedFlights[0]
      );
      this.selectFlightWithAuthCheck(this.searchedFlights[0]);
    }
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
    this.flightsService.updateSelectedFlight(flight); // This will now handle the order flights update as well

    // Add logging to confirm what's happening
    console.log('Selected flight in FlightsComponent:', flight);
    console.log('Flight has source "amadeus":', flight?.source === 'amadeus');
    console.log('Flightless option available:', this.flightlessOption);
  }

  // Verifica si un vuelo está seleccionado
  isFlightSelected(flight: any): boolean {
    return this.selectedFlight?.externalID === flight.externalID;
  }

  // Keep auth check for flight search toggle
  toggleFlightSearch(): void {
    this.authService.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        this.showFlightSearch = !this.showFlightSearch;
      } else {
        // Save current URL in session storage for redirect after login
        sessionStorage.setItem('redirectUrl', window.location.pathname);
        this.loginDialogVisible = true;
      }
    });
  }

  // Restore the auth check for flight selection
  selectFlightWithAuthCheck(flight: Flight | null): void {
    this.authService.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        this.selectFlight(flight);
      } else {
        // Save current URL in session storage for redirect after login
        sessionStorage.setItem('redirectUrl', window.location.pathname);
        this.loginDialogVisible = true;
      }
    });
  }

  // Update method to close the login modal
  closeLoginModal(): void {
    this.loginDialogVisible = false;
  }

  // Add method to navigate to login page
  navigateToLogin(): void {
    this.closeLoginModal();
    this.router.navigate(['/login']);
  }

  // Add method to navigate to register page
  navigateToRegister(): void {
    this.closeLoginModal();
    this.router.navigate(['/sign-up']); // Changed from '/register' to '/sign-up'
  }
}
