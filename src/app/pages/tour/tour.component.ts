import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToursService } from '../../core/services/tours.service';
import { Tour } from '../../core/models/tours/tour.model';
import { catchError, Subject, Subscription, finalize } from 'rxjs';
import { OrdersService } from '../../core/services/orders.service';
import { TourDataService } from '../../core/services/tour-data/tour-data.service';
import { TourOrderService } from '../../core/services/tour-data/tour-order.service';
import { AuthenticateService } from '../../core/services/auth-service.service';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-tour',
  standalone: false,
  templateUrl: './tour.component.html',
  styleUrls: ['./tour.component.scss'],
})
export class TourComponent implements OnInit, OnDestroy {
  tourSlug: string = '';
  tour?: Tour;
  loading: boolean = true;
  error: boolean = false;
  currentUserEmail: string = '';
  filterByStatus: boolean = true;

  // Subject para comunicar cambios en los pasajeros
  passengerChanges = new Subject<{ adults: number; children: number }>();

  // Información de itinerario compartida
  selectedDate: string = '';
  tripType: string = '';
  departureCity: string = '';

  private isInitialLoad = true;
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService,
    private ordersService: OrdersService,
    private router: Router,
    private tourOrderService: TourOrderService,
    private tourDataService: TourDataService,
    private authenticateService: AuthenticateService,
    private titleService: Title,
    private metaService: Meta
  ) {}

  ngOnInit(): void {
    this.initializeRouteSubscriptions();
    this.initializeServiceSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.passengerChanges.complete();
    this.tourOrderService.resetState();
  }

  onPassengerChange(data: { adults: number; children: number }): void {
    this.passengerChanges.next(data);
  }

  createOrderAndRedirect(periodID: string): void {
    if (!periodID) {
      console.error('No se proporcionó un ID de periodo válido');
      return;
    }
    
    this.loading = true;
    const ownerEmail = this.currentUserEmail || 'anonymous';
    
    this.tourOrderService
      .createOrder({
        periodID: periodID,
        status: 'AB',
        owner: ownerEmail
      })
      .pipe(
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (createdOrder) => {
          this.router.navigate(['/checkout', createdOrder._id], {
            queryParams: { filterByStatus: this.filterByStatus ? 'true' : 'false' }
          });
        },
        error: (error) => {
          console.error('Error creating order:', error);
        },
      });
  }

  getDuration(days: number | undefined): string {
    if (!days) return '';
    return `${days} días, ${days - 1} noches`;
  }

  private initializeRouteSubscriptions(): void {
    // Suscripción a parámetros de ruta
    this.subscriptions.add(
      this.route.params.subscribe((params) => {
        this.tourSlug = params['slug'];
      })
    );

    // Suscripción a fragmentos para navegación
    this.subscriptions.add(
      this.route.fragment.subscribe(fragment => {
        if (fragment && !this.isInitialLoad) {
          this.scrollToFragment(fragment);
        }
        this.isInitialLoad = false;
      })
    );

    // Suscripción a query params
    this.subscriptions.add(
      this.route.queryParams.subscribe((queryParams) => {
        this.filterByStatus = queryParams['filterByStatus'] !== 'false';
        this.tourDataService.setUnpublish(this.filterByStatus);
        
        if (this.tourSlug) {
          this.loadTourDetails();
        }
      })
    );
  }

  private initializeServiceSubscriptions(): void {
    // Suscripción a cambios de fecha
    this.subscriptions.add(
      this.tourOrderService.selectedDateInfo$.subscribe((dateInfo) => {
        this.selectedDate = dateInfo.date;
        this.tripType = dateInfo.tripType;
        this.departureCity = dateInfo.departureCity || '';
      })
    );

    // Suscripción al email del usuario
    this.subscriptions.add(
      this.authenticateService.getUserEmail().subscribe((email) => {
        this.currentUserEmail = email;
      })
    );
  }

  private scrollToFragment(fragment: string): void {
    setTimeout(() => {
      const element = document.getElementById(fragment);
      if (element) {
        const headerHeight = document.querySelector('.tour-header')?.clientHeight || 0;
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - headerHeight;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'auto'
        });
      }
    }, 10);
  }

  private loadTourDetails(): void {
    this.loading = true;
    this.error = false;

    this.toursService
      .getTourDetailBySlug(this.tourSlug, [
        'activePeriods',
        'basePrice',
        'price',
        'tags',
        'name',
        'description',
        'seo'
      ], this.filterByStatus)
      .pipe(
        catchError((error) => {
          console.error('Error loading tour:', error);
          this.error = true;
          this.loading = false;
          return [];
        }),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (tourData: Tour) => {
          this.tour = tourData;
          this.updateMetadata();
          this.tourDataService.updateTour(tourData);
        },
        error: (error) => {
          console.error('Error loading tour:', error);
          this.error = true;
        },
      });
  }

  private updateMetadata(): void {
    if (this.tour && this.tour.name) {
      // Actualizar título
      this.titleService.setTitle(`${this.tour.name} - Different Roads`);
      // Actualizar meta tags
      // Meta descripción limitada a 160 caracteres
      const description = this.tour.seo.description || `Descubre ${this.tour.seo.title} con Different Roads`;
      const shortDescription = description.length > 160 ? description.substring(0, 157) + '...' : description;
      this.metaService.updateTag({ name: 'description', content: shortDescription });
      
      // Añadir meta tags para redes sociales si hay imagen disponible
      if (this.tour.image && this.tour.image[0]?.url) {
        this.metaService.updateTag({ property: 'og:image', content: this.tour.image[0].url });
        this.metaService.updateTag({ property: 'og:title', content: this.tour.name });
        this.metaService.updateTag({ property: 'og:description', content: shortDescription });
      }
    }
  }
}
