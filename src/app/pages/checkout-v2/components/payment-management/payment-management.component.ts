import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, OnChanges } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IScalapayOrderResponse, NewScalapayService } from '../../services/newScalapay.service';
import { Router } from '@angular/router';
import { PaymentsNetService, PaymentStatusFilter } from '../../services/paymentsNet.service';
import { PaymentStatusNetService } from '../../services/paymentStatusNet.service';
import { PaymentMethodNetService } from '../../services/paymentMethodNet.service';
import { IFormData, NewRedsysService } from '../../services/newRedsys.service';
import { ReservationStatusService } from '../../../../core/services/reservation/reservation-status.service';
import { ReservationService } from '../../../../core/services/reservation/reservation.service';
import { MessageService } from 'primeng/api';
import { CurrencyService } from '../../../../core/services/currency.service';
import { FlightSearchService, IPriceChangeInfo } from '../../../../core/services/flight-search.service';

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
export class PaymentManagementComponent implements OnInit, OnDestroy, OnChanges {
  // Inputs
  @Input() totalPrice: number = 0;
  @Input() reservationId!: number;
  @Input() depositAmount: number = 200;
  @Input() paymentDeadline: string = '30 días antes del tour';
  @Input() departureDate: string = '';
  @Input() leaderTravelerName: string = '';
  @Input() leaderTravelerLastName: string = '';

  // Outputs
  @Output() paymentCompleted = new EventEmitter<PaymentOption>();
  @Output() backRequested = new EventEmitter<void>();
  @Output() navigateToStep = new EventEmitter<number>();

