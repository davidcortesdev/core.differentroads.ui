import { Component, Input, OnInit, HostListener, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-payment',
  standalone: false,
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
})
export class PaymentComponent implements OnInit {
  @Input() totalPrice: string = '1.395 €';
  totalPriceNumeric: number = 1395;
  formattedPrice: string = '1395.00';

  isOpen: boolean = true;
  isInstallmentsOpen: boolean = true;
  paymentType: string | null = null;
  installmentOption: string | null = null;

  threeInstallments: string = '';
  fourInstallments: string = '';

  isSourceDropdownOpen: boolean = false;
  selectedSource: string = 'Selecciona';
  sourcesOptions: string[] = ['LinkedIn', 'Trivago', 'Booking', 'Otro'];

  termsAccepted: boolean = false;
  showScalapayInfo: boolean = false;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  ngOnInit() {
    this.calculateInstallments();
    this.loadScalapayScript();
  }

  loadScalapayScript() {
    if (
      !this.document.querySelector('script[src*="scalapay-widget-loader.js"]')
    ) {
      const script = this.document.createElement('script');
      script.type = 'module';
      script.src =
        'https://cdn.scalapay.com/widget/scalapay-widget-loader.js?version=V5';
      this.document.head.appendChild(script);
    }
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.isInstallmentsOpen = false;
      this.showScalapayInfo = false;
    }
  }

  toggleInstallmentsDropdown() {
    this.isInstallmentsOpen = !this.isInstallmentsOpen;
    if (!this.isInstallmentsOpen) {
      this.showScalapayInfo = false;
    }
  }

  toggleSourceDropdown(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isSourceDropdownOpen = !this.isSourceDropdownOpen;
  }

  selectSource(source: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedSource = source;
    this.isSourceDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const dropdownElement = this.document.querySelector('.dropdown-container');
    if (
      dropdownElement &&
      !dropdownElement.contains(event.target as Node) &&
      this.isSourceDropdownOpen
    ) {
      this.isSourceDropdownOpen = false;
    }
  }

  onPaymentTypeChange() {
    if (this.paymentType === 'installments') {
      this.isInstallmentsOpen = true;
    } else {
      // Si selecciona pago completo:
      this.installmentOption = null; // Resetear la opción de plazos
      this.showScalapayInfo = false; // Ocultar información de Scalapay
      this.isInstallmentsOpen = false; // Ocultar sección de plazos

      // Resetear manualmente los radio buttons de plazos
      setTimeout(() => {
        const radioButtons = document.querySelectorAll(
          'input[name="installmentOption"]'
        );
        radioButtons.forEach((radio: any) => {
          radio.checked = false;
        });
      });
    }
  }

  calculateInstallments() {
    if (typeof this.totalPrice === 'string') {
      const priceMatch = this.totalPrice.match(/[\d.,]+/);
      if (priceMatch) {
        this.totalPriceNumeric = parseFloat(
          priceMatch[0].replace('.', '').replace(',', '.')
        );
        this.formattedPrice = this.totalPriceNumeric.toFixed(2);
      }
    }

    const threePaymentAmount = this.totalPriceNumeric / 3;
    this.threeInstallments = `€ ${threePaymentAmount
      .toFixed(2)
      .replace('.', ',')}`;

    const fourPaymentAmount = this.totalPriceNumeric / 4;
    this.fourInstallments = `€ ${fourPaymentAmount
      .toFixed(2)
      .replace('.', ',')}`;
  }

  onInstallmentOptionChange() {
    this.showScalapayInfo = false; // Ocultar información de Scalapay al cambiar opción
    if (this.installmentOption === 'three') {
      this.formattedPrice = (this.totalPriceNumeric / 3).toFixed(2);
    } else if (this.installmentOption === 'four') {
      this.formattedPrice = (this.totalPriceNumeric / 4).toFixed(2);
    }
  }

  toggleScalapayInfo(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.showScalapayInfo = !this.showScalapayInfo;
  }
}
