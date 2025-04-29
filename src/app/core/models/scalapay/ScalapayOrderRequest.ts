import { ScalapayAmount } from './ScalapayAmount';
import { ScalapayConsumer } from './ScalapayConsumer';
import { ScalapayBilling } from './ScalapayBilling';
import { ScalapayItem } from './ScalapayItem';
import { ScalapayDiscount } from './ScalapayDiscount';
import { ScalapayMerchant } from './ScalapayMerchant';
import { ScalapayFrequency } from './ScalapayFrequency';
import { ScalapayExtensions } from './ScalapayExtensions';

/**
 * Represents a request to create an order with Scalapay.
 */
export interface ScalapayOrderRequest {
  /**
   * The total amount of the order.
   * Example: { "amount": "1500.00", "currency": "EUR" }
   */
  totalAmount: ScalapayAmount;

  /**
   * Information about the consumer making the purchase.
   * Example: { "phoneNumber": "0400000001", "givenNames": "Joe", "surname": "Consumer", "email": "test@scalapay.com" }
   */
  consumer: ScalapayConsumer;

  /**
   * Billing information for the order.
   * Example: { "name": "Joe Consumer", "line1": "Via della Rosa, 58", "suburb": "Montelupo Fiorentino", "postcode": "50056", "countryCode": "IT", "phoneNumber": "0400000000" }
   */
  billing?: ScalapayBilling;

  /**
   * List of items included in the order.
   * Example: [{ "name": "Tours Islands", "category": "Honeymoon Trips", "brand": "Tour Operator Name", "sku": "12341234", "quantity": 1, "price": { "amount": "1500.00", "currency": "EUR" } }]
   */
  items: ScalapayItem[];

  /**
   * List of discounts applied to the order.
   * Example: [{ "displayName": "10% Off", "amount": { "amount": "150.00", "currency": "EUR" } }]
   */
  discounts?: ScalapayDiscount[];

  /**
   * Merchant information for redirect URLs.
   * Example: { "redirectConfirmUrl": "https://scalapay.com", "redirectCancelUrl": "https://scalapay.com" }
   */
  merchant: ScalapayMerchant;

  /**
   * Reference number for the merchant's order.
   * Example: "merchantOrder-1234"
   */
  merchantReference: string;

  /**
   * The total tax amount for the order.
   * Example: { "amount": "3.70", "currency": "EUR" }
   */
  taxAmount: ScalapayAmount;

  /**
   * The total shipping amount for the order.
   * Example: { "amount": "10.00", "currency": "EUR" }
   */
  shippingAmount: ScalapayAmount;

  /**
   * The time in milliseconds until the order expires.
   * Example: 6000000
   */
  orderExpiryMilliseconds: number;

  /**
   * The channel through which the order is placed.
   * Example: "scalapay.com"
   */
  channel: string;

  /**
   * The type of the order.
   * Example: "online"
   */
  type: string;

  /**
   * The product associated with the order.
   * Example: "pay-in-3"
   */
  product: string;

  /**
   * Frequency details for the order.
   * Example: { "number": 1, "frequencyType": "monthly" }
   */
  frequency: ScalapayFrequency;

  /**
   * Additional extensions for the order.
   * Example: { "industry": { "travel": { "startDate": "2023-11-30", "endDate": "2023-12-18" } } }
   */
  extensions: ScalapayExtensions;
}
