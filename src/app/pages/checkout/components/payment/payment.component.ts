import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-payment',
  standalone: false,
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
})
export class PaymentComponent implements OnInit {
  @Input() totalPrice: string = '1.395 €';
  totalPriceNumeric: number = 1395;

  isOpen: boolean = true;
  isInstallmentsOpen: boolean = false;
  paymentType: string | null = null;
  installmentOption: string | null = null;

  threeInstallments: string = '';
  sixInstallments: string = '';

  isSourceDropdownOpen: boolean = false;
  selectedSource: string = 'Selecciona';
  sourcesOptions: string[] = ['LinkedIn', 'Trivago', 'Booking', 'Otro'];

  termsAccepted: boolean = false;

  ngOnInit() {
    this.calculateInstallments();
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.isInstallmentsOpen = false;
    }
  }

  toggleInstallmentsDropdown() {
    this.isInstallmentsOpen = !this.isInstallmentsOpen;
  }

  toggleSourceDropdown() {
    this.isSourceDropdownOpen = !this.isSourceDropdownOpen;
  }

  selectSource(source: string) {
    this.selectedSource = source;
    this.isSourceDropdownOpen = false;
  }

  onPaymentTypeChange() {
    if (this.paymentType === 'installments') {
      this.isInstallmentsOpen = true;
    } else {
      this.isInstallmentsOpen = false;
      this.installmentOption = null;
    }
  }

  calculateInstallments() {
    if (typeof this.totalPrice === 'string') {
      const priceMatch = this.totalPrice.match(/[\d.,]+/);
      if (priceMatch) {
        this.totalPriceNumeric = parseFloat(
          priceMatch[0].replace('.', '').replace(',', '.')
        );
      }
    }

    const threePaymentAmount = this.totalPriceNumeric / 3;
    this.threeInstallments = `€ ${threePaymentAmount
      .toFixed(2)
      .replace('.', ',')}`;

    const sixPaymentAmount = this.totalPriceNumeric / 6;
    this.sixInstallments = `€ ${sixPaymentAmount.toFixed(2).replace('.', ',')}`;
  }
}
