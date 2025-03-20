import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  HostListener,
  Inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RedsysService } from '../../../../core/services/checkout/payment/redsys.service';
import { Router } from '@angular/router';
import { BookingsService } from '../../../../core/services/bookings.service';
import { Payment } from '../../../../core/models/bookings/payment.model';

@Component({
  selector: 'app-payment',
  standalone: false,
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
})
export class PaymentComponent implements OnInit, OnChanges {
  @Input() totalPrice: number = 0;
  @Input() processBooking!: () => Promise<{
    bookingID: string;
    ID: string;
  }>;
  @Input() departureDate: string | null = null;
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

  // Deposit payment variables
  depositAmount: number = 200;
  daysBeforeReservation: number = 30;
  remainingAmount: number = 0;
  paymentDeadline: string = '';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private redsysService: RedsysService,
    private bookingsService: BookingsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadScalapayScript();
    this.calculateRemainingAmount();
    this.calculatePaymentDeadline();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['departureDate'] && this.departureDate) {
      this.calculatePaymentDeadline();
    }
    if (changes['totalPrice']) {
      this.calculateRemainingAmount();
    }
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
    if (this.paymentType === 'complete' || this.paymentType === 'deposit') {
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
    if (this.isLoading) return; // Prevent multiple submissions

    this.isLoading = true;
    console.log('Payment process started');
    console.log('Payment Type:', this.paymentType);
    console.log('Payment Method:', this.paymentMethod);
    console.log('Installment Option:', this.installmentOption);
    console.log('Total Price:', this.totalPrice);

    try {
      const response = await this.processBooking();
      const bookingID = response.bookingID;
      const ID = response.ID;

      console.log('Booking created successfully:', bookingID);

      // Determine the payment amount based on payment type
      const paymentAmount =
        this.paymentType === 'deposit' ? this.depositAmount : this.totalPrice;

      console.log(`Processing payment of ${paymentAmount}`);

      const payment = await this.createPayment(bookingID, {
        amount: paymentAmount,
        registerBy: 'user',
      });

      const publicID = payment.publicID;
      console.log('Payment created:', payment);

      // Handle payment method redirect
      if (this.paymentMethod === 'creditCard') {
        console.log('Redirecting to credit card payment');
        this.redirectToRedSys(ID, paymentAmount, bookingID);
        return;
      } else if (this.paymentMethod === 'transfer') {
        console.log('Redirecting to bank transfer page');
        this.router.navigate([
          `/reservation/${bookingID}/transfer/${publicID}`,
        ]);
        return;
      }
    } catch (error) {
      console.error('Error in payment process:', error);
    } finally {
      // This will only run if we didn't redirect earlier
      this.isLoading = false;
    }
  }

  // Add this method to handle the back button click
  goBack(): void {
    this.goBackEvent.emit();
  }

  createPayment(
    bookingID: string,
    payment: {
      amount: number;
      registerBy: string;
    }
  ): Promise<Payment> {
    return new Promise((resolve, reject) => {
      this.bookingsService.createPayment(bookingID, payment).subscribe({
        next: (response) => {
          resolve(response);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  calculateRemainingAmount() {
    this.remainingAmount = this.totalPrice - this.depositAmount;
  }

  calculatePaymentDeadline() {
    if (this.departureDate) {
      const departureDate = new Date(this.departureDate);
      const deadline = new Date(departureDate);
      deadline.setDate(deadline.getDate() - this.daysBeforeReservation);

      this.paymentDeadline = deadline.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } else {
      // Default deadline if no departure date provided
      const today = new Date();
      const defaultDeadline = new Date(today);
      defaultDeadline.setDate(defaultDeadline.getDate() + 30);

      this.paymentDeadline = defaultDeadline.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }
  }
}
