import { Component, HostListener, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { RedsysService } from '../../core/services/checkout/payment/redsys.service';
import { BookingsService } from '../../core/services/bookings.service';
import { Payment } from '../../core/models/bookings/payment.model';
import { PaymentOptionsService } from '../../core/services/checkout/paymentOptions.service';
import { PaymentOption } from '../../core/models/orders/order.model';
import { SummaryService } from '../../core/services/checkout/summary.service';
import { AuthenticateService } from '../../core/services/auth-service.service';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss'],
  standalone: false,
})
export class PaymentsComponent implements OnInit {
  // Estado de la sección de opciones de pago
  isOpen: boolean = true;
  paymentType: string = '';
  totalPrice: number = 0;
  paidAmount: number = 0;
  depositAmount: number = 200; // Valor de ejemplo
  paymentDeadline: string = '15/08/2023'; // Valor de ejemplo

  // Estado para métodos de pago
  isPaymentMethodsOpen: boolean = true;
  paymentMethod: 'transfer' | 'creditCard' | undefined;

  // Estado para pagos a plazos
  isInstallmentsOpen: boolean = true;
  installmentOption: string = '';

  // Resumen final (total a pagar)
  total: number = 1000; // Valor de ejemplo

  // Source tracking
  isSourceDropdownOpen: boolean = false;
  selectedSource: string = 'Selecciona';
  sourcesOptions: string[] = ['LinkedIn', 'Trivago', 'Booking', 'Otro'];

  // General state
  termsAccepted: boolean = false;
  isLoading: boolean = false;

  // Payment info
  bookingID: string = '';

