import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  ViewChild,
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
import { DefaultFlightsComponent } from './default-flights/default-flights.component';

@Component({
  selector: 'app-flight-management',
  standalone: false,

  templateUrl: './flight-management.component.html',
  styleUrls: ['./flight-management.component.scss'],
})
export class FlightManagementComponent implements OnInit, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() tourId: number | null = null;
  @Input() selectedFlight: IFlightPackDTO | null = null; // Nuevo input
  @Output() flightSelectionChange = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }>();

  @ViewChild(DefaultFlightsComponent) defaultFlightsComponent!: DefaultFlightsComponent;

  isConsolidadorVuelosActive: boolean = false;
  loginDialogVisible: boolean = false;
  specificSearchVisible: boolean = false;

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
    let tourConsolidadorActive: boolean | null = null;
    let departureConsolidadorActive: boolean | null = null;

    console.log('🔄 Iniciando carga de datos - tourId:', this.tourId, 'departureId:', this.departureId);

    // Función para verificar si ambas respuestas han llegado
    const checkBothResponses = () => {
      console.log('📊 Verificando respuestas - tour:', tourConsolidadorActive, 'departure:', departureConsolidadorActive);
      
      if (tourConsolidadorActive !== null && departureConsolidadorActive !== null) {
        // Condición AND: ambas deben ser true
        this.isConsolidadorVuelosActive = tourConsolidadorActive && departureConsolidadorActive;
        console.log('✅ Resultado final isConsolidadorVuelosActive:', this.isConsolidadorVuelosActive);
      } else {
        console.log('⏳ Esperando más respuestas...');
      }
    };

    // Cargar datos del tour
    if (this.tourId) {
      console.log('🛫 Cargando datos del tour...');
      this.tourNetService.getTourById(this.tourId).subscribe({
        next: (tour: Tour) => {
          tourConsolidadorActive = !!tour.isConsolidadorVuelosActive;
          console.log('🎯 Tour cargado - isConsolidadorVuelosActive:', tour.isConsolidadorVuelosActive, '-> procesado:', tourConsolidadorActive);
          checkBothResponses();
        },
        error: (error) => {
          tourConsolidadorActive = false;
          console.log('❌ Error cargando tour:', error);
          checkBothResponses();
        },
      });
    } else {
      // Si no hay tourId, asumimos false
      tourConsolidadorActive = false;
      console.log('🚫 No hay tourId, asumiendo false');
      checkBothResponses();
    }

    // Cargar datos del departure
    if (this.departureId) {
      console.log('✈️ Cargando datos del departure...');
      this.departureService.getById(this.departureId).subscribe({
        next: (departure: IDepartureResponse) => {
          departureConsolidadorActive = !!departure.isConsolidadorVuelosActive;
          console.log('🎯 Departure cargado - isConsolidadorVuelosActive:', departure.isConsolidadorVuelosActive, '-> procesado:', departureConsolidadorActive);
          checkBothResponses();
        },
        error: (error) => {
          departureConsolidadorActive = false;
          console.log('❌ Error cargando departure:', error);
          checkBothResponses();
        },
      });
    } else {
      // Si no hay departureId, asumimos false
      departureConsolidadorActive = false;
      console.log('🚫 No hay departureId, asumiendo false');
      checkBothResponses();
    }
  }

  private loadTourData(): void {
    // Este método ya no se usa con la nueva lógica AND
  }

  // Métodos para autenticación
  checkAuthAndShowSpecificSearch(): void {
    this.authService.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        // Usuario está logueado, mostrar sección específica
        this.specificSearchVisible = true;
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

  saveFlightAssignments(): void {
    this.defaultFlightsComponent.saveFlightAssignments();
  }
}
