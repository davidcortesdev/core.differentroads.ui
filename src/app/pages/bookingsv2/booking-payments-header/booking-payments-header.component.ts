import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PaymentInfo } from '../../../core/services/payments/payment.service';

@Component({
  selector: 'app-booking-payments-header',
  templateUrl: './booking-payments-header.component.html',
  styleUrls: ['./booking-payments-header.component.scss'],
  standalone: false,
})
export class BookingPaymentsHeaderComponent {
  @Input() paymentInfo!: PaymentInfo;
  @Input() isAgency: boolean = false;
  @Input() grossPaymentInfo: PaymentInfo | null = null;
  @Input() netPaymentInfo: PaymentInfo | null = null;
  @Input() loadingProforma: boolean = false;
  @Input() isCancelled: boolean = false;

  @Output() addPayment = new EventEmitter<void>();
  @Output() couponClick = new EventEmitter<void>();

  onAddPayment(): void {
    this.addPayment.emit();
  }

  onCouponClick(): void {
    this.couponClick.emit();
  }
}

