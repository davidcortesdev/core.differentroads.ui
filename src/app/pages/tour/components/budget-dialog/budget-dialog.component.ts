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
    const { selectedPeriod } = this;

    const order: Partial<Order> = {
      periodID: selectedPeriod?.periodID,
      retailerID: '1064',
      status: 'Budget',
      owner: this.traveler.email,
      travelers: this.buildTravelers(),
      flights: [
        {
          id: selectedPeriod?.flightID || '',
          externalID: selectedPeriod?.flightID || '',
          name: this.selectedPeriod?.departureCity
            ?.toLowerCase()
            ?.includes('sin ')
            ? this.selectedPeriod?.departureCity
            : 'Vuelo desde ' + this.selectedPeriod?.departureCity,
        },
      ],
    };

    this.ordersService.createOrder(order).subscribe({
      next: (createdOrder) => {
        const products = [];
        if (this.travelers.adults > 0) {
          products.push({
            name: 'Paquete básico Adultos',
            units: this.travelers.adults,
            singlePrice: this.tourDataService.getPeriodPrice(
              this.selectedPeriod?.periodID!,
              true
            ),
          });
        }
        if (this.travelers.children > 0) {
          products.push({
            name: 'Paquete básico Niños',
            units: this.travelers.children,
            singlePrice: this.tourDataService.getPeriodPrice(
              this.selectedPeriod?.periodID!,
              true
            ),
          });
        }
        if (
          this.selectedPeriod?.flightID &&
          !this.selectedPeriod?.departureCity?.toLowerCase()?.includes('sin ')
        ) {
          products.push({
            name: this.selectedPeriod?.departureCity
              ?.toLowerCase()
              ?.includes('sin ')
              ? this.selectedPeriod?.departureCity
              : 'Vuelo desde ' + this.selectedPeriod?.departureCity,
            units: this.travelers.adults + this.travelers.children,
            singlePrice: this.tourDataService.getFlightPrice(
              this.selectedPeriod?.periodID!,
              this.selectedPeriod?.flightID!
            ),
          });
        }
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
              this.traveler = {
                name: '',
                email: '',
                phone: '',
              };
              this.close.emit();
            },
            error: (error) => {
              console.error('Error sending budget notification:', error);
              this.loading = false;
            },
          });
      },
      error: (error) => {
        console.error('Error creating order:', error);
        this.loading = false;
      },
    });
  }

  buildTravelers(): OrderTraveler[] {
    const travelers: OrderTraveler[] = [];

    const createTraveler = (type: string, i: number): OrderTraveler => ({
      lead: i === 0,
      travelerData: {
        name: i === 0 ? this.traveler.name : 'Pasajero ' + i,
        email: i === 0 ? this.traveler.email : '',
        phone: i === 0 ? this.traveler.phone : '',
        ageGroup: type,
      },
    });

    for (let i = 0; i < this.travelers.adults; i++) {
      travelers.push(createTraveler('Adultos', i));
    }

    for (let i = 0; i < this.travelers.children; i++) {
      travelers.push(createTraveler('Niños', i + this.travelers.adults));
    }

    for (let i = 0; i < this.travelers.babies; i++) {
      travelers.push(
        createTraveler(
          'Bebes',
          i + this.travelers.adults + this.travelers.children
        )
      );
    }

    return travelers;
  }

  getTravelersText() {
    const { adults, children, babies } = this.travelers;

    const adultsText =
      adults > 0 ? `${adults} Adulto` : '' + (adults > 1 ? 's' : '');
    const childrenText =
      children > 0 ? `${children} Niño` : '' + (children > 1 ? 's' : '');
    const babiesText =
      babies > 0 ? `${babies} Bebé` : '' + (babies > 1 ? 's' : '');

    return [adultsText, childrenText, babiesText]
      .filter((text) => text)
      .join(', ');
  }
}
