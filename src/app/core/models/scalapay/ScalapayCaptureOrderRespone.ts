import { ScalapayAmount } from './ScalapayAmount';
import { ScalapayOrderRequest } from './ScalapayOrderRequest';

export interface ScalapayCaptureOrderRespone {
  /**
   * Scalapay order unique token.
   * Example: 'SC6PLAC9O5VF'
   */
  token: string;
  status: string;
  /**
   * Represents an amount with currency.
   * Example: { "amount": "1500.00", "currency": "EUR" }
   */
  totalAmount: ScalapayAmount;
  /**
   * Represents a request to create an order with Scalapay.
   */
  orderDetails: ScalapayOrderRequest;
}
