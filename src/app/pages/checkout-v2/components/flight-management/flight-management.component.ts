import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  DepartureService,
  IDepartureResponse,
} from '../../../../core/services/departure/departure.service';
import {
  Tour,
  TourNetService,
} from '../../../../core/services/tourNet.service';
import { AuthenticateService } from '../../../../core/services/auth-service.service';
import { IFlightPackDTO } from '../../services/flightsNet.service';

@Component({
  selector: 'app-flight-management',
  standalone: false,

  templateUrl: './flight-management.component.html',
  styleUrls: ['./flight-management.component.scss'],
})
export class FlightManagementComponent implements OnInit, OnChanges {
  @Input() tourId!: number;
  @Input() departureId!: number;
  @Input() reservationId!: number;
  @Output() flightSelectionChange = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }>();

  isConsolidadorVuelosActive: boolean = false;
  loginDialogVisible: boolean = false;

  constructor(
    private departureService: DepartureService,
    private tourNetService: TourNetService,
    private authService: AuthenticateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTourAndDepartureData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['tourId'] && changes['tourId'].currentValue) ||
      (changes['departureId'] && changes['departureId'].currentValue)
    ) {
      this.loadTourAndDepartureData();
    }
  }

  private loadTourAndDepartureData(): void {
    if (this.tourId) {
      this.tourNetService.getTourById(this.tourId).subscribe({
        next: (tour: Tour) => {
          this.isConsolidadorVuelosActive = !!tour.isConsolidadorVuelosActive;
        },
      });
    }
    if (this.departureId) {
      this.departureService.getById(this.departureId).subscribe({
        next: (departure: IDepartureResponse) => {
          this.isConsolidadorVuelosActive =
            !!departure.isConsolidadorVuelosActive;
        },
        error: () => {
          this.isConsolidadorVuelosActive = false;
        },
      });
    }
  }

  // Métodos para autenticación
  checkAuthAndShowSpecificSearch(): void {
    this.authService.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        // Usuario está logueado, mostrar búsqueda específica
        this.isConsolidadorVuelosActive = true;
      } else {
        // Usuario no está logueado, mostrar modal
        // Guardar la URL actual con el step en sessionStorage (step 1 = vuelos)
        const currentUrl = window.location.pathname;
        const redirectUrl = `${currentUrl}?step=1`;
        sessionStorage.setItem('redirectUrl', redirectUrl);
        this.loginDialogVisible = true;
      }
    });
  }

  closeLoginModal(): void {
    this.loginDialogVisible = false;
  }

  navigateToLogin(): void {
    this.closeLoginModal();
    this.router.navigate(['/login']);
  }

  navigateToRegister(): void {
    this.closeLoginModal();
    this.router.navigate(['/sign-up']);
  }

  onFlightSelectionChange(flightData: {
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }): void {
    this.flightSelectionChange.emit(flightData);
  }
}
