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

  // Información de pasajeros
  adultsCount: number = 1;
  childrenCount: number = 0;

  // Precio base y total
  basePrice: number = 0;
  totalPrice: number = 0;
  travelersText: string = '';

  private isScrolled = false;
  private headerHeight = 0;
  private subscriptions: Subscription = new Subscription();
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
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.loadTourData(slug);
      }
    });

    // Suscribirse a cambios de pasajeros
    this.tourOrderService.selectedTravelers$.subscribe((travelers) => {
      this.adultsCount = travelers.adults;
      this.childrenCount = travelers.children;
      this.calculateTotalPrice();
      this.getPassengersInfo();
      console.log('Travelers:', travelers);
    });

    this.tourOrderService.selectedActivities$.subscribe((activities) => {
      this.selectedActivities = activities;
      this.calculateTotalPrice();
    });

    // Suscribirse a los cambios en la información de fechas y precios
    this.subscriptions.add(
      this.tourOrderService.selectedDateInfo$.subscribe((dateInfo) => {
        this.selectedDate = dateInfo.date;
        this.periodID = dateInfo.periodID;
        this.tripType = dateInfo.tripType;
        this.departureCity = dateInfo.departureCity || '';
        this.flightID = dateInfo.flightID;
      })
    );
  }

  ngOnDestroy() {
    // Limpiar suscripciones para evitar memory leaks
    this.subscriptions.unsubscribe();
  }

  ngAfterViewInit() {
    // Obtener la altura del encabezado
    const headerElement = this.el.nativeElement.querySelector('.tour-header');
    if (headerElement) {
      this.headerHeight = headerElement.offsetHeight;

      // Establecer la altura como variable CSS personalizada
      document.documentElement.style.setProperty(
        '--header-height',
        `${this.headerHeight}px`
      );
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    const headerElement = this.el.nativeElement.querySelector('.tour-header');

    if (!headerElement) return;

    // Umbral de scroll - puede ajustarse según necesidades
    const scrollThreshold = 100;

    if (scrollPosition > scrollThreshold && !this.isScrolled) {
      // Aplicar clase scrolled al header
      this.renderer.addClass(headerElement, 'scrolled');

      // Añadir clase al componente para activar el espaciado
      this.renderer.addClass(this.el.nativeElement, 'header-fixed');

      this.isScrolled = true;
    } else if (scrollPosition <= scrollThreshold && this.isScrolled) {
      // Quitar clase scrolled al header
      this.renderer.removeClass(headerElement, 'scrolled');

      // Quitar clase al componente para desactivar el espaciado
      this.renderer.removeClass(this.el.nativeElement, 'header-fixed');

      this.isScrolled = false;
    }
  }

  private loadTourData(slug: string) {
    this.toursService.getTourDetailBySlug(slug).subscribe({
      next: (tourData) => {
        console.log('Tour Data:', tourData);
        this.tour = {
          ...this.tour,
          ...tourData,
        };
        // Extraer el marketingTag si existe
        this.marketingTag = tourData.marketingSection?.marketingTag || '';

        // Establecer el precio base inicial
        if (tourData.price) {
          this.basePrice = tourData.price;
          this.calculateTotalPrice();
        }
      },
      error: (error) => {
        console.error('Error loading tour:', error);
      },
    });
  }

  getDuration(): string {
    const days = this.tour.activePeriods?.[0]?.days;
    return days ? `${days} días, ${days - 1} noches` : '';
  }

  // Calcular precio total basado en número de adultos y niños
  calculateTotalPrice(): void {
    this.tourOrderService.getTotalPrice().subscribe((totalPrice) => {
      this.totalPrice = totalPrice;
    });
  }

  // Obtener texto de pasajeros para mostrar
  getPassengersInfo() {
    this.travelersText = this.tourOrderService.getTravelersText();
  }

  bookTour() {
    this.tourComponent.createOrderAndRedirect(this.periodID);
  }
}