  // Order summary
  summary: { qty: number; value: number; description: string }[] = [];
  remainingAmount: number = 200;
  daysBeforeReservation: number = 30;
  amountToPay: number = 200;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private route: ActivatedRoute,
    private router: Router,
    private redsysService: RedsysService,
    private bookingsService: BookingsService,
    private paymentOptionsService: PaymentOptionsService,
    private summaryService: SummaryService,
    private messageService: MessageService,
    private authService: AuthenticateService
  ) {}

  ngOnInit() {
    // Load booking ID from route params
    this.route.params.subscribe((params) => {
      this.bookingID = params['id'];
      this.loadBookingDetails();
    });

    this.loadScalapayScript();
    this.calculatePaymentDeadline();
  }

  loadBookingDetails() {
    if (!this.bookingID) return;

    this.isLoading = true;
    this.bookingsService.getBookingById(this.bookingID).subscribe({
      next: (booking) => {
        console.log('Booking loaded:', booking);
        // Initially set totalPrice from periodData if available
        this.totalPrice = booking.periodData?.['total'] || 0;

        // Use extendedTotal from extraData to connect the summary and recalculate totalPrice
        if (booking.periodData?.['extendedTotal']) {
          this.summary = booking.periodData['extendedTotal'];
          this.totalPrice = this.summary.reduce(
            (acc, item) => acc + item.value * item.qty,
            0
          );
        }

        // Calculate remaining amount for deposit
        this.calculateRemainingAmount();

        // Llamada al nuevo método para obtener los pagos y actualizar totales
        this.fetchPayments();

        // If we have departure date, calculate payment deadline
        if (booking.periodData?.['dayOne']) {
          this.calculatePaymentDeadline(booking.periodData['dayOne']);
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading booking:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la información de la reserva.',
        });
        this.isLoading = false;
      },
    });
  }

  // NUEVO método para calcular pagos abonados y saldo pendiente
  fetchPayments() {
    this.bookingsService.getPayments(this.bookingID).subscribe((payments) => {
      const totalPaid = payments.reduce(
        (sum, payment) =>
          payment.status === 'COMPLETED' ? sum + payment.amount : sum,
        0
      );
      this.paidAmount = totalPaid;
      this.remainingAmount = this.totalPrice - totalPaid;

      // Agregar líneas al resumen: historial de pagos y pendiente de pago
      /* this.summary.push({
        qty: 1,
        value: this.paidAmount,
        description: 'Historial de pagos',
      }); */
      /* if (this.remainingAmount > 0) {
        this.summary.push({
          qty: 1,
          value: this.remainingAmount,
          description: 'Pendiente de pago',
        });
      } */
    });
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

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  onPaymentTypeChange(): void {
    // Reinicia opciones cuando se cambia de tipo pago
    this.paymentMethod = undefined;
    this.installmentOption = '';
    this.isPaymentMethodsOpen = false;
    this.isInstallmentsOpen = false;
  }

  togglePaymentMethodsDropdown(): void {
    this.isPaymentMethodsOpen = !this.isPaymentMethodsOpen;
  }

  toggleInstallmentsDropdown(): void {
    this.isInstallmentsOpen = !this.isInstallmentsOpen;
  }

  onPaymentMethodChange(): void {
    // Agregar lógica si es necesario
  }

  onInstallmentOptionChange(): void {
    // Agregar lógica si es necesario
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
    this.updatePaymentOption();
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

  redirectToRedSys(
    publicID: string,
    price: number,
    bookingID: string,
    paymentID: string
  ) {
    const formData = this.redsysService.generateFormData(
      bookingID,
      publicID,
      price,
      paymentID
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
    if (this.isLoading || this.amountToPay <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor ingrese un importe válido a abonar.',
      });
      return;
    }

    if (this.amountToPay > this.remainingAmount) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El importe ingresado excede el saldo restante.',
      });
      return;
    }

    this.isLoading = true;
    console.log('Payment process started');
    console.log('Payment Type:', this.paymentType);
    console.log('Payment Method:', this.paymentMethod);
    console.log('Installment Option:', this.installmentOption);
    console.log('Total Price:', this.totalPrice);
    console.log('Terms Accepted:', this.termsAccepted);

    // Update payment option before proceeding
    this.updatePaymentOption();

    try {
      // Determine the payment amount based on payment type
      const paymentAmount =
        this.paymentType === 'deposit'
          ? this.amountToPay
          : this.remainingAmount;
      console.log(`Processing payment of ${paymentAmount}`);

      const payment = await this.createPayment(this.bookingID, {
        amount: paymentAmount,
        registerBy: this.authService.getCurrentUsername(),
        method: this.paymentMethod!,
      });

      const publicID = payment.publicID;

      // Handle payment method redirect
      if (this.paymentMethod === 'creditCard') {
        console.log('Redirecting to credit card payment');
        // Cambiado: intercambiamos publicID y orderID
        this.redirectToRedSys(
          publicID,
          paymentAmount,
          this.bookingID,
          publicID
        );
        return;
      } else if (this.paymentMethod === 'transfer') {
        console.log('Redirecting to bank transfer page');
        this.router.navigate([
          `/reservation/${this.bookingID}/transfer/${publicID}`,
        ]);
        return;
      }
    } catch (error) {
      console.error('Error in payment process:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error en el proceso de pago',
        detail:
          'Ha ocurrido un error al procesar el pago. Por favor, inténtalo de nuevo.',
      });
    } finally {
      // This will only run if we didn't redirect earlier
      this.isLoading = false;
    }
  }

  createPayment(
    bookingID: string,
    payment: {
      amount: number;
      registerBy: string;
      method: 'creditCard' | 'transfer';
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

  updatePaymentOption() {
    if (!this.paymentType) return;

    const paymentOption: PaymentOption = {
      type: this.paymentType as 'complete' | 'installments' | 'deposit',
      source:
        this.selectedSource !== 'Selecciona' ? this.selectedSource : undefined,
    };

    if (
      (this.paymentType === 'complete' || this.paymentType === 'deposit') &&
      this.paymentMethod
    ) {
      paymentOption.method = this.paymentMethod as 'creditCard' | 'transfer';

      // Add deposit amount for deposit payment type
      if (this.paymentType === 'deposit') {
        paymentOption.depositAmount = this.depositAmount;
      }
    }

    if (this.paymentType === 'installments' && this.installmentOption) {
      paymentOption.installmentOption = this.installmentOption as
        | 'three'
        | 'four';
    }

    this.paymentOptionsService.updatePaymentOption(paymentOption);

    // Update the order with payment information
    const currentOrder = this.summaryService.getOrderValue();
    if (currentOrder) {
      currentOrder.payment = paymentOption;
      this.summaryService.updateOrder(currentOrder);
    }
  }

  calculateRemainingAmount() {
    // Si se desea conservar la lógica previa en caso de no contar con pagos (o complementar)
    this.remainingAmount = this.totalPrice - this.depositAmount;
  }

  calculatePaymentDeadline(departureDate?: string) {
    if (departureDate) {
      const departureDateTime = new Date(departureDate);
      const deadline = new Date(departureDateTime);
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
