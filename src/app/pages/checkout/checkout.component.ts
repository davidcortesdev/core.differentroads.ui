import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-checkout',
  standalone: false,

  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnInit {
  steps: MenuItem[] = [];
  currentStep: number = 0;

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

  ngOnInit() {
    this.initializeSteps();
  }

  private initializeSteps() {
    this.steps = [
      {
        label: 'Personaliza tu viaje',
        routerLink: 'customize',
      },
      {
        label: 'Vuelos',
        routerLink: 'flights',
      },
      {
        label: 'Viajeros',
        routerLink: 'travelers',
      },
      {
        label: 'Pago',
        routerLink: 'payment',
      },
    ];
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  updateOrderSummary(items: any) {
    this.selectedItems = [...this.selectedItems, ...items];
    this.calculateTotals();
  }

  private calculateTotals() {
    this.subtotal = this.selectedItems.reduce(
      (acc, item) => acc + item.price,
      0
    );
    // Add any additional calculations for total (taxes, fees, etc.)
    this.total = this.subtotal;
  }
}
