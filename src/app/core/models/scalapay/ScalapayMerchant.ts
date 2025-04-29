/**
 * Represents merchant information for redirect URLs.
 * Example: { "redirectConfirmUrl": "https://scalapay.com", "redirectCancelUrl": "https://scalapay.com" }
 */
export interface ScalapayMerchant {
  redirectConfirmUrl: string;
  redirectCancelUrl: string;
}
