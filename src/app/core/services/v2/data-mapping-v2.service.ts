import { Injectable } from '@angular/core';
import { BookingItem } from '../../models/v2/profile-v2.model';
import { ReservationResponse } from './bookings-v2.service';
import { TourV2 } from './tours-v2.service';
import { OrderV2 } from './orders-v2.service';

/**
 * Servicio para mapear datos de APIs a BookingItem V2
 * Transforma respuestas de API al formato que necesita el componente
 */
@Injectable({
  providedIn: 'root',
})
export class DataMappingV2Service {

  constructor() {}

  /**
   * Mapea una reserva con información de tour a BookingItem V2
   * @param reservation - Datos de reserva de la API
   * @param tour - Información del tour (opcional)
   * @param listType - Tipo de lista para configurar campos específicos
   * @returns BookingItem V2
   */
  mapReservationToBookingItem(
    reservation: ReservationResponse, 
    tour: TourV2 | null = null,
    listType: 'active-bookings' | 'travel-history' | 'recent-budgets' = 'active-bookings'
  ): BookingItem {
    const bookingItem: BookingItem = {
      id: reservation.id.toString(),
      title: tour?.name || `Reserva ${reservation.tkId}`,
      number: reservation.tkId,
      reservationNumber: reservation.tkId,
      creationDate: new Date(reservation.createdAt),
      status: this.mapReservationStatus(reservation.reservationStatusId),
      departureDate: this.extractReservationDepartureDate(reservation),
      image: this.getDefaultImage(),
      passengers: reservation.totalPassengers,
      price: reservation.totalAmount,
      tourID: reservation.tourId.toString(),
      code: reservation.tkId,
      imageLoading: false,
      imageLoaded: true
    };

    // Configurar campos específicos según el tipo de lista
    if (listType === 'recent-budgets') {
      bookingItem.budgetNumber = reservation.tkId;
      bookingItem.ID = reservation.id.toString();
      bookingItem._id = reservation.id.toString();
    }

    return bookingItem;
  }

  /**
   * Mapea una orden (presupuesto) con información de tour a BookingItem V2
   * @param order - Datos de orden de la API
   * @param tour - Información del tour (opcional)
   * @returns BookingItem V2
   */
  mapOrderToBookingItem(order: OrderV2, tour: TourV2 | null = null): BookingItem {
    return {
      id: order._id,
      title: tour?.name || `Presupuesto ${order.ID}`,
      number: order.ID,
      budgetNumber: order.ID,
      ID: order.ID,
      _id: order._id,
      creationDate: order.createdAt ? new Date(order.createdAt) : new Date(),
      status: this.mapOrderStatus(order.status),
      departureDate: this.extractOrderDepartureDate(order),
      image: this.getDefaultImage(),
      passengers: order.travelers?.length || 1,
      price: order.price || 0,
      tourID: order.periodID,
      code: order.ID,
      summary: order.summary,
      imageLoading: false,
      imageLoaded: true
    };
  }

  /**
   * Mapea múltiples reservas con tours a array de BookingItem V2
   * @param reservations - Array de reservas
   * @param tours - Array de tours correspondientes
   * @param listType - Tipo de lista
   * @returns Array de BookingItem V2
   */
  mapReservationsToBookingItems(
    reservations: ReservationResponse[],
    tours: (TourV2 | null)[],
    listType: 'active-bookings' | 'travel-history' | 'recent-budgets' = 'active-bookings'
  ): BookingItem[] {
    return reservations.map((reservation, index) => 
      this.mapReservationToBookingItem(reservation, tours[index] || null, listType)
    );
  }

  /**
   * Mapea múltiples órdenes con tours a array de BookingItem V2
   * @param orders - Array de órdenes
   * @param tours - Array de tours correspondientes
   * @returns Array de BookingItem V2
   */
  mapOrdersToBookingItems(orders: OrderV2[], tours: (TourV2 | null)[]): BookingItem[] {
    return orders.map((order, index) => 
      this.mapOrderToBookingItem(order, tours[index] || null)
    );
  }

  /**
   * Mapea múltiples respuestas de la API a un array de BookingItem V2
   * @param apiResponses - Array de respuestas de la API
   * @returns Array de BookingItem V2
   */
  mapApiResponsesToBookingItems(apiResponses: any[]): BookingItem[] {
    return Array.isArray(apiResponses)
      ? apiResponses.map(response => this.mapApiToBookingItem(response))
      : [];
  }

