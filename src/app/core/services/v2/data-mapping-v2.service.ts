import { Injectable } from '@angular/core';
import { BookingItem } from '../../models/v2/profile-v2.model';

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
   * Mapea una respuesta de API a BookingItem V2
   * @param apiResponse - Datos de reserva de la API
   * @returns BookingItem V2
   */
  mapApiToBookingItem(apiResponse: any): BookingItem {
    // Mapeo de API a BookingItem V2
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

  /**
   * Mapea múltiples respuestas de API a array de BookingItem V2
   * @param apiResponses - Array de respuestas de la API
   * @returns Array de BookingItem V2
   */
  mapApiResponsesToBookingItems(apiResponses: any[]): BookingItem[] {
    return apiResponses.map(response => this.mapApiToBookingItem(response));
  }

  // ===== MÉTODOS AUXILIARES PARA MAPEO REAL DE BOOKING =====

  private extractBookingTitle(apiResponse: any): string {
    // Extraer título del tour desde API
    if (apiResponse.tour?.name) {
      return apiResponse.tour.name;
    }
    if (apiResponse.title) {
      return apiResponse.title;
    }
    if (apiResponse.tour_name) {
      return apiResponse.tour_name;
    }
    return `Reserva ${apiResponse.number || apiResponse.id}`;
  }

  private extractDepartureDate(apiResponse: any): Date {
    // Extraer fecha de salida desde API
    if (apiResponse.departure_date) {
      return new Date(apiResponse.departure_date);
    }
    if (apiResponse.start_date) {
      return new Date(apiResponse.start_date);
    }
    if (apiResponse.tour?.departure_date) {
      return new Date(apiResponse.tour.departure_date);
    }
    // Fallback a fecha de creación + 30 días
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  private extractBookingImage(apiResponse: any): string {
    // Extraer imagen del tour desde API
    if (apiResponse.tour?.image) {
      return apiResponse.tour.image;
    }
    if (apiResponse.image_url) {
      return apiResponse.image_url;
    }
    if (apiResponse.image) {
      return apiResponse.image;
    }
    // Imagen por defecto
    return 'https://via.placeholder.com/300x200?text=Tour+Image';
  }

  private extractBookingPrice(apiResponse: any): number {
    // Extraer precio desde API
    if (apiResponse.total_price) {
      return apiResponse.total_price;
    }
    if (apiResponse.price) {
      return apiResponse.price;
    }
    if (apiResponse.tour?.price) {
      return apiResponse.tour.price;
    }
    return 0;
  }

  private mapBookingStatus(status: string): string {
    // Mapeo de estados de reserva
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