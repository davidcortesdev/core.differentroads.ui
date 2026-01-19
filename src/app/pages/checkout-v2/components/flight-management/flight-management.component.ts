import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { Router } from '@angular/router';
import {
  DepartureService,
  IDepartureResponse,
} from '../../../../core/services/departure/departure.service';
import {
  Tour,
  TourService,
} from '../../../../core/services/tour/tour.service';
import { forkJoin, Subscription } from 'rxjs';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { FlightsNetService, IFlightPackDTO } from '../../services/flightsNet.service';
import { DefaultFlightsComponent } from './default-flights/default-flights.component';
import { FlightSelectionState } from '../../types/flight-selection-state';

@Component({
  selector: 'app-flight-management',
  standalone: false,

  templateUrl: './flight-management.component.html',
  styleUrls: ['./flight-management.component.scss'],
})
export class FlightManagementComponent implements OnInit, OnChanges, OnDestroy {
  @Input() departureId: number = 0;
  @Input() reservationId: number = 0;
  @Input() tourId: number = 0;
  @Input() selectedFlight: IFlightPackDTO | null = null;
  @Input() departureActivityPackId: number | null = null;
  @Input() isStandaloneMode: boolean = false;
  @Output() flightSelectionChange = new EventEmitter<{
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }>();

  @ViewChild(DefaultFlightsComponent)
  defaultFlightsComponent!: DefaultFlightsComponent;

  @ViewChild('specificSearch')
  specificSearchComponent!: any;

  isConsolidadorVuelosActive: boolean = false;
  loginDialogVisible: boolean = false;
  specificSearchVisible: boolean = false;

  private dataSubscription: Subscription | null = null;

  private _cachedTransformedFlight: any = null;
  private _lastSelectedFlightId: number | null = null;

  get transformedSelectedFlight(): any {
    if (!this.selectedFlight) {
      this._cachedTransformedFlight = null;
      this._lastSelectedFlightId = null;
      return null;
    }

    if (this._lastSelectedFlightId !== this.selectedFlight.id) {
      this._cachedTransformedFlight = this.convertFlightsNetToFlightSearch(this.selectedFlight);
      this._lastSelectedFlightId = this.selectedFlight.id;
    }
    return this._cachedTransformedFlight;
  }

  constructor(
    private departureService: DepartureService,
    private tourService: TourService,
    private authService: AuthenticateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private flightsNetService: FlightsNetService
  ) { }

  ngOnInit(): void {
    this.loadTourAndDepartureData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['departureActivityPackId'] &&
      changes['departureActivityPackId'].currentValue !==
      changes['departureActivityPackId'].previousValue
    ) {
      // No action needed
    }

    if (
      (changes['departureId'] &&
        changes['departureId'].currentValue !==
        changes['departureId'].previousValue) ||
      (changes['tourId'] &&
        changes['tourId'].currentValue !== changes['tourId'].previousValue)
    ) {
      this.loadTourAndDepartureData();
    }

    if (changes['selectedFlight']) {
      this.clearFlightCache();
    }
    
