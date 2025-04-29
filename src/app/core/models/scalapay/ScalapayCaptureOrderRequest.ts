import { ScalapayAmount } from './ScalapayAmount';

export interface ScalapayCaptureOrderRequest {
  /**
   * Scalapay order unique token.
   * Example: 'SC6PLAC9O5VF'
   */
  token: string;
  /**
   * Reference number for the merchant's order.
   * Example: "merchantOrder-1234"
   */
  merchantReference?: string;
  /**
   * Represents an amount with currency.
   * Example: { "amount": "1500.00", "currency": "EUR" }
   */
  amount?: ScalapayAmount;
}
