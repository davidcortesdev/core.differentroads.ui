import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-checkout',
  standalone: false,
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnInit {
  currentStep: number = 1;

  // Tour information
  tourName: string = '';
  tourDates: string = '';
  travelers: number = 0;

  // Cart information
  selectedItems: any[] = [];
  hasFlights: boolean = false;
  subtotal: number = 0;
  total: number = 0;

  constructor() {}

  ngOnInit() {}

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
