import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Booking,
  BookingCreateInput,
  GetAllBookingsParams,
} from '../models/bookings/booking.model';
import { Order } from '../models/orders/order.model';
import { IPaymentVoucher, Payment } from '../models/bookings/payment.model';
import { Pagination } from '../models/commons/pagination.model';

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly API_URL = `${environment.dataApiUrl}/bookings`;

  constructor(private http: HttpClient) {}

  /**
   * Creates a new booking.
   * @param data - The booking creation input.
   * @returns Observable of Booking creation response.
   */
  createBooking(data: BookingCreateInput): Observable<{
    bookingID: string;
    ID: string;
    order: Order;
  }> {
    return this.http.post<{
      bookingID: string;
      ID: string;
      order: Order;
    }>(`${this.API_URL}/create`, data);
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

    return this.http.post<any>(`${this.API_URL}/${id}/save-travelers`, {
      bookingSID: ID,
      bookingID,
      ...order,
    });
  }

  /**
   * Books an order.
   * @param id - The booking ID.
   * @param data - The booking data.
   * @returns Observable of any.
   */
  bookOrder(id: string, data: { order: any; ID: any }): Observable<any> {
    const { order, ID } = data;
    return this.http.post<any>(`${this.API_URL}/${id}/book`, {
      ...order,
      bookingSID: ID,
    });
  }

  /**
   * Fetches a booking by its ID.
   * @param id - The booking ID.
   * @returns Observable of Booking.
   */
  getBookingById(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.API_URL}/${id}`);
  }

  /**
   * Updates a booking.
   * @param id - The booking ID.
   * @param data - The booking data to update.
   * @returns Observable of Booking.
   */
  updateBooking(id: string, data: any): Observable<Booking> {
    return this.http.put<Booking>(`${this.API_URL}/${id}`, data);
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
    return this.http.get<Booking[]>(this.API_URL, { params: httpParams });
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
    });
  }

  /**
   * Updates travelers for a booking.
   * @param id - The booking ID.
   * @param data - The travelers data to update.
   * @returns Observable of any.
   */
  updateTravelers(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/travelers/${id}`, data);
  }

  /**
   * Fetches payments for a booking.
   * @param id - The booking ID.
   * @returns Observable of Payment array.
   */
  getPayments(id: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.API_URL}/${id}/payment`);
  }

  /**
   * Fetches payments by public ID.
   * @param id - The public ID.
   * @returns Observable of Payment array.
   */
  getPaymentsByPublicID(id: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(
      `${this.API_URL}/${id}/payment/by-public-id`
    );
  }

  /**
   * Creates a new payment for a booking.
   * @param id - The booking ID.
   * @param data - The payment data.
   * @returns Observable of any.
   */
  createPayment(id: string, data: Partial<Payment>): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/${id}/payment`, data);
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
      data
    );
  }

  /**
   * Updates a payment.
   * @param paymentId - The payment ID.
   * @param data - The payment data to update.
   * @returns Observable of any.
   */
  updatePayment(paymentId: string, data: Partial<Payment>): Observable<any> {
    return this.http.put<any>(
      `${environment.apiUrl}/payment/${paymentId}`,
      data
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
      data
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
    data: any
  ): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/${id}/payment/${paymentId}/voucher/${voucherId}/review`,
      data
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
      { travelers }
    );
  }

  /**
   * Cancels a booking by its ID.
   * @param id - The booking ID.
   * @returns Observable of any.
   */
  cancelBookingById(id: string): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${id}/cancel`, {});
  }

  /**
   * Fetches booking inconsistencies by its ID.
   * @param id - The booking ID.
   * @returns Observable of any.
   */
  getBookingInconsistencies(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${id}/inconsistencies`);
  }
}
