import { ScalapayAmount } from './ScalapayAmount';
import { ScalapayItem } from './ScalapayItem';
import { ScalapayBilling } from './ScalapayBilling';
import { ScalapayConsumer } from './ScalapayConsumer';
import { ScalapayMerchant } from './ScalapayMerchant';
import { ScalapayDiscount } from './ScalapayDiscount';

export interface ScalapayCaptureOrderDetails {
  items: ScalapayItem[];
  billing: ScalapayBilling;
  consumer: ScalapayConsumer;
  merchant: ScalapayMerchant;
  shipping: ScalapayBilling;
  discounts?: ScalapayDiscount[];
  taxAmount?: ScalapayAmount;
  totalAmount: ScalapayAmount;
  shippingAmount?: ScalapayAmount;
  merchantReference: string;
}

export interface ScalapayCaptureOrderRespone {
  /**
   * Scalapay order unique token.
   * Example: '71KH916VPE'
   */
  token: string;
  
  /**
   * Status of the captured order.
   * Example: 'APPROVED'
   */
  status: string;
  
  /**
   * Total amount of the order.
   * Example: { "amount": "190.00", "currency": "EUR" }
   */
  totalAmount: ScalapayAmount;
  
  /**
   * Details of the captured order.
   */
  orderDetails: ScalapayCaptureOrderDetails;
  
  /**
   * Date and time when the order was captured.
   * Example: '2023-10-19T15:11:20.000Z'
   */
  capturedAt: string;
}
