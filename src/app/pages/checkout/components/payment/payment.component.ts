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
  OnDestroy,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RedsysService } from '../../../../core/services/checkout/payment/redsys.service';
import { Router } from '@angular/router';
import { BookingsService } from '../../../../core/services/bookings.service';
import { Payment } from '../../../../core/models/bookings/payment.model';
import { PaymentOptionsService } from '../../../../core/services/checkout/paymentOptions.service';
import { PaymentOption } from '../../../../core/models/orders/order.model';
import { SummaryService } from '../../../../core/services/checkout/summary.service';
import { TravelersService } from '../../../../core/services/checkout/travelers.service';
import { PointsService } from '../../../../core/services/points.service';
import {
  DiscountsService,
  Discount,
} from '../../../../core/services/checkout/discounts.service';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { TextsService } from '../../../../core/services/checkout/texts.service';
import { AuthenticateService } from '../../../../core/services/auth-service.service';

interface TravelerWithPoints {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  points?: number;
  redeeming?: boolean;
  pointsRedeemed?: number;
  redeemCheckbox?: boolean; // Add this new property
}
import { ScalapayOrderRequest } from '../../../../core/models/scalapay/ScalapayOrderRequest';
import { ScalapayConsumer } from '../../../../core/models/scalapay/ScalapayConsumer';
import { ScalapayExtensions } from '../../../../core/models/scalapay/ScalapayExtensions';
import { ScalapayItem } from '../../../../core/models/scalapay/ScalapayItem';
import { ScalapayOrderResponse } from '../../../../core/models/scalapay/ScalapayOrderResponse';
import { ScalapayService } from '../../../../core/services/checkout/payment/scalapay.service';

@Component({
  selector: 'app-payment',
  standalone: false,
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
})
export class PaymentComponent implements OnInit, OnChanges, OnDestroy {
  @Input() totalPrice: number = 0;
  @Input() processBooking!: () => Promise<{
    bookingID: string;
    ID: string;
  }>;
  @Input() departureDate: string | null = null;
  @Output() goBackEvent = new EventEmitter<void>();

  selectedPointsDiscount: string[] = [];

  isOpen: boolean = true;
  isInstallmentsOpen: boolean = true;
  isPaymentMethodsOpen: boolean = true;
  paymentType: string | null = null;
  installmentOption: string | null = null;
  paymentMethod: 'creditCard' | 'transfer' | null = null;

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

  // Add properties for travelers accordion
  uniqueTravelers: TravelerWithPoints[] = [];

  // Track current discounts
  private pointsDiscounts: Discount[] = [];

  private discountSubscription: Subscription | null = null;

