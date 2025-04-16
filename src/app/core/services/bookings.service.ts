import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Booking,
  BookingCreateInput,
  GetAllBookingsParams,
} from '../models/bookings/booking.model';
import { Order } from '../models/orders/order.model';
import {
  IPaymentVoucher,
  Payment,
  PaymentStatus,
  VoucherReviewStatus,
} from '../models/bookings/payment.model';
import { Pagination } from '../models/commons/pagination.model';

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly API_URL = `${environment.dataApiUrl}/bookings`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Creates a new booking.
   * @param data - The booking creation input.
   * @returns Observable of Booking creation response.
   */
  createBooking(
    orderID: string,
    data: BookingCreateInput
  ): Observable<{
    bookingID: string;
    code: string;
    order: Order;
  }> {
    return this.http.post<{
      bookingID: string;
      code: string;
      order: Order;
    }>(`${this.API_URL}/${orderID}/create`, data, this.httpOptions);
  }

  /**
   * Saves travelers for a booking.
   * @param id - The booking ID.
   * @param data - The travelers data.
   * @returns Observable of any.
   */
  saveTravelers(
    id: string,
    data: { bookingSID: string; bookingID: string; order: Order }
  ): Observable<any> {
    const { bookingSID: ID, bookingID, order } = data;

    return this.http.post<any>(
      `${this.API_URL}/${id}/save-travelers`,
      {
        bookingSID: ID,
        bookingID,
        ...order,
      },
      this.httpOptions
    );
  }

  /**
   * Books an order.
   * @param id - The booking ID.
   * @param data - The booking data.
   * @returns Observable of any.
   */
  bookOrder(id: string, data: { order: any; code: string }): Observable<any> {
    const { order, code } = data;
    return this.http.post<any>(
      `${this.API_URL}/${id}/book`,
      {
        ...order,
        bookingSID: code,
      },
      this.httpOptions
    );
  }

  /**
   * Fetches a booking by its ID.
   * @param id - The booking ID.
   * @returns Observable of Booking.
   */
  getBookingById(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.API_URL}/${id}`, this.httpOptions);
  }

  /**
   * Updates a booking.
   * @param id - The booking ID.
   * @param data - The booking data to update.
   * @returns Observable of Booking.
   */
  updateBooking(id: string, data: any): Observable<Booking> {
    return this.http.put<Booking>(
      `${this.API_URL}/${id}`,
      data,
      this.httpOptions
    );
  }

  /**
   * Fetches all bookings with optional parameters.
   * @param params - Optional parameters to filter bookings.
   * @returns Observable of Booking array.
   */
  getBookings(params?: GetAllBookingsParams): Observable<Booking[]> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<Booking[]>(this.API_URL, {
      params: httpParams,
      ...this.httpOptions,
    });
  }

  /**
   * Fetches bookings by email.
   * @param email - The email address.
   * @returns Observable of Booking array.
   */
  getBookingsByEmail(
    email: string,
    status: string,
    page: number = 1,
    limit: number = 5
  ): Observable<{ data: Partial<Booking[]>; pagination: Pagination }> {
    let params = new HttpParams();
    if (status !== undefined) {
      params = params.set('status', status.toString());
    }
    if (page !== undefined) {
      params = params.set('page', page.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<{ data: Partial<Booking[]>; pagination: Pagination }>(
      `${this.API_URL}/by-email/${email}`,
      {
        params,
        ...this.httpOptions,
      }
    );
  }

  /**
   * Fetches travelers by period.
   * @param id - The period ID.
   * @param params - Optional parameters to filter travelers.
   * @returns Observable of any.
   */
  getTravelersByPeriod(id: string, params?: any): Observable<any> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<any>(`${this.API_URL}/travelers/by-period/${id}`, {
      params: httpParams,
      ...this.httpOptions,
    });
  }

  /**
   * Updates travelers for a booking.
   * @param id - The booking ID.
   * @param data - The travelers data to update.
   * @returns Observable of any.
   */
  updateTravelers(id: string, data: any): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/travelers/${id}`,
      data,
      this.httpOptions
    );
  }

  /**
   * Fetches payments for a booking.
   * @param id - The booking ID.
   * @returns Observable of Payment array.
   */
  getPayments(id: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(
      `${this.API_URL}/${id}/payment`,
      this.httpOptions
    );
  }

  /**
   * Fetches payments by public ID.
   * @param id - The public ID.
   * @returns Observable of Payment array.
   */
  getPaymentsByPublicID(id: string): Observable<Payment> {
    return this.http.get<Payment>(
      `${this.API_URL}/${id}/payment/by-public-id`,
      this.httpOptions
    );
  }

  /**
   * Creates a new payment for a booking.
   * @param id - The booking ID.
   * @param data - The payment data.
   * @returns Observable of any.
   */
  createPayment(id: string, data: Partial<Payment>): Observable<Payment> {
    return this.http
      .post<{ data: Payment }>(
        `${this.API_URL}/${id}/payment`,
        data,
        this.httpOptions
      )
      .pipe(map((response) => response.data));
  }

  /**
   * Completes a payment for a booking.
   * @param id - The booking ID.
   * @param paymentId - The payment ID.
   * @param data - The payment completion data.
   * @returns Observable of any.
   */
  completePayment(
    id: string,
    paymentId: string,
    data: Payment
  ): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/${id}/payment/${paymentId}/complete`,
      data,
      this.httpOptions
    );
  }

  /**
   * Updates a payment.
   * @param paymentId - The payment ID.
   * @param data - The payment data to update.
   * @returns Observable of any.
   */
  updatePayment(paymentId: string, data: Partial<Payment>): Observable<any> {
    return this.http.post<any>(
      `${this.API_URL}/payment/${paymentId}`,
      data,
      this.httpOptions
    );
  }

  /**
   * Uploads a voucher for a payment.
   * @param id - The booking ID.
   * @param paymentId - The payment ID.
   * @param data - The voucher data.
   * @returns Observable of any.
   */
  uploadVoucher(
    id: string,
    paymentId: string,
    data: IPaymentVoucher
  ): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/${id}/payment/${paymentId}/upload-voucher`,
      data,
      this.httpOptions
    );
  }

  /**
   * Reviews a voucher for a payment.
   * @param id - The booking ID.
   * @param paymentId - The payment ID.
   * @param voucherId - The voucher ID.
   * @param data - The review data.
   * @returns Observable of any.
   */
  reviewVoucher(
    id: string,
    paymentId: string,
    voucherId: string,
    status: VoucherReviewStatus
  ): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/${id}/payment/${paymentId}/voucher/${voucherId}/review`,
      { status, complete: true },
      this.httpOptions
    );
  }

  /**
   * Adds optional activities to a booking.
   * @param id - The booking ID.
   * @param activityId - The activity ID.
   * @param travelers - The list of traveler IDs.
   * @returns Observable of any.
   */
  addOptionalActivities(
    id: string,
    activityId: string,
    travelers: string[]
  ): Observable<any> {
    return this.http.post<any>(
      `${this.API_URL}/${id}/optional-activity/${activityId}`,
      { travelers },
      this.httpOptions
    );
  }

  /**
   * Cancels a booking by its ID.
   * @param id - The booking ID.
   * @returns Observable of any.
   */
  cancelBookingById(id: string): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/${id}/cancel`,
      {},
      this.httpOptions
    );
  }

  /**
   * Fetches booking inconsistencies by its ID.
   * @param id - The booking ID.
   * @returns Observable of any.
   */
  getBookingInconsistencies(id: string): Observable<any> {
    return this.http.get<any>(
      `${this.API_URL}/${id}/inconsistencies`,
      this.httpOptions
    );
  }
}
