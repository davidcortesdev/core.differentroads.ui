import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PaymentOption } from '../../models/orders/order.model';

@Injectable({
  providedIn: 'root',
})
export class PaymentOptionsService {
  private paymentOptionSource = new BehaviorSubject<PaymentOption | null>(null);
  public paymentOption$ = this.paymentOptionSource.asObservable();

  constructor() {}

  updatePaymentOption(paymentOption: PaymentOption): void {
    this.paymentOptionSource.next(paymentOption);
  }

  getPaymentOption(): PaymentOption | null {
    console.log('getPaymentOption_______', this.paymentOptionSource.getValue());

    return this.paymentOptionSource.getValue();
  }

  resetPaymentOption(): void {
    this.paymentOptionSource.next(null);
  }
}
