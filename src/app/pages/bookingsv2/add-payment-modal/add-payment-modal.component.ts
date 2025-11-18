import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { NewScalapayService } from '../../checkout-v2/services/newScalapay.service';
import { PaymentsNetService } from '../../checkout-v2/services/paymentsNet.service';
import { PaymentStatusNetService } from '../../checkout-v2/services/paymentStatusNet.service';
import { PaymentMethodNetService } from '../../checkout-v2/services/paymentMethodNet.service';
import { NewRedsysService, IFormData } from '../../checkout-v2/services/newRedsys.service';
import { CurrencyService } from '../../../core/services/masterdata/currency.service';
import { PaymentService, PaymentInfo } from '../../../core/services/payments/payment.service';
import { environment } from '../../../../environments/environment';

export interface PaymentData {
  amount: number;
  method: 'card' | 'transfer' | 'scalapay';
}

@Component({
  selector: 'app-add-payment-modal',
  templateUrl: './add-payment-modal.component.html',
  styleUrls: ['./add-payment-modal.component.scss'],
  standalone: false,
})
export class AddPaymentModalComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() paymentInfo: PaymentInfo = { totalPrice: 0, pendingAmount: 0, paidAmount: 0 };
  @Input() reservationId: number = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() paymentProcessed = new EventEmitter<PaymentData>();

  // Propiedades para el formulario de pago
  customPaymentAmount: number = 0;
  selectedPaymentMethod: 'card' | 'transfer' | 'scalapay' | null = null;
  paymentAmountError: string = '';
  processingPayment: boolean = false;

  // Payment IDs
  transferMethodId: number = 0;
  redsysMethodId: number = 0;
  pendingStatusId: number = 0;

  constructor(
    private readonly router: Router,
    private readonly messageService: MessageService,
    private readonly scalapayService: NewScalapayService,
    private readonly paymentsService: PaymentsNetService,
    private readonly paymentStatusService: PaymentStatusNetService,
    private readonly paymentMethodService: PaymentMethodNetService,
    private readonly redsysService: NewRedsysService,
    private readonly currencyService: CurrencyService,
    private readonly paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.loadPaymentIds();
  }

  private loadPaymentIds(): void {
    this.paymentMethodService.getPaymentMethodByCode('TRANSFER').subscribe({
      next: (methods: any) => {
        if (methods && methods.length > 0) {
          this.transferMethodId = methods[0].id;
        }
      },
      error: (error: any) => console.error('Error loading transfer method:', error)
    });

    this.paymentMethodService.getPaymentMethodByCode('REDSYS').subscribe({
      next: (methods: any) => {
        if (methods && methods.length > 0) {
          this.redsysMethodId = methods[0].id;
        }
      },
      error: (error: any) => console.error('Error loading redsys method:', error)
    });

    this.paymentStatusService.getPaymentStatusByCode('PENDING').subscribe({
      next: (statuses: any) => {
        if (statuses && statuses.length > 0) {
          this.pendingStatusId = statuses[0].id;
        }
      },
      error: (error: any) => console.error('Error loading pending status:', error)
    });
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  resetForm(): void {
    this.customPaymentAmount = 0;
    this.selectedPaymentMethod = null;
    this.paymentAmountError = '';
    this.processingPayment = false;
  }

  validatePaymentAmount(): void {
    this.paymentAmountError = '';
    
    const validation = this.paymentService.validatePaymentAmount(
      this.customPaymentAmount, 
      this.paymentInfo.pendingAmount
    );
    
    if (!validation.valid) {
      this.paymentAmountError = validation.error || '';
    }
  }

  selectPaymentMethodType(method: 'card' | 'transfer' | 'scalapay'): void {
    this.selectedPaymentMethod = method;
  }

  isPaymentFormValid(): boolean {
    return !!(
      this.customPaymentAmount &&
      this.customPaymentAmount > 0 &&
      this.customPaymentAmount <= this.paymentInfo.pendingAmount &&
      this.selectedPaymentMethod &&
      !this.paymentAmountError
    );
  }

  async processCustomPayment(): Promise<void> {
    if (!this.isPaymentFormValid()) {
      return;
    }

    this.processingPayment = true;

    try {
      switch (this.selectedPaymentMethod) {
        case 'card':
          await this.processCardPayment();
          break;
        case 'transfer':
          await this.processTransferBankPayment();
          break;
        case 'scalapay':
          await this.processScalapayPayment();
          break;
      }
    } catch (error: any) {
      console.error('Error procesando pago:', error);
      this.processingPayment = false;
      
      let errorMessage = 'Ha ocurrido un error al procesar el pago. Por favor, inténtelo nuevamente.';
      
      // Proporcionar mensajes más específicos según el tipo de error
      if (error?.status === 500) {
        errorMessage = 'Error del servidor de pagos. Por favor, contacte con soporte.';
      } else if (error?.status === 400) {
        errorMessage = 'Los datos del pago no son válidos. Verifique la información e intente nuevamente.';
      } else if (error?.status === 404) {
        errorMessage = 'No se encontró la reserva. Por favor, recargue la página e intente nuevamente.';
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      this.messageService.add({
        severity: 'error',
        summary: 'Error al procesar el pago',
        detail: errorMessage,
        life: 7000,
      });
    }
  }

  private async processCardPayment(): Promise<void> {
    try {
      const currencyId = await this.currencyService.getCurrencyIdByCode('EUR').toPromise();

      if (!currencyId) {
        throw new Error('No se pudo obtener el ID de la moneda EUR');
      }

      // Crear el pago en la base de datos
      this.paymentsService.create({
        reservationId: this.reservationId,
        amount: this.customPaymentAmount,
        paymentDate: new Date(),
        paymentMethodId: this.redsysMethodId,
        paymentStatusId: this.pendingStatusId,
        currencyId: currencyId
      }).subscribe({
        next: (response: any) => {
          response.transactionReference = response.id + "F" + this.reservationId + "R";
          this.paymentsService.update(response).subscribe({
            next: (updatedResponse: any) => {
              console.log('🔵 Respuesta de actualización de pago:', updatedResponse);
              
              // Emitir evento de pago procesado para analytics
              this.paymentProcessed.emit({
                amount: this.customPaymentAmount,
                method: 'card'
              });

              // Generar los datos del formulario para Redsys
              const baseUrlFront = (window.location.href).replace(this.router.url, '');
              this.redsysService.generateFormData(
                updatedResponse.id, 
                environment.redsysApiUrl,
                baseUrlFront
              ).subscribe({
                next: (formData: IFormData | undefined) => {
                  if (formData) {
                    // Enviar el formulario a Redsys
                    this.enviarFormARedsys(formData);
                  } else {
                    throw new Error('No se pudieron generar los datos del formulario de Redsys');
                  }
                },
                error: (error: any) => {
                  console.error('Error generando formulario Redsys:', error);
                  this.processingPayment = false;
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudieron generar los datos del formulario de pago',
                    life: 7000,
                  });
                }
              });
            },
            error: (error: any) => {
              console.error('Error al actualizar el pago:', error);
              this.processingPayment = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al actualizar la referencia de transacción',
                life: 7000,
              });
            }
          });
        },
        error: (error: any) => {
          console.error('Error al crear el pago:', error);
          this.processingPayment = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al crear el pago',
            life: 7000,
          });
        }
      });
    } catch (error) {
      console.error('Error procesando pago con tarjeta:', error);
      this.processingPayment = false;
      throw error;
    }
  }

  private async enviarFormARedsys(formData: IFormData): Promise<void> {
    // Crear formulario dinámico para enviar a Redsys
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

  private async processTransferBankPayment(): Promise<void> {
    try {
      const currencyId = await this.currencyService.getCurrencyIdByCode('EUR').toPromise();

      if (!currencyId) {
        throw new Error('No se pudo obtener el ID de la moneda EUR');
      }

      // Crear el pago por transferencia
      this.paymentsService.create({
        reservationId: this.reservationId,
        amount: this.customPaymentAmount,
        paymentDate: new Date(),
        paymentMethodId: this.transferMethodId,
        paymentStatusId: this.pendingStatusId,
        currencyId: currencyId
      }).subscribe({
        next: (response: any) => {
          response.transactionReference = response.id + "F" + this.reservationId + "R";
          this.paymentsService.update(response).subscribe({
            next: (updatedResponse: any) => {
              console.log('🔵 Respuesta de actualización de pago:', updatedResponse);
              
              // Emitir evento de pago procesado para analytics
              this.paymentProcessed.emit({
                amount: this.customPaymentAmount,
                method: 'transfer'
              });

              // Navegar a la página de confirmación/subida de comprobante
              this.router.navigate([`/reservation/${this.reservationId}/${updatedResponse.id}`]);
            },
            error: (error: any) => {
              console.error('Error al actualizar el pago:', error);
              this.processingPayment = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Error al actualizar la referencia de transacción',
                life: 7000,
              });
            }
          });
        },
        error: (error: any) => {
          console.error('Error al crear el pago:', error);
          this.processingPayment = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al crear el pago por transferencia',
            life: 7000,
          });
        }
      });
    } catch (error) {
      console.error('Error procesando transferencia bancaria:', error);
      this.processingPayment = false;
      throw error;
    }
  }

  private async processScalapayPayment(): Promise<void> {
    try {
      // Obtener URL base
      const baseUrl = (window.location.href).replace(this.router.url, '');

      console.log('🔵 Scalapay - Iniciando proceso de pago:', {
        reservationId: this.reservationId,
        amount: this.customPaymentAmount,
        baseUrl: baseUrl
      });

      // Crear orden en Scalapay
      const response = await this.scalapayService.createOrder(this.reservationId, baseUrl).toPromise();

      console.log('✅ Scalapay - Respuesta recibida:', response);

      if (response?.checkoutUrl) {
        // Emitir evento de pago procesado para analytics (antes de redirigir)
        this.paymentProcessed.emit({
          amount: this.customPaymentAmount,
          method: 'scalapay'
        });

        console.log('🔗 Scalapay - Redirigiendo a:', response.checkoutUrl);
        // Redirigir a Scalapay para completar el pago
        window.location.href = response.checkoutUrl;
      } else {
        throw new Error('No se pudo obtener la URL de checkout de Scalapay');
      }
    } catch (error: any) {
      console.error('❌ Scalapay - Error completo:', {
        error: error,
        status: error?.status,
        statusText: error?.statusText,
        message: error?.message,
        errorDetails: error?.error
      });
      
      // Si es error 500, agregar más contexto
      if (error?.status === 500) {
        throw new Error('El servicio de Scalapay no está disponible temporalmente. Por favor, intente con otro método de pago o contacte con soporte.');
      }
      
      throw error;
    }
  }

  formatCurrency(amount: number): string {
    return this.paymentService.formatCurrency(amount);
  }
}

