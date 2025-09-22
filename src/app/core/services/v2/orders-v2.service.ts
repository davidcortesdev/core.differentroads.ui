
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface OrderV2 {
  id: string;
  userId: string;
  userEmail: string;
  status: 'draft' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemV2[];
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress?: AddressV2;
  billingAddress?: AddressV2;
  notes?: string;
}

export interface OrderItemV2 {
  id: string;
  productId: string;
  productType: 'tour' | 'hotel' | 'flight' | 'activity' | 'package';
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  travelers?: TravelerV2[];
  specialRequests?: string;
}

export interface TravelerV2 {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber?: string;
  dietaryRequirements?: string;
  medicalConditions?: string;
}

export interface AddressV2 {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderListResponseV2 {
  data: OrderV2[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersServiceV2 {
  private readonly API_URL = `${environment.dataApiUrl}/orders-v2`; // TODO: Actualizar URL cuando esté disponible

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Obtiene la lista de órdenes de un usuario
   * @param userId - ID del usuario
   * @param filters - Filtros de búsqueda
   * @param page - Página actual
   * @param limit - Límite de resultados por página
   * @returns Observable de OrderListResponseV2
   */
  getOrdersByUser(
    userId: string,
    filters?: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      minAmount?: number;
      maxAmount?: number;
    },
    page: number = 1,
    limit: number = 10
  ): Observable<OrderListResponseV2> {
    // TODO: API - Implementación real (comentada hasta que esté disponible)
    // let params = new HttpParams()
    //   .set('userId', userId)
    //   .set('page', page.toString())
    //   .set('limit', limit.toString());
    
    // if (filters) {
    //   if (filters.status) params = params.set('status', filters.status);
    //   if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    //   if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
    //   if (filters.minAmount) params = params.set('minAmount', filters.minAmount.toString());
    //   if (filters.maxAmount) params = params.set('maxAmount', filters.maxAmount.toString());
    // }

    // return this.http.get<any>(`${this.API_URL}/user/${userId}`, {
    //   params,
    //   ...this.httpOptions,
    // }).pipe(
    //   map((response: any) => ({
    //     data: this.mapApiResponseToOrders(response.data || response.orders || []),
    //     total: response.total || response.count || 0,
    //     page: response.page || page,
    //     limit: response.limit || limit,
    //     totalPages: Math.ceil((response.total || response.count || 0) / (response.limit || limit)),
    //     hasMore: response.has_more || response.hasMore || false
    //   }))
    // );

    // MOCK DATA - Usar datos de ejemplo para desarrollo
    return of(this.generateMockOrdersByUser(userId, filters, page, limit));
  }

  /**
   * Obtiene detalles de una orden específica
   * @param orderId - ID de la orden
   * @returns Observable de OrderV2
   */
  getOrderDetails(orderId: string): Observable<OrderV2> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.get<OrderV2>(`${this.API_URL}/${orderId}`, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of(this.generateMockOrderDetails(orderId));
  }

  /**
   * Crea una nueva orden
   * @param order - Datos de la orden
   * @returns Observable de OrderV2
   */
  createOrder(order: Partial<OrderV2>): Observable<OrderV2> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.post<OrderV2>(this.API_URL, order, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of(this.generateMockCreateOrder(order));
  }

  /**
   * Actualiza una orden existente
   * @param orderId - ID de la orden
   * @param order - Datos actualizados de la orden
   * @returns Observable de OrderV2
   */
  updateOrder(orderId: string, order: Partial<OrderV2>): Observable<OrderV2> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.put<OrderV2>(`${this.API_URL}/${orderId}`, order, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of(this.generateMockUpdateOrder(orderId, order));
  }

  /**
   * Cancela una orden
   * @param orderId - ID de la orden
   * @param reason - Razón de la cancelación
   * @returns Observable de OrderV2
   */
  cancelOrder(orderId: string, reason?: string): Observable<OrderV2> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.put<OrderV2>(`${this.API_URL}/${orderId}/cancel`, { reason }, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of(this.generateMockCancelOrder(orderId, reason));
  }

  /**
   * Obtiene el historial de órdenes de un usuario
   * @param userId - ID del usuario
   * @param page - Página actual
   * @param limit - Límite de resultados por página
   * @returns Observable de OrderListResponseV2
   */
  getOrderHistory(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Observable<OrderListResponseV2> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.get<OrderListResponseV2>(`${this.API_URL}/user/${userId}/history`, {
    //   params: new HttpParams()
    //     .set('page', page.toString())
    //     .set('limit', limit.toString()),
    //   ...this.httpOptions,
    // });

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of(this.generateMockOrderHistory(userId, page, limit));
  }

  /**
   * Obtiene órdenes por estado
   * @param status - Estado de la orden
   * @param page - Página actual
   * @param limit - Límite de resultados por página
   * @returns Observable de OrderListResponseV2
   */
  getOrdersByStatus(
    status: string,
    page: number = 1,
    limit: number = 10
  ): Observable<OrderListResponseV2> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.get<OrderListResponseV2>(`${this.API_URL}/status/${status}`, {
    //   params: new HttpParams()
    //     .set('page', page.toString())
    //     .set('limit', limit.toString()),
    //   ...this.httpOptions,
    // });

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of(this.generateMockOrdersByStatus(status, page, limit));
  }

  // ===== MÉTODOS PRIVADOS PARA MOCK DATA =====
  // TODO: Eliminar todos estos métodos cuando se implemente la API real

  private generateMockOrdersByUser(
    userId: string,
    filters?: any,
    page: number = 1,
    limit: number = 10
  ): OrderListResponseV2 {
    const allOrders = this.getAllMockOrders();
    let filteredOrders = allOrders.filter(order => order.userId === userId);

    // Aplicar filtros si existen
    if (filters) {
      if (filters.status) {
        filteredOrders = filteredOrders.filter(order => order.status === filters.status);
      }
      if (filters.dateFrom) {
        filteredOrders = filteredOrders.filter(order => order.createdAt >= filters.dateFrom);
      }
      if (filters.dateTo) {
        filteredOrders = filteredOrders.filter(order => order.createdAt <= filters.dateTo);
      }
      if (filters.minAmount) {
        filteredOrders = filteredOrders.filter(order => order.totalAmount >= filters.minAmount);
      }
      if (filters.maxAmount) {
        filteredOrders = filteredOrders.filter(order => order.totalAmount <= filters.maxAmount);
      }
    }

    // Aplicar paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    return {
      data: paginatedOrders,
      total: filteredOrders.length,
      page,
      limit,
      totalPages: Math.ceil(filteredOrders.length / limit)
    };
  }

  private generateMockOrderDetails(orderId: string): OrderV2 {
    const allOrders = this.getAllMockOrders();
    return allOrders.find(order => order.id === orderId) || allOrders[0];
  }

  private generateMockCreateOrder(order: Partial<OrderV2>): OrderV2 {
    const newOrder: OrderV2 = {
      id: `order-${Date.now()}`,
      userId: order.userId || 'mock-user-id',
      userEmail: order.userEmail || 'user@example.com',
      status: 'draft',
      totalAmount: order.totalAmount || 0,
      currency: order.currency || 'EUR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: order.items || [],
      paymentStatus: 'pending',
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      notes: order.notes
    };
    return newOrder;
  }

  private generateMockUpdateOrder(orderId: string, order: Partial<OrderV2>): OrderV2 {
    const existingOrder = this.generateMockOrderDetails(orderId);
    return {
      ...existingOrder,
      ...order,
      updatedAt: new Date().toISOString()
    };
  }

  private generateMockCancelOrder(orderId: string, reason?: string): OrderV2 {
    const existingOrder = this.generateMockOrderDetails(orderId);
    return {
      ...existingOrder,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
      notes: reason ? `${existingOrder.notes || ''}\nCancelado: ${reason}`.trim() : existingOrder.notes
    };
  }

  private generateMockOrderHistory(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): OrderListResponseV2 {
    const allOrders = this.getAllMockOrders();
    const userOrders = allOrders.filter(order => order.userId === userId);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = userOrders.slice(startIndex, endIndex);

    return {
      data: paginatedOrders,
      total: userOrders.length,
      page,
      limit,
      totalPages: Math.ceil(userOrders.length / limit)
    };
  }

  private generateMockOrdersByStatus(
    status: string,
    page: number = 1,
    limit: number = 10
  ): OrderListResponseV2 {
    const allOrders = this.getAllMockOrders();
    const filteredOrders = allOrders.filter(order => order.status === status);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    return {
      data: paginatedOrders,
      total: filteredOrders.length,
      page,
      limit,
      totalPages: Math.ceil(filteredOrders.length / limit)
    };
  }

  private getAllMockOrders(): OrderV2[] {
    return [
      {
        id: 'order-1',
        userId: 'mockUserId-123',
        userEmail: 'user@example.com',
        status: 'confirmed',
        totalAmount: 1250,
        currency: 'EUR',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        items: [
          {
            id: 'item-1',
            productId: 'tour-1',
            productType: 'tour',
            productName: 'Tour por Italia - Roma, Florencia y Venecia',
            description: '8 días / 7 noches',
            quantity: 2,
            unitPrice: 625,
            totalPrice: 1250,
            currency: 'EUR',
            startDate: '2024-03-15',
            endDate: '2024-03-22',
            travelers: [
              {
                id: 'traveler-1',
                firstName: 'Juan',
                lastName: 'Pérez',
                email: 'juan@example.com',
                phone: '+34600123456',
                dateOfBirth: '1990-05-15',
                nationality: 'Española',
                passportNumber: 'AB1234567'
              }
            ]
          }
        ],
        paymentStatus: 'paid',
        shippingAddress: {
          street: 'Calle Mayor 123',
          city: 'Madrid',
          state: 'Madrid',
          postalCode: '28001',
          country: 'España',
          phone: '+34600123456'
        },
        notes: 'Orden confirmada para viaje a Italia'
      },
      {
        id: 'order-2',
        userId: 'mockUserId-123',
        userEmail: 'user@example.com',
        status: 'pending',
        totalAmount: 450,
        currency: 'EUR',
        createdAt: '2024-01-20T14:15:00Z',
        updatedAt: '2024-01-20T14:15:00Z',
        items: [
          {
            id: 'item-2',
            productId: 'tour-3',
            productType: 'tour',
            productName: 'Escapada a París',
            description: '3 días / 2 noches',
            quantity: 1,
            unitPrice: 450,
            totalPrice: 450,
            currency: 'EUR',
            startDate: '2024-04-20',
            endDate: '2024-04-22'
          }
        ],
        paymentStatus: 'pending',
        notes: 'Orden pendiente de pago'
      },
      {
        id: 'order-3',
        userId: 'mockUserId-123',
        userEmail: 'user@example.com',
        status: 'completed',
        totalAmount: 1800,
        currency: 'EUR',
        createdAt: '2023-11-01T09:00:00Z',
        updatedAt: '2023-11-15T18:30:00Z',
        items: [
          {
            id: 'item-3',
            productId: 'tour-2',
            productType: 'tour',
            productName: 'Aventura en Tailandia',
            description: '12 días / 11 noches',
            quantity: 1,
            unitPrice: 1800,
            totalPrice: 1800,
            currency: 'EUR',
            startDate: '2023-11-10',
            endDate: '2023-11-21'
          }
        ],
        paymentStatus: 'paid',
        notes: 'Viaje completado exitosamente'
      }
    ];
  }

  /**
   * Mapea la respuesta de la API V2 a OrderV2[]
   * @param apiResponse - Respuesta de la API V2
   * @returns Array de OrderV2
   */
  private mapApiResponseToOrders(apiResponse: any[]): OrderV2[] {
    if (!Array.isArray(apiResponse)) {
      return [];
    }

    return apiResponse.map((item: any) => ({
      id: item.id || item.order_id || `order-${Date.now()}`,
      userId: item.user_id || item.userId || '',
      userEmail: item.user_email || item.userEmail || item.email || '',
      status: this.mapOrderStatus(item.status),
      totalAmount: parseFloat(item.total_amount || item.total || item.amount || 0),
      currency: item.currency || 'EUR',
      createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
      items: this.mapOrderItems(item.items || []),
      paymentStatus: this.mapPaymentStatus(item.payment_status || item.paymentStatus),
      shippingAddress: this.mapAddress(item.shipping_address || item.shippingAddress),
      billingAddress: this.mapAddress(item.billing_address || item.billingAddress),
      notes: item.notes || item.comments || ''
    }));
  }

  /**
   * Mapea el estado de la orden desde la API V2
   */
  private mapOrderStatus(status: string): 'draft' | 'pending' | 'confirmed' | 'cancelled' | 'completed' {
    const statusMap: Record<string, 'draft' | 'pending' | 'confirmed' | 'cancelled' | 'completed'> = {
      'draft': 'draft',
      'pending': 'pending',
      'confirmed': 'confirmed',
      'cancelled': 'cancelled',
      'completed': 'completed',
      'active': 'confirmed',
      'inactive': 'cancelled',
      'finished': 'completed'
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Mapea el estado del pago desde la API V2
   */
  private mapPaymentStatus(status: string): 'pending' | 'paid' | 'failed' | 'refunded' {
    const statusMap: Record<string, 'pending' | 'paid' | 'failed' | 'refunded'> = {
      'pending': 'pending',
      'paid': 'paid',
      'failed': 'failed',
      'refunded': 'refunded',
      'success': 'paid',
      'error': 'failed',
      'refund': 'refunded'
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Mapea los items de la orden desde la respuesta de API
   */
  private mapOrderItems(items: any[]): OrderItemV2[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item: any) => ({
      id: item.id || `item-${Date.now()}`,
      productId: item.product_id || item.productId || '',
      productType: this.mapProductType(item.product_type || item.productType),
      productName: item.product_name || item.productName || item.name || '',
      description: item.description || item.summary || '',
      quantity: parseInt(item.quantity || 1),
      unitPrice: parseFloat(item.unit_price || item.unitPrice || item.price || 0),
      totalPrice: parseFloat(item.total_price || item.totalPrice || item.total || 0),
      currency: item.currency || 'EUR',
      travelers: this.mapTravelers(item.travelers || [])
    }));
  }

  /**
   * Mapea el tipo de producto desde la API V2
   */
  private mapProductType(type: string): 'tour' | 'hotel' | 'flight' | 'activity' | 'package' {
    const typeMap: Record<string, 'tour' | 'hotel' | 'flight' | 'activity' | 'package'> = {
      'tour': 'tour',
      'hotel': 'hotel',
      'flight': 'flight',
      'activity': 'activity',
      'package': 'package',
      'trip': 'tour',
      'accommodation': 'hotel',
      'transport': 'flight'
    };
    return typeMap[type] || 'tour';
  }

  /**
   * Mapea los viajeros desde la respuesta de API
   */
  private mapTravelers(travelers: any[]): TravelerV2[] {
    if (!Array.isArray(travelers)) {
      return [];
    }

    return travelers.map((traveler: any) => ({
      id: traveler.id || `traveler-${Date.now()}`,
      firstName: traveler.first_name || traveler.firstName || '',
      lastName: traveler.last_name || traveler.lastName || '',
      email: traveler.email || '',
      phone: traveler.phone || '',
      dateOfBirth: traveler.date_of_birth || traveler.dateOfBirth || '',
      nationality: traveler.nationality || '',
      passportNumber: traveler.passport_number || traveler.passportNumber || '',
      specialRequests: traveler.special_requests || traveler.specialRequests || ''
    }));
  }

  /**
   * Mapea una dirección desde la respuesta de API
   */
  private mapAddress(address: any): AddressV2 | undefined {
    if (!address) return undefined;

    return {
      street: address.street || address.address || '',
      city: address.city || '',
      state: address.state || address.province || '',
      postalCode: address.postal_code || address.postalCode || address.zip || '',
      country: address.country || '',
      phone: address.phone || ''
    };
  }
}
