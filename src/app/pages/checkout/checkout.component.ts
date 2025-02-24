import { Component, OnInit } from '@angular/core';
import { OrdersService } from '../../core/services/orders.service';
import { PeriodsService } from '../../core/services/periods.service';
import { PriceData } from '../../core/models/commons/price-data.model';
import { TravelersService } from '../../core/services/checkout/travelers.service';
import { SummaryService } from '../../core/services/checkout/summary.service';
import { Order } from '../../core/models/orders/order.model';
import { RoomsService } from '../../core/services/checkout/rooms.service';
import { ReservationMode } from '../../core/models/tours/reservation-mode.model';
import { PricesService } from '../../core/services/checkout/prices.service';

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
  travelersSelected = {
    adults: 0,
    childs: 0,
    babies: 0,
  };

  // Cart information
  selectedItems: any[] = [];
  hasFlights: boolean = false;
  summary: { qty: number; price: number; description: string }[] = [];
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
  tourID: string = '';
  periodID: string = '';

  constructor(
    private ordersService: OrdersService,
    private periodsService: PeriodsService,
    private travelersService: TravelersService,
    private summaryService: SummaryService,
    private roomsService: RoomsService,
    private pricesService: PricesService
  ) {}

  ngOnInit() {
    const orderId = '67b702314d0586617b90606b';
    this.ordersService.getOrderDetails(orderId).subscribe((order) => {
      console.log('Order details:', order);

      this.orderDetails = order;

      const periodId = order.periodID;
      this.periodsService.getPeriodDetail(periodId).subscribe((period) => {
        console.log('Period details:', period);

        this.tourName = period.name;

        this.tourID = period.tourID;
        this.periodID = periodId;
        this.tourDates = `${period.dayOne} - ${period.returnDate}`;
      });

      this.periodsService.getPeriodPrices(periodId).subscribe((prices) => {
        console.log('Prices:', prices);

        this.prices = prices;
        this.pricesService.updatePrices(prices);
        this.updateOrderSummary();
      });
    });

    this.travelersService.travelersNumbers$.subscribe((data) => {
      this.travelers = data.adults + data.childs + data.babies;
      this.travelersSelected = data;
      this.updateOrderSummary();
    });

    this.summaryService.order$.subscribe((order) => {
      this.order = order;
    });

    this.roomsService.selectedRooms$.subscribe((rooms) => {
      console.log('Selected rooms:', rooms);
      this.rooms = rooms;
      this.updateOrderSummary();
    });
  }

  updateOrderSummary() {
    this.summary = [];

    this.travelersSelected.adults > 0 &&
      this.summary.push({
        qty: this.travelersSelected.adults,
        price:
          this.pricesService.getPriceById(this.tourID, 'Adultos') +
          this.pricesService.getPriceById(this.periodID, 'Adultos'),
        description: 'Adultos',
      });

    this.travelersSelected.childs > 0 &&
      this.summary.push({
        qty: this.travelersSelected.childs,
        price:
          this.pricesService.getPriceById(this.tourID, 'Niños') +
          this.pricesService.getPriceById(this.periodID, 'Niños'),
        description: 'Niños',
      });

    this.travelersSelected.babies > 0 &&
      this.summary.push({
        qty: this.travelersSelected.babies,
        price:
          this.pricesService.getPriceById(this.tourID, 'B') +
          this.pricesService.getPriceById(this.periodID, 'Niños'),
        description: 'Bebes',
      });

    this.rooms.forEach((room) => {
      this.summary.push({
        qty: room.qty || 0,
        price: this.pricesService.getPriceById(room.externalID),
        description: room.name,
      });
    });

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
    this.subtotal = this.summary.reduce(
      (acc, item) => acc + item.price * item.qty,
      0
    );
    this.total = this.subtotal;
  }
}
