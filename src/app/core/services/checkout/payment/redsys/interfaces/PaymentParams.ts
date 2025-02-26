// Interface
export interface PaymentParams {
    amount: number;
    orderReference?: string | number;
    merchantName?: string;
    merchantCode: string;
    currency?: string;
    transactionType: string;
    terminal?: string;
    merchantURL?: string;
    successURL: string;
    errorURL: string;
  }
  