import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingsService } from '../../../core/services/bookings.service';
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
  selector: 'app-booking-payment-history',
  templateUrl: './booking-payment-history.component.html',
  styleUrls: ['./booking-payment-history.component.scss'],
  standalone: false,
})
export class BookingPaymentHistoryComponent implements OnInit {
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

  constructor(
    private fb: FormBuilder,
    private bookingsService: BookingsService,
    private router: Router
  ) {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    if (this.bookingID) {
      this.bookingsService.getPayments(this.bookingID).subscribe((payments) => {
        const totalCompleted = payments.reduce(
          (sum, payment) =>
            payment.status === 'COMPLETED' ? sum + payment.amount : sum,
          0
        );
        this.paymentInfo = {
          totalPrice: this.bookingTotal,
          paidAmount: totalCompleted,
          pendingAmount: this.bookingTotal - totalCompleted,
        };
        // Mapear pagos e incluir paymentId y voucherId asumidos de la respuesta
        this.paymentHistory = /*  MOCKEO PARA PRUEBAS[{
          createdAt: 'someday',
          amount: 3,
          status: PaymentStatus.PENDING,
          publicID: '123', 
          updatedAt: 'someOtherDay',
          bookingID: '123',
        },{
          createdAt: 'someday',
          amount: 4,
          status: PaymentStatus.COMPLETED,
          publicID: '234', 
          updatedAt: 'someOtherDay',
          bookingID: '234',
        },{
          createdAt:'someday',
          amount: 5,
          status: PaymentStatus.PENDING,
          publicID: '345',
          updatedAt:'someOtherDay',
          bookingID: '345',
        },{
          createdAt:'someday',
          amount: 6,
          status: PaymentStatus.PENDING,
          publicID: '456',
          updatedAt:'someOtherDay',
          bookingID: '456',
        },{
          createdAt:'someday',
          amount: 7,
          status: PaymentStatus.PENDING,
          publicID: '567',
          updatedAt:'someOtherDay',
          bookingID: '567',
        }]*/payments.filter(
          (payment) => payment.status !== 'PENDING'
        );
      });
    }
  }

  private refreshPayments(): void {
    if (this.bookingID) {
      this.bookingsService.getPayments(this.bookingID).subscribe((payments) => {
        const totalCompleted = payments.reduce(
          (sum, payment) =>
            payment.status === 'COMPLETED' ? sum + payment.amount : sum,
          0
        );
        this.paymentInfo = {
          totalPrice: this.bookingTotal,
          paidAmount: totalCompleted,
          pendingAmount: this.bookingTotal - totalCompleted,
        };
        this.paymentHistory = payments.filter(
          (payment) => payment.status !== 'PENDING'
        );
      });
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
    this.bookingsService
      .reviewVoucher(
        this.bookingID,
        this.selectedPayment.publicID,
        this.selectedPayment.vouchers[0].id,
        VoucherReviewStatus.APPROVED
      )
      .subscribe({
        next: () => {
          if (this.selectedPayment) {
            this.selectedPayment.status = PaymentStatus.COMPLETED;
          }
          this.isApproveLoading = false;
          this.displayReviewModal = false;
          this.refreshPayments();
        },
        error: (error) => {
          console.error('Error al aprobar revisión de pago:', error);
          this.isApproveLoading = false;
        },
      });
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
    this.bookingsService
      .reviewVoucher(
        this.bookingID,
        this.selectedPayment.publicID,
        this.selectedPayment.vouchers[0].id,
        VoucherReviewStatus.DENIED
      )
      .subscribe({
        next: () => {
          if (this.selectedPayment) {
            this.selectedPayment.status = PaymentStatus.FAILED;
          }
          this.isRejectLoading = false;
          this.displayReviewModal = false;
          this.refreshPayments();
        },
        error: (error) => {
          console.error('Error al rechazar revisión de pago:', error);
          this.isRejectLoading = false;
        },
      });
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
