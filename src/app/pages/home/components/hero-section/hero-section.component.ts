import { Component, Input, OnInit } from '@angular/core';
import { HomeService } from '../../../../core/services/home.service';
import { GeneralConfigService } from '../../../../core/services/general-config.service';
import { BannerSection } from '../../../../core/models/home/banner/banner-section.model';
import { FiltersSection } from '../../../../core/models/general/filters.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-hero-section',
  standalone: false,
  templateUrl: './hero-section.component.html',
  styleUrls: ['./hero-section.component.scss'],
})
export class HeroSectionComponent implements OnInit {
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

  filterDestinations(event: { query: string }) {
    this.filteredDestinations = this.destinations.filter((destination) =>
      destination.toLowerCase().includes(event.query.toLowerCase())
    );
  }

  filterTripTypes(event: { query: string }) {
    this.filteredTripTypes = this.tripTypes.filter((type) =>
      type.toLowerCase().includes(event.query.toLowerCase())
    );
  }

  searchTrips() {
    const queryParams: any = {};
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
      queryParams.tripType = this.selectedTripType;
    }
    console.log('queryParams', queryParams);

    this.router.navigate(['/tours'], { queryParams });
  }

  private getFiltersSection(): void {
    this.generalConfigService
      .getFiltersSection()
      .subscribe((data: FiltersSection) => {
        this.tripTypes = data['trip-type'];
      });
  }

  private getBannerSection(): void {
    this.homeService.getBannerSection().subscribe((data: BannerSection) => {
      this.bannerSection = data;
    });
  }

  private setInitialValues(): void {
    if (this.initialDestination) {
      this.selectedDestination = this.initialDestination;
      this.destinationInput = this.initialDestination;
    }
    if (this.initialDepartureDate) {
      this.departureDate = new Date(this.initialDepartureDate);
    }
    if (this.initialReturnDate) {
      this.returnDate = new Date(this.initialReturnDate);
    }
    if (this.initialTripType) {
      this.selectedTripType = this.initialTripType;
    } else {
      // Asegurarse de que selectedTripType sea null para que muestre el placeholder
      this.selectedTripType = null;
    }
  }
}
