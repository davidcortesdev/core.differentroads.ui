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

  // Subject para comunicar cambios en los pasajeros
  passengerChanges = new Subject<{ adults: number; children: number }>();

  // Información de itinerario que podemos compartir
  selectedDate: string = '';
  tripType: string = '';
  departureCity: string = '';

  // Suscripciones para limpiar al destruir el componente
  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService,
    private ordersService: OrdersService,
    private router: Router,
    private tourOrderService: TourOrderService,
    private tourDataService: TourDataService,
    private authenticateService: AuthenticateService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.tourSlug = params['slug'];
      this.loadTourDetails();
    });

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
        'tags', // Add this line to ensure tags are fetched
      ])
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
          this.tourDataService.updateTour(tourData);
  
          // Add this line to debug
          console.log('Tour tags:', tourData.tags);

          // if (tourData.activePeriods && tourData.activePeriods.length > 0) {
          //   const firstPeriod = tourData.activePeriods[0];
          //   this.tourDataService.getPeriodPrice(firstPeriod.externalID);

          //   if (firstPeriod.name) {
          //     this.tourOrderService.updateSelectedDateInfo(
          //       firstPeriod.externalID,
          //       undefined
          //     );
          //   }
          // }
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
        owner: ownerEmail,
      })
      .subscribe({
        next: (createdOrder) => {
          console.log('Order created:', createdOrder);
          this.router.navigate(['/checkout', createdOrder._id]);
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
