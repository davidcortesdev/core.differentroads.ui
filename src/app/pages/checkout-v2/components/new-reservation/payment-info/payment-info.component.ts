// payment-info.component.ts
import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  PaymentsNetService,
  IPaymentResponse,
  IPaymentSummaryResponse,
} from '../../../services/paymentsNet.service';
import { PaymentMethodNetService } from '../../../services/paymentMethodNet.service';

// Interfaces para el template
interface PaymentInfo {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentPercentage: number;
}

interface ProcessedPayment {
  createdAt: Date;
  amount: number;
  method: string;
}

@Component({
  selector: 'app-payment-info',
  standalone: false,
  templateUrl: './payment-info.component.html',
  styleUrl: './payment-info.component.scss',
})
export class PaymentInfoComponent implements OnInit, OnChanges {
  @Input() reservationId: number | undefined;

  // Datos del componente
  paymentInfo: PaymentInfo = {
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    paymentPercentage: 0,
  };
  payments: ProcessedPayment[] = [];
  loading: boolean = false;

  constructor(
    private paymentsNetService: PaymentsNetService,
    private paymentMethodService: PaymentMethodNetService
  ) {}

  ngOnInit(): void {
    this.loadPaymentData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reservationId']) {
      this.loadPaymentData();
    }
  }

  private loadPaymentData(): void {
    if (!this.reservationId) {
      return;
    }

    this.loading = true;

    // Cargar resumen de pagos usando solo getPaymentSummary
    this.paymentsNetService.getPaymentSummary(this.reservationId).subscribe({
      next: (summary: IPaymentSummaryResponse) => {
        this.paymentInfo = {
          totalAmount: summary.totalAmount || 0,
          paidAmount: summary.totalPaid || 0,
          remainingAmount: summary.totalPending || 0,
          paymentPercentage: summary.paymentPercentage || 0,
        };

        console.log('Payment summary loaded:', this.paymentInfo);

        // Cargar historial de pagos solo si hay pagos realizados
        if (summary.totalPaid > 0) {
          this.loadPaymentHistory();
        } else {
          this.payments = [];
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading payment summary:', error);
        this.paymentInfo = {
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          paymentPercentage: 0,
        };
        this.payments = [];
        this.loading = false;
      },
    });
  }

  private loadPaymentHistory(): void {
    if (!this.reservationId) {
      this.loading = false;
      return;
    }

    // Cargar historial de pagos para mostrar el detalle
    this.paymentsNetService
      .getAll({ reservationId: this.reservationId })
      .subscribe({
        next: (payments) => {
          this.processPayments(payments);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading payments:', error);
          this.payments = [];
          this.loading = false;
        },
      });
  }

  private async processPayments(payments: IPaymentResponse[]): Promise<void> {
    if (!payments || payments.length === 0) {
      this.payments = [];
      return;
    }

    // Filtrar solo pagos completados/pagados
    const paidPayments = payments.filter((payment) => payment.amount > 0);

    // Procesar cada pago para obtener información del método
    const processedPayments = await Promise.all(
      paidPayments.map(async (payment) => {
        let methodName = 'método desconocido';

        try {
          const method = await this.paymentMethodService
            .getPaymentMethodById(payment.paymentMethodId)
            .toPromise();
          if (method) {
            // Mapear códigos de método a nombres legibles
            switch (method.code?.toLowerCase()) {
              case 'credit_card':
              case 'card':
                methodName = 'tarjeta de crédito';
                break;
              case 'transfer':
                methodName = 'transferencia bancaria';
                break;
              case 'scalapay':
                methodName = 'Scalapay';
                break;
              case 'payin':
                methodName = 'la web';
                break;
              default:
                methodName = method.name || 'la web';
            }
          }
        } catch (error) {
          console.error('Error getting payment method:', error);
        }

        return {
          createdAt: new Date(payment.paymentDate),
          amount: payment.amount,
          method: methodName,
        };
      })
    );

    // Ordenar por fecha (más reciente primero)
    this.payments = processedPayments.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log('Processed payments:', this.payments);
  }

  get hasPaymentInfo(): boolean {
    return !!(this.reservationId && this.paymentInfo.totalAmount > 0);
  }

  get hasPayments(): boolean {
    return this.payments.length > 0;
  }
}
