/**
 * Represents billing information for the order.
 * Example: { "name": "Joe Consumer", "line1": "Via della Rosa, 58", "suburb": "Montelupo Fiorentino", "postcode": "50056", "countryCode": "IT", "phoneNumber": "0400000000" }
 */
export interface ScalapayBilling {
  name: string;
  line1: string;
  suburb: string;
  postcode: string;
  countryCode: string;
  phoneNumber: string;
}
