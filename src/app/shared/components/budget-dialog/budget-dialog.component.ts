import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Tour, Flight } from '../../../core/models/tours/tour.model';
import { NotificationsService } from '../../../core/services/notifications.service';
import { OrdersService } from '../../../core/services/orders.service';
import { TourDataService } from '../../../core/services/tour-data/tour-data.service';
import {
  DateInfo,
  TourOrderService,
} from '../../../core/services/tour-data/tour-order.service';
import { SummaryService } from '../../../core/services/checkout/summary.service';

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

  // New inputs for flexible usage
  @Input() existingOrderId: string | null = null;
  @Input() tourName: string | null = null;
  @Input() periodName: string | null = null;
  @Input() periodDates: string | null = null;
  @Input() departureCity: string | null = null;
  @Input() tripType: string | null = null;
  @Input() travelersCount: {
    adults: number;
    children: number;
    babies: number;
  } | null = null;
  @Input() periodId: string | null = null;

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
    private notificationsService: NotificationsService,
    private summaryService: SummaryService // Add SummaryService
  ) {}

  ngOnInit(): void {
    // If we don't have inputs, use the service data (tour detail page)
    if (!this.existingOrderId) {
      this.tourOrderService.selectedDateInfo$.subscribe((dateInfo) => {
        this.selectedPeriod = dateInfo;
      });

      this.tourDataService.tour$.subscribe((tour) => {
        this.tourData = tour;
      });

      this.tourOrderService.selectedTravelers$.subscribe((travelers) => {
        this.travelers = travelers;
      });
    } else {
      // Use input values passed from checkout (override service values)
      if (this.travelersCount) {
        this.travelers = this.travelersCount;
      }
    }
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  saveTrip() {
    if (!this.validateForm()) {
      return;
    }
    this.loading = true;

    if (this.existingOrderId) {
      this.updateExistingOrder();
    } else {
      this.createOrder();
    }
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

  // Method for updating existing order (checkout page)
  updateExistingOrder(): void {
    if (!this.existingOrderId) return;

    this.loading = true;

    // Get the current order directly from the summary service
    const orderToUpdate = this.summaryService.getOrderValue();

    if (!orderToUpdate) {
      console.error('No order found in summary service');
      this.loading = false;
      return;
    }

    // Update only the budget-specific fields
    orderToUpdate.status = 'Budget';

    // Use the same pattern as checkout.updateOrder()
    this.ordersService.updateOrder(orderToUpdate._id, orderToUpdate).subscribe({
      next: (response) => {
        console.log('Order updated to budget:', response);

        // Construir los productos a partir del summary de la orden
        const products = this.buildProductsFromOrder(orderToUpdate);

        // Send budget notification email with the constructed products
        this.notificationsService
          .sendBudgetNotificationEmail({
            id: this.existingOrderId!,
            email: this.traveler.email,
            products: products,
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
      },
      error: (error) => {
        console.error('Error updating order:', error);
        this.loading = false;
      },
    });
  }

  // Helper method to build products array from order summary
  buildProductsFromOrder(order: any): any[] {
    if (!order.summary || order.summary.length === 0) {
      return [];
    }

    return order.summary.map((item: any) => {
      return {
        id: '', // No tenemos ID específico en el resumen
        name: item.description,
        price: item.value,
        qty: item.qty,
        total: item.value * item.qty,
      };
    });
  }

  // Original method for creating new order (tour detail page)
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
    if (this.existingOrderId && this.travelersCount) {
      // Custom formatting for checkout page
      const { adults, children, babies } = this.travelersCount;
      let text = '';

      if (adults > 0) {
        text += `${adults} adulto${adults > 1 ? 's' : ''}`;
      }

      if (children > 0) {
        text += text ? ', ' : '';
        text += `${children} niño${children > 1 ? 's' : ''}`;
      }

      if (babies > 0) {
        text += text ? ', ' : '';
        text += `${babies} bebé${babies > 1 ? 's' : ''}`;
      }

      return text;
    }

    // Original method for tour detail page
    return this.tourOrderService.getTravelersText();
  }

  // Helper method to get tour name
  getDisplayTourName(): string {
    return this.tourName || this.tourData?.name || '';
  }

  // Helper method to get period dates
  getDisplayPeriodDate(): string {
    return this.periodDates || this.selectedPeriod?.date || '';
  }

  // Helper method to get departure city
  getDisplayDepartureCity(): string {
    const city = this.departureCity || this.selectedPeriod?.departureCity || '';

    if (city.toLowerCase().includes('sin')) {
      return 'Sin vuelos';
    } else if (city.toLowerCase().includes('vuelo')) {
      return city;
    } else {
      return 'Desde ' + city;
    }
  }

  // Helper method to get trip type
  getDisplayTripType(): string {
    return this.tripType || this.selectedPeriod?.tripType || '';
  }
}
