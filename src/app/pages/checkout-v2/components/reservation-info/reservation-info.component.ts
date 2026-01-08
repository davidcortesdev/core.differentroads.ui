// reservation-info.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IReservationResponse,
  ReservationService,
} from '../../../../core/services/reservation/reservation.service';
import {
  IPaymentResponse,
  PaymentsNetService,
} from '../../services/paymentsNet.service';
import { PaymentMethodNetService } from '../../services/paymentMethodNet.service';
import { AnalyticsService } from '../../../../core/services/analytics/analytics.service';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';

@Component({
  selector: 'app-reservation-info',
  standalone: false,
  templateUrl: './reservation-info.component.html',
  styleUrls: ['./reservation-info.component.scss'],
})
export class ReservationInfoComponent implements OnInit {
  // Propiedades principales
  reservationId: number = 0;
  paymentId: number | undefined = 0;
  reservation: IReservationResponse | undefined;
  payment: IPaymentResponse | undefined;

  // Bandera para evitar disparar purchase múltiples veces
  private purchaseEventFired: boolean = false;

  // Tipo de pago para el evento purchase
  paymentType: 'Transfer' | 'Scalapay' | 'RedSys' | null = null;

  constructor(
    private route: ActivatedRoute,
    private reservationService: ReservationService,
    private paymentService: PaymentsNetService,
    private paymentMethodService: PaymentMethodNetService,
    private analyticsService: AnalyticsService,
    private authService: AuthenticateService
  ) {}

  ngOnInit(): void {
    // Obtener parámetros de la ruta
    this.route.params.subscribe((params) => {
      this.reservationId = params['reservationId']
        ? Number(params['reservationId'])
        : 0;
      this.paymentId = params['paymentId']
        ? Number(params['paymentId'])
        : undefined;

      // Cargar datos de la reserva y pago
      if (this.reservationId) {
        this.loadReservation();
      }
    });
  }

  /**
   * Carga los datos de la reserva
   */
  private loadReservation(): void {
    this.reservationService.getById(this.reservationId).subscribe({
      next: (reservation) => {
        this.reservation = reservation;

        // Cargar información del pago si existe paymentId
        if (this.paymentId) {
          this.loadPayment();
        } else {
          // Si no hay paymentId, disparar purchase de todas formas
          this.triggerPurchaseIfNeeded();
        }
      },
      error: (error) => {
        console.error('Error loading reservation:', error);
      },
    });
  }

  /**
   * Carga la información del pago
   */
  private loadPayment(): void {
    if (!this.paymentId || this.paymentId <= 0) {
      this.triggerPurchaseIfNeeded();
      return;
    }

    this.paymentService.getPaymentById(this.paymentId).subscribe({
      next: (payment: IPaymentResponse) => {
        this.payment = payment;

        // Cargar método de pago para determinar el tipo
        // El evento purchase se disparará después de cargar el método de pago
        this.loadPaymentMethod(payment.paymentMethodId);
      },
      error: (error) => {
        console.error('Error loading payment:', error);
        // Disparar purchase incluso si falla la carga del pago
        this.triggerPurchaseIfNeeded();
      },
    });
  }

  /**
   * Carga la información del método de pago
   */
  private loadPaymentMethod(paymentMethodId: number): void {
    this.paymentMethodService.getPaymentMethodById(paymentMethodId).subscribe({
      next: (method) => {
        // Determinar el tipo de pago
        if (method.code === 'TRANSFER') {
          this.paymentType = 'Transfer';
        } else if (method.code === 'SCALAPAY') {
          this.paymentType = 'Scalapay';
        } else if (method.code === 'REDSYS') {
          this.paymentType = 'RedSys';
        }

        // Disparar evento purchase después de cargar el método de pago
        this.triggerPurchaseIfNeeded();
      },
      error: (error) => {
        console.error('Error loading payment method:', error);
        // Disparar purchase incluso si falla la carga del método de pago
        this.triggerPurchaseIfNeeded();
      },
    });
  }

  /**
   * Dispara el evento purchase si aún no se ha disparado
   */
  private triggerPurchaseIfNeeded(): void {
    // Solo disparar una vez cuando se carga la página
    if (!this.purchaseEventFired && this.reservation) {
      this.trackPurchase();
      this.purchaseEventFired = true;
    }
  }

  /**
   * Disparar evento purchase cuando se completa la compra
   */
  private trackPurchase(): void {
    if (!this.reservation || !this.reservation.tourId) return;

    const reservationData = this.reservation as any;
    const tourId = this.reservation.tourId;

    // Obtener información del pago
    const paymentType = this.paymentType || 'completo, transferencia';
    const transactionId =
      this.payment?.transactionReference ||
      this.payment?.id?.toString() ||
      `#${this.reservationId}`;
    const totalValue = this.reservation.totalAmount || 0;

    // Usar el método centralizado del servicio que obtiene todos los datos dinámicamente
    this.analyticsService.trackPurchaseFromReservation(
      this.reservationId,
      tourId,
      {
        transactionId: transactionId,
        paymentType: paymentType,
        totalValue: totalValue,
        tax: 0.00, // Enviar tax como 0.00
        shipping: 0.00, // Enviar shipping como 0.00
        coupon: reservationData.coupon?.code || '',
      }
    );
  }
}
