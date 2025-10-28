import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Payment,
  PaymentStatus,
} from '../../../core/models/bookings/payment.model';
import { PaymentData } from '../add-payment-modal/add-payment-modal.component';
import { BookingsServiceV2, PaymentInfo } from '../../../core/services/v2/bookings-v2.service';

// Interfaces existentes
interface TripItemData {
  quantity: number;
  unitPrice: number;
  description?: string;
}

// Actualizamos la interfaz para incluir identificadores de pago y voucher


@Component({
  selector: 'app-booking-payment-history-v2',
  templateUrl: './booking-payment-history.component.html',
  styleUrls: ['./booking-payment-history.component.scss'],
  standalone: false,
})
export class BookingPaymentHistoryV2Component implements OnInit, OnChanges {
  @Input() bookingID: string = '';
  @Input() bookingTotal: number = 0;
  @Input() tripItems: TripItemData[] = [];
  @Input() isTO: boolean = false;
  @Input() refreshTrigger: any = null;
  @Input() reservationId: number = 0; // NUEVO: Para payment-management
  @Input() departureDate: string = ''; // NUEVO: Para payment-management

  @Output() registerPayment = new EventEmitter<number>();

  paymentInfo: PaymentInfo = { totalPrice: 0, pendingAmount: 0, paidAmount: 0 };
  paymentHistory: Payment[] = [];
  paymentForm: FormGroup;
  displayPaymentModal: boolean = false;
  
  // NUEVO: Modal para añadir pago
  displayAddPaymentModal: boolean = false;

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

  isLoadingPayments: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private bookingsService: BookingsServiceV2
  ) {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.calculatePaymentInfo();
    this.loadPayments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Actualizar paymentInfo si cambia bookingTotal
    if (changes['bookingTotal']) {
      this.calculatePaymentInfo();
    }
    
    // Cargar pagos si cambia reservationId
    if (changes['reservationId'] && changes['reservationId'].currentValue) {
      this.loadPayments();
    }
    
    if (changes['refreshTrigger'] && changes['refreshTrigger'].currentValue) {
      this.refreshPayments();
    }
  }

  private calculatePaymentInfo(): void {
    this.paymentInfo = this.bookingsService.calculatePaymentInfo(
      this.paymentHistory,
      this.bookingTotal
    );
  }

  private loadPayments(): void {
    if (!this.reservationId || this.reservationId <= 0) {
      return;
    }

    this.isLoadingPayments = true;

    this.bookingsService.getPaymentsByReservationId(this.reservationId, this.bookingID)
      .subscribe({
        next: (payments) => {
          this.paymentHistory = payments;
          this.calculatePaymentInfo();
          this.isLoadingPayments = false;
        },
        error: (error) => {
          console.error('Error cargando pagos:', error);
          this.paymentHistory = [];
          this.isLoadingPayments = false;
        }
      });
  }

  public refreshPayments(): void {
    if (this.reservationId) {
      this.loadPayments();
    } else {
      // Recalcular paymentInfo si no hay reservationId
      this.calculatePaymentInfo();
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
    // Abrir modal de añadir pago
    this.displayAddPaymentModal = true;
  }

  onPaymentProcessed(paymentData: PaymentData): void {
    console.log('Pago procesado:', paymentData);
    
    // Emitir evento para que el padre actualice los datos
    this.registerPayment.emit(paymentData.amount);
    
    // Refrescar la información de pagos
    this.refreshPayments();
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

  getStatusText(status: PaymentStatus | string): string {
    return this.bookingsService.getPaymentStatusText(status);
  }
}
