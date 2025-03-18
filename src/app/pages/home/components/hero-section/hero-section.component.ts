import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { HomeService } from '../../../../core/services/home.service';
import { GeneralConfigService } from '../../../../core/services/general-config.service';
import { BannerSection } from '../../../../core/models/home/banner/banner-section.model';
import { FiltersSection } from '../../../../core/models/general/filters.model';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

interface TripQueryParams {
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  tripType?: string;
}

@Component({
  selector: 'app-hero-section',
  standalone: false,
  templateUrl: './hero-section.component.html',
  styleUrls: ['./hero-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroSectionComponent implements OnInit, OnDestroy {
  @Input() initialDestination: string | null = null;
  @Input() initialDepartureDate: Date | null = null;
  @Input() initialReturnDate: Date | null = null;
  @Input() initialTripType: string | null = null;

  bannerSection!: BannerSection;

  selectedDestination: string | null = null;
  departureDate: Date | null = null;
  returnDate: Date | null = null;
  selectedTripType: string | null = null;
  destinationInput: string | null = null;

  filteredDestinations: string[] = [];
  filteredTripTypes: string[] = [];

  destinations: string[] = ['Europa', 'Asia', 'África', 'América'];
  tripTypes: string[] = [];

  private subscriptions: Subscription = new Subscription();

  constructor(
    private homeService: HomeService,
    private generalConfigService: GeneralConfigService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getBannerSection();
    this.getFiltersSection();
    this.setInitialValues();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  filterDestinations(event: { query: string }): void {
    const query = event.query.toLowerCase().trim();
    this.filteredDestinations = this.destinations.filter(destination => 
      destination.toLowerCase().includes(query)
    );
  }

  filterTripTypes(event: { query: string }): void {
    const query = event.query.toLowerCase().trim();
    this.filteredTripTypes = this.tripTypes.filter(type => 
      type.toLowerCase().includes(query)
    );
  }

  searchTrips(): void {
    const queryParams: TripQueryParams = {};
    
    if (this.destinationInput) {
      queryParams.destination = this.destinationInput.trim();
    }
    
    if (this.departureDate) {
      queryParams.departureDate = this.departureDate
        .toISOString()
        .split('T')[0];
    }
    
    if (this.returnDate) {
      queryParams.returnDate = this.returnDate.toISOString().split('T')[0];
    }
    
    if (this.selectedTripType) {
      queryParams.tripType = this.selectedTripType.trim();
    }
    
    console.log('queryParams', queryParams);
    this.router.navigate(['/tours'], { queryParams });
  }

  private getFiltersSection(): void {
    const subscription = this.generalConfigService
      .getFiltersSection()
      .subscribe({
        next: (data: FiltersSection) => {
          this.tripTypes = data['trip-type'];
        },
        error: (error) => console.error('Error loading filters:', error)
      });
    
    this.subscriptions.add(subscription);
  }

  private getBannerSection(): void {
    const subscription = this.homeService
      .getBannerSection()
      .subscribe({
        next: (data: BannerSection) => {
          this.bannerSection = data;
        },
        error: (error) => console.error('Error loading banner:', error)
      });
    
    this.subscriptions.add(subscription);
  }

  private setInitialValues(): void {
    if (this.initialDestination) {
      this.selectedDestination = this.initialDestination.trim();
      this.destinationInput = this.initialDestination.trim();
    }
    
    if (this.initialDepartureDate) {
      this.departureDate = new Date(this.initialDepartureDate);
    }
    
    if (this.initialReturnDate) {
      this.returnDate = new Date(this.initialReturnDate);
    }
    
    if (this.initialTripType) {
      this.selectedTripType = this.initialTripType.trim();
    } else {
      // Asegurarse de que selectedTripType sea null para que muestre el placeholder
      this.selectedTripType = null;
    }
  }
}
