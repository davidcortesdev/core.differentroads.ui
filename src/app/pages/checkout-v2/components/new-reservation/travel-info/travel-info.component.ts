// travel-info.component.ts
import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { forkJoin } from 'rxjs';

// Importaciones de servicios
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../../core/services/reservation/reservation-traveler.service';
import {
  ReservationTravelerFieldService,
  IReservationTravelerFieldResponse,
} from '../../../../../core/services/reservation/reservation-traveler-field.service';
import {
  TourService,
  Tour,
} from '../../../../../core/services/tour/tour.service';
import {
  DepartureService,
  IDepartureResponse,
} from '../../../../../core/services/departure/departure.service';

// Interfaces
interface TravelerWithFields extends IReservationTravelerResponse {
  fields: IReservationTravelerFieldResponse[];
}

@Component({
  selector: 'app-travel-info',
  standalone: false,
  templateUrl: './travel-info.component.html',
  styleUrl: './travel-info.component.scss',
})
export class TravelInfoComponent implements OnInit, OnChanges {
  @Input() reservationId!: number;
  @Input() tourId?: number;
  @Input() departureId?: number;

  // Datos del componente
  travelersWithFields: TravelerWithFields[] = [];
  totalTravelers: number = 0;
  tourInfo: Tour | undefined;
  departureInfo: IDepartureResponse | undefined;
  loading: boolean = false;

  constructor(
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerFieldService: ReservationTravelerFieldService,
    private tourService: TourService,
    private departureService: DepartureService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Recargar datos cuando cambien los inputs
    if (
      changes['reservationId'] ||
      changes['tourId'] ||
      changes['departureId']
    ) {
      this.loadData();
    }
  }

  private loadData(): void {
    if (!this.reservationId) {
      return;
    }

    this.loading = true;

    // Cargar travelers
    this.loadTravelers();

    // Cargar tour info si se proporciona tourId
    if (this.tourId) {
      this.loadTourInfo();
    }

    // Cargar departure info si se proporciona departureId
    if (this.departureId) {
      this.loadDepartureInfo();
    }
  }

  private loadTravelers(): void {

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          this.totalTravelers = travelers.length;

          // Cargar campos de todos los travelers
          this.loadTravelersFields(travelers);
        },
        error: (error) => {
          this.loading = false;
        },
      });
  }

  private loadTravelersFields(travelers: IReservationTravelerResponse[]): void {
    if (travelers.length === 0) {
      this.loading = false;
      return;
    }

    const travelerFieldRequests = travelers.map((traveler) =>
      this.reservationTravelerFieldService.getByReservationTraveler(traveler.id)
    );

    forkJoin(travelerFieldRequests).subscribe({
      next: (allTravelerFields) => {

        // Combinar travelers con sus campos
        this.travelersWithFields = travelers.map((traveler, index) => ({
          ...traveler,
          fields: allTravelerFields[index],
        }));

        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
      },
    });
  }

  private loadTourInfo(): void {
    if (!this.tourId) return;

    this.tourService.getTourById(this.tourId).subscribe({
      next: (tour) => {
        this.tourInfo = tour;

      },
      error: (error) => {
      },
    });
  }

  private loadDepartureInfo(): void {
    if (!this.departureId) return;

    this.departureService.getById(this.departureId).subscribe({
      next: (departure) => {
        this.departureInfo = departure;

      },
      error: (error) => {
      },
    });
  }

  // Getter para saber si hay información para mostrar
  get hasInfo(): boolean {
    return !!(
      this.tourInfo?.name ||
      (this.departureInfo?.departureDate && this.departureInfo?.arrivalDate) ||
      this.totalTravelers > 0
    );
  }
}
