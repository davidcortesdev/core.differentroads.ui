import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BookingItem } from '../../../core/models/v2/profile-v2.model';

@Injectable({
  providedIn: 'root',
})
export class BookingsServiceV2 {
  private readonly API_URL = `${environment.dataApiUrl}/bookings-v2`; // TODO: Actualizar URL cuando esté disponible

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las reservas activas de un usuario
   * @param userId - ID del usuario
   * @param page - Página actual
   * @param limit - Límite de resultados por página
   * @returns Observable de array de BookingItem
   */

  getActiveBookings(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Observable<BookingItem[]> {
    // TODO: API - Implementación real (comentada hasta que esté disponible)
    // return this.http.get<any>(`${this.API_URL}/active/${userId}`, {
    //   params: new HttpParams()
    //     .set('page', page.toString())
    //     .set('limit', limit.toString())
    //     .set('status', 'active'),
    //   ...this.httpOptions,
    // }).pipe(
    //   map((response: any) => {
    //     // Mapear respuesta de API a BookingItem[]
    //     return this.mapApiResponseToBookingItems(response.data || response);
    //   })
    // );

    // MOCK DATA - Usar datos de ejemplo para desarrollo
    return of(this.generateMockActiveBookings(userId));
  }

  /**
   * Obtiene el historial de viajes de un usuario
   * @param userId - ID del usuario
   * @param page - Página actual
   * @param limit - Límite de resultados por página
   * @returns Observable de array de BookingItem
   */
  getTravelHistory(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Observable<BookingItem[]> {
    // TODO: API - Implementación real (comentada hasta que esté disponible)
    // return this.http.get<any>(`${this.API_URL}/history/${userId}`, {
    //   params: new HttpParams()
    //     .set('page', page.toString())
    //     .set('limit', limit.toString())
    //     .set('status', 'completed'),
    //   ...this.httpOptions,
    // }).pipe(
    //   map((response: any) => {
    //     // Mapear respuesta de API a BookingItem[]
    //     return this.mapApiResponseToBookingItems(response.data || response);
    //   })
    // );

    // MOCK DATA - Usar datos de ejemplo para desarrollo
    return of(this.generateMockTravelHistory(userId));
  }

  /**
   * Obtiene los presupuestos recientes de un usuario
   * @param userId - ID del usuario
   * @param page - Página actual
   * @param limit - Límite de resultados por página
   * @returns Observable de array de BookingItem
   */
  getRecentBudgets(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Observable<BookingItem[]> {
    // TODO: API - Implementación real (comentada hasta que esté disponible)
    // return this.http.get<any>(`${this.API_URL}/budgets/${userId}`, {
    //   params: new HttpParams()
    //     .set('page', page.toString())
    //     .set('limit', limit.toString())
    //     .set('status', 'budget'),
    //   ...this.httpOptions,
    // }).pipe(
    //   map((response: any) => {
    //     // Mapear respuesta de API a BookingItem[]
    //     return this.mapApiResponseToBookingItems(response.data || response);
    //   })
    // );

    // MOCK DATA - Usar datos de ejemplo para desarrollo
    return of(this.generateMockRecentBudgets(userId));
  }

  /**
   * Descarga un documento de reserva
   * @param bookingId - ID de la reserva
   * @param documentType - Tipo de documento
   * @returns Observable de URL del documento
   */
  downloadBookingDocument(
    bookingId: string,
    documentType: 'voucher' | 'invoice' | 'itinerary' = 'voucher'
  ): Observable<{ fileUrl: string }> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.get<{ fileUrl: string }>(`${this.API_URL}/${bookingId}/documents/${documentType}`, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of({ fileUrl: `https://mock-api.com/documents/${bookingId}/${documentType}.pdf` });
  }

  /**
   * Envía un documento por email
   * @param bookingId - ID de la reserva
   * @param documentType - Tipo de documento
   * @param email - Email de destino
   * @returns Observable de respuesta
   */
  sendBookingDocument(
    bookingId: string,
    documentType: 'voucher' | 'invoice' | 'itinerary',
    email: string
  ): Observable<{ success: boolean; message: string }> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/${bookingId}/send-document`, {
    //   documentType,
    //   email
    // }, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of({ success: true, message: 'Documento enviado correctamente' });
  }

  /**
   * Obtiene detalles de una reserva específica
   * @param bookingId - ID de la reserva
   * @returns Observable de BookingItem
   */
  getBookingDetails(bookingId: string): Observable<BookingItem> {
    // TODO: Implementar cuando la API V2 esté disponible
    // return this.http.get<BookingItem>(`${this.API_URL}/${bookingId}`, this.httpOptions);

    // MOCK DATA - Eliminar cuando se implemente la API real
    return of(this.generateMockBookingDetails(bookingId));
  }

  // ===== MÉTODOS PRIVADOS PARA MOCK DATA =====
  // TODO: Eliminar todos estos métodos cuando se implemente la API real

  private generateMockActiveBookings(userId: string): BookingItem[] {
    // Generar datos personalizados basados en userId
    const userSuffix = userId.slice(-3); // Últimos 3 caracteres del userId
    
    return [
      {
        id: `booking-1-${userSuffix}`,
        title: 'Tour por Italia - Roma, Florencia y Venecia',
        number: `RES-001-${userSuffix}`,
        reservationNumber: `RES-001-${userSuffix}`,
        creationDate: new Date('2024-01-15'),
        status: 'Booked',
        departureDate: new Date('2024-03-15'),
        image: 'https://via.placeholder.com/300x200?text=Italia+Tour',
        passengers: 2,
        price: 1250,
        tourID: 'TOUR-001'
      },
      {
        id: `booking-2-${userSuffix}`,
        title: 'Escapada a París',
        number: `RES-002-${userSuffix}`,
        reservationNumber: `RES-002-${userSuffix}`,
        creationDate: new Date('2024-01-20'),
        status: 'RQ',
        departureDate: new Date('2024-04-20'),
        image: 'https://via.placeholder.com/300x200?text=Paris+Tour',
        passengers: 1,
        price: 450,
        tourID: 'TOUR-002'
      }
    ];
  }

  private generateMockTravelHistory(userId: string): BookingItem[] {
    const userSuffix = userId.slice(-3);
    
    return [
      {
        id: `history-1-${userSuffix}`,
        title: 'Aventura en Tailandia',
        number: `HIST-001-${userSuffix}`,
        creationDate: new Date('2023-11-01'),
        status: 'Completed',
        departureDate: new Date('2023-11-10'),
        image: 'https://via.placeholder.com/300x200?text=Tailandia+Tour',
        passengers: 2,
        price: 1800,
        tourID: 'TOUR-003'
      },
      {
        id: `history-2-${userSuffix}`,
        title: 'Explorando Grecia',
        number: `HIST-002-${userSuffix}`,
        creationDate: new Date('2023-08-01'),
        status: 'Completed',
        departureDate: new Date('2023-08-15'),
        image: 'https://via.placeholder.com/300x200?text=Grecia+Tour',
        passengers: 1,
        price: 750,
        tourID: 'TOUR-004'
      }
    ];
  }

  private generateMockRecentBudgets(userId: string): BookingItem[] {
    const userSuffix = userId.slice(-3);
    
    return [
      {
        id: `budget-1-${userSuffix}`,
        title: 'Presupuesto Japón 2024',
        number: `BUD-001-${userSuffix}`,
        budgetNumber: `BUD-001-${userSuffix}`,
        ID: `BUD-001-${userSuffix}`,
        creationDate: new Date('2024-01-15'),
        status: 'Budget',
        departureDate: new Date('2024-04-15'),
        image: 'https://via.placeholder.com/300x200?text=Japon+Budget',
        passengers: 2,
        price: 2500,
        tourID: 'TOUR-005'
      },
      {
        id: `budget-2-${userSuffix}`,
        title: 'Presupuesto Islandia',
        number: `BUD-002-${userSuffix}`,
        budgetNumber: `BUD-002-${userSuffix}`,
        ID: `BUD-002-${userSuffix}`,
        creationDate: new Date('2024-01-10'),
        status: 'Budget',
        departureDate: new Date('2024-05-10'),
        image: 'https://via.placeholder.com/300x200?text=Islandia+Budget',
        passengers: 1,
        price: 1200,
        tourID: 'TOUR-006'
      }
    ];
  }

  private generateMockBookingDetails(bookingId: string): BookingItem {
    return {
      id: bookingId,
      title: 'Tour por Italia - Roma, Florencia y Venecia',
      number: 'RES-001',
      reservationNumber: 'RES-001',
      creationDate: new Date('2024-01-15'),
      status: 'Booked',
      departureDate: new Date('2024-03-15'),
      image: 'https://via.placeholder.com/300x200?text=Italia+Tour',
      passengers: 2,
      price: 1250,
      tourID: 'TOUR-001'
    };
  }

  /**
   * Mapea la respuesta de la API V2 a BookingItem[]
   * @param apiResponse - Respuesta de la API V2
   * @returns Array de BookingItem
   */
  private mapApiResponseToBookingItems(apiResponse: any[]): BookingItem[] {
    if (!Array.isArray(apiResponse)) {
      return [];
    }

    return apiResponse.map((item: any) => ({
      id: item.id || item.booking_id || `booking-${Date.now()}`,
      title: this.extractBookingTitle(item),
      number: item.number || item.booking_number || item.reservation_number || `RES-${item.id}`,
      budgetNumber: item.budget_number || item.number,
      ID: item.id || item.booking_id,
      creationDate: item.created_at ? new Date(item.created_at) : new Date(),
      status: this.mapBookingStatus(item.status),
      departureDate: this.extractDepartureDate(item),
      image: this.extractBookingImage(item),
      passengers: item.passengers || item.travelers_count || 1,
      price: this.extractBookingPrice(item),
      tourID: item.tour_id || item.tour_external_id || item.tour?.id
    }));
  }

  /**
   * Extrae el título de la reserva desde la respuesta de API
   */
  private extractBookingTitle(item: any): string {
    if (item.tour?.name) return item.tour.name;
    if (item.title) return item.title;
    if (item.tour_name) return item.tour_name;
    if (item.name) return item.name;
    return `Reserva ${item.number || item.id}`;
  }

  /**
   * Extrae la fecha de salida desde la respuesta de API
   */
  private extractDepartureDate(item: any): Date {
    if (item.departure_date) return new Date(item.departure_date);
    if (item.start_date) return new Date(item.start_date);
    if (item.tour?.departure_date) return new Date(item.tour.departure_date);
    if (item.tour?.start_date) return new Date(item.tour.start_date);
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Fallback: +30 días
  }

  /**
   * Extrae la imagen de la reserva desde la respuesta de API
   */
  private extractBookingImage(item: any): string {
    if (item.tour?.image) return item.tour.image;
    if (item.tour?.image_url) return item.tour.image_url;
    if (item.image) return item.image;
    if (item.image_url) return item.image_url;
    return 'https://via.placeholder.com/300x200?text=Tour+Image';
  }

  /**
   * Extrae el precio de la reserva desde la respuesta de API
   */
  private extractBookingPrice(item: any): number {
    if (item.total_price) return parseFloat(item.total_price);
    if (item.price) return parseFloat(item.price);
    if (item.tour?.price) return parseFloat(item.tour.price);
    if (item.amount) return parseFloat(item.amount);
    return 0;
  }

  /**
   * Mapea el estado de la reserva desde la API V2
   */
  private mapBookingStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'confirmed': 'confirmed',
      'active': 'active',
      'pending': 'pending',
      'cancelled': 'cancelled',
      'completed': 'completed',
      'Booked': 'Booked',
      'RQ': 'RQ',
      'Budget': 'Budget',
      'budget': 'Budget',
      'travel_history': 'Completed'
    };
    return statusMap[status] || 'pending';
  }
}