  // Add a cache to store points data by email
  private pointsCache: Map<string, number> = new Map();
  private loadingPointsFor: Set<string> = new Set();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private redsysService: RedsysService,
    private scalapayService: ScalapayService,
    private bookingsService: BookingsService,
    private router: Router,
    private paymentOptionsService: PaymentOptionsService,
    private summaryService: SummaryService,
    private travelersService: TravelersService,
    private pointsService: PointsService,
    private discountsService: DiscountsService,
    private messageService: MessageService,
    private authService: AuthenticateService,
    private textsService: TextsService
  ) {}

  ngOnInit() {
    this.loadScalapayScript();
    this.calculateRemainingAmount();
    this.calculatePaymentDeadline();
    this.loadTravelersWithPoints();

    // Subscribe to discounts changes
    this.discountSubscription =
      this.discountsService.selectedDiscounts$.subscribe((discounts) => {
        this.updateCheckboxStates();
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['departureDate'] && this.departureDate) {
      this.calculatePaymentDeadline();
    }
    if (changes['totalPrice']) {
      this.calculateRemainingAmount();
    }
  }

  ngOnDestroy() {
    if (this.discountSubscription) {
      this.discountSubscription.unsubscribe();
    }
  }

  updateCheckboxStates() {
    const activeDiscounts = this.discountsService.getSelectedDiscounts();

    // Find all active point discounts
    const activePointsDiscounts = activeDiscounts.filter(
      (d) => d.type === 'points'
    );

    // Update checkboxes based on active discounts
    this.uniqueTravelers.forEach((traveler) => {
      // Check if this traveler has an active discount
      const hasActiveDiscount = activePointsDiscounts.some(
        (d) => d.source === traveler.email
      );
      // Only update if different to avoid triggering change detection unnecessarily
      if (traveler.redeemCheckbox !== hasActiveDiscount) {
        traveler.redeemCheckbox = hasActiveDiscount;
      }
    });

    // Update our tracking array
    this.selectedPointsDiscount = activePointsDiscounts
      .map((d) => d.source || '')
      .filter((s) => s);
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

    this.updatePaymentOption();
  }

  onPaymentMethodChange() {
    this.updatePaymentOption();
  }

  onInstallmentOptionChange() {
    this.reloadScalapayWidgets();
    this.updatePaymentOption();
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

  async processScalapay(bookingID: string, publicID: string) {
    const createItem = (): ScalapayItem => ({
      price: { currency: 'EUR', amount: this.totalPrice.toString() },
      name: `Tour - ${new Date().toLocaleDateString()}`,
      category: 'travel',
      brand: 'Different Roads',
      sku: `SKU-${bookingID}`,
      quantity: 1,
    });

    const createConsumer = (): ScalapayConsumer => ({
      phoneNumber: '0400000001',
      givenNames: 'Joe',
      surname: 'Consumer',
      email: 'test@scalapay.com',
    });

    const createMerchant = () => ({
      redirectCancelUrl: `${window.location.origin}/confirmacion/${bookingID}/error/${publicID}`,
      redirectConfirmUrl: `${window.location.origin}/confirmacion/${bookingID}/success/${publicID}`,
    });

    const createExtensions = (): ScalapayExtensions => ({
      industry: {
        travel: { startDate: '2023-11-30', endDate: '2023-12-18' },
      },
    });

    const createOrderData = (): ScalapayOrderRequest => ({
      product: 'pay-in-3',
      type: 'online',
      orderExpiryMilliseconds: 600000,
      consumer: createConsumer(),
      extensions: createExtensions(),
      merchant: createMerchant(),
      frequency: { number: 1, frequencyType: 'monthly' },
      totalAmount: { currency: 'EUR', amount: this.totalPrice.toString() },
      items: [createItem()],
      merchantReference: bookingID,
      taxAmount: { currency: 'EUR', amount: '0' },
      shippingAmount: { currency: 'EUR', amount: '0' },
      channel: 'online',
    });

    const orderDataWithTipo: ScalapayOrderRequest = createOrderData();

    try {
      const data = await this.scalapayService.createOrder(orderDataWithTipo);
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Error processing Scalapay payment:', error);
    }
  }

  async submitPayment() {
    if (this.isLoading) return; // Prevent multiple submissions

    this.isLoading = true;
    console.log('Payment process started');
    console.log('Payment Type:', this.paymentType);
    console.log('Payment Method:', this.paymentMethod);
    console.log('Installment Option:', this.installmentOption);
    console.log('Total Price:', this.totalPrice);
    console.log('Terms Accepted:', this.termsAccepted);

    // Update payment option before proceeding
    this.updatePaymentOption();

    let bookingID: string, ID: string;

    // Log applied points discounts if any
    if (this.pointsDiscounts.length > 0) {
      console.log('Applied points discounts:', this.pointsDiscounts);
    }

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
        registerBy: this.authService.getCurrentUsername(),

        method: this.paymentMethod!,
      });

      const publicID = payment.publicID;
      console.log('Payment created:', payment);

      // Handle payment method redirect
      if (this.paymentMethod === 'creditCard') {
        console.log('Redirecting to credit card payment');
        this.redirectToRedSys(ID, paymentAmount, bookingID, publicID);
        return;
      } else if (this.paymentMethod === 'transfer') {
        console.log('Redirecting to bank transfer page');
        this.router.navigate([
          `/reservation/${bookingID}/transfer/${publicID}`,
        ]);
        return;
      } else if (this.paymentType === 'installments') {
        console.log('Processing Scalapay payment');
        this.processScalapay(bookingID, publicID);
        return;
      }
      // If we reach here, it means the payment method was not recognized
      console.error('Unknown payment method:', this.paymentMethod);
      this.messageService.add({
        severity: 'error',
        summary: 'Método de pago desconocido',
        detail: 'El método de pago seleccionado no es válido.',
      })
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

  // Add this method to handle the back button click
  goBack(): void {
    this.goBackEvent.emit();
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

  // New method to update payment option
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

  loadTravelersWithPoints() {
    this.travelersService.travelers$.subscribe((travelers) => {
      const emailMap = new Map<string, TravelerWithPoints>();
      let needToUpdateTravelers = false;

      travelers.forEach((traveler) => {
        const email = traveler.travelerData?.email || '';
        console.log('Traveler email:', email);
        if (email && !emailMap.has(email)) {
          const existingTraveler = this.uniqueTravelers.find(
            (t) => t.email === email
          );

          if (existingTraveler) {
            emailMap.set(email, {
              ...existingTraveler,
              id: traveler._id || existingTraveler.id,
              firstName:
                traveler.travelerData?.name || existingTraveler.firstName,
              lastName:
                traveler.travelerData?.surname || existingTraveler.lastName,
            });
          } else {
            emailMap.set(email, {
              id: traveler._id || '',
              firstName: traveler.travelerData?.name || '',
              lastName: traveler.travelerData?.surname || '',
              email: email,
              points: this.pointsCache.get(email) || 0,
              redeemCheckbox: false,
            });
            needToUpdateTravelers = true;
          }

          if (!this.pointsCache.has(email) && !this.loadingPointsFor.has(email)) {
            console.log('Iniciando obtención de puntos para:', email);
            this.fetchTravelerPoints(email, emailMap);
          }
        }
      });

      if (
        needToUpdateTravelers ||
        this.uniqueTravelers.length !== emailMap.size
      ) {
        this.uniqueTravelers = Array.from(emailMap.values());
        this.updateCheckboxStates();
      }
    });
  }

  fetchTravelerPoints(
    email: string,
    emailMap: Map<string, TravelerWithPoints>
  ) {
    this.loadingPointsFor.add(email);

    this.pointsService.getTravelerPoints(email).subscribe({
      next: (response) => {
        console.log(`Puntos obtenidos para ${email}:`, response);
        const points = response?.points ?? 0;
        const travelerCategory = response?.typeTraveler?.toLowerCase() || 'default'
        let maxRedeemableAmount = 0;
      
      switch(travelerCategory) {
        case 'globetrotter': // Trotamundos
          maxRedeemableAmount = 50; // 50€ máximo
          break;
        case 'traveler': // Viajante
          maxRedeemableAmount = 75; // 75€ máximo
          break;
        case 'nomad': 
          maxRedeemableAmount = this.totalPrice * 0.05; 
          break;
        default:
          maxRedeemableAmount = 0;
      }

        
        this.pointsCache.set(email, points);

        const traveler = emailMap.get(email);
        if (traveler) {
          traveler.points = maxRedeemableAmount;

          const existingIndex = this.uniqueTravelers.findIndex(
            (t) => t.email === email
          );
          if (existingIndex >= 0) {
            this.uniqueTravelers[existingIndex] = { ...traveler };
          } else {
            this.uniqueTravelers = [...this.uniqueTravelers, traveler];
          }
        }

        this.loadingPointsFor.delete(email);
      },
      error: (error) => {
        console.error(`Error fetching points for ${email}:`, error);
        this.pointsCache.set(email, 0);

        const traveler = emailMap.get(email);
        if (traveler) {
          traveler.points = 0;

          const existingIndex = this.uniqueTravelers.findIndex(
            (t) => t.email === email
          );
          if (existingIndex >= 0) {
            this.uniqueTravelers[existingIndex] = { ...traveler };
          } else {
            this.uniqueTravelers = [...this.uniqueTravelers, traveler];
          }
        }

        this.loadingPointsFor.delete(email);
      },
    });
  }

  onRedeemCheckboxChange(traveler: TravelerWithPoints): void {
    // First update our internal state
    if (traveler.redeemCheckbox) {
      if (!this.selectedPointsDiscount.includes(traveler.email)) {
        this.selectedPointsDiscount.push(traveler.email);
      }
    } else {
      this.selectedPointsDiscount = this.selectedPointsDiscount.filter(
        (email) => email !== traveler.email
      );
    }

    // Get current discounts that are not point-based
    const otherDiscounts = this.discountsService
      .getSelectedDiscounts()
      .filter((d) => d.type !== 'points');

    // Create new point discounts based on checked travelers
    const pointDiscounts = this.uniqueTravelers
      .filter((t) => t.redeemCheckbox)
      .map((t) => ({
        type: 'points',
        amount: t.points || 0,
        description: `Descuento por puntos de ${t.firstName}`,
        source: t.email,
        points: t.points,
      }));

    // Store points information in TextsService
    const pointsData = this.uniqueTravelers.reduce(
      (acc: { [key: string]: any }, traveler) => {
        if (traveler.email) {
          acc[traveler.email] = {
            points: traveler.points || 0,
            redeemed: traveler.redeemCheckbox || false,
            travelerInfo: {
              firstName: traveler.firstName,
              lastName: traveler.lastName,
              email: traveler.email,
              id: traveler.id,
            },
          };
        }
        return acc;
      },
      {}
    );

    this.textsService.updateTextsForCategory('points', pointsData);

    console.log('Applying point discounts:', pointDiscounts);

    // Combine and update discounts - this should trigger an update in checkout
    this.discountsService.updateSelectedDiscounts([
      ...otherDiscounts,
      ...pointDiscounts,
    ]);
  }
}
