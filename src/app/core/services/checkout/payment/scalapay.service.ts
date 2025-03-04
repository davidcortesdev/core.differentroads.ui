import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ScalapayOrderRequest } from '../../../models/scalapay/ScalapayOrderRequest';
import { ScalapayOrderResponse } from '../../../models/scalapay/ScalapayOrderResponse';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ScalapayService {
  private readonly API_URL = environment.scalapayApiUrl;
  private readonly API_KEY = environment.scalapayApiKey;

  constructor(private http: HttpClient) {}

  private getHttpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${this.API_KEY}`,
      }),
    };
  }

  createOrder(orderData: ScalapayOrderRequest): Promise<ScalapayOrderResponse> {
    if (!this.API_URL || !this.API_KEY) {
      console.error(
        'Environment variables scalapayApiUrl or scalapayApiKey are not defined'
      );
      return Promise.reject('Environment variables not defined');
    }

    const url = `${this.API_URL}/v2/orders`;
    return this.http
      .post<ScalapayOrderResponse>(url, orderData, this.getHttpOptions())
      .toPromise()
      .then((response) => {
        if (!response) {
          throw new Error('No response received');
        }
        return response;
      })
      .catch((error) => {
        console.error('Error processing order:', error);
        throw error;
      });
  }

  capturePayment(paymentData: any): Promise<any> {
    if (!this.API_URL || !this.API_KEY) {
      console.error(
        'Environment variables scalapayApiUrl or scalapayApiKey are not defined'
      );
      return Promise.reject('Environment variables not defined');
    }

    const url = `${this.API_URL}/v2/payments/capture`;
    return this.http
      .post<any>(url, paymentData, this.getHttpOptions())
      .toPromise()
      .then((response) => {
        if (!response) {
          throw new Error('No response received');
        }
        return response;
      })
      .catch((error) => {
        console.error('Error processing order:', error);
        throw error;
      });
  }

  getPaymentDetails(paymentId: string): Promise<any> {
    if (!this.API_URL || !this.API_KEY) {
      console.error(
        'Environment variables scalapayApiUrl or scalapayApiKey are not defined'
      );
      return Promise.reject('Environment variables not defined');
    }

    const url = `${this.API_URL}/v2/payments/${paymentId}`;
    return this.http
      .get<any>(url, this.getHttpOptions())
      .toPromise()
      .then((response) => {
        if (!response) {
          throw new Error('No response received');
        }
        return response;
      })
      .catch((error) => {
        console.error('Error processing order:', error);
        throw error;
      });
  }
}
