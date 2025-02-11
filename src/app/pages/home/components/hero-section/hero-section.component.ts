import { Component } from '@angular/core';
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
export class HeroSectionComponent {
  bannerSection!: BannerSection;

  ngOnInit(): void {
    this.getBannerSection();
    this.getFiltersSection();
  }

  selectedDestination: string | null = null;
  departureDate: Date | null = null;
  returnDate: Date | null = null;
  selectedTripType: string | null = null;

  filteredDestinations: string[] = [];
  filteredTripTypes: string[] = [];

  destinations: string[] = ['Europa', 'Asia', 'África', 'América'];
  tripTypes: string[] = [];

  constructor(
    private homeService: HomeService,
    private generalConfigService: GeneralConfigService,
    private router: Router
  ) {}

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
    if (this.selectedDestination) {
      queryParams.destination = this.selectedDestination;
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
}
