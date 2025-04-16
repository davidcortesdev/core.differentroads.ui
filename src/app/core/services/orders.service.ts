import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Order,
  GetAllOrdersParams,
  OrderListResponse,
} from '../models/orders/order.model';

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly API_URL = `${environment.dataApiUrl}/orders`;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  createOrder(order: Partial<Order>): Observable<Order> {
    return this.http.post<Order>(this.API_URL, order, this.httpOptions);
  }

  getOrderDetails(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.API_URL}/${id}`, this.httpOptions);
  }

   // Add alias method for getOrderById to match what's used in the component
   getOrderById(id: string): Observable<Order> {
    return this.getOrderDetails(id);
  }

  updateOrder(id: string, order: Order): Observable<Order> {
    return this.http.put<Order>(
      `${this.API_URL}/${id}`,
      order,
      this.httpOptions
    );
  }

  deleteOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, this.httpOptions);
  }

  getOrders(params?: GetAllOrdersParams): Observable<OrderListResponse> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<OrderListResponse>(this.API_URL, {
      params: httpParams,
      ...this.httpOptions,
    });
  }

  getOrdersByUser(
    userEmail: string,
    page: number = 1,
    limit = 5
  ): Observable<OrderListResponse> {
    return this.getOrders({ keyword: userEmail, page, limit });
  }

  getOrdersByRetailer(retailerID: string): Observable<OrderListResponse> {
    return this.getOrders({ retailersID: [retailerID] });
  }
}
