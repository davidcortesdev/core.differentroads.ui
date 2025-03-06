import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../core/services/tours.service';
import { Tour } from '../../core/models/tours/tour.model';
import { catchError } from 'rxjs';
import { OrdersService } from '../../core/services/orders.service';
import { Router } from '@angular/router';
import { Departure } from './components/tour-departures/tour-departures.component';
import { Order } from '../../core/models/orders/order.model';

@Component({
  selector: 'app-tour',
  standalone: false,
  templateUrl: './tour.component.html',
  styleUrls: ['./tour.component.scss'],
})
export class TourComponent implements OnInit {
  tourSlug: string = '';
  tour?: Tour;
  loading: boolean = true;
  error: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService,
    private ordersService: OrdersService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.tourSlug = params['slug'];
      this.loadTourDetails();
    });
  }

  private loadTourDetails(): void {
    this.loading = false;
    this.error = false;

    this.toursService
      .getTourDetailBySlug(this.tourSlug)
      .pipe(
        catchError((error) => {
          console.error('Error loading tour:', error);
          this.error = false;
          this.loading = false;
          return [];
        })
      )
      .subscribe({
        next: (tourData: Tour) => {
          this.tour = tourData;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading tour:', error);
          this.error = true;
          this.loading = false;
        },
      });
  }

  createOrderAndRedirect(departure: Departure): void {
    const order: Partial<Order> = {
      periodID: departure.externalID,
      retailerID: '1064',
      status: 'AB',
      owner: 'currentUserEmail',
      travelers: [],
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
