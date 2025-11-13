import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  OnChanges,
  AfterViewInit,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  IScalapayOrderResponse,
  NewScalapayService,
} from '../../services/newScalapay.service';
import { Router } from '@angular/router';
import {
  PaymentsNetService,
  PaymentStatusFilter,
} from '../../services/paymentsNet.service';
import { PaymentStatusNetService } from '../../services/paymentStatusNet.service';
import { PaymentMethodNetService } from '../../services/paymentMethodNet.service';
import { IFormData, NewRedsysService } from '../../services/newRedsys.service';
import { ReservationStatusService } from '../../../../core/services/reservation/reservation-status.service';
import { ReservationService } from '../../../../core/services/reservation/reservation.service';
import { MessageService } from 'primeng/api';
import { CurrencyService } from '../../../../core/services/masterdata/currency.service';
import {
  FlightSearchService,
  IPriceChangeInfo,
} from '../../../../core/services/flight/flight-search.service';
import { environment } from '../../../../../environments/environment';

// Interfaces y tipos
export type PaymentType =
  | 'complete'
  | 'deposit'
  | 'installments'
  | 'transfer25';
export type PaymentMethod = 'creditCard' | 'transfer';

export interface PaymentOption {
  type: PaymentType;
  method?: PaymentMethod;
}

