import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { IScalapayOrderResponse, NewScalapayService } from '../../services/newScalapay.service';
import { Router } from '@angular/router';

// Interfaces y tipos
export type PaymentType = 'complete' | 'deposit' | 'installments';
export type PaymentMethod = 'creditCard' | 'transfer';
export type InstallmentOption = 'three' | 'four';

export interface PaymentOption {
  type: PaymentType;
  method?: PaymentMethod;
  installments?: InstallmentOption;
}

@Component({
  selector: 'app-payment-management',
  templateUrl: './payment-management.component.html',
  standalone: false,
  styleUrl: './payment-management.component.scss'
})
export class PaymentManagementComponent implements OnInit, OnDestroy {
  // Inputs
  @Input() totalPrice: number = 0;
  @Input() reservationId!: number;
  @Input() depositAmount: number = 200;
  @Input() paymentDeadline: string = '30 días antes del tour';

  // Outputs
  @Output() paymentCompleted = new EventEmitter<PaymentOption>();
  @Output() backRequested = new EventEmitter<void>();

  // State management
  readonly dropdownStates = {
    main: true,
    paymentMethods: true,
    installments: true
  };

  readonly paymentState = {
    type: null as PaymentType | null,
    method: null as PaymentMethod | null,
    installmentOption: null as InstallmentOption | null,
    isLoading: false
  };

  constructor(private readonly scalapayService: NewScalapayService, private readonly router: Router) {}

  ngOnInit(): void {
    this.initializeScalapayScript();
  }

  ngOnDestroy(): void {
    // Cleanup script if needed
  }

  // Getters for template
  get isLoading(): boolean {
    return this.paymentState.isLoading;
  }

  get paymentType(): PaymentType | null {
    return this.paymentState.type;
  }

  get paymentMethod(): PaymentMethod | null {
    return this.paymentState.method;
  }

  get installmentOption(): InstallmentOption | null {
    return this.paymentState.installmentOption;
  }

  get isPaymentValid(): boolean {
    if (!this.paymentState.type) return false;
    
    if (this.paymentState.type === 'installments') {
      return !!this.paymentState.installmentOption;
    }
    
    return !!this.paymentState.method;
  }

  get buttonLabel(): string {
    return this.paymentState.isLoading ? 'Procesando...' : 'Realizar pago';
  }

  // Payment type management
  selectPaymentType(type: PaymentType): void {
    this.paymentState.type = type;
    this.updateDropdownVisibility();
    this.resetRelatedSelections(type);
  }

  // Payment method management
  selectPaymentMethod(method: PaymentMethod): void {
    this.paymentState.method = method;
  }

  // Installment management
  selectInstallmentOption(option: InstallmentOption): void {
    this.paymentState.installmentOption = option;
    this.reloadScalapayWidgets();
  }

  // Dropdown management
  toggleDropdown(dropdown: keyof typeof this.dropdownStates): void {
    this.dropdownStates[dropdown] = !this.dropdownStates[dropdown];
    
    if (dropdown === 'main' && !this.dropdownStates.main) {
      this.dropdownStates.installments = false;
      this.dropdownStates.paymentMethods = false;
    }
  }

  // Actions
  goBack(): void {
    this.backRequested.emit();
  }

  async submitPayment(): Promise<void> {
    if (!this.isPaymentValid) return;

    this.paymentState.isLoading = true;

    try {
      if (this.paymentState.type === 'installments') {
        await this.processInstallmentPayment();
      } else {
        await this.processRegularPayment();
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
    }
  }

  // Private methods
  private initializeScalapayScript(): void {
    if (this.isScalapayScriptLoaded()) return;

    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://cdn.scalapay.com/widget/scalapay-widget-loader.js';
    document.head.appendChild(script);
  }

  private isScalapayScriptLoaded(): boolean {
    return !!document.querySelector('script[src*="scalapay-widget-loader.js"]');
  }

  private updateDropdownVisibility(): void {
    this.dropdownStates.installments = this.paymentState.type === 'installments';
    this.dropdownStates.paymentMethods = ['complete', 'deposit'].includes(this.paymentState.type!);
  }

  private resetRelatedSelections(type: PaymentType): void {
    if (type !== 'installments') {
      this.paymentState.installmentOption = null;
    }
    if (type === 'installments') {
      this.paymentState.method = null;
    }
  }

  private reloadScalapayWidgets(): void {
    setTimeout(() => {
      this.updatePriceContainers();
      this.dispatchScalapayReloadEvent();
    }, 200);
  }

  private updatePriceContainers(): void {
    const formattedPrice = `€ ${this.totalPrice?.toFixed?.(2) ?? this.totalPrice}`;
    
    ['three', 'four'].forEach(option => {
      const container = document.getElementById(`price-container-${option}`);
      if (container) {
        container.textContent = formattedPrice;
      }
    });
  }

  private dispatchScalapayReloadEvent(): void {
    const event = new CustomEvent('scalapay-widget-reload');
    window.dispatchEvent(event);
  }

  private async processInstallmentPayment(): Promise<void> {
    const payments = this.paymentState.installmentOption === 'three' ? 3 : 4;

    const baseUrl = (window.location.href).replace(this.router.url, '');

    console.log('baseUrl', baseUrl);
    
    const response = await this.scalapayService.createOrder(this.reservationId, payments, baseUrl).toPromise();
    
    if (response?.checkoutUrl) {
      window.location.href = response.checkoutUrl;
    }
  }

  private async processRegularPayment(): Promise<void> {
    const paymentOption: PaymentOption = {
      type: this.paymentState.type!,
      method: this.paymentState.method!
    };
    
    this.paymentCompleted.emit(paymentOption);
  }
}