  // Payment IDs (se cargarán desde la API)
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
    private readonly messageService: MessageService,
    private readonly currencyService: CurrencyService,
    private readonly flightSearchService: FlightSearchService
  ) { }

  ngOnInit(): void {
    this.initializeScalapayScript();
    this.loadPaymentIds();
    this.checkAmadeusFlightStatus();
  }

  ngOnChanges(): void {
    // Si el depósito no está disponible pero está seleccionado, limpiar la selección
    if (this.paymentState.type === 'deposit' && !this.shouldShowDepositOption) {
      this.paymentState.type = null;
      this.updateDropdownVisibility();
    }
  }

  /**
   * Verifica si hay un vuelo Amadeus seleccionado y valida el precio
   */
  private checkAmadeusFlightStatus(): void {
    if (!this.reservationId) return;

    this.flightSearchService.getSelectionStatus(this.reservationId).subscribe({
      next: (hasSelection: boolean) => {
        this.hasAmadeusFlight = hasSelection;
        
        if (hasSelection) {
          console.log('✅ Vuelo Amadeus detectado, validando precio...');
          
          // Verificar si hay vuelos de specific-search para depósito
          this.checkSpecificSearchFlights();
          
          // Limpiar selecciones no permitidas para vuelos de Amadeus
          this.cleanupInvalidSelectionsForAmadeus();
          
          this.validateAmadeusPrice();
        } else {
          console.log('ℹ️ No hay vuelo Amadeus seleccionado');
          this.hasSpecificSearchFlights = false;
          this.specificSearchFlightsCost = 0;
        }
      },
      error: (error) => {
        console.error('❌ Error al verificar estado de vuelo Amadeus:', error);
        this.hasAmadeusFlight = false;
        this.hasSpecificSearchFlights = false;
        this.specificSearchFlightsCost = 0;
      }
    });
  }

  /**
   * Verifica si hay vuelos de specific-search y calcula su coste
   */
  private checkSpecificSearchFlights(): void {
    if (!this.reservationId) return;

    // ✅ NUEVO: Solo verificar si no se han establecido ya los valores
    if (this.hasSpecificSearchFlights && this.specificSearchFlightsCost > 0) {
      console.log('✅ Los valores de specific-search ya están establecidos:', {
        hasSpecificSearchFlights: this.hasSpecificSearchFlights,
        specificSearchFlightsCost: this.specificSearchFlightsCost
      });
      return;
    }

    // TODO: Implementar llamada al servicio para obtener vuelos de specific-search
    // Por ahora, los valores se establecen en validateAmadeusPrice
    console.log('🔍 Verificando vuelos de specific-search...');
    console.log('📊 Estado actual:', {
      hasSpecificSearchFlights: this.hasSpecificSearchFlights,
      specificSearchFlightsCost: this.specificSearchFlightsCost
    });
  }

  /**
   * Limpia las selecciones de pago no permitidas para vuelos de Amadeus
   */
  private cleanupInvalidSelectionsForAmadeus(): void {
    // Si estaba seleccionado transferencia, limpiarlo (nunca permitida para Amadeus)
    if (this.paymentState.method === 'transfer') {
      console.log('🔄 Limpiando selección de transferencia (no permitido para Amadeus)');
      this.paymentState.method = null;
    }
    
    // Si estaba seleccionado depósito, verificar si se permite
    if (this.paymentState.type === 'deposit' && this.hasAmadeusFlight) {
      // Solo permitir depósito si hay vuelos de specific-search
      if (!this.hasSpecificSearchFlights) {
        console.log('🔄 Limpiando selección de depósito (no permitido para Amadeus sin vuelos de specific-search)');
        this.paymentState.type = null;
      }
    }
    
    // Actualizar visibilidad de dropdowns
    this.updateDropdownVisibility();
  }

  /**
   * Valida si ha cambiado el precio del vuelo Amadeus
   */
  private validateAmadeusPrice(): void {
    if (!this.reservationId) return;

    this.flightSearchService.validatePriceChange(this.reservationId).subscribe({
      next: (validation: IPriceChangeInfo | null) => {
        if (validation) {
          this.priceValidation = validation;
          
          // ✅ NUEVO: Rellenar specificSearchFlightsCost con el precio actual del vuelo
          this.specificSearchFlightsCost = validation.currentPrice;
          this.hasSpecificSearchFlights = true;
          
          console.log('✅ Precio del vuelo obtenido:', validation.currentPrice);
          console.log('📊 Estado actualizado:', {
            hasSpecificSearchFlights: this.hasSpecificSearchFlights,
            specificSearchFlightsCost: this.specificSearchFlightsCost
          });
          
          if (validation.hasChanged) {
            console.log('⚠️ Cambio de precio detectado:', validation);
            this.showPriceChangeDialog = true;
            
            // Mostrar mensaje informativo
            this.messageService.add({
              severity: 'warn',
              summary: 'Precio cambiado',
              detail: `El precio del vuelo ha cambiado. Diferencia: ${validation.priceDifference.toFixed(2)} ${validation.currency || 'EUR'}`,
              life: 5000,
            });
          } else {
            console.log('✅ Precio del vuelo sin cambios');
          }
        } else {
          console.log('ℹ️ No se pudo validar el precio del vuelo');
        }
      },
      error: (error) => {
        console.error('❌ Error al validar precio del vuelo:', error);
        // En caso de error, permitir continuar
        this.priceValidation = null;
      }
    });
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

  get leaderTravelerFullName(): string {
    if (this.leaderTravelerName && this.leaderTravelerLastName) {
      return `${this.leaderTravelerName} ${this.leaderTravelerLastName}`;
    }
    return this.leaderTravelerName || this.leaderTravelerLastName || '';
  }

  get shouldShowDepositOption(): boolean {
    if (!this.departureDate) return false;
    
    const today = new Date();
    const departureDate = new Date(this.departureDate);
    
    // Extraer el número de días del paymentDeadline (asumiendo formato "X días antes del tour")
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

  /**
   * Calcula el monto total del depósito
   * Para vuelos de Amadeus con specific-search: depósito + coste de vuelos
   * Para otros casos: solo el depósito
   */
  get depositTotalAmount(): number {
    if (this.hasAmadeusFlight && this.hasSpecificSearchFlights) {
      return this.depositAmount + this.specificSearchFlightsCost;
    }
    return this.depositAmount;
  }

  /**
   * Controla si se debe mostrar la opción de transferencia bancaria
   * Para vuelos de Amadeus, solo se permite tarjeta bancaria
   */
  get shouldShowTransferOption(): boolean {
    return !this.hasAmadeusFlight;
  }

  /**
   * Controla si se debe mostrar la opción de pagos a plazos (Scalapay)
   * Para vuelos de Amadeus: Siempre se permite Scalapay
   */
  get shouldShowInstallmentsOption(): boolean {
    return true; // Siempre mostrar Scalapay para todos los tipos de vuelos
  }

  // Payment type management
  selectPaymentType(type: PaymentType): void {
    // Si se intenta seleccionar depósito pero no está disponible, no hacer nada
    if (type === 'deposit' && !this.shouldShowDepositOption) {
      return;
    }
    
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

  /**
   * Maneja la decisión del usuario sobre el cambio de precio
   * @param continueWithNewPrice true para continuar con el nuevo precio, false para volver
   */
  handlePriceChangeDecision(continueWithNewPrice: boolean): void {
    this.showPriceChangeDialog = false;
    
    if (continueWithNewPrice) {
      console.log('✅ Usuario decidió continuar con el nuevo precio');
      this.messageService.add({
        severity: 'info',
        summary: 'Continuando con nuevo precio',
        detail: 'Procediendo con el pago con el precio actualizado del vuelo',
        life: 3000,
      });
    } else {
      console.log('🔄 Usuario decidió volver a selección de vuelos (step 1)');
      this.messageService.add({
        severity: 'info',
        summary: 'Volviendo a selección de vuelos',
        detail: 'Será redirigido al paso de selección de vuelos',
        life: 3000,
      });
      
      // Emitir evento para navegar al step 1 (selección de vuelos)
      this.navigateToStep.emit(1);
    }
  }

  async submitPayment(): Promise<void> {
    if (!this.isPaymentValid) return;

    this.paymentState.isLoading = true;

    try {
      // Mostrar mensaje de inicio del proceso
      this.messageService.add({
        severity: 'info',
        summary: 'Procesando pago',
        detail: 'Actualizando estado de la reservación...',
        life: 3000,
      });

      // Primero actualizar el estado a PREBOOKED y esperar a que se complete
      await this.updateReservationStatusToPrebooked();

      // Mostrar mensaje de éxito en la actualización
      this.messageService.add({
        severity: 'success',
        summary: 'Reserva actualizada',
        detail: 'Estado de la reservación actualizado correctamente. Procesando pago...',
        life: 3000,
      });

      // Solo después de actualizar el estado, procesar el pago
      await this.processPaymentBasedOnMethod();

      // Mensaje de éxito final
      this.messageService.add({
        severity: 'success',
        summary: 'Pago procesado',
        detail: 'El pago se ha procesado correctamente.',
        life: 5000,
      });

    } catch (error) {
      console.error('Payment processing failed:', error);
      
      // Determinar el tipo de error para mostrar mensaje apropiado
      let errorMessage = 'Ha ocurrido un error inesperado. Por favor, inténtelo nuevamente.';
      
      if (error instanceof Error) {
        if (error.message.includes('estado')) {
          errorMessage = 'Error al actualizar el estado de la reservación. El pago no se procesará.';
        } else if (error.message.includes('pago')) {
          errorMessage = 'Error al procesar el pago. La reservación se mantendrá en su estado actual.';
        }
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Error al procesar el pago',
        detail: errorMessage,
        life: 5000,
      });
    } finally {
      this.paymentState.isLoading = false;
    }
  }

  /**
   * Actualiza el estado de la reservación a PREBOOKED
   * @returns Promise<boolean> - true si se actualizó correctamente, false en caso contrario
   */
  private async updateReservationStatusToPrebooked(): Promise<boolean> {
    try {
      console.log('🔄 Actualizando estado de reservación a PREBOOKED...');
      
      // Obtener el estado PREBOOKED usando firstValueFrom (alternativa moderna a toPromise)
      const reservationStatus = await firstValueFrom(
        this.reservationStatusService.getByCode('PREBOOKED')
      );
      
      if (!reservationStatus || reservationStatus.length === 0) {
        throw new Error('No se pudo obtener el estado PREBOOKED');
      }

      // Actualizar el estado de la reservación
      const success = await firstValueFrom(
        this.reservationService.updateStatus(this.reservationId!, reservationStatus[0].id)
      );

      if (success) {
        console.log('✅ Estado de reservación actualizado correctamente a PREBOOKED');
        
        // Verificar que el estado se haya actualizado correctamente
        await this.verifyReservationStatusUpdate(reservationStatus[0].id);
        
        return true;
      } else {
        throw new Error('La actualización del estado falló');
      }

    } catch (error) {
      console.error('❌ Error al actualizar estado de reservación:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error interno al guardar su reserva',
        detail: 'No se pudo actualizar el estado de la reservación. Intente nuevamente más tarde o contacte con nuestro equipo de soporte.',
        life: 5000,
      });
      throw error; // Re-lanzar el error para que se maneje en el método principal
    }
  }

  /**
   * Verifica que el estado de la reservación se haya actualizado correctamente
   * @param expectedStatusId - ID del estado esperado
   */
  private async verifyReservationStatusUpdate(expectedStatusId: number): Promise<void> {
    try {
      console.log('🔍 Verificando actualización del estado de la reservación...');
      
      // Obtener la reservación actualizada para verificar el estado
      const updatedReservation = await firstValueFrom(
        this.reservationService.getById(this.reservationId!)
      );
      
      if (updatedReservation.reservationStatusId === expectedStatusId) {
        console.log('✅ Verificación exitosa: Estado de reservación actualizado correctamente');
      } else {
        console.warn('⚠️ Verificación fallida: Estado esperado', expectedStatusId, 'vs actual', updatedReservation.reservationStatusId);
        // No lanzar error aquí, solo log de advertencia
      }
      
    } catch (error) {
      console.warn('⚠️ No se pudo verificar el estado de la reservación:', error);
      // No lanzar error aquí, solo log de advertencia
    }
  }

  /**
   * Procesa el pago según el método seleccionado
   */
  private async processPaymentBasedOnMethod(): Promise<void> {
    console.log('💳 Procesando pago con método:', this.paymentMethod, 'tipo:', this.paymentState.type);

    if (this.paymentState.type === 'installments') {
      await this.processInstallmentPayment();
    } else if (this.paymentMethod === 'creditCard') {
      if (this.paymentState.type === 'deposit') {
        await this.processCreditCardPayment(this.depositAmount);
      } else {
        await this.processCreditCardPayment(this.totalPrice);
      }
    } else if (this.paymentMethod === 'transfer') {
      await this.processTransferPayment();
    } else {
      throw new Error(`Método de pago no soportado: ${this.paymentMethod}`);
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
    // Obtener el currencyId para EUR
    const currencyId = await this.currencyService.getCurrencyIdByCode('EUR').toPromise();

    if (!currencyId) {
      throw new Error('No se pudo obtener el ID de la moneda EUR');
    }

    const response = await this.paymentsService.create({
      reservationId: this.reservationId,
      amount: amount,
      paymentDate: new Date(),
      paymentMethodId: this.redsysMethodId,
      paymentStatusId: this.pendingStatusId,
      currencyId: currencyId
    }).toPromise();

    if (!response) {
      throw new Error('Error al crear el pago');
    }

    const formData: IFormData | undefined = await this.redsysService.generateFormData(response.id, "https://www.differentroads.es/", "https://redsys-dev.differentroads.es", this.leaderTravelerName, this.leaderTravelerLastName).toPromise();
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

    // Obtener el currencyId para EUR
    const currencyId = await this.currencyService.getCurrencyIdByCode('EUR').toPromise();

    if (!currencyId) {
      throw new Error('No se pudo obtener el ID de la moneda EUR');
    }

    // Crear el pago en la API
    const response = await this.paymentsService.create({
      reservationId: this.reservationId,
      amount: amount,
      paymentDate: new Date(),
      paymentMethodId: this.transferMethodId,
      paymentStatusId: this.pendingStatusId,
      currencyId: currencyId
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
