import { Component, Input, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { IScalapayOrderResponse, NewScalapayService } from '../../services/newScalapay.service';
import { Router } from '@angular/router';
import { PaymentsNetService, PaymentStatusFilter } from '../../services/paymentsNet.service';
import { PaymentStatusNetService } from '../../services/paymentStatusNet.service';
import { PaymentMethodNetService } from '../../services/paymentMethodNet.service';
import { IFormData, NewRedsysService } from '../../services/newRedsys.service';
import { ReservationStatusService } from '../../../../core/services/reservation/reservation-status.service';
import { ReservationService } from '../../../../core/services/reservation/reservation.service';
import { MessageService } from 'primeng/api';

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

  // Payment IDs (se cargarán desde la API)
  transferMethodId: number = 0;
  redsysMethodId: number = 0;
  pendingStatusId: number = 0;

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

  constructor(
    private readonly scalapayService: NewScalapayService, 
    private readonly router: Router, 
    private readonly paymentsService: PaymentsNetService, 
    private readonly paymentStatusService: PaymentStatusNetService,
    private readonly paymentMethodService: PaymentMethodNetService,
    private readonly redsysService: NewRedsysService,
    private readonly reservationStatusService: ReservationStatusService,
    private readonly reservationService: ReservationService,
    private readonly messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.initializeScalapayScript();
    this.loadPaymentIds();
  }

  private loadPaymentIds(): void {
    // Cargar métodos de pago
    this.paymentMethodService.getPaymentMethodByCode('TRANSFER').subscribe({
      next: (methods) => {
        if (methods && methods.length > 0) {
          this.transferMethodId = methods[0].id;
        }
      },
      error: (error) => console.error('Error loading transfer method:', error)
    });

    this.paymentMethodService.getPaymentMethodByCode('REDSYS').subscribe({
      next: (methods) => {
        if (methods && methods.length > 0) {
          this.redsysMethodId = methods[0].id;
        }
      },
      error: (error) => console.error('Error loading redsys method:', error)
    });

    // Cargar estados de pago
    this.paymentStatusService.getPaymentStatusByCode('PENDING').subscribe({
      next: (statuses) => {
        if (statuses && statuses.length > 0) {
          this.pendingStatusId = statuses[0].id;
        }
      },
      error: (error) => console.error('Error loading pending status:', error)
    });
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
      //estado --> PREBOOK
      this.reservationStatusService.getByCode('PREBOOK').subscribe({
        next: (reservationStatus) => {
          if (reservationStatus) {
            this.reservationService.updateStatus(this.reservationId!, reservationStatus[0].id).subscribe({
              next: (success) => {
                if (success) {
                  console.log('Estado actualizado correctamente');
                }     
              },
              error: (error) => {
                console.error('Error al actualizar el estado de la reservación:', error);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error interno al guardar su reserva',
                  detail: 'Intente nuevamente más tarde o contacte con nuestro equipo de soporte',
                  life: 3000,
                });
              }
            })
          }
          }
        })

      if (this.paymentState.type === 'installments') {
        await this.processInstallmentPayment();
      } else if (this.paymentMethod === 'creditCard') {
        if (this.paymentState.type === 'deposit') {
          await this.processCreditCardPayment(200);
        } else {
          await this.processCreditCardPayment(this.totalPrice);
        }
      } else if (this.paymentMethod === 'transfer') {
        await this.processTransferPayment();
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
    } finally {
      this.paymentState.isLoading = false;
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

    //El payment se crea en el backend
    const response = await this.scalapayService.createOrder(this.reservationId, payments, baseUrl).toPromise();

    if (response?.checkoutUrl) {
      window.location.href = response.checkoutUrl;
    }
  }

  private async processCreditCardPayment(amount: number): Promise<void> {
    const response = await this.paymentsService.create({
      reservationId: this.reservationId,
      amount: amount,
      paymentDate: new Date(),
      paymentMethodId: this.redsysMethodId,
      paymentStatusId: this.pendingStatusId
    }).toPromise();

    if (!response) {
      throw new Error('Error al crear el pago');
    }

    const formData: IFormData | undefined = await this.redsysService.generateFormData(response.id, "https://www.differentroads.es/", "https://redsys-dev.differentroads.es").toPromise();
    if (formData) {
      await this.enviarFormARedsys(formData);
    }
  }

  private async enviarFormARedsys(formData: IFormData): Promise<void> {

    if (formData) {
      // Create and submit form to Redsys
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://sis-t.redsys.es:25443/sis/realizarPago';

      const input1 = document.createElement('input');
      input1.type = 'hidden';
      input1.name = 'Ds_SignatureVersion';
      input1.value = formData.ds_SignatureVersion;
      form.appendChild(input1);

      const input2 = document.createElement('input');
      input2.type = 'hidden';
      input2.name = 'Ds_MerchantParameters';
      input2.value = formData.ds_MerchantParameters;
      form.appendChild(input2);

      const input3 = document.createElement('input');
      input3.type = 'hidden';
      input3.name = 'Ds_Signature';
      input3.value = formData.ds_Signature;
      form.appendChild(input3);

      document.body.appendChild(form);
      form.submit();
    }
  }

  private async processTransferPayment(): Promise<void> {
    // Determinar el importe según el tipo de pago
    const amount = this.paymentState.type === 'deposit' ? this.depositAmount : this.totalPrice;

    // Crear el pago en la API
    const response = await this.paymentsService.create({
      reservationId: this.reservationId,
      amount: amount,
      paymentDate: new Date(),
      paymentMethodId: this.transferMethodId,
      paymentStatusId: this.pendingStatusId
    }).toPromise();

    if (!response) {
      throw new Error('Error al crear el pago por transferencia');
    }

    // Redirigir a new-reservation con los parámetros necesarios
    this.router.navigate([
      `/reservation/${this.reservationId}/${response.id}`
    ]);
  }
}
