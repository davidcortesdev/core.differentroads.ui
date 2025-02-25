import { Component, Input, OnInit } from '@angular/core';

interface PriceDetail {
  description: string;
  amount: number;
  quantity: number;
  total: number;
}

@Component({
  selector: 'app-prices-section',
  standalone: false,
  templateUrl: './prices-section.component.html',
  styleUrls: ['./prices-section.component.scss'],
})
export class PricesSectionComponent implements OnInit {
  @Input() priceDetails!: PriceDetail[];

  totalPrice: number = 0;

  ngOnInit() {
    this.calculateTotalPrice();
  }

  private calculateTotalPrice() {
    this.totalPrice = this.priceDetails.reduce(
      (sum, item) => sum + item.total,
      0
    );
  }
}
