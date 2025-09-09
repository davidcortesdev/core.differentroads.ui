import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface TripQueryParams {
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  tripType?: string;
}

@Component({
  selector: 'app-hero-section-v2',
  standalone: false,
  templateUrl: './hero-section-v2.component.html',
  styleUrls: ['./hero-section-v2.component.scss'],
})
export class HeroSectionV2Component implements OnInit {
  @Input() initialDestination: string | null = null;
  @Input() initialDepartureDate: Date | null = null;
  @Input() initialReturnDate: Date | null = null;
  @Input() initialTripType: string | null = null;

  // Hardcoded banner data
  bannerSection = {
    bType: true,
    'banner-video':
      'https://d2sk3o7yhm4ek9.cloudfront.net/public/main-banner/desktop/fdb7592e-79e7-41bf-b1dd-36db39611353/different_roads_2025_tours_organizados_video_home.mp4',
  };

  selectedDestination: string | null = null;
  departureDate: Date | null = null;
  returnDate: Date | null = null;
  selectedTripType: string | null = null;
  destinationInput: string | null = null;

  filteredDestinations: string[] = [];
  filteredTripTypes: string[] = [];

  destinations: string[] = ['Europa', 'Asia', 'África', 'América'];

  // Hardcoded trip types
  tripTypes = [
    { label: 'Tours Organizados', value: 'tours-organizados' },
    { label: 'Viajes Familiares', value: 'viajes-familiares' },
    { label: 'Aventura', value: 'aventura' },
    { label: 'Cultural', value: 'cultural' },
    { label: 'Playa', value: 'playa' },
    { label: 'Montaña', value: 'montana' },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.setInitialValues();
  }

  filterDestinations(event: { query: string }): void {
    const query = event.query.toLowerCase().trim();
    this.filteredDestinations = this.destinations.filter((destination) =>
      destination.toLowerCase().includes(query)
    );
  }

  filterTripTypes(event: { query: string }): void {
    const query = event.query.toLowerCase().trim();
    this.filteredTripTypes = this.tripTypes
      .map((t) => t.label)
      .filter((type) => type.toLowerCase().includes(query));
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
      queryParams.tripType = this.selectedTripType.toString().trim();
    }

    console.log('queryParams', queryParams);
    this.router.navigate(['/tours'], { queryParams });
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
