import {
  Component,
  OnInit,
  HostListener,
  ElementRef,
  Renderer2,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { TourComponent } from '../../tour.component';
import { Tour } from '../../../../core/models/tours/tour.model';
import { TourDataService } from '../../../../core/services/tour-data/tour-data.service';
import { Subscription } from 'rxjs';
import { PeriodPricesService } from '../../../../core/services/tour-data/period-prices.service';
import { TourOrderService } from '../../../../core/services/tour-data/tour-order.service';
import { OptionalActivityRef } from '../../../../core/models/orders/order.model';

@Component({
  selector: 'app-tour-header',
  standalone: false,
  templateUrl: './tour-header.component.html',
  styleUrls: ['./tour-header.component.scss'],
})
export class TourHeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  tour: Partial<Tour> = {};
  marketingTag: string = '';
  selectedDate: string = '';
  tripType: string = '';
  departureCity: string = '';
  selectedActivities: OptionalActivityRef[] = [];

  // Passenger information
  adultsCount: number = 1;
  childrenCount: number = 0;

  // Base and total prices
  basePrice: number = 0;
  totalPrice: number = 0;
  travelersText: string = '';

  private isScrolled = false;
  private headerHeight = 0;
  private subscriptions = new Subscription();
  periodID: any;
  flightID: string | number | undefined;

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService,
    private tourComponent: TourComponent,
    private el: ElementRef,
    private renderer: Renderer2,
    private tourOrderService: TourOrderService
  ) {}

  ngOnInit() {
    this.initializeSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  ngAfterViewInit() {
    this.setHeaderHeight();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.handleScrollEffect();
  }

  bookTour() {
    this.tourComponent.createOrderAndRedirect(this.periodID);
  }

  getDuration(): string {
    const days = this.tour.activePeriods?.[0]?.days;
    return days ? `${days} días, ${days - 1} noches` : '';
  }

  getSelectedActivitiesNames(): string {
    if (!this.selectedActivities?.length) {
      return 'No hay actividades seleccionadas';
    }
    
    return this.selectedActivities
      .map(activity => activity.name)
      .join(', ');
  }
  
  // Helper method for template
  formatDepartureCity(city: string): string {
    const cityLower = city.toLowerCase();
    if (cityLower.includes("sin")) {
      return "Sin vuelos";
    } else if (cityLower.includes("vuelo")) {
      return city;
    }
    return "Vuelo Desde " + city;
  }

  // Private methods
  private initializeSubscriptions() {
    // Load tour data from route params
    this.subscriptions.add(
      this.route.params.subscribe(params => {
        const slug = params['slug'];
        if (slug) {
          this.loadTourData(slug);
        }
      })
    );

    // Subscribe to traveler changes
    this.subscriptions.add(
      this.tourOrderService.selectedTravelers$.subscribe(travelers => {
        this.adultsCount = travelers.adults;
        this.childrenCount = travelers.children;
        this.calculateTotalPrice();
        this.getPassengersInfo();
      })
    );

    // Subscribe to activity changes
    this.subscriptions.add(
      this.tourOrderService.selectedActivities$.subscribe(activities => {
        this.selectedActivities = activities;
        this.calculateTotalPrice();
      })
    );

    // Subscribe to date info changes
    this.subscriptions.add(
      this.tourOrderService.selectedDateInfo$.subscribe(dateInfo => {
        this.selectedDate = dateInfo.date;
        this.periodID = dateInfo.periodID;
        this.tripType = dateInfo.tripType;
        this.departureCity = dateInfo.departureCity || '';
        this.flightID = dateInfo.flightID;
      })
    );
  }

  private loadTourData(slug: string) {
    this.subscriptions.add(
      this.toursService.getTourDetailBySlug(slug).subscribe({
        next: (tourData) => {
          this.tour = { ...this.tour, ...tourData };
          this.marketingTag = tourData.marketingSection?.marketingTag || '';

          if (tourData.price) {
            this.basePrice = tourData.price;
            this.calculateTotalPrice();
          }
        },
        error: (error) => {
          console.error('Error loading tour:', error);
        },
      })
    );
  }

  private calculateTotalPrice(): void {
    this.subscriptions.add(
      this.tourOrderService.getTotalPrice().subscribe(totalPrice => {
        this.totalPrice = totalPrice;
      })
    );
  }

  private getPassengersInfo() {
    this.travelersText = this.tourOrderService.getTravelersText();
  }

  private setHeaderHeight() {
    const headerElement = this.el.nativeElement.querySelector('.tour-header');
    if (headerElement) {
      this.headerHeight = headerElement.offsetHeight;
      document.documentElement.style.setProperty(
        '--header-height',
        `${this.headerHeight}px`
      );
    }
  }

  private handleScrollEffect() {
    const scrollPosition =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    const headerElement = this.el.nativeElement.querySelector('.tour-header');

    if (!headerElement) return;

    const scrollThreshold = 100;

    if (scrollPosition > scrollThreshold && !this.isScrolled) {
      this.renderer.addClass(headerElement, 'scrolled');
      this.renderer.addClass(this.el.nativeElement, 'header-fixed');
      this.isScrolled = true;
    } else if (scrollPosition <= scrollThreshold && this.isScrolled) {
      this.renderer.removeClass(headerElement, 'scrolled');
      this.renderer.removeClass(this.el.nativeElement, 'header-fixed');
      this.isScrolled = false;
    }
  }
}
