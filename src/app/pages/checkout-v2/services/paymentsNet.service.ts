import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

export interface IPaymentResponse {
  id: number;
  reservationId: number;
  amount: number;
  paymentDate: Date;
  paymentMethodId: number;
  paymentStatusId: number;
  transactionReference?: string;
  notes?: string;
  attachmentUrl?: string;
  currencyId: number;
}

export interface IPaymentCreate {
  reservationId: number;
  amount: number;
  paymentDate: Date;
  paymentMethodId: number;
  paymentStatusId: number;
  transactionReference?: string;
  notes?: string;
  attachmentUrl?: string;
  currencyId: number;
}

export interface IPaymentUpdate {
  id: number;
  amount?: number;
  paymentDate?: Date;
  paymentMethodId?: number;
  paymentStatusId?: number;
  transactionReference?: string;
  notes?: string;
  currencyId?: number;
}

export interface PaymentFilter {
  id?: number;
  reservationId?: number;
  amount?: number;
  paymentMethodId?: number;
  paymentStatusId?: number;
  paymentDate?: Date;
}

export interface IPaymentStatusResponse {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface IPaymentSummaryResponse {
  reservationId: number;
  totalPaid: number;
  totalPending: number;
  totalAmount: number;
  paymentPercentage: number;
}

export class PaymentStatusFilter {
  id?: number = 0;
  code?: string = '';
  name?: string = '';
}

@Injectable({
  providedIn: 'root',
})
export class PaymentsNetService {
  private readonly API_URL = `${environment.reservationsApiUrl}`;

  constructor(private http: HttpClient) {}

  getPaymentById(paymentId: number): Observable<IPaymentResponse> {
    return this.http.get<IPaymentResponse>(
      `${this.API_URL}/ReservationPayment/${paymentId}`
    );
  }

  update(payment: IPaymentUpdate): Observable<IPaymentResponse> {
    return this.http.put<IPaymentResponse>(
      `${this.API_URL}/ReservationPayment/${payment.id}`,
      payment
    );
  }

  create(payment: IPaymentCreate): Observable<IPaymentResponse> {
    return this.http.post<IPaymentResponse>(
      `${this.API_URL}/ReservationPayment`,
      payment
    );
  }

  getStatus(filter: PaymentStatusFilter): Observable<IPaymentStatusResponse[]> {
    const params: any = {};
    if (filter.id) params.id = filter.id.toString();
    if (filter.code) params.code = filter.code;
    if (filter.name) params.name = filter.name;
    return this.http.get<IPaymentStatusResponse[]>(
      `${this.API_URL}/PaymentStatus`,
      { params }
    );
  }

  getAll(filter: PaymentFilter): Observable<IPaymentResponse[]> {
    const params: any = {};
    if (filter.id) params.id = filter.id.toString();
    if (filter.reservationId)
      params.reservationId = filter.reservationId.toString();
    if (filter.amount) params.amount = filter.amount.toString();
    if (filter.paymentMethodId)
      params.paymentMethodId = filter.paymentMethodId.toString();
    if (filter.paymentStatusId)
      params.paymentStatusId = filter.paymentStatusId.toString();
    if (filter.paymentDate)
      params.paymentDate = filter.paymentDate.toISOString();
    params.useExactMatchForStrings = false;
    return this.http.get<IPaymentResponse[]>(
      `${this.API_URL}/ReservationPayment`,
      { params }
    );
  }

  delete(paymentId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}/ReservationPayment/${paymentId}`
    );
  }

  cleanScalapayPendingPayments(reservationId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}/ReservationPayment/clean-pending-payments/${reservationId}`
    );
  }

  getPaymentSummary(
    reservationId: number
  ): Observable<IPaymentSummaryResponse> {
    return this.http.get<IPaymentSummaryResponse>(
      `${this.API_URL}/ReservationPayment/summary/${reservationId}`
    );
  }
}
