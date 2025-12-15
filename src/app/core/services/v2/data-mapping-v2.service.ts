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
   * @param departureDate - Fecha de salida del departure (opcional, si se proporciona se usa en lugar de extraerla)
   * @returns BookingItem V2
   */
  mapReservationToBookingItem(
    reservation: ReservationResponse, 
    tour: TourV2 | null = null,
    listType: 'active-bookings' | 'pending-bookings' | 'travel-history' | 'recent-budgets' = 'active-bookings',
    cmsTour: ICMSTourResponse | null = null,
    departureDate?: string | null
  ): BookingItem {
    // Usar siempre el id de la reserva (no tkId)
    const reservationNumber = reservation.id.toString();
    
    // Determinar la fecha de salida: usar la proporcionada, o extraerla de la reserva
    let finalDepartureDate: Date;
    if (departureDate) {
      // Validar que la fecha proporcionada sea válida
      const parsedDate = this.parseValidDate(departureDate);
      if (parsedDate) {
        finalDepartureDate = parsedDate;
      } else {
        // Si la fecha proporcionada es inválida, usar el método de extracción como fallback
        finalDepartureDate = this.extractReservationDepartureDate(reservation);
      }
    } else {
      finalDepartureDate = this.extractReservationDepartureDate(reservation);
    }
    
    const bookingItem: BookingItem = {
      id: reservation.id.toString(),
      title: tour?.name || `Reserva ${reservationNumber}`,
      number: reservationNumber,
      reservationNumber: reservationNumber,
      creationDate: this.parseValidDate(reservation.createdAt) || new Date(),
      status: this.mapReservationStatus(reservation.reservationStatusId),
      reservationStatusId: reservation.reservationStatusId,
      departureDate: finalDepartureDate,
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
   * @param departureDates - Array de fechas de salida correspondientes (opcional)
   * @returns Array de BookingItem V2 ordenado por fecha de creación (más recientes primero)
   */
  mapReservationsToBookingItems(
    reservations: ReservationResponse[],
    tours: (TourV2 | null)[],
    listType: 'active-bookings' | 'pending-bookings' | 'travel-history' | 'recent-budgets' = 'active-bookings',
    cmsTours: (ICMSTourResponse | null)[] = [],
    departureDates?: (string | null | undefined)[]
  ): BookingItem[] {
    const bookingItems = reservations.map((reservation, index) => 
      this.mapReservationToBookingItem(
        reservation, 
        tours[index] || null, 
        listType,
        cmsTours[index] || null,
        departureDates && departureDates[index] !== undefined ? departureDates[index] : undefined
      )
    );

    // Ordenar por fecha de creación (más recientes primero)
    return bookingItems.sort((a, b) => {
      const dateA = new Date(a.creationDate).getTime();
      const dateB = new Date(b.creationDate).getTime();
      return dateB - dateA; // Orden descendente (más recientes primero)
    });
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
      1: 'Borrador',
      2: 'Carrito en proceso',
      3: 'Presupuesto generado',
      4: 'Reserva pendiente de confirmación',
      5: 'Reserva registrada sin pagos',
      6: 'Reserva confirmada con pagos parciales',
      7: 'Reserva pagada completamente',
      8: 'Reserva cancelada',
      9: 'Carrito abandonado sin conversión',
      10: 'Error técnico',
      11: 'Reserva pendiente de confirmación',
      12: 'Reserva eliminada',
      13: 'Reserva expirada',
      14: 'Reserva suspendida'
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
   * Valida y crea un objeto Date desde un string, retornando null si la fecha es inválida
   * @param dateString - String de fecha a validar
   * @returns Date válida o null si es inválida
   */
  private parseValidDate(dateString: string | null | undefined): Date | null {
    if (!dateString || dateString === 'null' || dateString.trim() === '') {
      return null;
    }
    
    const date = new Date(dateString);
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  }

  /**
   * Extrae la fecha de salida de una reserva
   * Prioridad: departure.departureDate > reservedAt > budgetAt > cartAt > createdAt + 30 días
   */
  private extractReservationDepartureDate(reservation: ReservationResponse | any): Date {
    // Intentar obtener la fecha de salida desde el departure si está disponible en la respuesta
    // (la API puede incluir el objeto departure completo en algunos casos)
    if (reservation.departure?.departureDate) {
      const parsedDate = this.parseValidDate(reservation.departure.departureDate);
      if (parsedDate) {
        return parsedDate;
      }
    }
    
    // Si no está disponible el departure, usar fechas de la reserva como fallback
    // Prioridad: reservedAt > budgetAt > cartAt > createdAt + 30 días
    const reservedAtDate = this.parseValidDate(reservation.reservedAt);
    if (reservedAtDate) {
      return reservedAtDate;
    }
    
    const budgetAtDate = this.parseValidDate(reservation.budgetAt);
    if (budgetAtDate) {
      return budgetAtDate;
    }
    
    const cartAtDate = this.parseValidDate(reservation.cartAt);
    if (cartAtDate) {
      return cartAtDate;
    }
    
    // Fallback: fecha de creación + 30 días (validar que createdAt sea válido)
    const createdAtDate = this.parseValidDate(reservation.createdAt);
    if (createdAtDate) {
      return new Date(createdAtDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    
    // Último fallback: fecha actual + 30 días si createdAt también es inválido
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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
      creationDate: this.parseValidDate(apiResponse.created_at) || new Date(),
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
    const departureDate = this.parseValidDate(apiResponse.departure_date);
    if (departureDate) return departureDate;
    
    const startDate = this.parseValidDate(apiResponse.start_date);
    if (startDate) return startDate;
    
    const tourDepartureDate = this.parseValidDate(apiResponse.tour?.departure_date);
    if (tourDepartureDate) return tourDepartureDate;
    
    // Fallback: fecha actual + 30 días
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
      fechaExpiracionDni: '',
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
          case 'Prefijo telefónico':
            combinedData.phonePrefix = fieldValue.value;
            break;
          case 'Fecha de nacimiento':
            // Convertir de YYYY-MM-DD (API) a DD/MM/YYYY (visualización)
            if (fieldValue.value && fieldValue.value.includes('-')) {
              const [year, month, day] = fieldValue.value.split('-');
              combinedData.fechaNacimiento = `${day}/${month}/${year}`;
            } else {
              combinedData.fechaNacimiento = fieldValue.value;
            }
            break;
          case 'DNI/NIE':
            combinedData.dni = fieldValue.value;
            break;
          case 'Fecha expiración DNI':
            // Convertir de YYYY-MM-DD (API) a DD/MM/YYYY (visualización)
            if (fieldValue.value && fieldValue.value.includes('-')) {
              const [year, month, day] = fieldValue.value.split('-');
              combinedData.fechaExpiracionDni = `${day}/${month}/${year}`;
            } else {
              combinedData.fechaExpiracionDni = fieldValue.value;
            }
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
      { fieldName: 'image', value: userData.avatarUrl },
      { fieldName: 'dni', value: userData.dni },
      { fieldName: 'nacionalidad', value: userData.pais },
      { fieldName: 'telefono', value: userData.telefono },
      { fieldName: 'phonePrefix', value: userData.phonePrefix },
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