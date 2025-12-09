import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap, shareReplay } from 'rxjs/operators';
import { Payment, PaymentStatus } from '../../models/bookings/payment.model';
import { PaymentStatusNetService, IPaymentStatusResponse } from '../../../pages/checkout-v2/services/paymentStatusNet.service';
import { PaymentMethodNetService, IPaymentMethodResponse } from '../../../pages/checkout-v2/services/paymentMethodNet.service';
import { PaymentsNetService, IPaymentResponse } from '../../../pages/checkout-v2/services/paymentsNet.service';

export interface PaymentInfo {
  totalPrice: number;
  pendingAmount: number;
  paidAmount: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  // Usar shareReplay para compartir el Observable entre múltiples suscriptores
  // shareReplay(1) cachea el último valor emitido
  private paymentStatusesCache$: Observable<IPaymentStatusResponse[]> | null = null;
  private paymentMethodsCache$: Observable<IPaymentMethodResponse[]> | null = null;

  constructor(
    private paymentStatusService: PaymentStatusNetService,
    private paymentMethodService: PaymentMethodNetService,
    private paymentsNetService: PaymentsNetService
  ) {}

  /**
   * Obtiene todos los estados de pago disponibles
   * Usa shareReplay para compartir el resultado entre múltiples suscriptores
   * Solo hace una llamada HTTP aunque haya múltiples suscriptores
   */
  getAllPaymentStatuses(): Observable<IPaymentStatusResponse[]> {
    if (!this.paymentStatusesCache$) {
      this.paymentStatusesCache$ = this.paymentStatusService.getAllPaymentStatuses().pipe(
        shareReplay(1),
        catchError(error => {
          // En caso de error, limpiar el caché para permitir reintentos
          this.paymentStatusesCache$ = null;
          return of([]);
        })
      );
    }
    return this.paymentStatusesCache$;
  }

  /**
   * Obtiene todos los métodos de pago disponibles
   * Usa shareReplay para compartir el resultado entre múltiples suscriptores
   * Solo hace una llamada HTTP aunque haya múltiples suscriptores
   */
  getAllPaymentMethods(): Observable<IPaymentMethodResponse[]> {
    if (!this.paymentMethodsCache$) {
      this.paymentMethodsCache$ = this.paymentMethodService.getAllPaymentMethods().pipe(
        shareReplay(1),
        catchError(error => {
          // En caso de error, limpiar el caché para permitir reintentos
          this.paymentMethodsCache$ = null;
          return of([]);
        })
      );
    }
    return this.paymentMethodsCache$;
  }

  /**
   * Obtiene el estado de pago completo desde la API por su ID
   */
  getPaymentStatusById(paymentStatusId: number, paymentStatuses: IPaymentStatusResponse[]): IPaymentStatusResponse | null {
    return paymentStatuses.find(s => s.id === paymentStatusId) || null;
  }

  /**
   * Obtiene el nombre del estado de pago desde la API
   */
  getPaymentStatusName(paymentStatusId: number, paymentStatuses: IPaymentStatusResponse[]): string {
    const status = this.getPaymentStatusById(paymentStatusId, paymentStatuses);
    return status?.name || '';
  }

  /**
   * Actualiza el estado de un pago
   */
  updatePaymentStatus(
    payment: Payment,
    newStatusId: number,
    reservationId: number
  ): Observable<boolean> {
    // Obtener el pago completo desde la API
    return this.paymentsNetService.getAll({ reservationId }).pipe(
      map(apiPayments => {
        const apiPayment = apiPayments.find(p => 
          p.transactionReference === payment.publicID || 
          p.id.toString() === payment.publicID
        );

        if (!apiPayment) {
          throw new Error('No se encontró el pago en la API');
        }

        // Construir payload completo requerido por la API
        const updateData: any = {
          id: apiPayment.id,
          amount: apiPayment.amount,
          paymentDate: apiPayment.paymentDate,
          paymentMethodId: apiPayment.paymentMethodId,
          paymentStatusId: newStatusId,
          transactionReference: apiPayment.transactionReference,
          notes: apiPayment.notes,
          currencyId: apiPayment.currencyId,
          // Campos adicionales si el backend los acepta en PUT
          reservationId: apiPayment.reservationId,
          attachmentUrl: apiPayment.attachmentUrl
        };

        return updateData;
      })
    ).pipe(
      switchMap((updateData: any) =>
        this.paymentsNetService.update(updateData).pipe(
          map(() => true),
          catchError(() => of(false))
        )
      )
    );
  }

  /**
   * Calcula la información de pagos (total, pendiente, pagado)
   * Solo cuenta pagos COMPLETADOS
   */
  calculatePaymentInfo(payments: Payment[], bookingTotal: number): PaymentInfo {
    const totalPaid = payments
      .filter(p => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      totalPrice: bookingTotal || 0,
      pendingAmount: Math.max(0, (bookingTotal || 0) - totalPaid),
      paidAmount: totalPaid,
    };
  }

  /**
   * Valida que el monto del pago no exceda el monto pendiente
   */
  validatePaymentAmount(amount: number, pendingAmount: number): { valid: boolean; error?: string } {
    if (!amount || amount <= 0) {
      return { valid: false, error: 'La cantidad debe ser mayor a 0' };
    }
    
    if (amount > pendingAmount) {
      return { 
        valid: false, 
        error: `La cantidad no puede exceder el monto pendiente (${this.formatCurrency(pendingAmount)})` 
      };
    }

    return { valid: true };
  }

  /**
   * Formatea una cantidad a moneda EUR
   */
  formatCurrency(amount: number): string {
    return `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  }

}

