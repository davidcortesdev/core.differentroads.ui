import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { FlightsNetService, IFlightDetailDTO, IFlightPackDTO } from '../../../services/flightsNet.service';


@Component({
  selector: 'app-default-flights',
  standalone: false,

  templateUrl: './default-flights.component.html',
  styleUrl: './default-flights.component.scss'
})
export class DefaultFlightsComponent implements OnInit, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;

  FLIGHT_TYPE_SALIDA = 4;

  selectedFlight: IFlightPackDTO | null = null;
  flightPacks: IFlightPackDTO[] = [];
  loginDialogVisible: boolean = false;
  flightDetails: Map<number, IFlightDetailDTO> = new Map();

  constructor(
    private router: Router,
    private flightsNetService: FlightsNetService
  ) { }

  ngOnInit(): void {
    console.log('ngOnInit');
    this.getFlights();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('ngOnChanges - departureId changed:', changes['departureId']);
    if (changes['departureId'] && changes['departureId'].currentValue && 
        changes['departureId'].currentValue !== changes['departureId'].previousValue) {
      console.log('🔄 Recargando vuelos debido a cambio en departureId');
      this.getFlights();
    }
  }

  getFlights(): void {
    if (!this.departureId) {
      return;
    }
    this.flightsNetService.getFlights(this.departureId).subscribe((flights) => {
      this.flightPacks = flights;
      console.log('Vuelos cargados: ', this.flightPacks);
      this.flightPacks.forEach(pack => {
        pack.flights.forEach(flight => {
          console.log('looking for detail of flight: ', flight);
          this.getFlightDetail(flight.id);
        });
      });
    });
  }

  // // Selecciona un vuelo
  // selectFlight(flight: Flight | null): void {
  //   if (!flight) {
  //     flight = this.flightlessOption;
  //   }
  //   this.selectedFlight = flight;
  //   this.flightsService.updateSelectedFlight(flight); // This will now handle the order flights update as well
  // }

  // // Verifica si un vuelo está seleccionado
  // isFlightSelected(flight: any): boolean {
  //   return this.selectedFlight?.externalID === flight.externalID;
  // }

  // // Keep auth check for flight search toggle
  // toggleFlightSearch(): void {
  //   this.authService.isLoggedIn().subscribe((isLoggedIn) => {
  //     if (isLoggedIn) {
  //       this.showFlightSearch = !this.showFlightSearch;
  //     } else {
  //       // Save current URL in session storage for redirect after login
  //       sessionStorage.setItem('redirectUrl', window.location.pathname);
  //       this.loginDialogVisible = true;
  //     }
  //   });
  // }

  // // Restore the auth check for flight selection
  // selectFlightWithAuthCheck(flight: Flight | null): void {
  //   this.authService.isLoggedIn().subscribe((isLoggedIn) => {
  //     if (isLoggedIn) {
  //       this.selectFlight(flight);
  //     } else {
  //       // Save current URL in session storage for redirect after login
  //       sessionStorage.setItem('redirectUrl', window.location.pathname);
  //       this.loginDialogVisible = true;
  //     }
  //   });
  // }

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

  selectFlight(flightPack: IFlightPackDTO): void {
    this.selectedFlight = flightPack;
  }

  getFlightDetail(flightId: number): void {
    this.flightsNetService.getFlightDetail(flightId).subscribe((detail) => {
      console.log('detail: ', detail);
      this.flightDetails.set(flightId, detail);
    });
  }
}
