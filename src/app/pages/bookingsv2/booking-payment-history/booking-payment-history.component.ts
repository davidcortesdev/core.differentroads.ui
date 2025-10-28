import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Payment,
  PaymentStatus,
  IPaymentVoucher,
  VoucherReviewStatus,
} from '../../../core/models/bookings/payment.model';
import { PaymentData } from '../add-payment-modal/add-payment-modal.component';
import { PaymentsNetService, IPaymentResponse } from '../../../pages/checkout-v2/services/paymentsNet.service';
import { PaymentStatusNetService } from '../../../pages/checkout-v2/services/paymentStatusNet.service';
import { PaymentMethodNetService } from '../../../pages/checkout-v2/services/paymentMethodNet.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  paymentStatusMap: { [key: number]: string } = {};
  paymentMethodMap: { [key: number]: string } = {};

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private paymentsNetService: PaymentsNetService,
    private paymentStatusService: PaymentStatusNetService,
    private paymentMethodService: PaymentMethodNetService
  ) {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.calculatePaymentInfo();
    this.loadPaymentStatusAndMethods();
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
    // Calcular el total pagado desde paymentHistory
    const totalPaid = this.paymentHistory
      .filter(p => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + p.amount, 0);
    
    // Usar bookingTotal de la reserva real
    this.paymentInfo = {
      totalPrice: this.bookingTotal || 0,
      pendingAmount: Math.max(0, (this.bookingTotal || 0) - totalPaid),
      paidAmount: totalPaid,
    };
  }

  private loadPaymentStatusAndMethods(): void {
    // Cargar estados de pago
    this.paymentStatusService.getAllPaymentStatuses().pipe(
      catchError(() => of([]))
    ).subscribe(statuses => {
      statuses.forEach(status => {
        this.paymentStatusMap[status.id] = status.name;
      });
    });

    // Cargar métodos de pago
    this.paymentMethodService.getAllPaymentMethods().pipe(
      catchError(() => of([]))
    ).subscribe(methods => {
      methods.forEach(method => {
        this.paymentMethodMap[method.id] = method.name;
      });
    });
  }

  private loadPayments(): void {
    if (!this.reservationId || this.reservationId <= 0) {
      return;
    }

    this.isLoadingPayments = true;

    this.paymentsNetService.getAll({ reservationId: this.reservationId })
      .pipe(
        catchError((error) => {
          console.error('Error cargando pagos:', error);
          this.paymentHistory = [];
          this.isLoadingPayments = false;
          return of([]);
        })
      )
      .subscribe((payments: IPaymentResponse[]) => {
        // Mapear los pagos de la API al formato del componente
        this.paymentHistory = payments.map((payment) => {
          const mappedPayment: Payment = {
            bookingID: this.bookingID,
            amount: payment.amount,
            publicID: payment.transactionReference || payment.id.toString(),
            externalID: payment.transactionReference,
            status: this.mapPaymentStatus(payment.paymentStatusId),
            method: this.paymentMethodMap[payment.paymentMethodId] || 'Desconocido',
            createdAt: new Date(payment.paymentDate).toISOString(),
            updatedAt: new Date(payment.paymentDate).toISOString(),
          };

          // Agregar vouchers si hay archivo adjunto
          if (payment.attachmentUrl) {
            const voucher: IPaymentVoucher = {
              fileUrl: payment.attachmentUrl,
              metadata: {},
              uploadDate: new Date(payment.paymentDate),
              reviewStatus: VoucherReviewStatus.PENDING,
              id: payment.id.toString()
            };
            mappedPayment.vouchers = [voucher];
          }

          return mappedPayment;
        });

        // Ordenar por fecha (más recientes primero)
        this.paymentHistory.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });

        // Recalcular la información de pagos
        this.calculatePaymentInfo();
        this.isLoadingPayments = false;
      });
  }

  private mapPaymentStatus(paymentStatusId: number): PaymentStatus {
    const statusName = this.paymentStatusMap[paymentStatusId];
    if (!statusName) return PaymentStatus.PENDING;

    // Mapear nombres de estado a PaymentStatus enum
    const statusMapping: { [key: string]: PaymentStatus } = {
      'Completado': PaymentStatus.COMPLETED,
      'Pendiente': PaymentStatus.PENDING,
      'Pendiente de revisión': PaymentStatus.PENDING_REVIEW,
      'Rechazado': PaymentStatus.CANCELLED,
      'Fallido': PaymentStatus.FAILED,
    };

    return statusMapping[statusName] || PaymentStatus.PENDING;
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
    // Si es string, convertir a PaymentStatus
    const paymentStatus = typeof status === 'string' ? status as PaymentStatus : status;
    
    switch (paymentStatus) {
      case PaymentStatus.COMPLETED:
        return 'Completado';
      case PaymentStatus.PENDING:
        return 'Pendiente';
      case PaymentStatus.PENDING_REVIEW:
        return 'Pendiente de revisión';
      case PaymentStatus.CANCELLED:
        return 'Cancelado';
      case PaymentStatus.FAILED:
        return 'Fallido';
      default:
        return String(status);
    }
  }
}
