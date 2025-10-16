import { Injectable } from '@angular/core';
import { BookingItem, PersonalInfo } from '../../models/v2/profile-v2.model';
import { ReservationResponse } from '../../models/v2/profile-v2.model';
import { TourV2 } from './tours-v2.service';
import { ICMSTourResponse } from '../cms/cms-tour.service';

/**
 * Servicio para mapear datos de APIs a modelos V2
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
   * @param cmsTour - Información del tour CMS con imagen (opcional)
   * @returns BookingItem V2
   */
  mapReservationToBookingItem(
    reservation: ReservationResponse, 
    tour: TourV2 | null = null,
    listType: 'active-bookings' | 'travel-history' | 'recent-budgets' = 'active-bookings',
    cmsTour: ICMSTourResponse | null = null
  ): BookingItem {
    // Usar tkId si existe, sino usar el id de la reserva
    const reservationNumber = reservation.tkId || reservation.id.toString();
    
    const bookingItem: BookingItem = {
      id: reservation.id.toString(),
      title: tour?.name || `Reserva ${reservationNumber}`,
      number: reservationNumber,
      reservationNumber: reservationNumber,
      creationDate: new Date(reservation.createdAt),
      status: this.mapReservationStatus(reservation.reservationStatusId),
      departureDate: this.extractReservationDepartureDate(reservation),
      image: this.getImageFromCMS(cmsTour) || this.getDefaultImage(),
      passengers: reservation.totalPassengers,
      price: reservation.totalAmount,
      tourID: reservation.tourId.toString(),
      code: reservationNumber,
      imageLoading: false,
      imageLoaded: true
    };

    // Configurar campos específicos según el tipo de lista
    if (listType === 'recent-budgets') {
      bookingItem.budgetNumber = reservationNumber;
      bookingItem.ID = reservation.id.toString();
      bookingItem._id = reservation.id.toString();
    }

    return bookingItem;
  }

  /**
   * Mapea múltiples reservas con tours a array de BookingItem V2
   * @param reservations - Array de reservas
   * @param tours - Array de tours correspondientes
   * @param listType - Tipo de lista
   * @param cmsTours - Array de tours CMS con imágenes (opcional)
   * @returns Array de BookingItem V2
   */
  mapReservationsToBookingItems(
    reservations: ReservationResponse[],
    tours: (TourV2 | null)[],
    listType: 'active-bookings' | 'travel-history' | 'recent-budgets' = 'active-bookings',
    cmsTours: (ICMSTourResponse | null)[] = []
  ): BookingItem[] {
    return reservations.map((reservation, index) => 
      this.mapReservationToBookingItem(
        reservation, 
        tours[index] || null, 
        listType,
        cmsTours[index] || null
      )
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
   * Obtiene imagen por defecto
   */
  private getDefaultImage(): string {
    return 'assets/images/icon-different.svg';
  }

  /**
   * Obtiene imagen desde CMSTour si está disponible
   * @param cmsTour - Datos del tour CMS
   * @returns URL de la imagen o null si no está disponible
   */
  private getImageFromCMS(cmsTour: ICMSTourResponse | null): string | null {
    if (cmsTour?.imageUrl) {
      return cmsTour.imageUrl;
    }
    return null;
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
      number: apiResponse.number || apiResponse.reservation_number || apiResponse.id.toString(),
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

  // ===== MÉTODOS DE MAPEO PARA DATOS DE USUARIO =====

  /**
   * Combina los datos del usuario con los campos adicionales
   * @param user - Datos básicos del usuario
   * @param userFields - Campos disponibles
   * @param userFieldValues - Valores de campos del usuario
   * @returns PersonalInfo combinado
   */
  combineUserData(user: any, userFields: any[], userFieldValues: any[]): PersonalInfo {
    // Crear un mapa de valores de campos para acceso rápido
    const fieldValueMap = new Map();
    userFieldValues.forEach(fieldValue => {
      fieldValueMap.set(fieldValue.fieldId, fieldValue.value);
    });

    // Crear un mapa de campos para obtener nombres
    const fieldMap = new Map();
    userFields.forEach(field => {
      fieldMap.set(field.id, field.name);
    });

    // Combinar datos básicos del usuario con campos adicionales
    const combinedData: PersonalInfo = {
      id: user.id,
      nombre: user.nombre || user.firstName || user.name || '',
      apellido: user.apellido || user.lastName || '',
      email: user.email || '',
      telefono: user.telefono || user.phone || '',
      avatarUrl: user.avatarUrl || user.avatar || '',
      // Campos adicionales que se mapearán desde userFieldValues
      dni: '',
      direccion: '',
      ciudad: '',
      codigoPostal: '',
      pais: '',
      fechaNacimiento: '',
      notas: ''
    };

    // Agregar campos adicionales desde userFieldValues
    userFieldValues.forEach(fieldValue => {
      const fieldName = fieldMap.get(fieldValue.userFieldId);
      
      if (fieldName && fieldValue.value) {
        // Mapear nombres de campos a propiedades de PersonalInfo según la API
        switch (fieldName) {
          case 'Imagen de Perfil':
            combinedData.avatarUrl = fieldValue.value;
            break;
          case 'Teléfono':
            combinedData.telefono = fieldValue.value;
            break;
          case 'Fecha de nacimiento':
            combinedData.fechaNacimiento = fieldValue.value;
            break;
          case 'DNI/NIE':
            combinedData.dni = fieldValue.value;
            break;
          case 'Dirección':
            combinedData.direccion = fieldValue.value;
            break;
          case 'Ciudad':
            combinedData.ciudad = fieldValue.value;
            break;
          case 'Código Postal':
            combinedData.codigoPostal = fieldValue.value;
            break;
          case 'País':
            combinedData.pais = fieldValue.value;
            break;
          case 'Notas':
            combinedData.notas = fieldValue.value;
            break;
          case 'Sexo':
            combinedData.sexo = fieldValue.value;
            break;
        }
      }
    });

    return combinedData;
  }

  /**
   * Prepara los valores de campos para guardar
   * @param userId - ID del usuario
   * @param userData - Datos del usuario
   * @param userFields - Campos disponibles
   * @returns Array de valores de campos
   */
  prepareFieldValues(userId: string, userData: PersonalInfo, userFields: any[]): any[] {
    const fieldValues: any[] = [];
    
    // Mapear campos de PersonalInfo a userFieldValues
    const fieldMappings = [
      { fieldName: 'dni', value: userData.dni },
      { fieldName: 'nacionalidad', value: userData.pais },
      { fieldName: 'telefono', value: userData.telefono },
      { fieldName: 'ciudad', value: userData.ciudad },
      { fieldName: 'codigo_postal', value: userData.codigoPostal },
      { fieldName: 'fecha_nacimiento', value: userData.fechaNacimiento },
      { fieldName: 'sexo', value: userData.sexo },
    ];

    fieldMappings.forEach(mapping => {
      if (mapping.value) {
        // Buscar el campo correspondiente
        const field = userFields.find(f => 
          f.name.toLowerCase() === mapping.fieldName.toLowerCase() ||
          f.name.toLowerCase() === mapping.fieldName.replace('_', ' ').toLowerCase()
        );
        
        if (field) {
          fieldValues.push({
            userId: userId,
            fieldId: field.id,
            value: mapping.value
          });
        }
      }
    });

    return fieldValues;
  }
}