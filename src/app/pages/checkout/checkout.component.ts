import { Component, OnInit } from '@angular/core';
import { OrdersService } from '../../core/services/orders.service';
import { PeriodsService } from '../../core/services/periods.service';
import { PriceData } from '../../core/models/commons/price-data.model';

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

  constructor(
    private ordersService: OrdersService,
    private periodsService: PeriodsService
  ) {}

  ngOnInit() {
    const orderId = '67b702314d0586617b90606b';
    this.ordersService.getOrderDetails(orderId).subscribe((order) => {
      console.log('Order details:', order);

      this.orderDetails = order;

      const periodId = order.periodID; // Assuming order has a periodId field
      this.periodsService.getPeriodPrices(periodId).subscribe((prices) => {
        this.prices = prices;
      });
    });
  }

  updateOrderSummary(items: any[]) {
    this.selectedItems = [...this.selectedItems, ...items];
    this.calculateTotals();
  }

  private calculateTotals() {
    this.subtotal = this.selectedItems.reduce(
      (acc, item) => acc + item.price,
      0
    );
    this.total = this.subtotal;
  }
}
