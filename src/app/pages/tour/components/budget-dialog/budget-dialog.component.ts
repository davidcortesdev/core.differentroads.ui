import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TourDataService } from '../../../../core/services/tour-data/tour-data.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { NotificationsService } from '../../../../core/services/notifications.service';
import {
  Order,
  OrderTraveler,
} from '../../../../core/models/orders/order.model';
import { Flight, Tour } from '../../../../core/models/tours/tour.model';
import {
  DateInfo,
  TourOrderService,
} from '../../../../core/services/tour-data/tour-order.service';

@Component({
  selector: 'app-budget-dialog',
  standalone: false,
  templateUrl: './budget-dialog.component.html',
  styleUrl: './budget-dialog.component.scss',
})
export class BudgetDialogComponent implements OnInit {
  @Input() visible: boolean = false;

  @Input() handleCloseModal: () => void = () => {};

  @Output() close = new EventEmitter<void>();

  travelers: {
    adults: number;
    children: number;
    babies: number;
  } = {
    adults: 1,
    children: 0,
    babies: 0,
  };
  tour: Tour | null = null;
  tourData: Tour | null = null;
  traveler = {
    name: '',
    email: '',
    phone: '',
  };

  travelerErrors = {
    name: false,
    email: false,
    phone: false,
  };

  flights: Flight[] = [];
  selectedPeriod: DateInfo | null = null;
  loading: boolean = false;

  constructor(
    private sanitizer: DomSanitizer,
    private tourDataService: TourDataService,
    private tourOrderService: TourOrderService,
    private ordersService: OrdersService,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit(): void {
    this.tourOrderService.selectedDateInfo$.subscribe((dateInfo) => {
      this.selectedPeriod = dateInfo;
    });

    this.tourDataService.tour$.subscribe((tour) => {
      this.tourData = tour;
    });

    this.tourOrderService.selectedTravelers$.subscribe((travelers) => {
      this.travelers = travelers;
    });
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  saveTrip() {
    if (!this.validateForm()) {
      return;
    }
    this.loading = true;

    this.createOrder();
  }

  validateForm(): boolean {
    this.travelerErrors.name = !this.traveler.name;
    this.travelerErrors.email = !this.traveler.email;
    this.travelerErrors.phone = !this.traveler.phone;

    return (
      !this.travelerErrors.name &&
      !this.travelerErrors.email &&
      !this.travelerErrors.phone
    );
  }

  createOrder(): void {
    if (!this.validateForm()) {
      return;
    }
    this.loading = true;

    this.tourOrderService
      .createOrder({
        periodID: this.selectedPeriod?.periodID || '',
        status: 'Budget',
        owner: this.traveler.email,
        traveler: this.traveler,
      })
      .subscribe({
        next: (createdOrder) => {
          console.log('Order created:', createdOrder);

          // Use the new method to build products
          this.tourOrderService
            .buildOrderProducts(this.travelers, this.selectedPeriod)
            .subscribe((products) => {
              // Send budget notification email
              this.notificationsService
                .sendBudgetNotificationEmail({
                  id: createdOrder._id,
                  email: this.traveler.email,
                  products,
                })
                .subscribe({
                  next: (response) => {
                    console.log('Budget notification sent:', response);
                    this.loading = false;
                    this.handleCloseModal();
                    this.traveler = { name: '', email: '', phone: '' };
                    this.close.emit();
                  },
                  error: (error) => {
                    console.error('Error sending budget notification:', error);
                    this.loading = false;
                  },
                });
            });
        },
        error: (error) => {
          console.error('Error creating order:', error);
          this.loading = false;
        },
      });
  }

  getTravelersText() {
    return this.tourOrderService.getTravelersText();
  }
}
