import { Component } from '@angular/core';
import { HomeService } from '../../../../core/services/home.service';
import { BannerSection } from '../../../../core/models/home/banner/banner-section.model';

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
  }

  selectedDestination: string | null = null;
  departureDate: Date | null = null;
  returnDate: Date | null = null;
  selectedTripType: string | null = null;

  filteredDestinations: string[] = [];
  filteredTripTypes: string[] = [];

  destinations: string[] = ['Europa', 'Asia', 'África', 'América'];
  tripTypes: string[] = ['Cultural', 'Aventura', 'Relax'];

  constructor(private homeService: HomeService) {}

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

  private getBannerSection(): void {
    this.homeService.getBannerSection().subscribe((data: BannerSection) => {
      this.bannerSection = data;
    });
  }
}