  // ===== MÉTODOS AUXILIARES PARA MAPEO V2 =====

  /**
   * Mapea el ID de estado de reserva a string legible
   */
  private mapReservationStatus(statusId: number): string {
    const statusMap: Record<number, string> = {
      0: 'Budget',
      1: 'Booked',
      2: 'RQ',
      3: 'Completed',
      4: 'Cancelled'
    };
    return statusMap[statusId] || 'Unknown';
  }

  /**
   * Mapea el estado de orden a string legible
   */
  private mapOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'AB': 'Budget',
      'Budget': 'Budget'
    };
    return statusMap[status] || 'Budget';
  }

  /**
   * Extrae la fecha de salida de una reserva
   */
  private extractReservationDepartureDate(reservation: ReservationResponse): Date {
    // Prioridad: reservedAt > budgetAt > cartAt > createdAt + 30 días
    if (reservation.reservedAt && reservation.reservedAt !== 'null') {
      return new Date(reservation.reservedAt);
    }
    if (reservation.budgetAt && reservation.budgetAt !== 'null') {
      return new Date(reservation.budgetAt);
    }
    if (reservation.cartAt && reservation.cartAt !== 'null') {
      return new Date(reservation.cartAt);
    }
    // Fallback: fecha de creación + 30 días
    return new Date(new Date(reservation.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  /**
   * Extrae la fecha de salida de una orden
   */
  private extractOrderDepartureDate(order: OrderV2): Date {
    // Para órdenes, usar fecha de creación + 30 días como fallback
    if (order.createdAt) {
      return new Date(new Date(order.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  /**
   * Obtiene imagen por defecto
   */
  private getDefaultImage(): string {
    return 'https://via.placeholder.com/300x200?text=Tour+Image';
  }

  // ===== MÉTODOS COMPATIBILIDAD (mantener para compatibilidad) =====

  /**
   * Mapea una respuesta de API genérica a BookingItem V2 (compatibilidad)
   * @param apiResponse - Datos de reserva de la API
   * @returns BookingItem V2
   */
  mapApiToBookingItem(apiResponse: any): BookingItem {
    return {
      id: apiResponse.id || apiResponse.reservation_id || `booking-${Date.now()}`,
      title: this.extractBookingTitle(apiResponse),
      number: apiResponse.number || apiResponse.reservation_number || `RES-${apiResponse.id}`,
      reservationNumber: apiResponse.reservation_number || apiResponse.number,
      creationDate: apiResponse.created_at ? new Date(apiResponse.created_at) : new Date(),
      status: this.mapBookingStatus(apiResponse.status),
      departureDate: this.extractDepartureDate(apiResponse),
      image: this.extractBookingImage(apiResponse),
      passengers: apiResponse.passengers || apiResponse.travelers_count || 1,
      price: this.extractBookingPrice(apiResponse),
      tourID: apiResponse.tour_id || apiResponse.tour_external_id
    };
  }


  private extractBookingTitle(apiResponse: any): string {
    if (apiResponse.tour?.name) return apiResponse.tour.name;
    if (apiResponse.title) return apiResponse.title;
    if (apiResponse.tour_name) return apiResponse.tour_name;
    return `Reserva ${apiResponse.number || apiResponse.id}`;
  }

  private extractDepartureDate(apiResponse: any): Date {
    if (apiResponse.departure_date) return new Date(apiResponse.departure_date);
    if (apiResponse.start_date) return new Date(apiResponse.start_date);
    if (apiResponse.tour?.departure_date) return new Date(apiResponse.tour.departure_date);
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  private extractBookingImage(apiResponse: any): string {
    if (apiResponse.tour?.image) return apiResponse.tour.image;
    if (apiResponse.image_url) return apiResponse.image_url;
    if (apiResponse.image) return apiResponse.image;
    return this.getDefaultImage();
  }

  private extractBookingPrice(apiResponse: any): number {
    if (apiResponse.total_price) return apiResponse.total_price;
    if (apiResponse.price) return apiResponse.price;
    if (apiResponse.tour?.price) return apiResponse.tour.price;
    return 0;
  }

  private mapBookingStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'confirmed': 'confirmed',
      'pending': 'pending',
      'cancelled': 'cancelled',
      'completed': 'completed',
      'Booked': 'Booked',
      'RQ': 'RQ',
      'Budget': 'Budget'
    };
    return statusMap[status] || 'pending';
  }
}