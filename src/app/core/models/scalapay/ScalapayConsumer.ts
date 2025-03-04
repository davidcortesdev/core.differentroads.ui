/**
 * Represents a consumer making the purchase.
 * Example: { "phoneNumber": "0400000001", "givenNames": "Joe", "surname": "Consumer", "email": "test@scalapay.com" }
 */
export interface ScalapayConsumer {
  phoneNumber?: string;
  givenNames?: string;
  surname?: string;
  email: string;
}
