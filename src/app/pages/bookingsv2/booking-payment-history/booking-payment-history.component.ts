import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Payment,
  PaymentStatus,
  VoucherReviewStatus,
} from '../../../core/models/bookings/payment.model';

// Interfaces existentes
interface TripItemData {
  quantity: number;
  unitPrice: number;
  description?: string;
}

// Actualizamos la interfaz para incluir identificadores de pago y voucher

interface PaymentInfo {
  totalPrice: number;
  pendingAmount: number;
  paidAmount: number;
}

@Component({
  selector: 'app-booking-payment-history-v2',
  templateUrl: './booking-payment-history.component.html',
  styleUrls: ['./booking-payment-history.component.scss'],
  standalone: false,
})
export class BookingPaymentHistoryV2Component implements OnInit {
  @Input() bookingID: string = '';
  @Input() bookingTotal: number = 0;
  @Input() tripItems: TripItemData[] = [];
  @Input() isTO: boolean = false; // Add this line to receive isTO from parent

  @Output() registerPayment = new EventEmitter<number>();

  paymentInfo: PaymentInfo = { totalPrice: 0, pendingAmount: 0, paidAmount: 0 };
  paymentHistory: Payment[] = [];
  paymentForm: FormGroup;
  displayPaymentModal: boolean = false;

  displayReviewModal: boolean = false;
  selectedReviewVoucherUrl: string = '';
  selectedPayment: Payment | null = null;

  deadlines: {
    date: string;
    amount: number;
    status: string;
  }[] = [
    {
      date: '01/01/2021',
      amount: 100,
      status: 'COMPLETED',
    },
  ];

  isApproveLoading: boolean = false;
  isRejectLoading: boolean = false;

  approveMessage: string | null = null;
  isApproveSuccess: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    if (this.bookingID) {
      //TODO: Implementar leyendo los datos de mysql
    }
  }

  private refreshPayments(): void {
    if (this.bookingID) {
      //TODO: Implementar leyendo los datos de mysql
    }
  }

  calculateTotal(item: TripItemData): number {
    return item.quantity * item.unitPrice;
  }

  formatCurrency(amount: number): string {
    return `${amount.toLocaleString('es-ES')} €`;
  }

  showPaymentModal(): void {
    this.displayPaymentModal = true;
  }

  hidePaymentModal(): void {
    this.displayPaymentModal = false;
    this.paymentForm.reset({ amount: 0 });
  }

  onSubmitPayment(): void {
    if (this.paymentForm.valid) {
      const amount = this.paymentForm.get('amount')?.value;
      this.registerPayment.emit(amount);
      this.hidePaymentModal();
    }
  }

  showReviewModal(payment: Payment): void {
    this.selectedReviewVoucherUrl = payment.vouchers?.[0].fileUrl || '';
    this.selectedPayment = payment;

    this.displayReviewModal = true;
  }

  hideReviewModal(): void {
    this.displayReviewModal = false;
  }

  approvePaymentReview(): void {
    if (
      !this.selectedPayment ||
      !this.selectedPayment.publicID ||
      !this.selectedPayment.vouchers
    ) {
      return;
    }
    this.isApproveLoading = true;
    this.approveMessage = null;
    //TODO: Implementar leyendo los datos de mysql
  }

  rejectPaymentReview(): void {
    if (
      !this.selectedPayment ||
      !this.selectedPayment.publicID ||
      !this.selectedPayment.vouchers
    ) {
      return;
    }
    this.isRejectLoading = true;
    //TODO: Implementar leyendo los datos de mysql

  }

  viewPaymentReview(): void {
    // Abre el voucher URL en otra pestaña
    window.open(this.selectedReviewVoucherUrl, '_blank');
  }

  navigateToPayment(): void {
    this.router.navigate([`/payment/${this.bookingID}/`]);
  }

  formatDateForDisplay(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return `${date.getDate().toString().padStart(2, '0')}/${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, '0')}/${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'Completado';
      case 'PENDING':
        return 'Pendiente';
      case 'PENDING_REVIEW':
        return 'Pendiente de revisión';
      case 'REJECTED':
        return 'Rechazado';
      case 'FAILED':
        return 'Fallido';
      default:
        return status;
    }
  }
}
