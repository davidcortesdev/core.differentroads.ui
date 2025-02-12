import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Booking,
  GetAllBookingsParams,
  Payment,
} from '../models/bookings/booking.model';

@Injectable({
  providedIn: 'root',
})
export class BookingsService {
  private readonly API_URL = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) {}

  createBooking(id: string, data: any): Observable<Booking> {
    return this.http.post<Booking>(`${this.API_URL}/${id}/create`, data);
  }

  saveTravelers(id: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/${id}/save-travelers`, data);
  }

  bookOrder(id: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/${id}/book`, data);
  }

  getBookingById(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.API_URL}/${id}`);
  }

  updateBooking(id: string, data: any): Observable<Booking> {
    return this.http.put<Booking>(`${this.API_URL}/${id}`, data);
  }

  getBookings(params?: GetAllBookingsParams): Observable<Booking[]> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<Booking[]>(this.API_URL, { params: httpParams });
  }

  getBookingsByEmail(email: string): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.API_URL}/by-email/${email}`);
  }

  getTravelersByPeriod(id: string, params?: any): Observable<any> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<any>(`${this.API_URL}/travelers/by-period/${id}`, {
      params: httpParams,
    });
  }

  updateTravelers(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/travelers/${id}`, data);
  }

  getPayments(id: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.API_URL}/${id}/payment`);
  }

  getPaymentsByPublicID(id: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(
      `${this.API_URL}/${id}/payment/by-public-id`
    );
  }

  createPayment(id: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/${id}/payment`, data);
  }

  completePayment(id: string, paymentId: string, data: any): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/${id}/payment/${paymentId}/complete`,
      data
    );
  }

  updatePayment(paymentId: string, data: any): Observable<any> {
    return this.http.put<any>(
      `${environment.apiUrl}/payment/${paymentId}`,
      data
    );
  }

  uploadVoucher(id: string, paymentId: string, data: any): Observable<any> {
    return this.http.put<any>(
      `${this.API_URL}/${id}/payment/${paymentId}/upload-voucher`,
      data
    );
  }

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

  cancelBookingById(id: string): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${id}/cancel`, {});
  }

  getBookingInconsistencies(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${id}/inconsistencies`);
  }
}
