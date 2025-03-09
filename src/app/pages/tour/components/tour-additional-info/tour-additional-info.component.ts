import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import {
  ActivePeriod,
  Flight,
  Tour,
} from '../../../../core/models/tours/tour.model';
import { TourDataService } from '../../../../core/services/tours/tour-data.service';

@Component({
  selector: 'app-tour-additional-info',
  standalone: false,
  templateUrl: './tour-additional-info.component.html',
  styleUrl: './tour-additional-info.component.scss',
})
export class TourAdditionalInfoComponent implements OnInit {
  passengerText: any;

  tour: any;
  visible: boolean = false;
  showPassengersPanel: boolean = true;
  travelers = {
    adults: 1,
    children: 0,
    babies: 0,
  };
  periods: any[] | undefined;
  selectedPeriod: any;
  selectedFlight: any;
  traveler: any = {
    name: '',
    email: '',
    phone: '',
  };
  flights: Flight[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private toursService: ToursService,
    private tourDataService: TourDataService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      const selectedFields: (keyof Tour | 'all' | undefined)[] = [
        'extra-info-section', // Asegúrate de incluir 'extra-info-section'
      ];
      this.toursService
        .getTourDetailBySlug(slug, selectedFields)
        .subscribe((tour) => {
          console.log('Fetched tour data:', tour);
          // Ordenar el array 'info-card' por la propiedad 'order'
          if (tour && tour['extra-info-section']?.['infoCard']) {
            tour['extra-info-section']['infoCard'].sort(
              (a, b) => parseInt(a.order) - parseInt(b.order)
            );
          }
          this.tour = tour;
        });
    }
    this.updatePassengerText();
    this.tourDataService.tour$.subscribe((tour: Tour | null) => {
      if (tour) {
        console.log('____Tour data:', tour);

        this.periods = tour.activePeriods.map((period: ActivePeriod) => ({
          name: period.name,
          value: period.externalID,
          flights: period.flights,
        }));
      }
    });
  }

  onPeriodChange(): void {
    const selectedPeriod = this.periods?.find(
      (period) => period.value === this.selectedPeriod
    );
    this.selectedFlight = undefined;
    if (selectedPeriod) {
      this.flights = selectedPeriod.flights.filter(
        (flight: { name: any }, index: any, self: any[]) =>
          index === self.findIndex((f: { name: any }) => f.name === flight.name)
      );
    } else {
      this.flights = [];
    }
    console.log('____Selected period:', selectedPeriod);
    console.log('____Selected flights:', this.flights);
  }

  handleSaveTrip(): void {
    this.visible = true;
  }

  handleDownloadTrip(): void {
    // Implement download trip logic
  }

  handleInviteFriend(): void {
    // Implement invite friend logic
  }

  togglePassengersPanel(event: Event): void {
    this.showPassengersPanel = !this.showPassengersPanel;
    event.stopPropagation();
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  updatePassengers(
    type: 'adults' | 'children' | 'babies',
    change: number
  ): void {
    if (type === 'adults') {
      this.travelers.adults = Math.max(1, this.travelers.adults + change);
    } else if (type === 'children') {
      this.travelers.children = Math.max(0, this.travelers.children + change);
    } else if (type === 'babies') {
      this.travelers.babies = Math.max(0, this.travelers.babies + change);
    }

    this.updatePassengerText();
  }

  applyPassengers(): void {
    this.showPassengersPanel = false;
  }

  updatePassengerText(): void {
    const parts = [];

    if (this.travelers.adults > 0) {
      parts.push(
        `${this.travelers.adults} ${
          this.travelers.adults === 1 ? 'Adulto' : 'Adultos'
        }`
      );
    }

    if (this.travelers.children > 0) {
      parts.push(
        `${this.travelers.children} ${
          this.travelers.children === 1 ? 'Niño' : 'Niños'
        }`
      );
    }

    if (this.travelers.babies > 0) {
      parts.push(
        `${this.travelers.babies} ${
          this.travelers.babies === 1 ? 'Bebé' : 'Bebés'
        }`
      );
    }

    this.passengerText = parts.join(', ');
  }

  saveTrip() {
    console.log('Selected Period:', this.selectedPeriod);
    console.log('Selected Flight:', this.selectedFlight);
    console.log('Travelers:', this.travelers);
    console.log('Traveler Details:', this.traveler);
  }
}
