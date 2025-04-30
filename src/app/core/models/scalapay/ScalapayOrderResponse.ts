export type ScalapayOrderResponse = {
  /**
   * Scalapay order unique token.
   * Example: 'SC6PLAC9O5VF'
   */
  token: string;
  status: string;
  checkoutUrl: string;
};
