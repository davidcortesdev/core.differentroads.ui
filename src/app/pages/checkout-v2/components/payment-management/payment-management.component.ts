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
  NewScalapayService,
} from '../../services/newScalapay.service';
import { Router } from '@angular/router';
import {
  PaymentsNetService,
} from '../../services/paymentsNet.service';
import { PaymentStatusNetService } from '../../services/paymentStatusNet.service';
import { PaymentMethodNetService } from '../../services/paymentMethodNet.service';
import { IFormData, NewRedsysService } from '../../services/newRedsys.service';
import { ReservationStatusService } from '../../../../core/services/reservation/reservation-status.service';
import { ReservationService } from '../../../../core/services/reservation/reservation.service';
import { MessageService } from 'primeng/api';
import { CurrencyService } from '../../../../core/services/currency.service';
import {
  FlightSearchService,
  IPriceChangeInfo,
} from '../../../../core/services/flight-search.service';

// Simplified interfaces for points redemption
export interface PointsRedemptionConfig {
  enabled: boolean;
  totalPointsToUse: number;
  pointsPerTraveler: { [travelerId: string]: number };
  maxDiscountPerTraveler: number;
  totalDiscount: number;
}

export interface TravelerData {
  id: string;
  name: string;
  email: string;
  hasEmail: boolean;
  maxPoints: number;
  assignedPoints: number;
}

export interface TravelerPointsSummary {
  travelerId: string;
  currentCategory: string;
  totalPoints: number;
  availablePoints: number;
  usedPoints: number;
  categoryStartDate: Date;
  nextCategory?: string;
  pointsToNextCategory?: number;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  errorType: string;
  details?: string[];
}

export interface PointsDistributionSummary {
  totalPoints: number;
  totalDiscount: number;
  travelersWithPoints: number;
  mainTravelerPoints: number;
}

export type PaymentType =
  | 'complete'
  | 'deposit'
  | 'installments'
  | 'transfer25';
