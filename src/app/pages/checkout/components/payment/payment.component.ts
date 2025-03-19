import { Component, Input, Output, EventEmitter, OnInit, HostListener, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RedsysService } from '../../../../core/services/checkout/payment/redsys.service';

@Component({
  selector: 'app-payment',
  standalone: false,
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
})
export class PaymentComponent implements OnInit {
  @Input() totalPrice: number = 0;
  @Input() processBooking!: () => Promise<{
    bookingID: string;
    ID: string;
  }>;
  @Output() goBackEvent = new EventEmitter<void>();

  isOpen: boolean = true;
  isInstallmentsOpen: boolean = true;
  isPaymentMethodsOpen: boolean = true;
  paymentType: string | null = null;
  installmentOption: string | null = null;
  paymentMethod: string | null = null;

  isSourceDropdownOpen: boolean = false;
  selectedSource: string = 'Selecciona';
  sourcesOptions: string[] = ['LinkedIn', 'Trivago', 'Booking', 'Otro'];

  termsAccepted: boolean = false;
  isLoading: boolean = false;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private redsysService: RedsysService
  ) {}

  ngOnInit() {
    this.loadScalapayScript();
  }

  loadScalapayScript() {
    if (
      !this.document.querySelector('script[src*="scalapay-widget-loader.js"]')
    ) {
      const script = this.document.createElement('script');
      script.type = 'module';
      script.src = 'https://cdn.scalapay.com/widget/scalapay-widget-loader.js';
      this.document.head.appendChild(script);
    }
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.isInstallmentsOpen = false;
      this.isPaymentMethodsOpen = false;
    }
  }

  toggleInstallmentsDropdown() {
    this.isInstallmentsOpen = !this.isInstallmentsOpen;
  }

  togglePaymentMethodsDropdown() {
    this.isPaymentMethodsOpen = !this.isPaymentMethodsOpen;
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
    if (this.paymentType === 'complete') {
      this.installmentOption = null;
      this.isInstallmentsOpen = false;
      this.isPaymentMethodsOpen = true;

      if (!this.paymentMethod) {
        this.paymentMethod = 'creditCard';
      }

      setTimeout(() => {
        const radioButtons = document.querySelectorAll(
          'input[name="installmentOption"]'
        );
        radioButtons.forEach((radio: any) => {
          radio.checked = false;
        });
      });
    } else if (this.paymentType === 'installments') {
      this.paymentMethod = null;
      this.isInstallmentsOpen = true;
      this.isPaymentMethodsOpen = false;

      setTimeout(() => {
        const radioButtons = document.querySelectorAll(
          'input[name="paymentMethod"]'
        );
        radioButtons.forEach((radio: any) => {
          radio.checked = false;
        });
      });

      setTimeout(() => {
        if (!this.installmentOption) {
          this.installmentOption = 'three';
          this.reloadScalapayWidgets();
        }
      }, 100);
    }
  }

  onPaymentMethodChange() {}

  onInstallmentOptionChange() {
    this.reloadScalapayWidgets();
  }

  reloadScalapayWidgets() {
    setTimeout(() => {
      const priceContainerThree = document.getElementById(
        'price-container-three'
      );
      const priceContainerFour = document.getElementById(
        'price-container-four'
      );

      if (priceContainerThree) {
        priceContainerThree.textContent = `€ ${this.totalPrice.toFixed(2)}`;
      }

      if (priceContainerFour) {
        priceContainerFour.textContent = `€ ${this.totalPrice.toFixed(2)}`;
      }

      const event = new CustomEvent('scalapay-widget-reload');
      window.dispatchEvent(event);
    }, 200);
  }

  redirectToRedSys(publicID: string, price: number, bookingID: string) {
    const formData = this.redsysService.generateFormData(
      bookingID,
      publicID,
      price
    );

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://sis-t.redsys.es:25443/sis/realizarPago';

    Object.entries(formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value as string;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  }

  async submitPayment() {
    this.isLoading = true;
    console.log('Payment Type:', this.paymentType);
    console.log('Payment Method:', this.paymentMethod);
    console.log('Installment Option:', this.installmentOption);
    console.log('Total Price:', this.totalPrice);
    console.log('Terms Accepted:', this.termsAccepted);
    let bookingID: string, ID: string;
    try {
      const response = await this.processBooking();
      bookingID = response.bookingID;
      ID = response.ID;
    } catch (error) {
      console.error('Error processing booking:', error);
    }

    if (
      this.paymentType === 'complete' &&
      this.paymentMethod === 'creditCard'
    ) {
      this.redirectToRedSys(ID!, this.totalPrice, bookingID!);
      return;
    }
    this.isLoading = false;
  }
  
  // Add this method to handle the back button click
  goBack(): void {
    this.goBackEvent.emit();
  }
}
