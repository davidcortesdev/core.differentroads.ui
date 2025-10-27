import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface PaymentInfo {
  totalPrice: number;
  pendingAmount: number;
  paidAmount: number;
}

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
export class AddPaymentModalComponent {
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

  constructor() {}

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
    
    if (!this.customPaymentAmount || this.customPaymentAmount <= 0) {
      this.paymentAmountError = 'La cantidad debe ser mayor a 0';
      return;
    }
    
    if (this.customPaymentAmount > this.paymentInfo.pendingAmount) {
      this.paymentAmountError = `La cantidad no puede exceder el monto pendiente (${this.formatCurrency(this.paymentInfo.pendingAmount)})`;
      return;
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

  processCustomPayment(): void {
    if (!this.isPaymentFormValid()) {
      return;
    }

    this.processingPayment = true;

    console.log('Procesando pago:', {
      amount: this.customPaymentAmount,
      method: this.selectedPaymentMethod,
      reservationId: this.reservationId
    });

    // Simular proceso de pago
    setTimeout(() => {
      switch (this.selectedPaymentMethod) {
        case 'card':
          this.processCardPayment();
          break;
        case 'transfer':
          this.processTransferBankPayment();
          break;
        case 'scalapay':
          this.processScalapayPayment();
          break;
      }
    }, 500);
  }

  private processCardPayment(): void {
    console.log('Procesando pago con tarjeta (Redsys):', this.customPaymentAmount);
    
    // TODO: Implementar integración real con Redsys
    // Similar a processCreditCardPayment del checkout
    
    // Por ahora, emitir evento
    this.processingPayment = false;
    this.paymentProcessed.emit({
      amount: this.customPaymentAmount,
      method: 'card'
    });
    this.closeDialog();
    
    alert(`Pago con tarjeta de ${this.formatCurrency(this.customPaymentAmount)} procesado (simulado)`);
  }

  private processTransferBankPayment(): void {
    console.log('Procesando pago por transferencia bancaria:', this.customPaymentAmount);
    
    // TODO: Implementar lógica de transferencia con upload de justificante
    // Similar a processTransferPayment del checkout
    
    // Por ahora, emitir evento
    this.processingPayment = false;
    this.paymentProcessed.emit({
      amount: this.customPaymentAmount,
      method: 'transfer'
    });
    this.closeDialog();
    
    alert(`Pago por transferencia de ${this.formatCurrency(this.customPaymentAmount)} registrado (simulado)`);
  }

  private processScalapayPayment(): void {
    console.log('Procesando pago con Scalapay:', this.customPaymentAmount);
    
    // TODO: Implementar integración real con Scalapay
    // Similar a processInstallmentPayment del checkout
    
    // Por ahora, emitir evento
    this.processingPayment = false;
    this.paymentProcessed.emit({
      amount: this.customPaymentAmount,
      method: 'scalapay'
    });
    this.closeDialog();
    
    alert(`Pago con Scalapay de ${this.formatCurrency(this.customPaymentAmount)} procesado (simulado)`);
  }

  formatCurrency(amount: number): string {
    return `${amount.toLocaleString('es-ES')} €`;
  }
}

