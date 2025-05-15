import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToursService } from '../../core/services/tours.service';
import { Tour } from '../../core/models/tours/tour.model';
import { catchError, Subject, Subscription } from 'rxjs';
import { OrdersService } from '../../core/services/orders.service';
import { Order } from '../../core/models/orders/order.model';
import { TourDataService } from '../../core/services/tour-data/tour-data.service';
import { TourOrderService } from '../../core/services/tour-data/tour-order.service';
import { AuthenticateService } from '../../core/services/auth-service.service';
import { Title } from '@angular/platform-browser';

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
  filterByStatus: boolean = true; // Por defecto true para filtrar

  // Subject para comunicar cambios en los pasajeros
  passengerChanges = new Subject<{ adults: number; children: number }>();

  // Información de itinerario que podemos compartir
  selectedDate: string = '';
  tripType: string = '';
  departureCity: string = '';

  private isInitialLoad = true;
  // Suscripciones para limpiar al destruir el componente
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService,
    private ordersService: OrdersService,
    private router: Router,
    private tourOrderService: TourOrderService,
    private tourDataService: TourDataService,
    private authenticateService: AuthenticateService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    // Suscribirse a los parámetros de ruta y query params
    this.subscriptions.add(
      this.route.params.subscribe((params) => {
        this.tourSlug = params['slug'];
        // No cargar detalles aquí, esperar a los queryParams
      })
    );

    
  // Modified fragment subscription
  this.subscriptions.add(
    this.route.fragment.subscribe(fragment => {
      // Skip scrolling on initial load
      if (fragment && !this.isInitialLoad) {
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
      
      // Set flag to false after first load
      this.isInitialLoad = false;
    })
  );

    // Suscribirse a los query params
    this.subscriptions.add(
      this.route.queryParams.subscribe((queryParams) => {
        // Obtener el parámetro filterByStatus (por defecto es true)
        // Solo será false si explícitamente viene como 'false' en los query params
        this.filterByStatus = queryParams['filterByStatus'] !== 'false';
        
        // Actualizar el servicio con el valor de filterByStatus
        this.tourDataService.setUnpublish(this.filterByStatus);
        
        // Cargar los detalles del tour después de tener todos los parámetros
        if (this.tourSlug) {
          this.loadTourDetails();
        }
      })
    );

    // Suscribirse a los cambios de fecha del servicio compartido
    // para mantener sincronizado el componente principal también
    this.subscriptions.add(
      this.tourOrderService.selectedDateInfo$.subscribe((dateInfo) => {
        this.selectedDate = dateInfo.date;
        this.tripType = dateInfo.tripType;
        this.departureCity = dateInfo.departureCity || '';
      })
    );

    // Suscribirse al email del usuario autenticado
    this.subscriptions.add(
      this.authenticateService.getUserEmail().subscribe((email) => {
        this.currentUserEmail = email;
      })
    );
  }

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones al destruir el componente
    this.subscriptions.unsubscribe();
    this.passengerChanges.complete();
    
    // Limpiar el estado del servicio
    this.tourOrderService.resetState();
  }

  // Método para recibir actualizaciones de pasajeros desde tour-departures
  onPassengerChange(data: { adults: number; children: number }): void {
    console.log('Passenger change received:', data);
    this.passengerChanges.next(data);
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
      ], this.filterByStatus) // Actualizado el nombre del parámetro
      .pipe(
        catchError((error) => {
          console.error('Error loading tour:', error);
          this.error = true;
          this.loading = false;
          return [];
        })
      )
      .subscribe({
        next: (tourData: Tour) => {
          this.tour = tourData;
          this.loading = false;

          if (this.tour && this.tour.name) {
            this.titleService.setTitle(`${this.tour.name} - Different Roads`);
          }

          this.tourDataService.updateTour(tourData);
          },
        error: (error) => {
          console.error('Error loading tour:', error);
          this.error = true;
          this.loading = false;
        },
      });
  }

  createOrderAndRedirect(periodID: string): void {
    const ownerEmail = this.currentUserEmail
      ? this.currentUserEmail
      : 'anonymous';
    this.tourOrderService
      .createOrder({
        periodID: periodID,
        status: 'AB',
        owner: ownerEmail
      })
      .subscribe({
        next: (createdOrder) => {
          console.log('Order created:', createdOrder);
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
}