export type PaymentMethod = 'creditCard' | 'transfer';
// Removed InstallmentOption type since we no longer have specific installment options

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
  // Inputs
  @Input() set totalPrice(value: number) {
    const previousPrice = this._totalPrice;
    this._totalPrice = value;

    // Solo reinicializar el widget si el precio cambió y hay un valor válido
    if (
      value &&
      value !== previousPrice &&
      this.paymentState.type === 'installments'
    ) {
      console.log(`💰 Precio actualizado: ${previousPrice} → ${value}`);
      setTimeout(() => {
        this.forceScalapayReload();
      }, 100);
    }
  }

  ngAfterViewInit(): void {
    console.log('🔧 Inicializando componente de pago...');
    // Primero cargar el script de ScalaPay
    this.initializeScalapayScript();
  }

  get totalPrice(): number {
    return this._totalPrice;
  }

  private _totalPrice: number = 0;
  @Input() reservationId!: number;
  @Input() depositAmount: number = 200;
  @Input() paymentDeadline: string = '30 días antes del tour';
  @Input() departureDate: string = '';

  // Outputs
  @Output() paymentCompleted = new EventEmitter<PaymentOption>();
  @Output() backRequested = new EventEmitter<void>();
  @Output() navigateToStep = new EventEmitter<number>();
  @Output() pointsDiscountChange = new EventEmitter<number>();

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

  // Points redemption
  pointsSummary: TravelerPointsSummary | null = null;
  pointsRedemption: PointsRedemptionConfig = {
    enabled: false,
    totalPointsToUse: 0,
    pointsPerTraveler: {},
    maxDiscountPerTraveler: 50, // 50€ máximo por persona
    totalDiscount: 0,
  };

  // Travelers data for points distribution
  travelers: TravelerData[] = [];

  // Transfer 25% voucher attachment
  transfer25VoucherUrl: string | null = null;

  // Configuration flags
  @Input() showTransfer25Option: boolean = false; // Por defecto oculto para otros proyectos

  // State management
  readonly dropdownStates = {
    main: true,
    paymentMethods: true,
    pointsRedemption: true,
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
    private readonly flightSearchService: FlightSearchService,
  ) {}

  ngOnInit(): void {
    this.loadPaymentIds();
    this.checkAmadeusFlightStatus();
    this.loadUserPoints();
    this.loadTravelersData();
  }

  ngOnChanges(): void {
    // Si el depósito no está disponible pero está seleccionado, limpiar la selección
    if (this.paymentState.type === 'deposit' && !this.shouldShowDepositOption) {
      this.paymentState.type = null;
      this.updateDropdownVisibility();
    }

    // Si transfer25 no está habilitado pero está seleccionado, limpiar la selección
    if (this.paymentState.type === 'transfer25' && !this.showTransfer25Option) {
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

          // Verificar vuelos de specific-search para depósito
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
      },
    });
  }

  /**
   * Verifica si hay vuelos de specific-search y calcula su coste
   */
  private checkSpecificSearchFlights(): void {
    if (!this.reservationId) return;

    // Verificar si ya se establecieron los valores
    if (this.hasSpecificSearchFlights && this.specificSearchFlightsCost > 0) {
      console.log('✅ Los valores de specific-search ya están establecidos:', {
        hasSpecificSearchFlights: this.hasSpecificSearchFlights,
        specificSearchFlightsCost: this.specificSearchFlightsCost,
      });
      return;
    }

    // Implementar llamada al servicio para obtener vuelos de specific-search
    // Por ahora, los valores se establecen en validateAmadeusPrice
    console.log('🔍 Verificando vuelos de specific-search...');
    console.log('📊 Estado actual:', {
      hasSpecificSearchFlights: this.hasSpecificSearchFlights,
      specificSearchFlightsCost: this.specificSearchFlightsCost,
    });
  }

  /**
   * Limpia las selecciones de pago no permitidas para vuelos de Amadeus
   */
  private cleanupInvalidSelectionsForAmadeus(): void {
    // Si estaba seleccionado transferencia, limpiarlo (nunca permitida para Amadeus)
    if (this.paymentState.method === 'transfer') {
      console.log(
        '🔄 Limpiando selección de transferencia (no permitido para Amadeus)'
      );
      this.paymentState.method = null;
    }

    // Si estaba seleccionado depósito, verificar si se permite
    if (this.paymentState.type === 'deposit' && this.hasAmadeusFlight) {
      // Solo permitir depósito si hay vuelos de specific-search
      if (!this.hasSpecificSearchFlights) {
        console.log(
          '🔄 Limpiando selección de depósito (no permitido para Amadeus sin vuelos de specific-search)'
        );
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

          // Rellenar specificSearchFlightsCost con el precio actual del vuelo
          this.specificSearchFlightsCost = validation.currentPrice;
          this.hasSpecificSearchFlights = true;

          console.log('✅ Precio del vuelo obtenido:', validation.currentPrice);
          console.log('📊 Estado actualizado:', {
            hasSpecificSearchFlights: this.hasSpecificSearchFlights,
            specificSearchFlightsCost: this.specificSearchFlightsCost,
          });

          if (validation.hasChanged) {
            console.log('⚠️ Cambio de precio detectado:', validation);
            this.showPriceChangeDialog = true;

            // Mostrar mensaje informativo
            this.messageService.add({
              severity: 'warn',
              summary: 'Precio cambiado',
              detail: `El precio del vuelo ha cambiado. Diferencia: ${validation.priceDifference.toFixed(
                2
              )} ${validation.currency || 'EUR'}`,
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
      },
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

    // Cargar estados de pago
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

  get isPaymentValid(): boolean {
    if (!this.paymentState.type) return false;

    if (this.paymentState.type === 'installments') {
      return true; // Para installments, siempre es válido ya que no hay opciones específicas
    }

    if (this.paymentState.type === 'transfer25') {
      return this.showTransfer25Option; // Solo válido si la opción está habilitada
    }

    return !!this.paymentState.method;
  }

  get buttonLabel(): string {
    return this.paymentState.isLoading ? 'Procesando...' : 'Realizar pago';
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

  /**
   * Calcula el 25% del precio total para la opción de transferencia del 25%
   */
  get transfer25Amount(): number {
    return this.totalPrice * 0.25;
  }

  // Payment type management
  selectPaymentType(type: PaymentType): void {
    // Si se intenta seleccionar depósito pero no está disponible, no hacer nada
    if (type === 'deposit' && !this.shouldShowDepositOption) {
      return;
    }

    // Si se intenta seleccionar transfer25 pero no está habilitado, no hacer nada
    if (type === 'transfer25' && !this.showTransfer25Option) {
      return;
    }

    this.paymentState.type = type;
    this.updateDropdownVisibility();
    this.resetRelatedSelections(type);

    // Si se selecciona installments, inicializar/recargar el widget de Scalapay
    if (type === 'installments') {
      console.log(
        '💳 Opción de installments seleccionada, inicializando widget...'
      );
      // Dar tiempo para que el DOM se actualice
      setTimeout(() => {
        // Asegurarse de que el script esté cargado
        if (!this.isScalapayScriptLoaded()) {
          console.log('📜 Script no cargado, cargando...');
          this.initializeScalapayScript();
        }
        // Inicializar el widget
        this.initializeScalapayWidget();
      }, 200);
    }
  }

  // Payment method management
  selectPaymentMethod(method: PaymentMethod): void {
    this.paymentState.method = method;
  }

  // Dropdown management
  toggleDropdown(dropdown: keyof typeof this.dropdownStates): void {
    this.dropdownStates[dropdown] = !this.dropdownStates[dropdown];

    if (dropdown === 'main' && !this.dropdownStates.main) {
      this.dropdownStates.paymentMethods = false;
    }
  }

  // Actions
  goBack(): void {
    this.backRequested.emit();
  }

  /**
   * Maneja la subida exitosa del justificante de transferencia del 25%
   */
  handleTransfer25VoucherUpload(response: any): void {
    console.log('Voucher uploaded successfully:', response);

    if (response.secure_url) {
      this.transfer25VoucherUrl = response.secure_url;
      this.messageService.add({
        severity: 'success',
        summary: 'Justificante subido',
        detail: 'El justificante se ha subido correctamente.',
        life: 3000,
      });
    }
  }

  /**
   * Maneja errores en la subida del justificante de transferencia del 25%
   */
  handleTransfer25VoucherError(error: any): void {
    console.error('Error uploading voucher:', error);
    this.messageService.add({
      severity: 'error',
      summary: 'Error de subida',
      detail:
        'Ha ocurrido un error al subir el justificante. Por favor, inténtalo de nuevo.',
      life: 4000,
    });
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

    // Validar canje de puntos antes del pago
    if (
      this.pointsRedemption.enabled &&
      this.pointsRedemption.totalPointsToUse > 0
    ) {
      const validationResult = this.validatePointsRedemption(
        this.pointsRedemption.totalPointsToUse,
        this.pointsRedemption.pointsPerTraveler
      );

      if (!validationResult.isValid) {
        this.showValidationError(validationResult);
        return; // No proceder con el pago si hay errores de validación
      }
    }

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
        detail:
          'Estado de la reservación actualizado correctamente. Procesando pago...',
        life: 3000,
      });

      // Procesar canje de puntos antes del pago
      if (
        this.pointsRedemption.enabled &&
        this.pointsRedemption.totalPointsToUse > 0
      ) {
        const redemptionSuccess = await this.processPointsRedemption(
          this.reservationId.toString()
        );
        if (!redemptionSuccess) {
          // Si falla el canje de puntos, continuar sin descuento
          this.messageService.add({
            severity: 'warn',
            summary: 'Canje de puntos no procesado',
            detail: 'El pago continuará sin descuento de puntos.',
            life: 4000,
          });
        }
      }

      // Solo después de procesar puntos, procesar el pago
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

      // Obtener estado PREBOOKED
      const reservationStatus = await firstValueFrom(
        this.reservationStatusService.getByCode('PREBOOKED')
      );

      if (!reservationStatus || reservationStatus.length === 0) {
        throw new Error('No se pudo obtener el estado PREBOOKED');
      }

      // Actualizar estado de la reservación
      const success = await firstValueFrom(
        this.reservationService.updateStatus(
          this.reservationId!,
          reservationStatus[0].id
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
        summary: 'Error interno al guardar su reserva',
        detail:
          'No se pudo actualizar el estado de la reservación. Intente nuevamente más tarde o contacte con nuestro equipo de soporte.',
        life: 5000,
      });
      throw error; // Re-lanzar el error para que se maneje en el método principal
    }
  }

  /**
   * Procesa el pago según el método seleccionado
   */
  private async processPaymentBasedOnMethod(): Promise<void> {
    console.log(
      '💳 Procesando pago con método:',
      this.paymentMethod,
      'tipo:',
      this.paymentState.type
    );

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
    if (this.isScalapayScriptLoaded()) {
      console.log('📄 Script de Scalapay ya existe');
      return;
    }

    console.log('🚀 Cargando script de Scalapay...');
    const script = document.createElement('script');
    script.type = 'module';
    script.src =
      'https://cdn.scalapay.com/widget/scalapay-widget-loader.js?version=V5';

    script.onload = () => {
      console.log('✅ Script de Scalapay cargado correctamente');
      // Inicializar el widget después de que se cargue el script
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
    if (type === 'installments') {
      this.paymentState.method = null;
    }
  }

  private reloadScalapayWidgets(): void {
    if (!this.totalPrice) return;

    setTimeout(() => {
      this.updatePriceContainers();
      this.dispatchScalapayReloadEvent();
    }, 200);
  }

  private updatePriceContainers(): void {
    if (!this.totalPrice) {
      console.warn('⚠️ No hay precio disponible para actualizar');
      return;
    }

    const formattedPrice = `€ ${this.totalPrice.toFixed(2)}`;
    const mainContainer = document.getElementById('price-container-main');
    if (mainContainer) {
      mainContainer.textContent = formattedPrice;
      console.log('💰 Precio actualizado en contenedor:', formattedPrice);
      console.log('🔍 Estado del contenedor:', {
        id: mainContainer.id,
        content: mainContainer.textContent,
        visible: mainContainer.style.display !== 'none',
      });
    } else {
      console.warn(
        '⚠️ Contenedor de precio no encontrado - ID: price-container-main'
      );
      console.log(
        '🔍 Elementos disponibles:',
        Array.from(document.querySelectorAll('[id*="price"]')).map(
          (el) => el.id
        )
      );
    }
  }

  private dispatchScalapayReloadEvent(): void {
    const event = new CustomEvent('scalapay-widget-reload');
    window.dispatchEvent(event);
    console.log('🔄 Evento de recarga de Scalapay enviado');
  }

  /**
   * Inicializa el widget de Scalapay después de que esté cargado el script
   */
  private initializeScalapayWidget(): void {
    console.log('🔄 Intentando inicializar widget de Scalapay...');
    console.log('📊 Estado actual:', {
      totalPrice: this.totalPrice,
      paymentType: this.paymentState.type,
      scriptLoaded: this.isScalapayScriptLoaded(),
      containerExists: !!document.getElementById('price-container-main'),
      widgetExists: !!document.querySelector('scalapay-widget'),
    });

    if (!this.totalPrice) {
      console.log('⏳ Sin precio disponible, reintentando en 500ms...');
      setTimeout(() => {
        this.initializeScalapayWidget();
      }, 500);
      return;
    }

    // Verificar que los elementos DOM estén presentes
    const container = document.getElementById('price-container-main');
    const widget = document.querySelector('scalapay-widget');

    if (!container) {
      console.error('❌ Contenedor de precio no encontrado!');
      return;
    }

    if (!widget) {
      console.error('❌ Elemento scalapay-widget no encontrado!');
      return;
    }

    console.log(
      '🚀 Inicializando widget de Scalapay con precio:',
      this.totalPrice
    );
    this.updatePriceContainers();

    // Dar tiempo para que el DOM se actualice antes de disparar el evento
    setTimeout(() => {
      this.dispatchScalapayReloadEvent();

      // Verificar si el widget se inicializó correctamente después de un tiempo
      setTimeout(() => {
        this.verifyWidgetInitialization();
      }, 2000);
    }, 200);
  }

  /**
   * Verifica si el widget de Scalapay está listo para ser inicializado
   */
  private isScalapayWidgetReady(): boolean {
    const container = document.getElementById('price-container-main');
    const widget = document.querySelector('scalapay-widget');
    const isReady = !!(container && widget && this.totalPrice);

    console.log('🔍 Estado de readiness del widget:', {
      containerExists: !!container,
      widgetExists: !!widget,
      priceAvailable: !!this.totalPrice,
      ready: isReady,
    });

    return isReady;
  }

  /**
   * Fuerza la recarga completa del widget de Scalapay
   */
  private forceScalapayReload(): void {
    console.log('🔄 Forzando recarga completa del widget de Scalapay');

    // Primero actualizar el precio
    this.updatePriceContainers();

    // Luego disparar los eventos necesarios
    setTimeout(() => {
      this.dispatchScalapayReloadEvent();

      // Si no funciona, intentar inicializar de nuevo
      setTimeout(() => {
        if (!this.isScalapayWidgetVisible()) {
          console.log('⚠️ Widget no visible, reintentando...');
          this.initializeScalapayWidget();
        }
      }, 1000);
    }, 100);
  }

  /**
   * Verifica si el widget de Scalapay está visible
   */
  private isScalapayWidgetVisible(): boolean {
    const widget = document.querySelector('scalapay-widget');
    if (!widget) return false;

    const hasContent =
      widget.children.length > 0 ||
      (widget.textContent?.trim().length || 0) > 0 ||
      (widget.innerHTML?.trim().length || 0) > 0;

    console.log('👁️ Widget visibility check:', {
      exists: !!widget,
      hasContent,
      innerHTML: widget.innerHTML?.slice(0, 100),
    });

    return hasContent;
  }

  /**
   * Verifica que el widget se haya inicializado correctamente
   */
  private verifyWidgetInitialization(): void {
    const widget = document.querySelector('scalapay-widget');
    const container = document.getElementById('price-container-main');

    if (!widget) {
      console.error('❌ Widget no encontrado después de la inicialización');
      return;
    }

    if (!container) {
      console.error(
        '❌ Contenedor de precio no encontrado después de la inicialización'
      );
      return;
    }

    const isVisible = this.isScalapayWidgetVisible();
    console.log('✅ Verificación de inicialización:', {
      widgetExists: !!widget,
      containerExists: !!container,
      containerContent: container.textContent,
      widgetVisible: isVisible,
      widgetHTML: widget.innerHTML?.slice(0, 200),
    });

    if (!isVisible) {
      console.warn(
        '⚠️ El widget no parece haberse inicializado correctamente. Reintentando...'
      );
      setTimeout(() => {
        this.forceScalapayReload();
      }, 1000);
    } else {
      console.log('🎉 Widget de Scalapay inicializado correctamente!');
    }
  }

  private async processInstallmentPayment(): Promise<void> {
    const baseUrl = window.location.href.replace(this.router.url, '');

    console.log('baseUrl', baseUrl);

    //El payment se crea en el backend
    const response = await this.scalapayService
      .createOrder(this.reservationId, baseUrl)
      .toPromise();

    if (response?.checkoutUrl) {
      window.location.href = response.checkoutUrl;
    }
  }

  private async processCreditCardPayment(amount: number): Promise<void> {
    // Obtener currencyId para EUR
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

    const formData: IFormData | undefined = await this.redsysService
      .generateFormData(
        response.id,
        'https://www.differentroads.es/',
        'https://redsys-dev.differentroads.es'
      )
      .toPromise();
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
    const amount =
      this.paymentState.type === 'deposit'
        ? this.depositAmount
        : this.totalPrice;

    // Obtener currencyId para EUR
    const currencyId = await this.currencyService
      .getCurrencyIdByCode('EUR')
      .toPromise();

    if (!currencyId) {
      throw new Error('No se pudo obtener el ID de la moneda EUR');
    }

    // Crear el pago en la API
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

    // Emitir evento de pago completado
    this.paymentCompleted.emit({
      method: this.paymentMethod || undefined,
      type: this.paymentState.type!,
    });

    // Redirigir a new-reservation con los parámetros necesarios
    this.router.navigate([`/reservation/${this.reservationId}/${response.id}`]);
  }

  // ===== MÉTODOS PARA CANJE DE PUNTOS =====

  /**
   * Carga los puntos del usuario autenticado
   *
   * NOTA PARA INTEGRACIÓN CON API:
   * Este método debe ser reemplazado por una llamada al endpoint de saldo de puntos.
   */
  private loadUserPoints(): void {
    // TODO: Reemplazar con llamada real a la API
    // const balance = await this.pointsService.getTravelerPoints(email).toPromise();
    // this.pointsSummary = balance;

    // TEMPORAL: Usar datos mock para desarrollo
    const userId = 'mock-user-id';

    // Datos mock simplificados
    this.pointsSummary = {
      travelerId: userId,
      currentCategory: 'VIAJERO',
      totalPoints: 1500,
      availablePoints: 1200,
      usedPoints: 300,
      categoryStartDate: new Date('2024-01-01'),
      nextCategory: 'NOMADA',
      pointsToNextCategory: 2,
    };
  }

  /**
   * Carga los datos de los viajeros para la distribución de puntos
   *
   * NOTA PARA INTEGRACIÓN CON API:
   * Este método debe ser reemplazado por una llamada al endpoint de viajeros de la reserva.
   */
  private loadTravelersData(): void {
    // TODO: Reemplazar con llamada real a la API
    // const travelers = await this.reservationService.getTravelers(this.reservationId).toPromise();

    // TEMPORAL: Usar datos mock si no se proporcionaron viajeros
    if (!this.travelers || this.travelers.length === 0) {
      this.travelers = [
        {
          id: 'traveler-1',
          name: 'Juan Pérez',
          email: 'juan@example.com',
          hasEmail: true,
          maxPoints: 50,
          assignedPoints: 0,
        },
        {
          id: 'traveler-2',
          name: 'María García',
          email: 'maria@example.com',
          hasEmail: true,
          maxPoints: 50,
          assignedPoints: 0,
        },
      ];
    }
  }

  /**
   * Obtiene la siguiente categoría de viajero
   */
  private getNextCategory(currentCategory: string): string | undefined {
    switch (currentCategory) {
      case 'TROTAMUNDOS':
        return 'VIAJERO';
      case 'VIAJERO':
        return 'NOMADA';
      default:
        return undefined;
    }
  }

  /**
   * Calcula los puntos necesarios para la siguiente categoría
   */
  private calculatePointsToNextCategory(
    currentTrips: number,
    currentCategory: string
  ): number | undefined {
    const nextCategory = this.getNextCategory(currentCategory);
    if (!nextCategory) return undefined;

    switch (nextCategory) {
      case 'VIAJERO':
        return Math.max(0, 3 - currentTrips);
      case 'NOMADA':
        return Math.max(0, 6 - currentTrips);
      default:
        return undefined;
    }
  }

  /**
   * Maneja el cambio del checkbox de canje de puntos
   */
  onPointsRedemptionChange(event: any): void {
    this.pointsRedemption.enabled = event.checked;
    if (!this.pointsRedemption.enabled) {
      this.resetPointsRedemption();
    } else {
      // Si se habilita, inicializar con 0 puntos
      this.updatePointsToUse(0);
    }
  }

  /**
   * Habilita/deshabilita el canje de puntos (método alternativo)
   */
  togglePointsRedemption(): void {
    this.pointsRedemption.enabled = !this.pointsRedemption.enabled;
    if (!this.pointsRedemption.enabled) {
      this.resetPointsRedemption();
    } else {
      // Si se habilita, inicializar con 0 puntos
      this.updatePointsToUse(0);
    }
  }

  /**
   * Resetea la configuración de canje de puntos
   */
  private resetPointsRedemption(): void {
    this.pointsRedemption.totalPointsToUse = 0;
    this.pointsRedemption.pointsPerTraveler = {};
    this.pointsRedemption.totalDiscount = 0;
  }

  /**
   * Obtiene el descuento máximo disponible según la categoría
   */
  getMaxDiscountForCategory(): number {
    if (!this.pointsSummary) return 0;

    // Lógica simplificada para obtener el descuento máximo por categoría
    switch (this.pointsSummary.currentCategory) {
      case 'TROTAMUNDOS':
        return 100; // 100€ máximo
      case 'VIAJERO':
        return 200; // 200€ máximo
      case 'NOMADA':
        return 500; // 500€ máximo
      default:
        return 50; // 50€ por defecto
    }
  }

  /**
   * Obtiene el saldo de puntos disponible
   */
  getAvailablePoints(): number {
    return this.pointsSummary?.availablePoints || 0;
  }

  /**
   * Valida si se puede usar la cantidad de puntos especificada
   */
  canUsePoints(pointsToUse: number): boolean {
    if (!this.pointsSummary) return false;
    const availablePoints = this.getAvailablePoints();
    const maxDiscount = this.getMaxDiscountForCategory();
    return pointsToUse <= availablePoints && pointsToUse <= maxDiscount;
  }

  /**
   * Obtiene el nombre de un viajero por su ID
   * @param travelerId ID del viajero
   */
  private getTravelerName(travelerId: string): string {
    if (travelerId === 'main-traveler') {
      return 'Titular de la reserva';
    }

    const traveler = this.travelers.find((t) => t.id === travelerId);
    return traveler ? traveler.name : 'Viajero desconocido';
  }

  /**
   * Valida todos los aspectos del canje de puntos
   * @param pointsToUse Puntos totales a usar
   * @param distribution Distribución de puntos por viajero
   * @returns Objeto con resultado de validación completo
   */
  validatePointsRedemption(
    pointsToUse: number,
    distribution: { [travelerId: string]: number }
  ): ValidationResult {
    if (!this.pointsSummary) {
      return {
        isValid: false,
        message: 'No se pudo validar el canje de puntos.',
        errorType: 'distribution_error',
      };
    }

    const availablePoints = this.getAvailablePoints();
    const maxDiscount = this.getMaxDiscountForCategory();

    if (pointsToUse > availablePoints) {
      return {
        isValid: false,
        message: 'No tienes suficientes puntos disponibles.',
        errorType: 'insufficient_points',
      };
    }

    if (pointsToUse > maxDiscount) {
      return {
        isValid: false,
        message: 'Excedes el límite de descuento para tu categoría.',
        errorType: 'category_limit',
      };
    }

    return {
      isValid: true,
      message: 'Validación exitosa',
      errorType: 'success',
    };
  }

  /**
   * Muestra mensajes de error de validación
   * @param validationResult Resultado de la validación
   */
  showValidationError(validationResult: {
    isValid: boolean;
    message: string;
    errorType: string;
    details?: string[];
  }): void {
    if (validationResult.isValid) return;

    // Mostrar mensaje principal
    this.messageService.add({
      severity: 'error',
      summary: 'Error en validación de puntos',
      detail: validationResult.message,
      life: 5000,
    });

    // Mostrar detalles adicionales si existen
    if (validationResult.details && validationResult.details.length > 0) {
      validationResult.details.forEach((detail) => {
        this.messageService.add({
          severity: 'warn',
          summary: 'Detalle adicional',
          detail: detail,
          life: 4000,
        });
      });
    }
  }

  /**
   * Valida la asignación de puntos a un viajero
   * @param travelerId ID del viajero
   * @param points Puntos a asignar
   * @returns true si la asignación es válida, false en caso contrario
   */
  validateAndAssignPoints(travelerId: string, points: number): boolean {
    const maxPointsPerPerson = this.pointsRedemption.maxDiscountPerTraveler;
    return points >= 0 && points <= maxPointsPerPerson;
  }

  /**
   * Actualiza la cantidad de puntos a usar con validaciones estrictas
   */
  updatePointsToUse(pointsToUse: number): void {
    if (pointsToUse < 0) pointsToUse = 0;

    // Obtener límites máximos
    const availablePoints = this.getAvailablePoints();
    const maxDiscountForCategory = this.getMaxDiscountForCategory();
    const maxAllowed = Math.min(availablePoints, maxDiscountForCategory);

    // Limitar estrictamente al máximo permitido
    if (pointsToUse > maxAllowed) {
      pointsToUse = maxAllowed;

      // Mostrar mensaje informativo
      this.messageService.add({
        severity: 'warn',
        summary: 'Límite aplicado',
        detail: `Se ha limitado a ${maxAllowed} puntos (máximo disponible)`,
        life: 3000,
      });
    }

    this.pointsRedemption.totalPointsToUse = pointsToUse;
    this.pointsRedemption.totalDiscount = pointsToUse; // 1 punto = 1 euro

    // Distribuir puntos entre viajeros automáticamente
    this.distributePointsAmongTravelers(pointsToUse);
  }

  /**
   * Establece el máximo de puntos disponibles sin mostrar errores (para el botón "Máximo")
   */
  setMaximumPoints(): void {
    const availablePoints = this.getAvailablePoints();
    const maxDiscountForCategory = this.getMaxDiscountForCategory();

    // El máximo real es el menor entre los puntos disponibles y el límite de categoría
    const maximumPoints = Math.min(availablePoints, maxDiscountForCategory);

    this.pointsRedemption.totalPointsToUse = maximumPoints;
    this.pointsRedemption.totalDiscount = maximumPoints; // 1 punto = 1 euro

    // Distribuir puntos entre viajeros automáticamente
    this.distributePointsAmongTravelers(maximumPoints);
  }

  // ===== MÉTODOS PARA DISTRIBUCIÓN DE PUNTOS POR PERSONA =====

  /**
   * Distribuye puntos automáticamente entre los viajeros disponibles
   * @param totalPoints Puntos totales a distribuir
   */
  private distributePointsAmongTravelers(totalPoints: number): void {
    // Resetear asignaciones
    this.travelers.forEach((traveler) => {
      traveler.assignedPoints = 0;
    });

    const maxPointsPerPerson = this.pointsRedemption.maxDiscountPerTraveler;
    let remainingPoints = totalPoints;
    const eligibleTravelers = this.travelers.filter((t) => t.hasEmail);
    const pointsPerEligibleTraveler =
      eligibleTravelers.length > 0
        ? Math.floor(totalPoints / eligibleTravelers.length)
        : 0;

    eligibleTravelers.forEach((traveler) => {
      let pointsToAssign = Math.min(
        pointsPerEligibleTraveler,
        maxPointsPerPerson
      );
      if (remainingPoints > 0) {
        pointsToAssign = Math.min(pointsToAssign, remainingPoints);
        traveler.assignedPoints = pointsToAssign;
        this.pointsRedemption.pointsPerTraveler[traveler.id] = pointsToAssign;
        remainingPoints -= pointsToAssign;
      }
    });

    // Distribute any remaining points to the first eligible traveler
    if (remainingPoints > 0 && eligibleTravelers.length > 0) {
      const firstTraveler = eligibleTravelers[0];
      const currentAssigned = firstTraveler.assignedPoints || 0;
      const canAssignMore = maxPointsPerPerson - currentAssigned;
      const pointsToAdd = Math.min(remainingPoints, canAssignMore);
      firstTraveler.assignedPoints = currentAssigned + pointsToAdd;
      this.pointsRedemption.pointsPerTraveler[firstTraveler.id] =
        firstTraveler.assignedPoints;
    }
  }

  /**
   * Asigna puntos manualmente a un viajero específico con validaciones estrictas
   * @param travelerId ID del viajero
   * @param points Puntos a asignar
   */
  assignPointsToTraveler(travelerId: string, points: number): void {
    const traveler = this.travelers.find((t) => t.id === travelerId);
    if (!traveler) return;

    // Validar que el viajero pueda recibir puntos
    if (travelerId !== 'main-traveler' && !traveler.hasEmail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de asignación',
        detail: 'Este viajero no puede recibir puntos (sin email)',
        life: 4000,
      });
      return;
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
    }
  }
}
