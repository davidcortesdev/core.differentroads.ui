import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Payment, PaymentStatus } from '../../models/bookings/payment.model';
import { PaymentStatusNetService, IPaymentStatusResponse } from '../../../pages/checkout-v2/services/paymentStatusNet.service';
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
  private paymentStatusesCache: IPaymentStatusResponse[] | null = null;
  private loadingStatuses: boolean = false;

  constructor(
    private paymentStatusService: PaymentStatusNetService,
    private paymentsNetService: PaymentsNetService
  ) {}

  /**
   * Obtiene todos los estados de pago disponibles
   */
  getAllPaymentStatuses(): Observable<IPaymentStatusResponse[]> {
    // Si ya tenemos los estados en caché, devolverlos
    if (this.paymentStatusesCache) {
      return new Observable(observer => {
        observer.next(this.paymentStatusesCache!);
        observer.complete();
      });
    }

    // Cargar desde la API
    return this.paymentStatusService.getAllPaymentStatuses().pipe(
      map(statuses => {
        this.paymentStatusesCache = statuses;
        return statuses;
      })
    );
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

        // Actualizar solo el estado del pago
        const updateData: any = {
          id: apiPayment.id,
          paymentStatusId: newStatusId
        };

        this.paymentsNetService.update(updateData).subscribe({
          next: () => console.log('Estado de pago actualizado correctamente'),
          error: (error) => console.error('Error actualizando estado del pago:', error)
        });

        return true;
      })
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

