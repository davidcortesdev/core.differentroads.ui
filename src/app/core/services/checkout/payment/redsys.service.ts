import { Injectable } from '@angular/core';
import RedSys, { CURRENCIES, TRANSACTION_TYPES } from './redsys';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RedsysService {
  private readonly REDSYS_FUC = environment.redsysFuc;
  private readonly REDSYS_CLAVE_COMERCIO = environment.redsysClaveComercio;
  private readonly MERCHANT_KEY = this.REDSYS_CLAVE_COMERCIO;

  constructor() {}

  generateFormData(bookingID: string, publicID: string, price: number) {
    const pos = new RedSys(this.MERCHANT_KEY);

    const baseUrl = window.location.origin;

    const obj = {
      amount: price,
      orderReference: publicID,
      merchantName: 'Different Test',
      merchantCode: this.REDSYS_FUC,
      currency: CURRENCIES['EUR'],
      transactionType: TRANSACTION_TYPES['AUTHORIZATION'],
      terminal: '1',
      merchantURL: `${environment.redsysNotifyUrl}/${publicID}`,
      successURL: `${baseUrl}/reservation/${bookingID}/success/${publicID}`,
      errorURL: `${baseUrl}/reservation/${bookingID}/error/${publicID}`,
    };

    // Make a payment
    const result = pos.makePaymentParameters(obj);
    return result;
  }
}
