import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { Flight, Tour } from '../../../../core/models/tours/tour.model';
import {
  DateInfo,
  TourDataService,
} from '../../../../core/services/tour-data.service';
import {
  Order,
  OrderTraveler,
} from '../../../../core/models/orders/order.model';
import { OrdersService } from '../../../../core/services/orders.service';
import { NotificationsService } from '../../../../core/services/notifications.service';

@Component({
  selector: 'app-tour-additional-info',
  standalone: false,
  templateUrl: './tour-additional-info.component.html',
  styleUrl: './tour-additional-info.component.scss',
})
export class TourAdditionalInfoComponent implements OnInit {
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
  visible: boolean = false;
  traveler = {
    name: '',
    email: '',
    phone: '',
  };

  flights: Flight[] = [];
  selectedPeriod: DateInfo | null = null;
  loading: boolean = false;

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private toursService: ToursService,
    private tourDataService: TourDataService,
    private ordersService: OrdersService,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.toursService
        .getTourDetailBySlug(slug, ['extra-info-section'])
        .subscribe((tour) => {
          if (tour && tour['extra-info-section']?.['info-card']) {
            tour['extra-info-section']['info-card'].sort(
              (a, b) => parseInt(a.order) - parseInt(b.order)
            );
          }
          this.tour = tour;
        });
    }

    this.tourDataService.selectedDateInfo$.subscribe((dateInfo) => {
      console.log('Date info:', dateInfo);
      this.selectedPeriod = dateInfo;
    });

    this.tourDataService.tour$.subscribe((tour) => {
      this.tourData = tour;
    });

    this.tourDataService.selectedTravelers$.subscribe((travelers) => {
      this.travelers = travelers;
    });
  }

  handleSaveTrip(): void {
    this.visible = true;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  saveTrip() {
    this.loading = true;
    console.log('Selected Period:', this.selectedPeriod);
    console.log('Traveler Details:', this.traveler);
    this.createOrder();
  }

  createOrder(): void {
    const { selectedPeriod } = this;

    const order: Partial<Order> = {
      periodID: selectedPeriod?.periodID,
      retailerID: '1064',
      status: 'Budget',
      owner: this.traveler.email,
      travelers: this.buildTravelers(),
      flights: selectedPeriod?.flightID,
    };

    this.ordersService.createOrder(order).subscribe({
      next: (createdOrder) => {
        console.log('Order created:', createdOrder);
        this.notificationsService
          .sendBudgetNotificationEmail({
            id: createdOrder._id,
            email: this.traveler.email,
          })
          .subscribe({
            next: (response) => {
              console.log('Budget notification sent:', response);
              this.loading = false;
              this.visible = false;
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

  handleDownloadTrip() {
    throw new Error('Method not implemented.');
  }
  handleInviteFriend() {
    throw new Error('Method not implemented.');
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
