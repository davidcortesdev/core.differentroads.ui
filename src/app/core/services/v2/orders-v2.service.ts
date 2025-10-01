import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces para la respuesta de la API (igual que orders.service.ts)
export interface OrderV2 {
  _id: string;
  ID: string;
  periodID: string;
  retailerID: string;
  status: 'AB' | 'Budget';
  owner: string;
  travelers?: OrderTravelerV2[];
  price?: number;
  createdAt?: string;
  updatedAt?: string;
  optionalActivitiesRef?: OptionalActivityRefV2[];
  insurancesRef?: OptionalActivityRefV2[];
  extraData?: any;
  flights?: FlightV2[] | { id: string; name?: string; externalID: string }[];
  summary?: SummaryItemV2[];
  discounts?: DiscountInfoV2[];
  payment?: PaymentOptionV2;
}

export interface OptionalActivityRefV2 {
  id: string;
  travelersAssigned: string[];
  name?: string;
  _id?: string;
}

export interface TravelerDataV2 {
  ageGroup?: string;
  birthdate?: string;
  category?: string;
  dni?: string;
  documentType?: string;
  email?: string;
  name?: string;
  nationality?: string;
  passportExpirationDate?: string;
  passportID?: string;
  passportIssueDate?: string;
  phone?: string;
  postalCode?: string;
  sex?: string;
  surname?: string;
  minorIdExpirationDate?: string;
  minorIdIssueDate?: string;
  associatedAdult?: string;
}

export interface OrderTravelerV2 {
  lead?: boolean;
  bookingID?: string;
  flightID?: string;
  periodReservationModeID?: string;
  travelerData?: TravelerDataV2;
  optionalActivitiesIDs?: string[];
  insuranceID?: string;
  _id?: string;
  id?: string;
}

export interface GetAllOrdersParamsV2 {
  page?: number;
  limit?: number;
  keyword?: string;
  retailersID?: string[];
  status?: string[];
  periodId?: string[];
  minDate?: string;
  maxDate?: string;
  withTourData?: boolean;
}

export interface OrderListResponseV2 {
  data: OrderV2[];
  pagination: {
  page: number;
  limit: number;
    total: number;
  totalPages: number;
  };
}

export interface SummaryItemV2 {
  qty: number;
  value: number;
  description: string;
}

export interface DiscountInfoV2 {
  code?: string;
  amount: number;
  description: string;
  type: string;
}

export interface PaymentOptionV2 {
  type: 'complete' | 'installments' | 'deposit';
  method?: 'creditCard' | 'transfer';
  installmentOption?: 'three' | 'four';
  source?: string;
  depositAmount?: number;
}

export interface FlightV2 {
  id: string;
  name?: string;
  externalID: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersServiceV2 {
  private readonly API_URL = `${environment.dataApiUrl}/orders`;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Crea una nueva orden
   * @param order - Datos de la orden
   * @returns Observable de OrderV2
   */
  createOrder(order: Partial<OrderV2>): Observable<OrderV2> {
    return this.http.post<OrderV2>(this.API_URL, order, this.httpOptions);
  }

  /**
   * Obtiene detalles de una orden específica
   * @param id - ID de la orden
   * @returns Observable de OrderV2
   */
  getOrderDetails(id: string): Observable<OrderV2> {
    return this.http.get<OrderV2>(`${this.API_URL}/${id}`, this.httpOptions);
  }

  /**
   * Alias para getOrderDetails (compatibilidad)
   * @param id - ID de la orden
   * @returns Observable de OrderV2
   */
  getOrderById(id: string): Observable<OrderV2> {
    return this.getOrderDetails(id);
  }

  /**
   * Actualiza una orden existente
   * @param id - ID de la orden
   * @param order - Datos actualizados de la orden
   * @returns Observable de OrderV2
   */
  updateOrder(id: string, order: OrderV2): Observable<OrderV2> {
    return this.http.put<OrderV2>(
      `${this.API_URL}/${id}`,
      order,
      this.httpOptions
    );
  }

  /**
   * Elimina una orden
   * @param id - ID de la orden
   * @returns Observable de void
   */
  deleteOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, this.httpOptions);
  }

  /**
   * Obtiene órdenes con parámetros de filtro
   * @param params - Parámetros de filtro
   * @returns Observable de OrderListResponseV2
   */
  getOrders(params?: GetAllOrdersParamsV2): Observable<OrderListResponseV2> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<OrderListResponseV2>(this.API_URL, {
      params: httpParams,
      ...this.httpOptions,
    });
  }

  /**
   * Obtiene órdenes por usuario (email)
   * @param userEmail - Email del usuario
   * @param page - Página actual
   * @param limit - Límite de resultados por página
   * @returns Observable de OrderListResponseV2
   */
  getOrdersByUser(
    userEmail: string,
    page: number = 1,
    limit: number = 5
  ): Observable<OrderListResponseV2> {
    return this.getOrders({ keyword: userEmail, page, limit });
  }

  /**
   * Obtiene órdenes por retailer
   * @param retailerID - ID del retailer
   * @returns Observable de OrderListResponseV2
   */
  getOrdersByRetailer(retailerID: string): Observable<OrderListResponseV2> {
    return this.getOrders({ retailersID: [retailerID] });
  }

  /**
   * Obtiene presupuestos recientes por usuario
   * @param userEmail - Email del usuario
   * @param page - Página actual
   * @param limit - Límite de resultados por página
   * @returns Observable de OrderListResponseV2
   */
  getRecentBudgets(
    userEmail: string,
    page: number = 1,
    limit: number = 10
  ): Observable<OrderListResponseV2> {
    return this.getOrders({ 
      keyword: userEmail, 
      status: ['Budget'], 
      page,
      limit 
    });
  }
}