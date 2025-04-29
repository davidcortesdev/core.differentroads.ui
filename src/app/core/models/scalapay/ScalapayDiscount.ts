import { ScalapayAmount } from './ScalapayAmount';

/**
 * Represents a discount applied to the order.
 * Example: { "displayName": "10% Off", "amount": { "amount": "150.00", "currency": "EUR" } }
 */
export interface ScalapayDiscount {
  displayName: string;
  amount: ScalapayAmount;
}
