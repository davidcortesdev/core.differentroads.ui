import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, OnChanges, AfterViewInit } from '@angular/core';
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
import { CurrencyService } from '../../../../core/services/masterdata/currency.service';
import { FlightSearchService, IPriceChangeInfo } from '../../../../core/services/flight/flight-search.service';

// Interfaces y tipos
export type PaymentType = 'complete' | 'deposit' | 'installments' | 'transfer25';
export type PaymentMethod = 'creditCard' | 'transfer';

export interface PaymentOption {
  type: PaymentType;
  method?: PaymentMethod;
}

@Component({
  selector: 'app-payment-management',
  templateUrl: './payment-management.component.html',
  standalone: false,
  styleUrl: './payment-management.component.scss'
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
  @Output() backRequested = new EventEmitter<void>();
  @Output() navigateToStep = new EventEmitter<number>();
  @Output() pointsDiscountChange = new EventEmitter<number>();

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

  // Transfer 25% voucher
  transfer25VoucherUrl: string | null = null;

  // State management
  readonly dropdownStates = {
    main: true,
    paymentMethods: true
  };

  readonly paymentState = {
    type: null as PaymentType | null,
    method: null as PaymentMethod | null,
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
    if (this.paymentState.type === 'transfer25' && !this.shouldShowTransfer25Option) {
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
    if (!this.isTourOperator && !this.showTransfer25Option && this.paymentState.type === 'transfer25') {
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
      }
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
              detail: `El precio del vuelo ha cambiado. Diferencia: ${validation.priceDifference.toFixed(2)} ${validation.currency || 'EUR'}`,
              life: 5000,
            });
          }
        }
      },
      error: (error) => {
        this.priceValidation = null;
      }
    });
  }

  private loadPaymentIds(): void {
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

  get isPaymentValid(): boolean {
    if (!this.paymentState.type) return false;

    if (this.paymentState.type === 'installments') {
      return true;
    }

    if (this.paymentState.type === 'transfer25') {
      return this.showTransfer25Option && !!this.transfer25VoucherUrl;
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

  goBack(): void {
    this.backRequested.emit();
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

  // Handle transfer25 voucher upload
  async onTransfer25VoucherUpload(event: any): Promise<void> {
    const file = event.files[0];
    if (!file) return;

    try {
      // TODO: Implementar subida real a Cloudinary u otro servicio
      // Por ahora, crear un ObjectURL temporal
      const objectUrl = URL.createObjectURL(file);
      this.transfer25VoucherUrl = objectUrl;
      
      this.messageService.add({
        severity: 'success',
        summary: 'Justificante subido',
        detail: 'El justificante se ha subido correctamente',
        life: 3000,
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error al subir archivo',
        detail: 'No se pudo subir el justificante. Intente nuevamente.',
        life: 3000,
      });
    }
  }

  async submitPayment(): Promise<void> {
    if (!this.isPaymentValid) return;

    this.paymentState.isLoading = true;

    try {
      this.messageService.add({
        severity: 'info',
        summary: 'Procesando pago',
        detail: 'Procesando su pago...',
        life: 3000,
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
      
      let errorMessage = 'Ha ocurrido un error inesperado. Por favor, inténtelo nuevamente.';
      
      if (error instanceof Error && error.message.includes('pago')) {
        errorMessage = 'Error al procesar el pago. Por favor, inténtelo nuevamente.';
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
    script.type = 'module';
    script.src = 'https://cdn.scalapay.com/widget/scalapay-widget-loader.js?version=V5';
    
    script.onload = () => {
      setTimeout(() => {
        this.initializeScalapayWidget();
      }, 500);
    };
    
    script.onerror = (error) => {
      console.error('❌ Error al cargar script de Scalapay:', error);
    };
    
    document.head.appendChild(script);
  }

  private isScalapayScriptLoaded(): boolean {
    return !!document.querySelector('script[src*="scalapay-widget-loader.js?version=V5"]');
  }

  private updateDropdownVisibility(): void {
    this.dropdownStates.paymentMethods = ['complete', 'deposit'].includes(this.paymentState.type!);
  }

  private resetRelatedSelections(type: PaymentType): void {
    if (type === 'installments' || type === 'transfer25') {
      this.paymentState.method = null;
    }
  }

  private updatePriceContainers(): void {
    if (!this.totalPrice) return;
    
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
    
    const hasContent = widget.children.length > 0 || 
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
    const baseUrl = (window.location.href).replace(this.router.url, '');

    const response = await this.scalapayService.createOrder(this.reservationId, baseUrl).toPromise();

    if (response?.checkoutUrl) {
      window.location.href = response.checkoutUrl;
    }
  }

  private async processCreditCardPayment(amount: number): Promise<void> {
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

    const formData: IFormData | undefined = await this.redsysService.generateFormData(
      response.id, 
      "https://www.differentroads.es/"
    ).toPromise();
    
    if (formData) {
      await this.enviarFormARedsys(formData);
    }
  }

  private async enviarFormARedsys(formData: IFormData): Promise<void> {
    if (formData) {
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
    const amount = this.paymentState.type === 'deposit' ? this.depositTotalAmount : this.totalPrice;

    const currencyId = await this.currencyService.getCurrencyIdByCode('EUR').toPromise();

    if (!currencyId) {
      throw new Error('No se pudo obtener el ID de la moneda EUR');
    }

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

    this.router.navigate([`/reservation/${this.reservationId}/${response.id}`]);
  }

  private async processTransfer25Payment(): Promise<void> {
    const amount = this.transfer25Amount;

    const currencyId = await this.currencyService.getCurrencyIdByCode('EUR').toPromise();

    if (!currencyId) {
      throw new Error('No se pudo obtener el ID de la moneda EUR');
    }

    // Calcular el máximo permitido para este viajero
    const maxForThisTraveler = this.calculateMaxPointsForTraveler(travelerId);

    // Aplicar límites automáticamente
    const originalPoints = points;
    points = Math.max(0, Math.min(points, maxForThisTraveler));

    // Si se aplicó algún límite, mostrar mensaje informativo
    if (originalPoints !== points) {
      this.showLimitAppliedMessage(
        originalPoints,
        points,
        travelerId,
        maxForThisTraveler
      );
    }

    // Actualizar asignación del viajero
    traveler.assignedPoints = points;
    this.pointsRedemption.pointsPerTraveler[travelerId] = points;

    // Recalcular totales
    this.recalculatePointsTotals();
  }

  /**
   * Calcula el máximo de puntos que puede recibir un viajero específico
   * @param travelerId ID del viajero
   * @returns Máximo de puntos permitidos
   */
  private calculateMaxPointsForTraveler(travelerId: string): number {
    const maxPointsPerPerson = this.pointsRedemption.maxDiscountPerTraveler;
    const availablePoints = this.getAvailablePoints();
    const maxDiscount = this.getMaxDiscountForCategory();

    // El máximo es el menor entre el límite por persona y los puntos disponibles
    return Math.min(maxPointsPerPerson, availablePoints, maxDiscount);
  }

  /**
   * Muestra mensaje cuando se aplica un límite
   * @param originalPoints Puntos originales intentados
   * @param finalPoints Puntos finales aplicados
   * @param travelerId ID del viajero
   * @param maxAllowed Máximo permitido
   */
  private showLimitAppliedMessage(
    originalPoints: number,
    finalPoints: number,
    travelerId: string,
    maxAllowed: number
  ): void {
    const traveler = this.travelers.find((t) => t.id === travelerId);
    const travelerName = traveler ? traveler.name : 'Viajero';

    let reason = '';
    if (originalPoints > (traveler?.maxPoints || 0)) {
      reason = `límite por persona (${traveler?.maxPoints || 0}€)`;
    } else {
      reason = `límite total disponible (${maxAllowed}€)`;
    }

    this.messageService.add({
      severity: 'warn',
      summary: 'Límite aplicado',
      detail: `${travelerName}: Se limitó a ${finalPoints}€ por ${reason}`,
      life: 3000,
    });
  }

  /**
   * Recalcula los totales de puntos después de cambios manuales
   */
  private recalculatePointsTotals(): void {
    const totalAssigned = Object.values(
      this.pointsRedemption.pointsPerTraveler
    ).reduce((sum, points) => sum + points, 0);

    this.pointsRedemption.totalPointsToUse = totalAssigned;
    this.pointsRedemption.totalDiscount = totalAssigned;

    // Emitir el cambio de descuento por puntos
    this.pointsDiscountChange.emit(this.pointsRedemption.totalDiscount);
  }

  /**
   * Obtiene el total de puntos asignados a un viajero
   * @param travelerId ID del viajero
   */
  getTravelerAssignedPoints(travelerId: string): number {
    return this.pointsRedemption.pointsPerTraveler[travelerId] || 0;
  }

  /**
   * Obtiene el máximo de puntos que puede recibir un viajero según el documento (50€ por persona)
   * @param travelerId ID del viajero
   */
  getTravelerMaxPoints(travelerId: string): number {
    return this.calculateMaxPointsForTraveler(travelerId);
  }

  /**
   * Obtiene el máximo fijo de puntos por persona para mostrar en la UI (siempre 50€)
   * @param travelerId ID del viajero
   */
  getTravelerMaxPointsDisplay(travelerId: string): number {
    const traveler = this.travelers.find((t) => t.id === travelerId);
    if (!traveler) return 0;

    // Siempre mostrar el límite fijo por persona (50€ según el documento)
    return traveler.maxPoints;
  }

  /**
   * Valida si se puede asignar la cantidad de puntos especificada a un viajero
   * @param travelerId ID del viajero
   * @param points Puntos a validar
   */
  canAssignPointsToTraveler(travelerId: string, points: number): boolean {
    const traveler = this.travelers.find((t) => t.id === travelerId);
    if (!traveler || (travelerId !== 'main-traveler' && !traveler.hasEmail))
      return false;

    const maxForThisTraveler = this.calculateMaxPointsForTraveler(travelerId);
    return points >= 0 && points <= maxForThisTraveler;
  }

  /**
   * Distribuye puntos automáticamente de forma equitativa
   */
  distributePointsEqually(): void {
    const totalPoints = this.pointsRedemption.totalPointsToUse;
    this.distributePointsAmongTravelers(totalPoints);
  }

  /**
   * Obtiene el resumen de distribución de puntos
   */
  getPointsDistributionSummary(): {
    totalPoints: number;
    totalDiscount: number;
    travelersWithPoints: number;
    mainTravelerPoints: number;
  } {
    const travelersWithPoints = this.travelers.filter(
      (t) => t.assignedPoints > 0
    ).length;
    const mainTravelerPoints =
      this.pointsRedemption.pointsPerTraveler['main-traveler'] || 0;

    return {
      totalPoints: this.pointsRedemption.totalPointsToUse,
      totalDiscount: this.pointsRedemption.totalDiscount,
      travelersWithPoints,
      mainTravelerPoints,
    };
  }

  /**
   * Obtiene el precio final después de aplicar descuentos de puntos
   */
  getFinalPrice(): number {
    const basePrice =
      this.paymentState.type === 'deposit'
        ? this.depositTotalAmount
        : this.totalPrice;
    return Math.max(0, basePrice - this.pointsRedemption.totalDiscount);
  }

  /**
   * Obtiene el nombre de la categoría para mostrar
   */
  getCategoryDisplayName(): string {
    if (!this.pointsSummary) return '';
    return this.pointsSummary.currentCategory; // Simplified
  }

  /**
   * Obtiene el icono de la categoría
   */
  getCategoryIcon(): string {
    if (!this.pointsSummary) return '';
    // Simplified mock logic
    switch (this.pointsSummary.currentCategory) {
      case 'TROTAMUNDOS':
        return 'pi pi-leaf';
      case 'VIAJERO':
        return 'pi pi-send';
      case 'NOMADA':
        return 'pi pi-globe';
      default:
        return 'pi pi-star';
    }
  }

  /**
   * Obtiene la clase CSS para el badge de categoría
   */
  getCategoryBadgeClass(): string {
    if (!this.pointsSummary) return '';
    // Simplified mock logic
    switch (this.pointsSummary.currentCategory) {
      case 'TROTAMUNDOS':
        return 'category-trotamundos';
      case 'VIAJERO':
        return 'category-viajero';
      case 'NOMADA':
        return 'category-nomada';
      default:
        return '';
    }
  }

  /**
   * Obtiene el texto de progreso hacia la siguiente categoría
   */
  getProgressText(): string {
    if (!this.pointsSummary || !this.pointsSummary.nextCategory) return '';

    const nextCategoryName = this.pointsSummary.nextCategory;
    const tripsNeeded = this.pointsSummary.pointsToNextCategory || 0;

    if (tripsNeeded <= 0) {
      return `¡Felicidades! Has alcanzado el nivel ${nextCategoryName}`;
    }

    return `Te faltan ${tripsNeeded} viaje${
      tripsNeeded > 1 ? 's' : ''
    } para ser ${nextCategoryName}`;
  }

  /**
   * Obtiene el porcentaje de progreso hacia la siguiente categoría
   */
  getProgressPercentage(): number {
    if (!this.pointsSummary || !this.pointsSummary.pointsToNextCategory)
      return 100;

    // Simplified mock logic
    const currentTrips = 1; // Mock value
    const totalTripsNeeded = 3; // Mock value for VIAJERO

    return Math.min(100, (currentTrips / totalTripsNeeded) * 100);
  }

  // ===== MÉTODOS PARA CONFIRMACIÓN Y REGISTRO DE CANJE (E3-04) =====

  /**
   * Registra las transacciones de canje de puntos en el sistema
   * @param reservationId ID de la reserva
   * @param pointsDistribution Distribución de puntos por viajero
   * @returns Array de transacciones registradas
   */
  async registerPointsRedemption(
    reservationId: string,
    pointsDistribution: { [travelerId: string]: number }
  ): Promise<any[]> {
    const transactions: any[] = [];

    try {
      // Crear transacción para cada viajero que recibió puntos
      Object.entries(pointsDistribution).forEach(([travelerId, points]) => {
        if (points > 0) {
          const transaction = {
            travelerId,
            points,
            type: 'redemption',
            category: 'travel',
            concept: `Canje de puntos en reserva ${reservationId}`,
            reservationId,
          };

          transactions.push(transaction);
        }
      });

      // TODO: Implementar llamada a la API para registrar transacciones
      // await this.pointsService.registerTransactions(transactions);

      return transactions;
    } catch (error) {
      console.error('❌ Error al registrar transacciones de canje:', error);
      throw new Error('No se pudieron registrar las transacciones de puntos');
    }
  }

  /**
   * Actualiza el saldo de puntos del usuario después del canje
   * @param pointsUsed Puntos utilizados en el canje
   */
  private updateUserPointsAfterRedemption(pointsUsed: number): void {
    if (this.pointsSummary) {
      // Reducir puntos disponibles
      this.pointsSummary.availablePoints -= pointsUsed;
      this.pointsSummary.usedPoints += pointsUsed;
    }
  }

  /**
   * Muestra la confirmación de canje de puntos al usuario
   * @param transactions Transacciones registradas
   * @param totalDiscount Descuento total aplicado
   */
  private showRedemptionConfirmation(
    transactions: any[],
    totalDiscount: number
  ): void {
    const travelersCount = transactions.length;
    const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);

    // Mensaje principal
    this.messageService.add({
      severity: 'success',
      summary: 'Canje de puntos exitoso',
      detail: `Se han canjeado ${totalPoints} puntos por ${totalDiscount.toFixed(
        2
      )}€ de descuento.`,
      life: 6000,
    });

    // Mensaje adicional con detalles
    if (travelersCount > 1) {
      this.messageService.add({
        severity: 'info',
        summary: 'Distribución de puntos',
        detail: `Los puntos se distribuyeron entre ${travelersCount} viajeros.`,
        life: 4000,
      });
    }
  }

  /**
   * Procesa el canje de puntos completo (registro + confirmación)
   * @param reservationId ID de la reserva
   * @returns Promise<boolean> - true si el canje fue exitoso
   */
  async processPointsRedemption(reservationId: string): Promise<boolean> {
    if (
      !this.pointsRedemption.enabled ||
      this.pointsRedemption.totalPointsToUse <= 0
    ) {
      return true; // No hay canje de puntos
    }

    try {
      // TODO: Implementar llamada real a la API
      console.log(
        `Processing points redemption for reservation ${reservationId}`
      );

      // Simular éxito
      const success = true;

      if (success) {
        // Actualizar saldo del usuario
        this.updateUserPointsAfterRedemption(
          this.pointsRedemption.totalPointsToUse
        );

        // Mostrar confirmación al usuario
        this.showRedemptionConfirmation(
          [],
          this.pointsRedemption.totalDiscount
        );
      }

      return success;
    } catch (error) {
      console.error('❌ Error al procesar canje de puntos:', error);

      this.messageService.add({
        severity: 'error',
        summary: 'Error en canje de puntos',
        detail:
          'No se pudo procesar el canje de puntos. El pago continuará sin descuento.',
        life: 5000,
      });

      return false;
    }
  }

  /**
   * Obtiene el resumen de canje para mostrar en la confirmación
   */
  getRedemptionSummary(): PointsDistributionSummary {
    const travelersWithPoints = this.travelers.filter(
      (t) => t.assignedPoints > 0
    ).length;
    const mainTravelerPoints =
      this.pointsRedemption.pointsPerTraveler['main-traveler'] || 0;

    return {
      totalPoints: this.pointsRedemption.totalPointsToUse,
      totalDiscount: this.pointsRedemption.totalDiscount,
      travelersWithPoints,
      mainTravelerPoints,
    };
  }

  /**
   * Obtiene el máximo de puntos permitidos (menor entre disponibles y límite de categoría)
   */
  getMaxAllowedPoints(): number {
    return Math.min(
      this.getAvailablePoints(),
      this.getMaxDiscountForCategory()
    );
  }

  /**
   * Verifica si el total de puntos asignados excede el máximo permitido
   */
  isTotalExceeded(): boolean {
    return (
      this.getPointsDistributionSummary().totalPoints >
      this.getMaxAllowedPoints()
    );
  }

  // ===== MÉTODOS PARA REVERSO POR CANCELACIÓN =====

  /**
   * Procesa la cancelación de la reserva y revierte los puntos usados
   * @param reservationId ID de la reserva a cancelar
   * @param reason Razón de la cancelación
   */
  async processReservationCancellation(
    reservationId: string,
    reason: string = 'Usuario canceló la reserva'
  ): Promise<boolean> {
    try {
      console.log(
        `Processing reservation cancellation for ${reservationId} due to: ${reason}`
      );

      // Verificar uso de puntos en la reserva
      if (
        this.pointsRedemption.enabled &&
        this.pointsRedemption.totalPointsToUse > 0
      ) {
        // TODO: Implementar reverso real de puntos
        console.log(
          `Reverting ${this.pointsRedemption.totalPointsToUse} points for cancellation`
        );

        // Mostrar mensaje de confirmación al usuario
        this.messageService.add({
          severity: 'success',
          summary: 'Puntos revertidos',
          detail: `Se han revertido ${this.pointsRedemption.totalPointsToUse} puntos a tu cuenta por la cancelación de la reserva.`,
          life: 5000,
        });

        // Actualizar saldo de puntos del usuario
        this.updateUserPointsAfterReversal(
          this.pointsRedemption.totalPointsToUse
        );
      }

      // TODO: Cancelar la reserva en el sistema
      return true;
    } catch (error) {
      console.error('❌ Error al procesar cancelación de reserva:', error);

      this.messageService.add({
        severity: 'error',
        summary: 'Error en cancelación',
        detail:
          'No se pudo procesar la cancelación de la reserva. Contacta con soporte.',
        life: 5000,
      });

      return false;
    }
  }

  /**
   * Actualiza el saldo de puntos del usuario después de un reverso
   * @param pointsReversed Puntos que se revirtieron
   */
  private updateUserPointsAfterReversal(pointsReversed: number): void {
    if (this.pointsSummary) {
      // Añadir los puntos revertidos al saldo disponible
      this.pointsSummary.availablePoints += pointsReversed;
      this.pointsSummary.totalPoints += pointsReversed;
    }
  }

  /**
   * Simula la cancelación de una reserva (para testing)
   */
  simulateReservationCancellation(): void {
    const reservationId = `reservation_${Date.now()}`;
    this.processReservationCancellation(
      reservationId,
      'Simulación de cancelación'
    );
  }

  /**
   * Simula la finalización de un viaje para probar la generación automática de puntos
   */
  async simulateTripCompletion(): Promise<void> {
    try {
      console.log('Simulating trip completion');

      // TODO: Implementar llamada real a la API para generar puntos
      this.messageService.add({
        severity: 'info',
        summary: 'Simulación de finalización',
        detail:
          'La simulación de finalización de viaje se ha ejecutado (sin API real).',
        life: 3000,
      });
    } catch (error) {
      console.error('Error en simulación de finalización:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Ocurrió un error durante la simulación de finalización.',
        life: 4000,
      });
    }
  }

  /**
   * Obtiene información sobre los puntos usados en la reserva actual
   */
  getPointsUsedInReservation(): {
    used: boolean;
    amount: number;
    canRevert: boolean;
  } {
    return {
      used:
        this.pointsRedemption.enabled &&
        this.pointsRedemption.totalPointsToUse > 0,
      amount: this.pointsRedemption.totalPointsToUse,
      canRevert: true, // Simplified - always allow reversal
    };
  }

  /**
   * Maneja el cambio de descuento por puntos desde el componente de canje
   */
  onPointsDiscountChange(discount: number): void {
    this.pointsRedemption.totalDiscount = discount;
    this.pointsDiscountChange.emit(discount);
  }

  /**
   * Maneja el cambio de estado de habilitación del canje de puntos
   */
  onRedemptionEnabledChange(enabled: boolean): void {
    this.pointsRedemption.enabled = enabled;
    if (!enabled) {
      this.pointsRedemption.totalPointsToUse = 0;
      this.pointsRedemption.totalDiscount = 0;
      this.pointsDiscountChange.emit(0);
      this.reloadReservationTotalAmount();
    }
  }

  loadReservationTotalAmount(): void {
    this.reservationService.getById(this.reservationId).subscribe((reservation) => {
      this.totalPrice = reservation.totalAmount;
    });
  }

  reloadReservationTotalAmount(): void {
    this.loadReservationTotalAmount();
  }
}