    if (changes['specificSearchVisible']) {
      // No action needed
    }
  }

  private clearFlightCache(): void {
    this._cachedTransformedFlight = null;
    this._lastSelectedFlightId = null;
  }

  private loadTourAndDepartureData(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    if (!this.tourId || !this.departureId) {
      this.isConsolidadorVuelosActive = false;
      return;
    }

    this.dataSubscription = forkJoin({
      tour: this.tourService.getTourById(this.tourId),
      departure: this.departureService.getById(this.departureId)
    }).subscribe({
      next: (results) => {
        const tourActive = !!results.tour.isConsolidadorVuelosActive;
        const departureActive = !!results.departure.isConsolidadorVuelosActive;
        
        this.isConsolidadorVuelosActive = tourActive && departureActive;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isConsolidadorVuelosActive = false;
        this.cdr.markForCheck();
      }
    });
  }


  checkAuthAndShowSpecificSearch(): void {
    if (this.isStandaloneMode) {
      this.specificSearchVisible = true;
      return;
    }

    this.authService.isLoggedIn().subscribe((isLoggedIn) => {
      if (isLoggedIn) {
        this.specificSearchVisible = true;
      } else {
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

  async onFlightSelectionChange(flightData: {
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }): Promise<void> {
    this.selectedFlight = flightData.selectedFlight;
    this.flightSelectionChange.emit(flightData);
  }

  onSpecificSearchFlightSelection(flightData: FlightSelectionState): void {
    const convertedFlight = flightData.selectedFlight ? this.convertFlightSearchToFlightsNet(flightData.selectedFlight) : null;

    this.flightSelectionChange.emit({
      selectedFlight: convertedFlight,
      totalPrice: flightData.totalPrice
    });
  }

  async onDefaultFlightSelected(flightData: {
    selectedFlight: IFlightPackDTO | null;
    totalPrice: number;
  }): Promise<void> {
    if (!flightData.selectedFlight) {
      return;
    }

    this.selectedFlight = flightData.selectedFlight;

    if (this.reservationId && this.selectedFlight) {
      try {
        await this.flightsNetService
          .changeReservationFlight(this.reservationId, this.selectedFlight.id, 'default')
          .toPromise();
      } catch (error) {
        // Silent error handling
      }
    }

    this.flightSelectionChange.emit(flightData);
  }

  async onSpecificFlightSelected(flightData: {
    selectedFlight: any | null;
    totalPrice: number;
    shouldAssignNoFlight?: boolean;
  }): Promise<void> {
    if (!flightData.selectedFlight && !flightData.shouldAssignNoFlight) {
      return;
    }

    const convertedFlight = flightData.selectedFlight ? this.convertFlightSearchToFlightsNet(flightData.selectedFlight) : null;
    this.selectedFlight = convertedFlight;

    if (this.reservationId && convertedFlight) {
      try {
        await this.flightsNetService
          .changeReservationFlight(this.reservationId, convertedFlight.id, 'consolidator')
          .toPromise();
      } catch (error) {
        // Silent error handling
      }
    }

    this.flightSelectionChange.emit({
      selectedFlight: convertedFlight,
      totalPrice: flightData.totalPrice
    });
  }

  private convertFlightSearchToFlightsNet(flightSearchFlight: any): IFlightPackDTO {
    return {
      id: flightSearchFlight.id,
      code: flightSearchFlight.code || '',
      name: flightSearchFlight.name || '',
      description: flightSearchFlight.description || '',
      tkId: typeof flightSearchFlight.tkId === 'string' ? parseInt(flightSearchFlight.tkId) || 0 : (flightSearchFlight.tkId || 0),
      itineraryId: flightSearchFlight.itineraryId,
      isOptional: flightSearchFlight.isOptional,
      imageUrl: flightSearchFlight.imageUrl || '',
      imageAlt: flightSearchFlight.imageAlt || '',
      isVisibleOnWeb: flightSearchFlight.isVisibleOnWeb,
      ageGroupPrices: flightSearchFlight.ageGroupPrices?.map((price: any) => ({
        price: price.price || 0,
        ageGroupId: price.ageGroupId || 0,
        ageGroupName: price.ageGroupName || 'Adultos'
      })) || [],
      flights: flightSearchFlight.flights?.map((flight: any) => ({
        id: flight.id,
        tkId: flight.tkId || '',
        name: flight.name || '',
        activityId: flight.activityId,
        departureId: flight.departureId,
        tkActivityPeriodId: flight.tkActivityPeriodId || '',
        tkServiceCombinationId: flight.tkServiceCombinationId || '',
        date: flight.date || '',
        tkServiceId: flight.tkServiceId || '',
        tkJourneyId: flight.tkJourneyId || '',
        flightTypeId: flight.flightTypeId,
        departureIATACode: flight.departureIATACode || '',
        arrivalIATACode: flight.arrivalIATACode || '',
        departureDate: flight.departureDate || '',
        departureTime: flight.departureTime || '',
        arrivalDate: flight.arrivalDate || '',
        arrivalTime: flight.arrivalTime || '',
        departureCity: flight.departureCity || '',
        arrivalCity: flight.arrivalCity || ''
      })) || []
    };
  }

  convertFlightsNetToFlightSearch(flightsNetFlight: IFlightPackDTO): any {
    const baseObject = {
      id: flightsNetFlight.id,
      code: flightsNetFlight.code,
      name: flightsNetFlight.name,
      description: flightsNetFlight.description,
      tkId: flightsNetFlight.tkId.toString(),
      itineraryId: flightsNetFlight.itineraryId,
      isOptional: flightsNetFlight.isOptional,
      imageUrl: flightsNetFlight.imageUrl,
      imageAlt: flightsNetFlight.imageAlt,
      isVisibleOnWeb: flightsNetFlight.isVisibleOnWeb,
      ageGroupPrices: flightsNetFlight.ageGroupPrices?.map((price) => ({
        price: price.price,
        ageGroupId: price.ageGroupId,
        ageGroupName: price.ageGroupName
      })) || [],
      flights: flightsNetFlight.flights?.map((flight) => ({
        id: flight.id,
        tkId: flight.tkId,
        name: flight.name,
        activityId: flight.activityId,
        departureId: flight.departureId,
        tkActivityPeriodId: flight.tkActivityPeriodId,
        tkServiceCombinationId: flight.tkServiceCombinationId,
        date: flight.date,
        tkServiceId: flight.tkServiceId,
        tkJourneyId: flight.tkJourneyId,
        flightTypeId: flight.flightTypeId,
        departureIATACode: flight.departureIATACode,
        arrivalIATACode: flight.arrivalIATACode,
        departureDate: flight.departureDate,
        departureTime: flight.departureTime,
        arrivalDate: flight.arrivalDate,
        arrivalTime: flight.arrivalTime,
        departureCity: flight.departureCity,
        arrivalCity: flight.arrivalCity
      })) || []
    };

    return baseObject;
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }
}
