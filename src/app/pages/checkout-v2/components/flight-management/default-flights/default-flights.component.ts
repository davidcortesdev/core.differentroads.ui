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
  FlightsNetService,
  IFlightDetailDTO,
  IFlightPackDTO,
} from '../../../services/flightsNet.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../../core/services/reservation/reservation-traveler.service';
import {
  ActivityPackAvailabilityService,
  IActivityPackAvailabilityResponse,
} from '../../../../../core/services/activity/activity-pack-availability.service';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface FlightPackWithAvailability extends IFlightPackDTO {
  availablePlaces?: number;
}

@Component({
  selector: 'app-default-flights',
  standalone: false,
  templateUrl: './default-flights.component.html',
  styleUrls: ['./default-flights.component.scss'],
})
export class DefaultFlightsComponent implements OnInit, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() selectedFlightFromParent: IFlightPackDTO | null = null;
  @Input() departureActivityPackId: number | null = null;
  @Output() flightSelectionChange = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }>();
  @Output() defaultFlightSelected = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }>();

  private isInternalSelection: boolean = false;

  selectedFlight: IFlightPackDTO | null = null;
  flightPacks: FlightPackWithAvailability[] = [];
  private allFlightPacks: IFlightPackDTO[] = [];
  private sinVuelosPack: IFlightPackDTO | null = null;
  loginDialogVisible: boolean = false;
  flightDetails: Map<number, IFlightDetailDTO> = new Map();
  travelers: IReservationTravelerResponse[] = [];
  private isProcessing: boolean = false;

  constructor(
    private router: Router,
    private flightsNetService: FlightsNetService,
    private reservationTravelerService: ReservationTravelerService,
    private activityPackAvailabilityService: ActivityPackAvailabilityService
  ) {}

  ngOnInit(): void {
    this.getFlights();
    this.getTravelers();
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (
      changes['departureId'] &&
      changes['departureId'].currentValue &&
      changes['departureId'].currentValue !==
        changes['departureId'].previousValue
    ) {
      this.flightPacks = [];
      this.allFlightPacks = [];
      this.sinVuelosPack = null;
      this.selectedFlight = null;
      this.flightDetails.clear();
      this.getFlights();
    }

    if (
      changes['reservationId'] &&
      changes['reservationId'].currentValue &&
      changes['reservationId'].currentValue !==
        changes['reservationId'].previousValue
    ) {
      this.getTravelers();
    }

    if (
      changes['departureActivityPackId'] &&
      changes['departureActivityPackId'].currentValue !==
        changes['departureActivityPackId'].previousValue
    ) {
      // No action needed
    }

    if (
      changes['selectedFlightFromParent'] &&
      changes['selectedFlightFromParent'].currentValue !==
        changes['selectedFlightFromParent'].previousValue
    ) {
      this.selectedFlight = changes['selectedFlightFromParent'].currentValue;
      this.isInternalSelection = false;
    }
  }

  getFlights(): void {
    if (!this.departureId) {
      this.flightPacks = [];
      this.allFlightPacks = [];
      this.sinVuelosPack = null;
      this.selectedFlight = null;
      return;
    }
    
    this.flightPacks = [];
    this.allFlightPacks = [];
    this.sinVuelosPack = null;
    this.selectedFlight = null;
    this.flightDetails.clear();
    
    this.flightsNetService.getPackSinVuelos(this.departureId).subscribe({
      next: (sinVuelosPack) => {
        this.sinVuelosPack = sinVuelosPack;
        this.loadAllFlights();
      },
      error: (error) => {
        this.sinVuelosPack = null;
        this.loadAllFlights();
      }
    });
  }

  private loadAllFlights(): void {
    if (!this.departureId) {
      return;
    }

    this.flightsNetService.getFlights(this.departureId).subscribe((flights) => {
      this.allFlightPacks = flights.map((pack) => ({
        ...pack,
        availablePlaces: undefined,
      }));

      const sinVuelosPackId = this.sinVuelosPack?.id;
      const filteredFlights = flights.filter((pack) => {
        return sinVuelosPackId ? pack.id !== sinVuelosPackId : true;
      });

      this.flightPacks = filteredFlights.map((pack) => ({
        ...pack,
        availablePlaces: undefined,
      }));

      this.flightPacks.forEach((pack, index) => {
        pack.flights.forEach((flight) => {
          this.getFlightDetail(flight.id);
        });
        this.loadAvailabilityForFlightPack(pack, index);
      });
    });
  }

  private loadAvailabilityForFlightPack(
    pack: FlightPackWithAvailability,
    index: number
  ): void {
    if (!this.departureId) return;

    this.activityPackAvailabilityService
      .getByActivityPackAndDeparture(pack.id, this.departureId)
      .pipe(
        map((availabilities) =>
          availabilities.length > 0 ? availabilities : []
        ),
        catchError((error) => {
          return of([]);
        })
      )
      .subscribe((availabilities: IActivityPackAvailabilityResponse[]) => {
        const availablePlaces =
          availabilities.length > 0
            ? availabilities[0].bookableAvailability
            : 0;

        this.flightPacks[index] = {
          ...this.flightPacks[index],
          availablePlaces,
        };
      });
    }

  private isSinVuelosPack(flightPack: IFlightPackDTO): boolean {
    return this.sinVuelosPack !== null && flightPack.id === this.sinVuelosPack.id;
  }

  private isSelectedFlightFromDeparture(): boolean {
    if (!this.selectedFlight || !this.departureActivityPackId) {
      return false;
    }
    return this.selectedFlight.id === this.departureActivityPackId;
  }

  getTravelers(): void {
    if (!this.reservationId) {
      return;
    }

    this.reservationTravelerService
      .getByReservation(this.reservationId)
      .subscribe({
        next: (travelers) => {
          this.travelers = travelers;
          this.recalculateFlightPrice();
        },
        error: (error) => {
          // Silent error handling
        },
      });
  }

  private recalculateFlightPrice(): void {
    if (!this.selectedFlight) {
      this.flightSelectionChange.emit({
        selectedFlight: null,
        totalPrice: 0,
      });
      return;
    }

    const basePrice =
      this.selectedFlight.ageGroupPrices.find(
        (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
      )?.price || 0;
    const totalTravelers = this.travelers.length;
    const totalPrice = totalTravelers > 0 ? basePrice * totalTravelers : 0;

    this.flightSelectionChange.emit({
      selectedFlight: this.selectedFlight,
      totalPrice: basePrice,
    });
  }

  async selectFlight(flightPack: IFlightPackDTO): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    if (this.isSinVuelosPack(flightPack) && !this.isInternalSelection) {
      this.isProcessing = false;
      return;
    }

    if (this.selectedFlight === flightPack) {
      this.selectedFlight = null;
      this.flightSelectionChange.emit({ selectedFlight: null, totalPrice: 0 });
    } else {
      this.selectedFlight = flightPack;
      
      const basePrice =
        flightPack.ageGroupPrices.find(
          (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
        )?.price || 0;

      this.defaultFlightSelected.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
      });

      this.flightSelectionChange.emit({
        selectedFlight: flightPack,
        totalPrice: basePrice,
      });
    }
    this.isProcessing = false;
  }

  async selectSinVuelos(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    if (this.sinVuelosPack) {
      this.isInternalSelection = true;
      this.selectedFlight = this.sinVuelosPack;

      const basePrice = 0;

      this.flightSelectionChange.emit({
        selectedFlight: this.sinVuelosPack,
        totalPrice: basePrice,
      });

      this.defaultFlightSelected.emit({
        selectedFlight: this.sinVuelosPack,
        totalPrice: basePrice,
      });

      this.isInternalSelection = false;
    }
    this.isProcessing = false;
  }

  getSelectedFlightText(): string {
    if (!this.selectedFlight) {
      return 'Sin Vuelos';
    }

    if (this.selectedFlight.id === this.departureActivityPackId) {
      return 'Vuelo del Departure';
    }

    return `Vuelo ${this.selectedFlight.id}`;
  }

  getSelectedFlightPrice(): number {
    if (!this.selectedFlight) {
      return 0;
    }

    const basePrice =
      this.selectedFlight.ageGroupPrices.find(
        (price) => price.ageGroupId === this.travelers[0]?.ageGroupId
      )?.price || 0;

    return basePrice;
  }

  hasSelectedFlight(): boolean {
    return this.selectedFlight !== null;
  }

  getFlightSummaryInfo(): {
    hasFlight: boolean;
    flightText: string;
    price: number;
    isFromDeparture: boolean;
  } {
    const hasFlight = this.hasSelectedFlight();
    const flightText = this.getSelectedFlightText();
    const price = this.getSelectedFlightPrice();
    const isFromDeparture = this.isSelectedFlightFromDeparture();

    return {
      hasFlight,
      flightText,
      price,
      isFromDeparture,
    };
  }

  getFlightDetail(flightId: number): void {
    this.flightsNetService.getFlightDetail(flightId).subscribe((detail) => {
      this.flightDetails.set(flightId, detail);
    });
  }

  refreshData(): void {
    this.getFlights();
    this.getTravelers();
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
}