@Component({
  selector: 'app-payment-management',
  templateUrl: './payment-management.component.html',
  standalone: false,
  styleUrl: './payment-management.component.scss',
})
export class PaymentManagementComponent
  implements OnInit, OnDestroy, OnChanges, AfterViewInit
{
  //Total reservation amount
  totalPrice: number = 0;

  ngAfterViewInit(): void {
    // Primero cargar el script de ScalaPay
    this.initializeScalapayScript();
  }

  @Input() reservationId!: number;
  @Input() depositAmount: number = 200;
  @Input() paymentDeadline: string = '30 días antes del tour';
  @Input() departureDate: string = '';
  @Input() showTransfer25Option: boolean = false;
  @Input() isTourOperator: boolean = false;

  // Outputs
  @Output() paymentCompleted = new EventEmitter<PaymentOption>();
  @Output() navigateToStep = new EventEmitter<number>();

  // Payment IDs
  transferMethodId: number = 0;
  redsysMethodId: number = 0;
  pendingStatusId: number = 0;

  // Amadeus flight validation
  hasAmadeusFlight: boolean = false;
  priceValidation: IPriceChangeInfo | null = null;
  showPriceChangeDialog: boolean = false;

  // Specific search flights validation
  hasSpecificSearchFlights: boolean = false;
  specificSearchFlightsCost: number = 0;

  // State management
  readonly dropdownStates = {
    main: true,
    paymentMethods: true,
  };

  readonly paymentState = {
    type: null as PaymentType | null,
    method: null as PaymentMethod | null,
    isLoading: false,
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
    private readonly messageService: MessageService,
    private readonly currencyService: CurrencyService,
    private readonly flightSearchService: FlightSearchService
  ) {}

  ngOnInit(): void {
    this.loadReservationTotalAmount();
    this.loadPaymentIds();
    this.checkAmadeusFlightStatus();
  }

  ngOnChanges(): void {
    // Si el depósito no está disponible pero está seleccionado, limpiar la selección
    if (this.paymentState.type === 'deposit' && !this.shouldShowDepositOption) {
      this.paymentState.type = null;
      this.updateDropdownVisibility();
    }

    // Si transfer25 no está habilitado pero está seleccionado, limpiar la selección
    if (
      this.paymentState.type === 'transfer25' &&
      !this.shouldShowTransfer25Option
    ) {
      this.paymentState.type = null;
      this.updateDropdownVisibility();
    }

    // Si cambió a TO, limpiar selecciones no permitidas
    if (this.isTourOperator) {
      if (this.paymentState.type !== 'transfer25') {
        this.paymentState.type = null;
        this.paymentState.method = null;
        this.updateDropdownVisibility();
      }
    }

    // Si ya no es TO, limpiar transfer25 si showTransfer25Option es false
    if (
      !this.isTourOperator &&
      !this.showTransfer25Option &&
      this.paymentState.type === 'transfer25'
    ) {
      this.paymentState.type = null;
      this.updateDropdownVisibility();
    }
  }

  private checkAmadeusFlightStatus(): void {
    if (!this.reservationId) return;

    this.flightSearchService.getSelectionStatus(this.reservationId).subscribe({
      next: (hasSelection: boolean) => {
        this.hasAmadeusFlight = hasSelection;

        if (hasSelection) {
          this.checkSpecificSearchFlights();
          this.cleanupInvalidSelectionsForAmadeus();
          this.validateAmadeusPrice();
        } else {
          this.hasSpecificSearchFlights = false;
          this.specificSearchFlightsCost = 0;
        }
      },
      error: (error) => {
        this.hasAmadeusFlight = false;
        this.hasSpecificSearchFlights = false;
        this.specificSearchFlightsCost = 0;
      },
    });
  }

  private checkSpecificSearchFlights(): void {
    if (!this.reservationId) return;

    if (this.hasSpecificSearchFlights && this.specificSearchFlightsCost > 0) {
      return;
    }
  }

  private cleanupInvalidSelectionsForAmadeus(): void {
    if (this.paymentState.method === 'transfer') {
      this.paymentState.method = null;
    }

    if (this.paymentState.type === 'deposit' && this.hasAmadeusFlight) {
      if (!this.hasSpecificSearchFlights) {
        this.paymentState.type = null;
      }
    }

    this.updateDropdownVisibility();
  }

  private validateAmadeusPrice(): void {
    if (!this.reservationId) return;

    this.flightSearchService.validatePriceChange(this.reservationId).subscribe({
      next: (validation: IPriceChangeInfo | null) => {
        if (validation) {
          this.priceValidation = validation;
          this.specificSearchFlightsCost = validation.currentPrice;
          this.hasSpecificSearchFlights = true;

          if (validation.hasChanged) {
            this.showPriceChangeDialog = true;
            this.messageService.add({
              severity: 'warn',
              summary: 'Precio cambiado',
              detail: `El precio del vuelo ha cambiado. Diferencia: ${validation.priceDifference.toFixed(
                2
              )} ${validation.currency || 'EUR'}`,
              life: 5000,
            });
          }
        }
      },
      error: (error) => {
        this.priceValidation = null;
      },
    });
  }

  private loadPaymentIds(): void {
    this.paymentMethodService.getPaymentMethodByCode('TRANSFER').subscribe({
      next: (methods) => {
        if (methods && methods.length > 0) {
          this.transferMethodId = methods[0].id;
        }
      },
      error: (error) => console.error('Error loading transfer method:', error),
    });

    this.paymentMethodService.getPaymentMethodByCode('REDSYS').subscribe({
      next: (methods) => {
        if (methods && methods.length > 0) {
          this.redsysMethodId = methods[0].id;
        }
      },
      error: (error) => console.error('Error loading redsys method:', error),
    });

    this.paymentStatusService.getPaymentStatusByCode('PENDING').subscribe({
      next: (statuses) => {
        if (statuses && statuses.length > 0) {
          this.pendingStatusId = statuses[0].id;
        }
      },
      error: (error) => console.error('Error loading pending status:', error),
    });
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  // Getters
  get isLoading(): boolean {
    return this.paymentState.isLoading;
  }

  get paymentType(): PaymentType | null {
    return this.paymentState.type;
  }

  get paymentMethod(): PaymentMethod | null {
    return this.paymentState.method;
  }

  get scalapayMerchantToken(): string {
    return environment.scalapayMerchantToken;
  }

  get scalapayEnvironment(): string {
    return environment.scalapayEnvironment;
  }

  get isPaymentValid(): boolean {
    if (!this.paymentState.type) return false;

    if (this.paymentState.type === 'installments') {
      return true;
    }

    if (this.paymentState.type === 'transfer25') {
      return this.shouldShowTransfer25Option;
    }

    return !!this.paymentState.method;
  }

  get buttonLabel(): string {
    return this.paymentState.isLoading ? 'Procesando...' : 'Realizar pago';
  }

  get shouldShowDepositOption(): boolean {
    // Si es TO, no mostrar la opción de depósito
    if (this.isTourOperator) return false;

    if (!this.departureDate) return false;

    const today = new Date();
    const departureDate = new Date(this.departureDate);

    const deadlineMatch = this.paymentDeadline.match(/(\d+)\s*días?\s*antes/);
    if (!deadlineMatch) return false;

    const daysBeforeDeparture = parseInt(deadlineMatch[1]);
    const deadlineDate = new Date(departureDate);
    deadlineDate.setDate(departureDate.getDate() - daysBeforeDeparture);

    const isWithinDeadline = today < deadlineDate;

    // Para vuelos de Amadeus, solo permitir depósito si hay vuelos de specific-search
    if (this.hasAmadeusFlight) {
      return this.hasSpecificSearchFlights && isWithinDeadline;
    }

    return isWithinDeadline;
  }

  get depositTotalAmount(): number {
    if (this.hasAmadeusFlight && this.hasSpecificSearchFlights) {
      return this.depositAmount + this.specificSearchFlightsCost;
    }
    return this.depositAmount;
  }

  get shouldShowTransferOption(): boolean {
    return !this.hasAmadeusFlight;
  }

  get shouldShowInstallmentsOption(): boolean {
    // Si es TO, no mostrar la opción de pagos a plazos
    if (this.isTourOperator) return false;

    return true;
  }

  get transfer25Amount(): number {
    return this.totalPrice * 0.25;
  }

  get shouldShowCompleteOption(): boolean {
    return !this.isTourOperator;
  }

  get shouldShowTransfer25Option(): boolean {
    return this.isTourOperator || this.showTransfer25Option;
  }

  // Payment type management
  selectPaymentType(type: PaymentType): void {
    // Si es TO y se intenta seleccionar algo que no sea transfer25, no hacer nada
    if (this.isTourOperator && type !== 'transfer25') {
      return;
    }

    // Si se intenta seleccionar depósito pero no está disponible, no hacer nada
    if (type === 'deposit' && !this.shouldShowDepositOption) {
      return;
    }

    // Si se intenta seleccionar transfer25 pero no está habilitado, no hacer nada
    if (type === 'transfer25' && !this.shouldShowTransfer25Option) {
      return;
    }

    this.paymentState.type = type;
    this.updateDropdownVisibility();
    this.resetRelatedSelections(type);

    // Si se selecciona installments, recargar el widget de Scalapay
    if (type === 'installments') {
      setTimeout(() => {
        this.forceScalapayReload();
      }, 100);
    }
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.paymentState.method = method;
  }

  toggleDropdown(dropdown: keyof typeof this.dropdownStates): void {
    this.dropdownStates[dropdown] = !this.dropdownStates[dropdown];

    if (dropdown === 'main' && !this.dropdownStates.main) {
      this.dropdownStates.paymentMethods = false;
    }
  }

  handlePriceChangeDecision(continueWithNewPrice: boolean): void {
    this.showPriceChangeDialog = false;

    if (continueWithNewPrice) {
      this.messageService.add({
        severity: 'info',
        summary: 'Continuando con nuevo precio',
        detail: 'Procediendo con el pago con el precio actualizado del vuelo',
        life: 3000,
      });
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Volviendo a selección de vuelos',
        detail: 'Será redirigido al paso de selección de vuelos',
        life: 3000,
      });

      this.navigateToStep.emit(1);
    }
  }

  async submitPayment(): Promise<void> {
    if (!this.isPaymentValid) return;

    this.paymentState.isLoading = true;

    try {
      this.messageService.add({
        severity: 'info',
        summary: 'Procesando pago',
        detail: 'Actualizando estado de la reservación...',
        life: 3000,
      });

      await this.updateReservationStatusToPrebooked();

      this.messageService.add({
        severity: 'success',
        summary: 'Reserva actualizada',
        detail:
          'Estado de la reservación actualizado correctamente. Procesando pago...',
        life: 3000,
      });

      // Emitir evento de pago completado para analytics ANTES de procesar el pago
      // Esto asegura que el evento se dispare incluso si el procesamiento redirige o falla
      this.paymentCompleted.emit({
        type: this.paymentState.type || 'complete',
        method: this.paymentState.method || 'transfer',
      });

      await this.processPaymentBasedOnMethod();

      this.messageService.add({
        severity: 'success',
        summary: 'Pago procesado',
        detail: 'El pago se ha procesado correctamente.',
        life: 5000,
      });
    } catch (error) {
      console.error('Payment processing failed:', error);

      let errorMessage =
        'Ha ocurrido un error inesperado. Por favor, inténtelo nuevamente.';

      if (error instanceof Error) {
        if (error.message.includes('estado')) {
          errorMessage =
            'Error al actualizar el estado de la reservación. El pago no se procesará.';
        } else if (error.message.includes('pago')) {
          errorMessage =
            'Error al procesar el pago. La reservación se mantendrá en su estado actual.';
        }
      }
      
      this.paymentState.isLoading = false;

      this.messageService.add({
        severity: 'error',
        summary: 'Error al procesar el pago',
        detail: errorMessage,
        life: 5000,
      });
    
      
    }
  }

  private async updateReservationStatusToPrebooked(): Promise<boolean> {
    try {
      console.log('🔄 Verificando estado actual de la reserva...');

      // 1. Obtener la reserva actual
      const currentReservation = await firstValueFrom(
        this.reservationService.getById(this.reservationId!)
      );

      // 2. Obtener los estados permitidos (CART y BUDGET)
      const [cartStatus, budgetStatus] = await Promise.all([
        firstValueFrom(this.reservationStatusService.getByCode('CART')),
        firstValueFrom(this.reservationStatusService.getByCode('BUDGET')),
      ]);

      if (
        !cartStatus ||
        cartStatus.length === 0 ||
        !budgetStatus ||
        budgetStatus.length === 0
      ) {
        throw new Error('No se pudieron obtener los estados CART o BUDGET');
      }

      const allowedStatusIds = [cartStatus[0].id, budgetStatus[0].id];

      // 3. Verificar si el estado actual es CART o BUDGET
      if (!allowedStatusIds.includes(currentReservation.reservationStatusId)) {
        console.log(
          '⚠️ La reserva no está en estado CART o BUDGET. Estado actual ID:',
          currentReservation.reservationStatusId
        );
        this.messageService.add({
          severity: 'warn',
          summary: 'Estado de reserva',
          detail:
            'La reserva no se encuentra en un estado que permita realizar el pago.',
          life: 5000,
        });
        return false;
      }

      console.log(
        '✅ Estado actual válido, procediendo a actualizar a PREBOOKED'
      );

      // 4. Obtener el estado PREBOOKED
      const prebookedStatus = await firstValueFrom(
        this.reservationStatusService.getByCode('PREBOOKED')
      );

      if (!prebookedStatus || prebookedStatus.length === 0) {
        throw new Error('No se pudo obtener el estado PREBOOKED');
      }

      // 5. Actualizar el estado a PREBOOKED
      const success = await firstValueFrom(
        this.reservationService.updateStatus(
          this.reservationId!,
          prebookedStatus[0].id
        )
      );

      if (success) {
        console.log(
          '✅ Estado de reservación actualizado correctamente a PREBOOKED'
        );
        return true;
      } else {
        throw new Error('La actualización del estado falló');
      }
    } catch (error) {
      console.error('❌ Error al actualizar estado de reservación:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error al guardar reserva',
        detail: 'No se pudo actualizar el estado de la reservación.',
        life: 5000,
      });
      throw error;
    }
  }

  private async processPaymentBasedOnMethod(): Promise<void> {
    if (this.paymentState.type === 'transfer25') {
      await this.processTransfer25Payment();
    } else if (this.paymentState.type === 'installments') {
      await this.processInstallmentPayment();
    } else if (this.paymentMethod === 'creditCard') {
      if (this.paymentState.type === 'deposit') {
        await this.processCreditCardPayment(this.depositTotalAmount);
      } else {
        await this.processCreditCardPayment(this.totalPrice);
      }
    } else if (this.paymentMethod === 'transfer') {
      await this.processTransferPayment();
    } else {
      throw new Error(`Método de pago no soportado: ${this.paymentMethod}`);
    }
  }

  private initializeScalapayScript(): void {
    if (this.isScalapayScriptLoaded()) {
      return;
    }

    const script = document.createElement('script');
    script.src =
      'https://cdn.scalapay.com/widget/scalapay-widget-loader.js?version=V5';

    script.onerror = (error) => {
      console.error('❌ Error al cargar script de Scalapay:', error);
    };

    document.head.appendChild(script);
  }

  private isScalapayScriptLoaded(): boolean {
    return !!document.querySelector(
      'script[src*="scalapay-widget-loader.js?version=V5"]'
    );
  }

  private updateDropdownVisibility(): void {
    this.dropdownStates.paymentMethods = ['complete', 'deposit'].includes(
      this.paymentState.type!
    );
  }

  private resetRelatedSelections(type: PaymentType): void {
    if (type === 'installments' || type === 'transfer25') {
      this.paymentState.method = null;
    }
  }

  private updatePriceContainers(): void {
    if (!this.totalPrice) {
      return;
    }

    const formattedPrice = `€ ${this.totalPrice.toFixed(2)}`;
    const mainContainer = document.getElementById('price-container-main');
    if (mainContainer) {
      mainContainer.textContent = formattedPrice;
    }
  }

  private dispatchScalapayReloadEvent(): void {
    const event = new CustomEvent('scalapay-widget-reload');
    window.dispatchEvent(event);
  }

  private initializeScalapayWidget(): void {
    if (!this.totalPrice) {
      setTimeout(() => {
        this.initializeScalapayWidget();
      }, 500);
      return;
    }

    this.updatePriceContainers();

    setTimeout(() => {
      this.dispatchScalapayReloadEvent();
    }, 100);
  }

  private isScalapayWidgetVisible(): boolean {
    const widget = document.querySelector('scalapay-widget');
    if (!widget) return false;

    const hasContent =
      widget.children.length > 0 ||
      (widget.textContent?.trim().length || 0) > 0 ||
      (widget.innerHTML?.trim().length || 0) > 0;

    return hasContent;
  }

  private forceScalapayReload(): void {
    this.updatePriceContainers();

    setTimeout(() => {
      this.dispatchScalapayReloadEvent();

      setTimeout(() => {
        if (!this.isScalapayWidgetVisible()) {
          this.initializeScalapayWidget();
        }
      }, 1000);
    }, 100);
  }

  private async processInstallmentPayment(): Promise<void> {
    const baseUrl = window.location.href.replace(this.router.url, '');

    const response = await this.scalapayService
      .createOrder(this.reservationId, baseUrl)
      .toPromise();

    if (response?.checkoutUrl) {
      window.location.href = response.checkoutUrl;
    }
  }

  private async processCreditCardPayment(amount: number): Promise<void> {
    const currencyId = await this.currencyService
      .getCurrencyIdByCode('EUR')
      .toPromise();

    if (!currencyId) {
      throw new Error('No se pudo obtener el ID de la moneda EUR');
    }

    const response = await this.paymentsService
      .create({
        reservationId: this.reservationId,
        amount: amount,
        paymentDate: new Date(),
        paymentMethodId: this.redsysMethodId,
        paymentStatusId: this.pendingStatusId,
        currencyId: currencyId,
      })
      .toPromise();

    if (!response) {
      throw new Error('Error al crear el pago');
    }

    const baseUrlFront = window.location.href.replace(this.router.url, '');
    const formData: IFormData | undefined = await this.redsysService
      .generateFormData(response.id, environment.redsysApiUrl, baseUrlFront)
      .toPromise();

    if (formData) {
      await this.enviarFormARedsys(formData);
    }
  }

  private async enviarFormARedsys(formData: IFormData): Promise<void> {
    if (formData) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = environment.redsysUrl;

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
    const amount =
      this.paymentState.type === 'deposit'
        ? this.depositTotalAmount
        : this.totalPrice;

    const currencyId = await this.currencyService
      .getCurrencyIdByCode('EUR')
      .toPromise();

    if (!currencyId) {
      throw new Error('No se pudo obtener el ID de la moneda EUR');
    }

    const response = await this.paymentsService
      .create({
        reservationId: this.reservationId,
        amount: amount,
        paymentDate: new Date(),
        paymentMethodId: this.transferMethodId,
        paymentStatusId: this.pendingStatusId,
        currencyId: currencyId,
      })
      .toPromise();

    if (!response) {
      throw new Error('Error al crear el pago por transferencia');
    }

    this.router.navigate([`/reservation/${this.reservationId}/${response.id}`]);
  }

  private async processTransfer25Payment(): Promise<void> {
    const amount = this.transfer25Amount;

    const currencyId = await this.currencyService
      .getCurrencyIdByCode('EUR')
      .toPromise();

    if (!currencyId) {
      throw new Error('No se pudo obtener el ID de la moneda EUR');
    }

    const response = await this.paymentsService
      .create({
        reservationId: this.reservationId,
        amount: amount,
        paymentDate: new Date(),
        paymentMethodId: this.transferMethodId,
        paymentStatusId: this.pendingStatusId,
        currencyId: currencyId,
      })
      .toPromise();

    if (!response) {
      throw new Error('Error al crear el pago por transferencia 25%');
    }

    // TODO: Implementar lógica adicional para transferencia 25% con voucher
    this.router.navigate([`/reservation/${this.reservationId}/${response.id}`]);
  }

  loadReservationTotalAmount(): void {
    this.reservationService
      .getById(this.reservationId)
      .subscribe((reservation) => {
        this.totalPrice = reservation.totalAmount;

        // Después de cargar el precio, forzar recarga del widget de Scalapay
        setTimeout(() => {
          this.forceScalapayReload();
        }, 300);
      });
  }

  reloadReservationTotalAmount(): void {
    this.loadReservationTotalAmount();
  }
}
