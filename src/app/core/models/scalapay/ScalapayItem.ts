import { ScalapayAmount } from './ScalapayAmount';

/**
 * Represents an item included in the order.
 * Example: { "name": "Tours Islands", "category": "Honeymoon Trips", "brand": "Tour Operator Name", "sku": "12341234", "quantity": 1, "price": { "amount": "1500.00", "currency": "EUR" } }
 */
export interface ScalapayItem {
  name: string;
  category: string;
  brand: string;
  sku: string;
  quantity: number;
  price: ScalapayAmount;
}
