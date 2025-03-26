export interface Payment {
  bookingID: string;
  amount: number;
  dueDate?: string | Date;
  publicID: string;
  externalID?: string;
  method?: string;
  provider?: string;
  providerResponse?: any;
  status: PaymentStatus;
  registerBy?: string;
  vouchers?: IPaymentVoucher[];
  createdAt: string;
  updatedAt: string;
}

export interface IPaymentVoucher {
  fileUrl: string;
  metadata?: any;
  uploadDate: Date;
  reviewStatus: VoucherReviewStatus;
  id: string;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED_PENDING_UPLOAD = 'PENDING_REVIEW',
}

export enum VoucherReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  IGNORED = 'IGNORED',
}
