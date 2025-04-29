import { ScalapayOrderRequest } from './ScalapayOrderRequest';

export type ScalapayGetOrdersDetailsResponse = {
  /**
   * Scalapay order unique token.
   * Example: 'SC6PLAC9O5VF'
   */
  token: string;
  created: string; // Date and time of order creation in ISO 8601 format
  status: string; // Scalapay order status
  totalAmount: {
    amount: number; // Total order amount
    currency: string; // Currency of the amount
  };
  orderDetails: ScalapayOrderRequest; // Order details
};
