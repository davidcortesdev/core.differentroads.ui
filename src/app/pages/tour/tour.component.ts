import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToursService } from '../../core/services/tours.service';
import { Tour } from '../../core/models/tours/tour.model';
import { catchError, Subject, Subscription } from 'rxjs';
import { OrdersService } from '../../core/services/orders.service';
import { Departure } from './components/tour-departures/tour-departures.component';
import { Order } from '../../core/models/orders/order.model';
import { TourDataService } from '../../core/services/tour-data/tour-data.service';

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
    private tourDataService: TourDataService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.tourSlug = params['slug'];
      this.loadTourDetails();
    });

    // Suscribirse a los cambios de fecha del servicio compartido
    // para mantener sincronizado el componente principal también
    this.subscriptions.add(
      this.tourDataService.selectedDateInfo$.subscribe((dateInfo) => {
        this.selectedDate = dateInfo.date;
        this.tripType = dateInfo.tripType;
        this.departureCity = dateInfo.departureCity || '';
      })
    );
  }

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones al destruir el componente
    this.subscriptions.unsubscribe();
    this.passengerChanges.complete();
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

          if (tourData.activePeriods && tourData.activePeriods.length > 0) {
            const firstPeriod = tourData.activePeriods[0];
            this.tourDataService.getPeriodPrice(firstPeriod.externalID);

            if (firstPeriod.name) {
              this.tourDataService.updateSelectedDateInfo(
                firstPeriod.externalID,
                undefined
              );
            }
          }
        },
        error: (error) => {
          console.error('Error loading tour:', error);
          this.error = true;
          this.loading = false;
        },
      });
  }

  createOrderAndRedirect(periodID: string): void {
    const selectedPeriod = this.tourDataService.getCurrentDateInfo();
    const order: Partial<Order> = {
      periodID: periodID,
      retailerID: '1064',
      status: 'AB',
      owner: 'currentUserEmail',
      travelers: [],
      flights: [
        {
          id: selectedPeriod?.flightID || '',
          externalID: selectedPeriod?.flightID || '',
          name: selectedPeriod?.departureCity?.toLowerCase()?.includes('sin ')
            ? selectedPeriod?.departureCity
            : 'Vuelo desde ' + selectedPeriod?.departureCity,
        },
      ],
      // Se agregan las actividades añadidas desde el tourDataService
      optionalActivitiesRef: this.tourDataService.getSelectedActivities(),
    };

    this.ordersService.createOrder(order).subscribe({
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
