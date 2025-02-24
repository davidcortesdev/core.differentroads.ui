import { Component, OnInit } from '@angular/core';
import { OrdersService } from '../../core/services/orders.service';
import { PeriodsService } from '../../core/services/periods.service';
import { PriceData } from '../../core/models/commons/price-data.model';
import { TravelersService } from '../../core/services/checkout/travelers.service';
import { SummaryService } from '../../core/services/checkout/summary.service';
import { Order } from '../../core/models/orders/order.model';
import { RoomsService } from '../../core/services/checkout/rooms.service';
import { ReservationMode } from '../../core/models/tours/reservation-mode.model';

@Component({
  selector: 'app-checkout',
  standalone: false,
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnInit {
  currentStep: number = 1;
  orderDetails: any = null;
  availableTravelers: string[] = [];

  // Tour information
  tourName: string = '';
  tourDates: string = '';
  travelers: number = 0;

  // Cart information
  selectedItems: any[] = [];
  hasFlights: boolean = false;
  subtotal: number = 0;
  total: number = 0;
  prices:
    | {
        [key: string]: {
          priceData: PriceData[];
          availability?: number | undefined;
        };
      }
    | undefined = undefined;

  order: Order | null = null;

  // summary
  rooms: ReservationMode[] = [];

  constructor(
    private ordersService: OrdersService,
    private periodsService: PeriodsService,
    private travelersService: TravelersService,
    private summaryService: SummaryService,
    private roomsService: RoomsService
  ) {}

  ngOnInit() {
    const orderId = '67b702314d0586617b90606b';
    this.ordersService.getOrderDetails(orderId).subscribe((order) => {
      console.log('Order details:', order);

      this.orderDetails = order;

      const periodId = order.periodID; // Assuming order has a periodId field
      this.periodsService.getPeriodPrices(periodId).subscribe((prices) => {
        console.log('Prices:', prices);

        this.prices = prices;
      });
    });

    this.travelersService.travelersNumbers$.subscribe((data) => {
      this.travelers = data.adults + data.childs + data.babies;
    });

    this.summaryService.order$.subscribe((order) => {
      this.order = order;
    });

    this.roomsService.selectedRooms$.subscribe((rooms) => {
      console.log('Selected rooms:', rooms);
      this.updateOrderSummaryWithRooms(rooms);
    });
  }

  updateOrderSummary(items: any[]) {
    this.selectedItems = [...this.selectedItems, ...items];
    this.calculateTotals();
  }

  handleTravelersChange(event: {
    adults: number;
    childs: number;
    babies: number;
  }) {
    this.travelers = event.adults + event.childs + event.babies;
  }

  private calculateTotals() {
    this.subtotal = this.selectedItems.reduce(
      (acc, item) => acc + item.price,
      0
    );
    this.total = this.subtotal;
  }

  private updateOrderSummaryWithRooms(rooms: ReservationMode[]) {
    // Logic to update the order summary with the room summary
    console.log('Updating order summary with rooms:', rooms);
    this.rooms = rooms;
  }
}
