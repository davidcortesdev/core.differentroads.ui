import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Payment,
  PaymentStatus,
} from '../../../core/models/bookings/payment.model';
import { PaymentData } from '../add-payment-modal/add-payment-modal.component';
import { BookingsServiceV2 } from '../../../core/services/v2/bookings-v2.service';
import { PaymentService, PaymentInfo } from '../../../core/services/payments/payment.service';
import { IPaymentStatusResponse } from '../../checkout-v2/services/paymentStatusNet.service';
import { PaymentsNetService } from '../../checkout-v2/services/paymentsNet.service';
import { PaymentMethodNetService } from '../../checkout-v2/services/paymentMethodNet.service';

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
  @Input() isATC: boolean = false; // NUEVO: Para mostrar selector de estados

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
  
  // NUEVO: Estados de pago disponibles
  paymentStatuses: IPaymentStatusResponse[] = [];
  loadingStatuses: boolean = false;

  // Estado local para selección y loading por pago
  selectedStatusByPaymentId: { [publicID: string]: number } = {};
  isChanging: { [publicID: string]: boolean } = {};

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
  transferMethodId: number = 0;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private bookingsService: BookingsServiceV2,
    private paymentService: PaymentService,
    private paymentsNetService: PaymentsNetService,
    private paymentMethodService: PaymentMethodNetService
  ) {
    this.paymentForm = this.fb.group({
      amount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    this.calculatePaymentInfo();
    this.loadPayments();
    
    // Cargar estados de pago desde la API (siempre, para todos)
    this.loadPaymentStatuses();

    // Obtener el id del método de pago de transferencia para filtrar
    this.paymentMethodService.getPaymentMethodByCode('TRANSFER').subscribe({
      next: (methods: any) => {
        if (methods && methods.length > 0) {
          this.transferMethodId = methods[0].id;
          // Refiltrar si ya había datos cargados
          if (this.paymentHistory?.length) {
            this.filterPaymentHistoryForDisplay();
          }
        }
      },
      error: () => {
        this.transferMethodId = 0;
      }
    });
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

    // Cargar estados si aún no están cargados
    if (changes['isATC'] && !this.paymentStatuses.length) {
      this.loadPaymentStatuses();
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
          this.filterPaymentHistoryForDisplay();
          // Inicializar selección por cada pago al estado actual
          this.paymentHistory.forEach(p => {
            if (p.publicID) {
              this.selectedStatusByPaymentId[p.publicID] = p.paymentStatusId || 0;
            }
          });
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

  /**
   * Filtra el historial para que los pagos por transferencia solo aparezcan
   * cuando ya existe justificante (voucher). El estado puede permanecer en PENDING
   * hasta que ATC lo cambie; no mostramos el registro mientras no haya justificante.
   */
  private filterPaymentHistoryForDisplay(): void {
    if (!this.paymentHistory || this.paymentHistory.length === 0) return;
    this.paymentHistory = this.paymentHistory.filter(p => {
      const isTransfer = this.transferMethodId && p.paymentMethodId === this.transferMethodId;
      const hasVoucher = !!(p.vouchers && p.vouchers.length > 0);
      // Ocultar transferencias recién creadas (sin voucher), independientemente del estado
      if (isTransfer && !hasVoucher) {
        return false;
      }
      return true;
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

  /**
   * Carga todos los estados de pago disponibles desde la API
   */
  private loadPaymentStatuses(): void {
    this.loadingStatuses = true;
    this.paymentService.getAllPaymentStatuses().subscribe({
      next: (statuses) => {
        this.paymentStatuses = statuses;
        this.loadingStatuses = false;
      },
      error: (error) => {
        console.error('Error cargando estados de pago:', error);
        this.loadingStatuses = false;
      }
    });
  }

  /**
   * Obtiene el nombre del estado para mostrar (directo desde la API)
   */
  getPaymentStatusDisplayName(payment: Payment): string {
    if (!payment.paymentStatusId || this.paymentStatuses.length === 0) {
      return ''; // No mostrar nada hasta que cargue la API
    }
    // Obtener el nombre directo desde la API
    return this.paymentService.getPaymentStatusName(payment.paymentStatusId, this.paymentStatuses);
  }

  /**
   * Cambia el estado del pago usando el valor seleccionado en el selector
   */
  onChangeStatusClick(payment: Payment): void {
    if (!payment.publicID) return;
    const selectedId = this.selectedStatusByPaymentId[payment.publicID];
    if (!selectedId || selectedId === payment.paymentStatusId) return;

    this.isChanging[payment.publicID] = true;
    this.paymentService.updatePaymentStatus(payment, selectedId, this.reservationId).subscribe({
      next: () => {
        // Recargar los pagos para que la label se actualice desde BBDD
        this.refreshPayments();
        this.isChanging[payment.publicID] = false;
      },
      error: (error) => {
        console.error('Error actualizando estado del pago:', error);
        this.isChanging[payment.publicID] = false;
      }
    });
  }

  isChangeDisabled(payment: Payment): boolean {
    if (!payment.publicID) return true;
    const selectedId = this.selectedStatusByPaymentId[payment.publicID];
    return (
      this.loadingStatuses ||
      this.isChanging[payment.publicID] === true ||
      !selectedId ||
      selectedId === payment.paymentStatusId
    );
  }
}
