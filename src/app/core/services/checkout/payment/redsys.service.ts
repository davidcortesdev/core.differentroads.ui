import { Injectable } from '@angular/core';
import RedSys from './redsys/redsys.class';
import { environment } from '../../../../../environments/environment';
import { CURRENCIES } from './redsys/constants/CURRENCIES';
import { TRANSACTION_TYPES } from './redsys/constants/TRANSACTION_TYPES';

@Injectable({
  providedIn: 'root',
})
export class RedsysService {
  private readonly REDSYS_FUC = environment.redsysFuc;
  private readonly REDSYS_CLAVE_COMERCIO = environment.redsysClaveComercio;
  private readonly MERCHANT_KEY = this.REDSYS_CLAVE_COMERCIO;
  private readonly REDSYS_MERCHANT_TERMINAL =
    environment.redsysMerchantTerminal;

  constructor() {}

  generateFormData(
    bookingID: string,
    publicID: string,
    price: number,
    paymentID: string
  ) {
    const pos = new RedSys(this.MERCHANT_KEY);

    const baseUrl = window.location.origin;

    const obj = {
      amount: price * 100,
      orderReference: publicID,
      merchantName: 'Different Test',
      merchantCode: this.REDSYS_FUC,
      currency: CURRENCIES['EUR'],
      transactionType: TRANSACTION_TYPES['AUTHORIZATION'],
      terminal: this.REDSYS_MERCHANT_TERMINAL,
      merchantURL: `${environment.dataApiUrl}/redsys/notify/${paymentID}`,
      successURL: `${baseUrl}/reservation/${bookingID}/success/${paymentID}`,
      errorURL: `${baseUrl}/reservation/${bookingID}/error/${paymentID}`,
    };

    // Make a payment
    const result = pos.makePaymentParameters(obj);
    return result;
  }
}
