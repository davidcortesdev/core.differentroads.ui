import { Injectable, Injector } from '@angular/core';
import { UsersNetService } from '../users/usersNet.service';
import { PersonalInfoV2Service } from '../v2/personal-info-v2.service';
import { Observable, of, map, switchMap, catchError, first, take, shareReplay, tap, defaultIfEmpty, filter, skipWhile, forkJoin, concatMap } from 'rxjs';
import { TourTagService } from '../tag/tour-tag.service';
import { TagService } from '../tag/tag.service';
import { TripTypeService } from '../trip-type/trip-type.service';
import { TourDataV2 } from '../../../shared/components/tour-card-v2/tour-card-v2.model';
import { ReviewsService } from '../reviews/reviews.service';
import { TourService } from '../tour/tour.service';
import { TourLocationService, ITourLocationResponse } from '../tour/tour-location.service';
import { LocationNetService, Location } from '../locations/locationNet.service';
import { ItineraryService, ItineraryFilters } from '../itinerary/itinerary.service';
import { ItineraryDayService, IItineraryDayResponse } from '../itinerary/itinerary-day/itinerary-day.service';
import { DepartureService, IDepartureResponse } from '../departure/departure.service';
import { ReservationTravelerService } from '../reservation/reservation-traveler.service';
import { ReservationTravelerActivityService } from '../reservation/reservation-traveler-activity.service';
import { ReservationTravelerActivityPackService } from '../reservation/reservation-traveler-activity-pack.service';
import { ActivityService, IActivityResponse } from '../activity/activity.service';
import { AgeGroupService } from '../agegroup/age-group.service';
import { ReservationService, IReservationSummaryResponse, ReservationSummaryItem } from '../reservation/reservation.service';
import { ReservationFlightService } from '../flight/reservationflight.service';

/**
 * Interfaz para los datos de usuario que se envían en los eventos
 */
export interface UserData {
  email_address?: string;
  phone_number?: string;
  user_id?: string;
}

/**
 * Interfaz para los items de ecommerce
 */
export interface EcommerceItem {
  item_id: string;
  item_name: string;
  coupon?: string;
  discount?: number;
  index?: number;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_list_id?: string;
  item_list_name?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  puntuacion?: string;
  duracion?: string;
  start_date?: string;
  end_date?: string;
  pasajeros_adultos?: string;
  pasajeros_niños?: string;
  actividades?: string;
  seguros?: string;
  vuelo?: string;
}

/**
 * Interfaz para los datos de ecommerce
 */
export interface EcommerceData {
  currency?: string;
  value?: number;
  item_list_id?: string;
  item_list_name?: string;
  items?: EcommerceItem[];
  coupon?: string;
  payment_type?: string;
  transaction_id?: string;
  tax?: number;
  shipping?: number;
}

/**
 * ============================================
 * ESTRUCTURAS ESPECÍFICAS PARA CADA EVENTO
 * ============================================
 */

/**
 * Estructura específica para view_item_list
 */
export interface ViewItemListEventData {
  event: 'view_item_list';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: {
    item_list_id: string;
    item_list_name: string;
    items: EcommerceItem[];
  };
}

/**
 * Estructura específica para select_item
 */
export interface SelectItemEventData {
  event: 'select_item';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: {
    item_list_id: string;
    item_list_name: string;
    items: EcommerceItem[];
  };
}

/**
 * Estructura específica para view_item
 */
export interface ViewItemEventData {
  event: 'view_item';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: {
    item_list_id: string;
    item_list_name: string;
    items: EcommerceItem[];
  };
}

/**
 * Estructura específica para add_to_wishlist
 */
export interface AddToWishlistEventData {
  event: 'add_to_wishlist';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: {
    item_list_id: string;
    item_list_name: string;
    items: EcommerceItem[];
  };
}

/**
 * Estructura específica para add_to_cart
 */
export interface AddToCartEventData {
  event: 'add_to_cart';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: {
    currency: string;
    value: number;
    items: EcommerceItem[];
  };
}

/**
 * Estructura específica para view_cart
 */
export interface ViewCartEventData {
  event: 'view_cart';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: {
    currency: string;
    value: number;
    items: EcommerceItem[];
  };
}

/**
 * Estructura específica para begin_checkout
 */
export interface BeginCheckoutEventData {
  event: 'begin_checkout';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: EcommerceData;
}

/**
 * Estructura específica para view_flights_info
 */
export interface ViewFlightsInfoEventData {
  event: 'view_flights_info';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: EcommerceData;
}

/**
 * Estructura específica para add_flights_info
 */
export interface AddFlightsInfoEventData {
  event: 'add_flights_info';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: EcommerceData;
}

/**
 * Estructura específica para view_personal_info
 */
export interface ViewPersonalInfoEventData {
  event: 'view_personal_info';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: EcommerceData;
}

/**
 * Estructura específica para add_personal_info
 */
export interface AddPersonalInfoEventData {
  event: 'add_personal_info';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: EcommerceData;
}

/**
 * Estructura específica para view_payment_info
 */
export interface ViewPaymentInfoEventData {
  event: 'view_payment_info';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: EcommerceData;
}

/**
 * Estructura específica para add_payment_info
 */
export interface AddPaymentInfoEventData {
  event: 'add_payment_info';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: EcommerceData;
}

/**
 * Estructura específica para purchase
 */
export interface PurchaseEventData {
  event: 'purchase';
  user_data: {
    email_address: string;
    phone_number: string;
    user_id: string;
  };
  ecommerce: EcommerceData;
}

/**
 * Interfaz para los parámetros de eventos de búsqueda
 */
export interface SearchParams {
  search_term: string;
  start_date?: string;
  end_date?: string;
  trip_type?: string;
}

/**
 * Interfaz para los parámetros de filtros
 */
export interface FilterParams {
  filter_categoria?: string;
  filter_temporada?: string;
  filter_mes?: string;
  filter_precio?: string;
}

/**
 * Interfaz para los datos del tour necesarios para construir EcommerceItem
 */
export interface TourDataForEcommerce {
  id?: number;
  tkId?: string;
  name?: string;
  destination?: {
    continent?: string;
    country?: string;
  };
  days?: number;
  nights?: number;
  rating?: number | string;
  monthTags?: string[];
  tourType?: string;
  // Datos adicionales opcionales
  flightCity?: string;
  activitiesText?: string;
  selectedInsurance?: string;
  childrenCount?: string;
  totalPassengers?: number;
  departureDate?: string;
  returnDate?: string;
  price?: number;
}

/**
 * Servicio para gestionar todos los eventos de Google Analytics 4 mediante dataLayer
 * Implementa el plan de medición de Different Roads siguiendo las especificaciones de GA4
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private _authService: any; // Lazy-loaded para evitar dependencia circular
  
  constructor(
    private injector: Injector,
    private usersNetService: UsersNetService,
    private personalInfoService: PersonalInfoV2Service,
    private tourTagService: TourTagService,
    private tagService: TagService,
    private tripTypeService: TripTypeService,
    // Servicios para obtener datos dinámicos del tour
    private reviewsService: ReviewsService,
    private tourService: TourService,
    private tourLocationService: TourLocationService,
    private locationNetService: LocationNetService,
    private itineraryService: ItineraryService,
    private itineraryDayService: ItineraryDayService,
    private departureService: DepartureService,
    private reservationTravelerService: ReservationTravelerService,
    private reservationTravelerActivityService: ReservationTravelerActivityService,
    private reservationTravelerActivityPackService: ReservationTravelerActivityPackService,
    private activityService: ActivityService,
    private ageGroupService: AgeGroupService,
    private reservationService: ReservationService,
    private reservationFlightService: ReservationFlightService
  ) {
    this.initDataLayer();
  }
  
  /**
   * Obtiene AuthenticateService de forma lazy para evitar dependencia circular
   */
  private getAuthService(): any {
    if (!this._authService) {
      // Importar dinámicamente para evitar dependencia circular
      const AuthenticateService = require('../auth/auth-service.service').AuthenticateService;
      this._authService = this.injector.get(AuthenticateService);
    }
    return this._authService;
  }
  
  private get authService(): any {
    return this.getAuthService();
  }

  /**
   * Inicializa el dataLayer si no existe
   */
  private initDataLayer(): void {
    (window as any).dataLayer = (window as any).dataLayer || [];
  }

  /**
   * Limpia el objeto ecommerce previo antes de enviar un nuevo evento
   */
  private clearEcommerce(): void {
    (window as any).dataLayer.push({ ecommerce: null });
  }

  /**
   * Envía un evento al dataLayer
   */
  private pushEvent(eventData: any): void {
    (window as any).dataLayer.push(eventData);
  }

  // ============================================
  // EVENTOS DE ECOMMERCE
  // ============================================

  // Set para trackear eventos ya disparados (última línea de defensa)
  private firedEvents = new Set<string>();

  /**
   * Evento: view_item_list
   * Se dispara cuando el usuario visualiza una lista de viajes
   * Estructura exacta según especificación GA4
   */
  viewItemList(
    itemListId: string,
    itemListName: string,
    items: EcommerceItem[],
    userData?: UserData
  ): void {
    // Última verificación: si ya se disparó este evento, no hacer nada
    const eventKey = `view_item_list_${itemListId}`;
    if (this.firedEvents.has(eventKey)) {
      return;
    }

    // Marcar como disparado inmediatamente
    this.firedEvents.add(eventKey);

    this.clearEcommerce();
    
    // Estructura específica para view_item_list
    const eventData: ViewItemListEventData = {
      event: 'view_item_list',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        item_list_id: itemListId,
        item_list_name: itemListName,
        items: items
      }
    };
    
    this.pushEvent(eventData);
  }

  /**
   * Evento: select_item
   * Se dispara cuando el usuario hace clic sobre un artículo desde una lista
   */
  selectItem(
    itemListId: string,
    itemListName: string,
    item: EcommerceItem,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    
    // Eliminar end_date del item si existe
    const { end_date, ...itemWithoutEndDate } = item;
    
    // Estructura específica para select_item
    const eventData: SelectItemEventData = {
      event: 'select_item',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        item_list_id: itemListId,
        item_list_name: itemListName,
        items: [itemWithoutEndDate]
      }
    };
    
    this.pushEvent(eventData);
  }

  /**
   * Evento: view_item
   * Se dispara cuando el usuario visualiza la ficha de un tour
   */
  viewItem(
    itemListId: string,
    itemListName: string,
    item: EcommerceItem,
    userData?: UserData
  ): void {
    // Crear una clave única basada en item_list_id e item_id para evitar duplicados
    const itemId = item.item_id || '';
    const eventKey = `view_item_${itemListId}_${itemId}`;
    
    // Verificar si ya se disparó este evento
    if (this.firedEvents.has(eventKey)) {
      return;
    }
    
    // Marcar como disparado inmediatamente
    this.firedEvents.add(eventKey);
    
    this.clearEcommerce();
    
    // Filtrar solo los campos permitidos para view_item
    const filteredItem: EcommerceItem = {
      item_id: item.item_id || '',
      item_name: item.item_name || '',
      coupon: item.coupon || '',
      discount: item.discount || 0,
      index: item.index || 1,
      item_brand: item.item_brand || '',
      item_category: item.item_category || '',
      item_category2: item.item_category2 || '',
      item_category3: item.item_category3 || '',
      item_category4: item.item_category4 || '',
      item_category5: item.item_category5 || '',
      item_list_id: item.item_list_id || itemListId,
      item_list_name: item.item_list_name || itemListName,
      item_variant: item.item_variant || '',
      price: item.price || 0,
      quantity: item.quantity || 1,
      puntuacion: item.puntuacion || '',
      duracion: item.duracion || ''
    };
    
    // Estructura específica para view_item
    const eventData: ViewItemEventData = {
      event: 'view_item',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        item_list_id: itemListId,
        item_list_name: itemListName,
        items: [filteredItem]
      }
    };
    
    this.pushEvent(eventData);
    
    // También enviar evento Taboola view_content (migrado desde Tour.tsx)
    this.sendTaboolaEvent('view_content');
  }

  /**
   * Evento: add_to_wishlist
   * Se dispara cuando el usuario añade un artículo a favoritos
   */
  addToWishlist(
    itemListId: string | number,
    itemListName: string,
    item: EcommerceItem,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    // Convertir item_list_id a string según especificación
    const itemListIdString = typeof itemListId === 'number' 
      ? itemListId.toString()
      : itemListId;
    
    // Filtrar solo los campos permitidos para add_to_wishlist
    // Asegurar que puntuacion esté formateada correctamente
    const puntuacion = item.puntuacion 
      ? item.puntuacion 
      : this.formatRating((item as any).rating, '');
    
    const filteredItem: EcommerceItem = {
      item_id: item.item_id || '',
      item_name: item.item_name || '',
      coupon: item.coupon || '',
      discount: item.discount || 0,
      index: item.index || 0,
      item_brand: item.item_brand || '',
      item_category: item.item_category || '',
      item_category2: item.item_category2 || '',
      item_category3: item.item_category3 || '',
      item_category4: item.item_category4 || '',
      item_category5: item.item_category5 || '',
      item_list_id: item.item_list_id || itemListIdString,
      item_list_name: item.item_list_name || itemListName,
      item_variant: item.item_variant || '',
      price: item.price || 0,
      quantity: item.quantity || 1,
      puntuacion: puntuacion,
      duracion: item.duracion || ''
    };
    
    // Estructura específica para add_to_wishlist
    const eventData: AddToWishlistEventData = {
      event: 'add_to_wishlist',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        item_list_id: itemListIdString,
        item_list_name: itemListName,
        items: [filteredItem]
      }
    };
    
    this.pushEvent(eventData);
  }

  /**
   * Evento: add_to_cart
   * Se dispara cuando el usuario añade un tour al carrito con éxito
   */
  addToCart(
    currency: string,
    value: number,
    item: EcommerceItem,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    
    // Filtrar solo los campos permitidos para add_to_cart
    // Asegurar que puntuacion esté formateada correctamente
    const puntuacion = item.puntuacion 
      ? item.puntuacion 
      : this.formatRating((item as any).rating, '');
    
    const filteredItem: EcommerceItem = {
      item_id: item.item_id || '',
      item_name: item.item_name || '',
      coupon: item.coupon || '',
      discount: item.discount || 0,
      index: item.index || 0,
      item_brand: item.item_brand || '',
      item_category: item.item_category || '',
      item_category2: item.item_category2 || '',
      item_category3: item.item_category3 || '',
      item_category4: item.item_category4 || '',
      item_category5: item.item_category5 || '',
      item_list_id: item.item_list_id || '',
      item_list_name: item.item_list_name || '',
      item_variant: item.item_variant || '',
      price: item.price || 0,
      quantity: item.quantity || 1,
      puntuacion: puntuacion,
      duracion: item.duracion || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      pasajeros_adultos: item.pasajeros_adultos || '',
      pasajeros_niños: item.pasajeros_niños || ''
    };
    
    // Estructura específica para add_to_cart
    const eventData: AddToCartEventData = {
      event: 'add_to_cart',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: currency,
        value: value,
        items: [filteredItem]
      }
    };
    
    this.pushEvent(eventData);
  }

  /**
   * Evento: view_cart
   * Se dispara cuando el usuario visualiza el paso "Personaliza tu viaje"
   */
  viewCart(
    currency: string,
    value: number,
    item: EcommerceItem,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    
    // Filtrar solo los campos permitidos para view_cart
    // Asegurar que puntuacion esté formateada correctamente
    const puntuacion = item.puntuacion 
      ? item.puntuacion 
      : this.formatRating((item as any).rating, '');
    
    const filteredItem: EcommerceItem = {
      item_id: item.item_id || '',
      item_name: item.item_name || '',
      coupon: item.coupon || '',
      discount: item.discount || 0,
      index: item.index || 0,
      item_brand: item.item_brand || '',
      item_category: item.item_category || '',
      item_category2: item.item_category2 || '',
      item_category3: item.item_category3 || '',
      item_category4: item.item_category4 || '',
      item_category5: item.item_category5 || '',
      item_list_id: item.item_list_id || '',
      item_list_name: item.item_list_name || '',
      item_variant: item.item_variant || '',
      price: item.price || 0,
      quantity: item.quantity || 1,
      puntuacion: puntuacion,
      duracion: item.duracion || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      pasajeros_adultos: item.pasajeros_adultos || '',
      pasajeros_niños: item.pasajeros_niños || ''
    };
    
    // Estructura específica para view_cart
    const eventData: ViewCartEventData = {
      event: 'view_cart',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: currency,
        value: value,
        items: [filteredItem]
      }
    };
    
    this.pushEvent(eventData);
  }

  // ============================================
  // EVENTOS DEL FUNNEL DE CHECKOUT
  // ============================================

  /**
   * Evento: begin_checkout
   * Se dispara cuando el usuario inicia el proceso de compra (paso 1)
   */
  beginCheckout(
    ecommerceData: EcommerceData,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    
    // Filtrar items para incluir solo los campos permitidos
    const filteredItems: EcommerceItem[] = (ecommerceData.items || []).map(item => {
      // Asegurar que puntuacion esté formateada correctamente
      const puntuacion = item.puntuacion 
        ? item.puntuacion 
        : this.formatRating((item as any).rating, '');
      
      return {
        item_id: item.item_id || '',
        item_name: item.item_name || '',
        coupon: item.coupon || '',
        discount: item.discount || 0,
        index: item.index || 0,
        item_brand: item.item_brand || '',
        item_category: item.item_category || '',
        item_category2: item.item_category2 || '',
        item_category3: item.item_category3 || '',
        item_category4: item.item_category4 || '',
        item_category5: item.item_category5 || '',
        item_list_id: item.item_list_id || '',
        item_list_name: item.item_list_name || '',
        item_variant: item.item_variant || '',
        price: item.price || 0,
        quantity: item.quantity || 1,
        puntuacion: puntuacion,
        duracion: item.duracion || '',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        pasajeros_adultos: item.pasajeros_adultos || '',
        pasajeros_niños: item.pasajeros_niños || '',
        actividades: item.actividades || '',
        seguros: item.seguros || ''
      };
    });
    
    // Estructura específica para begin_checkout
    const eventData: BeginCheckoutEventData = {
      event: 'begin_checkout',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: ecommerceData.currency || 'EUR',
        value: ecommerceData.value || 0,
        coupon: ecommerceData.coupon || '',
        items: filteredItems
      }
    };
    
    this.pushEvent(eventData);
    
    // También enviar evento Taboola start_checkout (migrado desde CustomizeTrip.tsx)
    this.sendTaboolaEvent('start_checkout');
  }

  /**
   * Evento: view_flights_info
   * Se dispara cuando el usuario visualiza el paso de vuelos (paso 2)
   */
  viewFlightsInfo(
    ecommerceData: EcommerceData,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    
    // Filtrar items para incluir solo los campos permitidos
    const filteredItems: EcommerceItem[] = (ecommerceData.items || []).map(item => {
      // Asegurar que puntuacion esté formateada correctamente
      const puntuacion = item.puntuacion 
        ? item.puntuacion 
        : this.formatRating((item as any).rating, '');
      
      return {
        item_id: item.item_id || '',
        item_name: item.item_name || '',
        coupon: item.coupon || '',
        discount: item.discount || 0,
        index: item.index || 0,
        item_brand: item.item_brand || '',
        item_category: item.item_category || '',
        item_category2: item.item_category2 || '',
        item_category3: item.item_category3 || '',
        item_category4: item.item_category4 || '',
        item_category5: item.item_category5 || '',
        item_list_id: item.item_list_id || '',
        item_list_name: item.item_list_name || '',
        item_variant: item.item_variant || '',
        price: item.price || 0,
        quantity: item.quantity || 1,
        puntuacion: puntuacion,
        duracion: item.duracion || '',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        pasajeros_adultos: item.pasajeros_adultos || '',
        pasajeros_niños: item.pasajeros_niños || '',
        actividades: item.actividades || '',
        seguros: item.seguros || ''
      };
    });
    
    // Estructura específica para view_flights_info
    const eventData: ViewFlightsInfoEventData = {
      event: 'view_flights_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: ecommerceData.currency || 'EUR',
        value: ecommerceData.value || 0,
        coupon: ecommerceData.coupon || '',
        items: filteredItems
      }
    };
    
    this.pushEvent(eventData);
  }

  /**
   * Evento: add_flights_info
   * Se dispara cuando el usuario selecciona vuelos y continúa (paso 3)
   */
  addFlightsInfo(
    ecommerceData: EcommerceData,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    
    // Filtrar items para incluir solo los campos permitidos
    const filteredItems: EcommerceItem[] = (ecommerceData.items || []).map(item => {
      // Asegurar que puntuacion esté formateada correctamente
      const puntuacion = item.puntuacion 
        ? item.puntuacion 
        : this.formatRating((item as any).rating, '');
      
      return {
        item_id: item.item_id || '',
        item_name: item.item_name || '',
        coupon: item.coupon || '',
        discount: item.discount || 0,
        index: item.index || 0,
        item_brand: item.item_brand || '',
        item_category: item.item_category || '',
        item_category2: item.item_category2 || '',
        item_category3: item.item_category3 || '',
        item_category4: item.item_category4 || '',
        item_category5: item.item_category5 || '',
        item_list_id: item.item_list_id || '',
        item_list_name: item.item_list_name || '',
        item_variant: item.item_variant || '',
        price: item.price || 0,
        quantity: item.quantity || 1,
        puntuacion: puntuacion,
        duracion: item.duracion || '',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        pasajeros_adultos: item.pasajeros_adultos || '',
        pasajeros_niños: item.pasajeros_niños || '',
        actividades: item.actividades || '',
        seguros: item.seguros || '',
        vuelo: item.vuelo || ''
      };
    });
    
    // Estructura específica para add_flights_info
    const eventData: AddFlightsInfoEventData = {
      event: 'add_flights_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: ecommerceData.currency || 'EUR',
        value: ecommerceData.value || 0,
        coupon: ecommerceData.coupon || '',
        items: filteredItems
      }
    };
    
    this.pushEvent(eventData);
  }

  /**
   * Evento: view_personal_info
   * Se dispara cuando el usuario visualiza el paso de datos de pasajeros (paso 4)
   */
  viewPersonalInfo(
    ecommerceData: EcommerceData,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    
    // Filtrar items para incluir solo los campos permitidos
    const filteredItems: EcommerceItem[] = (ecommerceData.items || []).map(item => {
      // Asegurar que puntuacion esté formateada correctamente
      const puntuacion = item.puntuacion 
        ? item.puntuacion 
        : this.formatRating((item as any).rating, '');
      
      return {
        item_id: item.item_id || '',
        item_name: item.item_name || '',
        coupon: item.coupon || '',
        discount: item.discount || 0,
        index: item.index || 0,
        item_brand: item.item_brand || '',
        item_category: item.item_category || '',
        item_category2: item.item_category2 || '',
        item_category3: item.item_category3 || '',
        item_category4: item.item_category4 || '',
        item_category5: item.item_category5 || '',
        item_list_id: item.item_list_id || '',
        item_list_name: item.item_list_name || '',
        item_variant: item.item_variant || '',
        price: item.price || 0,
        quantity: item.quantity || 1,
        puntuacion: puntuacion,
        duracion: item.duracion || '',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        pasajeros_adultos: item.pasajeros_adultos || '',
        pasajeros_niños: item.pasajeros_niños || '',
        actividades: item.actividades || '',
        seguros: item.seguros || '',
        vuelo: item.vuelo || ''
      };
    });
    
    // Estructura específica para view_personal_info
    const eventData: ViewPersonalInfoEventData = {
      event: 'view_personal_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: ecommerceData.currency || 'EUR',
        value: ecommerceData.value || 0,
        coupon: ecommerceData.coupon || '',
        items: filteredItems
      }
    };
    
    this.pushEvent(eventData);
  }

  /**
   * Evento: add_personal_info
   * Se dispara cuando el usuario completa los datos de pasajeros (paso 5)
   */
  addPersonalInfo(
    ecommerceData: EcommerceData,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    
    // Filtrar items para incluir solo los campos permitidos
    const filteredItems: EcommerceItem[] = (ecommerceData.items || []).map(item => {
      // Asegurar que puntuacion esté formateada correctamente
      const puntuacion = item.puntuacion 
        ? item.puntuacion 
        : this.formatRating((item as any).rating, '');
      
      return {
        item_id: item.item_id || '',
        item_name: item.item_name || '',
        coupon: item.coupon || '',
        discount: item.discount || 0,
        index: item.index || 0,
        item_brand: item.item_brand || '',
        item_category: item.item_category || '',
        item_category2: item.item_category2 || '',
        item_category3: item.item_category3 || '',
        item_category4: item.item_category4 || '',
        item_category5: item.item_category5 || '',
        item_list_id: item.item_list_id || '',
        item_list_name: item.item_list_name || '',
        item_variant: item.item_variant || '',
        price: item.price || 0,
        quantity: item.quantity || 1,
        puntuacion: puntuacion,
        duracion: item.duracion || '',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        pasajeros_adultos: item.pasajeros_adultos || '',
        pasajeros_niños: item.pasajeros_niños || '',
        actividades: item.actividades || '',
        seguros: item.seguros || '',
        vuelo: item.vuelo || ''
      };
    });
    
    // Estructura específica para add_personal_info
    const eventData: AddPersonalInfoEventData = {
      event: 'add_personal_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: ecommerceData.currency || 'EUR',
        value: ecommerceData.value || 0,
        coupon: ecommerceData.coupon || '',
        items: filteredItems
      }
    };
    
    this.pushEvent(eventData);
  }

  /**
   * Evento: view_payment_info
   * Se dispara cuando el usuario visualiza el paso de pago (paso 6)
   */
  viewPaymentInfo(
    ecommerceData: EcommerceData,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    
    // Filtrar items para incluir solo los campos permitidos
    const filteredItems: EcommerceItem[] = (ecommerceData.items || []).map(item => {
      // Asegurar que puntuacion esté formateada correctamente
      const puntuacion = item.puntuacion 
        ? item.puntuacion 
        : this.formatRating((item as any).rating, '');
      
      return {
        item_id: item.item_id || '',
        item_name: item.item_name || '',
        coupon: item.coupon || '',
        discount: item.discount || 0,
        index: item.index || 0,
        item_brand: item.item_brand || '',
        item_category: item.item_category || '',
        item_category2: item.item_category2 || '',
        item_category3: item.item_category3 || '',
        item_category4: item.item_category4 || '',
        item_category5: item.item_category5 || '',
        item_list_id: item.item_list_id || '',
        item_list_name: item.item_list_name || '',
        item_variant: item.item_variant || '',
        price: item.price || 0,
        quantity: item.quantity || 1,
        puntuacion: puntuacion,
        duracion: item.duracion || '',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        pasajeros_adultos: item.pasajeros_adultos || '',
        pasajeros_niños: item.pasajeros_niños || '',
        actividades: item.actividades || '',
        seguros: item.seguros || '',
        vuelo: item.vuelo || ''
      };
    });
    
    // Estructura específica para view_payment_info
    const eventData: ViewPaymentInfoEventData = {
      event: 'view_payment_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: ecommerceData.currency || 'EUR',
        value: ecommerceData.value || 0,
        coupon: ecommerceData.coupon || '',
        items: filteredItems
      }
    };
    
    this.pushEvent(eventData);
    
    // También enviar eventos adicionales de Pay.tsx cuando se visualiza el paso de pago
    this.sendViewPaymentInfoToLegacyPlatforms();
  }

  /**
   * Envía eventos adicionales cuando se visualiza el paso de pago (migrado desde Pay.tsx)
   */
  private sendViewPaymentInfoToLegacyPlatforms(): void {
    try {
      // 1. Google Analytics Universal - evento booking/checkout/Booked (tal cual Pay.tsx)
      const ga = (window as any).ga;
      if (typeof ga === 'function') {
        ga('send', {
          hitType: 'event',
          eventCategory: 'booking',
          eventAction: 'checkout',
          eventLabel: 'Booked'
        });
      }

      // 2. Taboola Pixel - evento add_payment_info (tal cual Pay.tsx)
      this.sendTaboolaEvent('add_payment_info');
    } catch (error) {
    }
  }

  /**
   * Envía evento Booked_Blocked cuando la reserva está bloqueada (migrado desde BookingForm.tsx - BookingRequest)
   * Se dispara cuando la reserva está en estado PENDING (pendiente de confirmación)
   */
  sendBookedBlockedEvent(): void {
    try {
      const ga = (window as any).ga;
      if (typeof ga === 'function') {
        ga('send', {
          hitType: 'event',
          eventCategory: 'booking',
          eventAction: 'checkout',
          eventLabel: 'Booked_Blocked'
        });
      }
    } catch (error) {
    }
  }

  /**
   * Evento: add_payment_info
   * Se dispara cuando el usuario selecciona método de pago y realiza el pago (paso 7)
   */
  addPaymentInfo(
    ecommerceData: EcommerceData,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    
    // Filtrar items para incluir solo los campos permitidos
    const filteredItems: EcommerceItem[] = (ecommerceData.items || []).map(item => {
      // Asegurar que puntuacion esté formateada correctamente
      const puntuacion = item.puntuacion 
        ? item.puntuacion 
        : this.formatRating((item as any).rating, '');
      
      return {
        item_id: item.item_id || '',
        item_name: item.item_name || '',
        coupon: item.coupon || '',
        discount: item.discount || 0,
        index: item.index || 0,
        item_brand: item.item_brand || '',
        item_category: item.item_category || '',
        item_category2: item.item_category2 || '',
        item_category3: item.item_category3 || '',
        item_category4: item.item_category4 || '',
        item_category5: item.item_category5 || '',
        item_list_id: item.item_list_id || '',
        item_list_name: item.item_list_name || '',
        item_variant: item.item_variant || '',
        price: item.price || 0,
        quantity: item.quantity || 1,
        puntuacion: puntuacion,
        duracion: item.duracion || '',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        pasajeros_adultos: item.pasajeros_adultos || '',
        pasajeros_niños: item.pasajeros_niños || '',
        actividades: item.actividades || '',
        seguros: item.seguros || '',
        vuelo: item.vuelo || ''
      };
    });
    
    // Estructura específica para add_payment_info
    const eventData: AddPaymentInfoEventData = {
      event: 'add_payment_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: ecommerceData.currency || 'EUR',
        value: ecommerceData.value || 0,
        coupon: ecommerceData.coupon || '',
        payment_type: ecommerceData.payment_type || '',
        items: filteredItems
      }
    };
    
    this.pushEvent(eventData);
  }

  /**
   * Evento: purchase
   * Se dispara cuando el usuario completa una compra exitosamente
   */
  purchase(
    ecommerceData: EcommerceData,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    
    // Filtrar items para incluir solo los campos permitidos
    const filteredItems: EcommerceItem[] = (ecommerceData.items || []).map(item => {
      // Asegurar que puntuacion esté formateada correctamente
      const puntuacion = item.puntuacion 
        ? item.puntuacion 
        : this.formatRating((item as any).rating, '');
      
      return {
        item_id: item.item_id || '',
        item_name: item.item_name || '',
        coupon: item.coupon || '',
        discount: item.discount || 0,
        index: item.index || 0,
        item_brand: item.item_brand || '',
        item_category: item.item_category || '',
        item_category2: item.item_category2 || '',
        item_category3: item.item_category3 || '',
        item_category4: item.item_category4 || '',
        item_category5: item.item_category5 || '',
        item_list_id: item.item_list_id || '',
        item_list_name: item.item_list_name || '',
        item_variant: item.item_variant || '',
        price: item.price || 0,
        quantity: item.quantity || 1,
        puntuacion: puntuacion,
        duracion: item.duracion || '',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        pasajeros_adultos: item.pasajeros_adultos || '',
        pasajeros_niños: item.pasajeros_niños || '',
        actividades: item.actividades || '',
        seguros: item.seguros || '',
        vuelo: item.vuelo || ''
      };
    });
    
    // Estructura específica para purchase
    const eventData: PurchaseEventData = {
      event: 'purchase',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: ecommerceData.currency || 'EUR',
        value: ecommerceData.value || 0,
        coupon: ecommerceData.coupon || '',
        payment_type: ecommerceData.payment_type || '',
        transaction_id: ecommerceData.transaction_id || '',
        tax: ecommerceData.tax || 0,
        shipping: ecommerceData.shipping || 0,
        items: filteredItems
      }
    };
    
    this.pushEvent(eventData);
    
    // También enviar a otras plataformas de seguimiento
    // Los datos ya están disponibles en ecommerceData y filteredItems
    this.sendPurchaseToLegacyPlatforms(ecommerceData, filteredItems);
  }

  /**
   * Envía eventos purchase a todas las plataformas de seguimiento (GA Universal, gtag, Taboola, Meta)
   * Este método complementa el evento purchase de GA4 que se envía al dataLayer
   */
  private sendPurchaseToLegacyPlatforms(
    ecommerceData: EcommerceData,
    items: EcommerceItem[]
  ): void {
    if (!items || items.length === 0) {
      return;
    }

    const transactionId = ecommerceData.transaction_id || '';
    const totalValue = ecommerceData.value || 0;
    const tax = ecommerceData.tax || 0;
    const shipping = ecommerceData.shipping || 0;
    const currency = ecommerceData.currency || 'EUR';
    
    // Obtener el primer item (normalmente hay solo uno en una reserva)
    const item = items[0];
    const itemId = item.item_id || '';
    const itemName = item.item_name || '';
    const itemCategory = item.item_category || '';
    const itemPrice = item.price || totalValue;

    // 1. Google Analytics Universal (ga) - ecommerce:addTransaction y ecommerce:addItem
    this.sendPurchaseToGAUniversal(transactionId, totalValue, tax, shipping, itemId, itemName, itemPrice);

    // 2. Google Tag (gtag) - evento purchase y evento conversion
    this.sendPurchaseToGtag(transactionId, totalValue, tax, shipping, currency, itemId, itemName, itemCategory, itemPrice);

    // 3. Taboola Pixel (_tfa) - evento make_purchase
    this.sendPurchaseToTaboola(totalValue, currency);
  }

  /**
   * Envía evento purchase a Google Analytics Universal (ga)
   */
  private sendPurchaseToGAUniversal(
    transactionId: string,
    revenue: number,
    tax: number,
    shipping: number,
    itemId: string,
    itemName: string,
    itemPrice: number
  ): void {
    try {
      const ga = (window as any).ga;
      if (typeof ga === 'function') {
        // Enviar transacción
        ga('ecommerce:addTransaction', {
          'id': transactionId,
          'affiliation': 'Different Roads',
          'revenue': revenue.toString(),
          'shipping': shipping.toString(),
          'tax': tax.toString()
        });

        // Enviar item
        ga('ecommerce:addItem', {
          'id': transactionId,
          'name': itemName,
          'sku': itemId,
          'category': '',
          'price': itemPrice.toString(),
          'quantity': '1'
        });

        // Enviar evento
        ga('ecommerce:send');
      }
    } catch (error) {
    }
  }

  /**
   * Envía evento purchase a Google Tag (gtag)
   * Migrado exactamente desde PaymentConfirmation.tsx
   */
  private sendPurchaseToGtag(
    transactionId: string,
    value: number,
    tax: number,
    shipping: number,
    currency: string,
    itemId: string,
    itemName: string,
    itemCategory: string,
    itemPrice: number
  ): void {
    try {
      const gtag = (window as any).gtag;
      if (typeof gtag === 'function') {
        // Evento purchase - exactamente como en PaymentConfirmation.tsx
        gtag('event', 'purchase', {
          'transaction_id': transactionId,
          'affiliation': 'Google online store', // Tal cual está en el original
          'value': value,
          'currency': currency,
          'tax': 0.00, // Enviar tax como 0.00
          'shipping': 0.00, // Enviar shipping como 0.00
          'items': [
            {
              'id': itemId,
              'name': itemName,
              'brand': 'Different Roads',
              'category': itemCategory,
              'quantity': 1,
              'price': itemPrice
            }
          ]
        });

        // Evento conversion para Google Ads - transaction_id vacío tal cual está en el original
        gtag('event', 'conversion', {
          'send_to': 'AW-969524948/h16rCKGA1pIDENSNp84D',
          'transaction_id': '' // Tal cual está en el original
        });
      }
    } catch (error) {
    }
  }

  /**
   * Envía evento purchase a Taboola Pixel
   */
  private sendPurchaseToTaboola(
    revenue: number,
    currency: string
  ): void {
    this.sendTaboolaEvent('make_purchase', {
      revenue: revenue.toString(),
      currency: currency
    });
  }

  /**
   * Método genérico para enviar eventos a Taboola Pixel
   * Migrado desde varios componentes del proyecto React
   */
  private sendTaboolaEvent(eventName: string, additionalData?: { revenue?: string; currency?: string }): void {
    try {
      const _tfa = (window as any)._tfa;
      if (Array.isArray(_tfa)) {
        const eventData: { notify: string; name: string; id: number; revenue?: string; currency?: string } = {
          notify: 'event',
          name: eventName,
          id: 1878210
        };
        
        // Agregar datos adicionales si existen (para make_purchase)
        if (additionalData?.revenue) {
          eventData.revenue = additionalData.revenue;
        }
        if (additionalData?.currency) {
          eventData.currency = additionalData.currency;
        }
        
        _tfa.push(eventData);
      }
    } catch (error) {
    }
  }

  /**
   * Método centralizado para disparar evento purchase desde una reservación
   * Obtiene todos los datos dinámicamente y construye el evento completo
   */
  trackPurchaseFromReservation(
    reservationId: number,
    tourId: number,
    paymentData: {
      transactionId: string;
      paymentType: string;
      totalValue: number;
      tax?: number;
      shipping?: number;
      coupon?: string;
    },
    itemListId?: string,
    itemListName?: string
  ): void {
    // Obtener item_list_id y item_list_name desde sessionStorage si no se proporcionan
    const finalItemListId = itemListId || sessionStorage.getItem('checkout_itemListId') || '';
    const finalItemListName = itemListName || sessionStorage.getItem('checkout_itemListName') || '';
    const storedInsurance = sessionStorage.getItem('checkout_selectedInsurance') || '';

    // Obtener todos los datos completos del tour dinámicamente
    forkJoin({
      tourData: this.getCompleteTourDataForEcommerce(tourId),
      activitiesText: this.getActivitiesFromTravelers(reservationId),
      passengersCount: this.getPassengersCount(reservationId),
      reservation: this.reservationService.getById(reservationId),
      summary: this.reservationService.getSummary(reservationId).pipe(catchError(() => of(null)))
    }).pipe(
      switchMap(({ tourData, activitiesText, passengersCount, reservation, summary }) => {
        const reservationData = reservation as any;
        const departureId = reservationData.departureId;
        
        // Obtener departure para las fechas
        const departureRequest = departureId 
          ? this.departureService.getById(departureId).pipe(
              catchError(() => of(null))
            )
          : of(null);
        
        // Obtener vuelo seleccionado desde ReservationFlightService (igual que en checkout)
        const flightRequest = this.reservationFlightService.getSelectedFlightPack(reservationId).pipe(
          catchError(() => of(null))
        );
        
        return forkJoin({
          departure: departureRequest,
          flightPack: flightRequest
        }).pipe(
          switchMap(({ departure, flightPack }) => {
            // Obtener vuelo desde el flight pack seleccionado (igual que en checkout: selectedFlight?.name)
            let flightCity = 'Sin vuelo';
            if (flightPack) {
              // flightPack puede ser un objeto o un array
              const pack = Array.isArray(flightPack) ? flightPack[0] : flightPack;
              if (pack?.name) {
                flightCity = pack.name;
              }
            }
            
            // Actualizar con datos adicionales del contexto
            // Asignar flightCity
            tourData.flightCity = flightCity || tourData.flightCity || 'Sin vuelo';
            // Asignar actividades (usar las obtenidas dinámicamente)
            const summaryActivities = this.extractActivitiesFromSummary(summary);
            const summaryInsurance = this.extractInsuranceFromSummary(summary, reservationData, storedInsurance);

            tourData.activitiesText = activitiesText || summaryActivities || tourData.activitiesText || '';
            // Asignar seguro desde reservationData.insurance o summary
            tourData.selectedInsurance = reservationData.insurance?.name || summaryInsurance || storedInsurance || tourData.selectedInsurance || '';
            // Asignar pasajeros
            tourData.totalPassengers = parseInt(passengersCount.adults) + parseInt(passengersCount.children);
            tourData.childrenCount = passengersCount.children;
            // Obtener fechas del departure (departureDate y arrivalDate)
            tourData.departureDate = departure?.departureDate || reservationData.departureDate || tourData.departureDate || '';
            tourData.returnDate = departure?.arrivalDate || reservationData.returnDate || tourData.returnDate || '';
            tourData.price = paymentData.totalValue;
        
            // Usar el ID del tour desde tourData
            const itemId = tourData.tkId?.toString() || tourData.id?.toString() || '';
            
            return this.buildEcommerceItemFromTourData(
              tourData,
              finalItemListId,
              finalItemListName,
              itemId
            ).pipe(
              switchMap((item) => {
                return this.getCurrentUserData().pipe(
                  map((userData) => ({ item, userData }))
                );
              })
            );
          })
        );
      }),
      catchError((error) => {
        // Fallback: obtener datos básicos de la reserva
        return forkJoin({
          reservation: this.reservationService.getById(reservationId),
          summary: this.reservationService.getSummary(reservationId).pipe(catchError(() => of(null)))
        }).pipe(
          switchMap(({ reservation, summary }) => {
            const reservationData = reservation as any;
            const tourData = reservationData.tour || {};
            const departureId = reservationData.departureId;
            
            // Intentar obtener departure para las fechas
            const departureRequest = departureId 
              ? this.departureService.getById(departureId).pipe(
                  catchError(() => of(null))
                )
              : of(null);
            
            // Obtener vuelo seleccionado desde ReservationFlightService (igual que en checkout)
            const flightRequest = this.reservationFlightService.getSelectedFlightPack(reservationId).pipe(
              catchError(() => of(null))
            );
            
            return forkJoin({
              departure: departureRequest,
              flightPack: flightRequest
            }).pipe(
              switchMap(({ departure, flightPack }) => {
                // Obtener vuelo desde el flight pack seleccionado (igual que en checkout: selectedFlight?.name)
                let flightCity = 'Sin vuelo';
                if (flightPack) {
                  const pack = Array.isArray(flightPack) ? flightPack[0] : flightPack;
                  if (pack?.name) {
                    flightCity = pack.name;
                  }
                }
                
                          const summaryActivities = this.extractActivitiesFromSummary(summary);
                          const summaryInsurance = this.extractInsuranceFromSummary(summary, reservationData, storedInsurance);

                          const tourDataForEcommerce: TourDataForEcommerce = {
                  id: tourData.id,
                  tkId: tourData.tkId ?? undefined,
                  name: reservationData.tourName || tourData.name || undefined,
                  destination: {
                    continent: tourData.destination?.continent || undefined,
                    country: tourData.destination?.country || undefined
                  },
                  days: tourData.days || undefined,
                  nights: tourData.nights || undefined,
                  rating: tourData.rating || undefined,
                  monthTags: tourData.monthTags || undefined,
                  tourType: tourData.tourType || undefined,
                  flightCity: flightCity,
                            activitiesText: summaryActivities || (reservationData.activities && reservationData.activities.length > 0
                              ? reservationData.activities.map((a: any) => a.description || a.name).join(', ')
                              : ''),
                            selectedInsurance: reservationData.insurance?.name || summaryInsurance || storedInsurance || '',
                  childrenCount: '0',
                  totalPassengers: reservation.totalPassengers || undefined,
                  departureDate: departure?.departureDate || reservationData.departureDate || '',
                  returnDate: departure?.arrivalDate || reservationData.returnDate || '',
                  price: paymentData.totalValue
                };

                const itemId = tourDataForEcommerce.tkId?.toString() || tourDataForEcommerce.id?.toString() || '';
                return this.buildEcommerceItemFromTourData(
                  tourDataForEcommerce,
                  finalItemListId,
                  finalItemListName,
                  itemId
                ).pipe(
                  map((item) => ({ item, userData: this.getUserData('', undefined, '') }))
                );
              })
            );
          })
        );
      })
    ).subscribe({
      next: ({ item, userData }) => {
        this.purchase(
          {
            transaction_id: paymentData.transactionId,
            value: paymentData.totalValue,
            tax: 0.00, // Enviar tax como 0.00
            shipping: 0.00, // Enviar shipping como 0.00
            currency: 'EUR',
            coupon: paymentData.coupon || '',
            payment_type: paymentData.paymentType,
            items: [item]
          },
          userData
        );
      },
      error: (error) => {
      }
    });
  }

  /**
   * Obtiene datos completos del tour para analytics (rating, continent, country, monthTags, days, nights, tourType)
   */
  private getCompleteTourDataForEcommerce(tourId: number): Observable<TourDataForEcommerce> {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      concatMap((itineraries) => {
        if (itineraries.length === 0) {
          return forkJoin({
            tour: this.tourService.getById(tourId, false),
            rating: this.reviewsService.getAverageRating({ tourId: tourId }).pipe(
              map((ratingResponse) => {
                const avgRating = ratingResponse?.averageRating;
                return avgRating && avgRating > 0 ? avgRating : null;
              }),
              catchError(() => of(null))
            )
          }).pipe(
            map(({ tour, rating }) => ({
              id: tourId,
              tkId: tour.tkId ?? undefined,
              name: tour.name ?? undefined,
              destination: { continent: undefined, country: undefined },
              days: undefined,
              nights: undefined,
              rating: rating !== null ? rating : undefined,
              monthTags: undefined,
              tourType: tour.tripTypeId === 1 ? 'FIT' : 'Grupos',
              price: tour.minPrice ?? undefined
            } as TourDataForEcommerce))
          );
        }

        // Obtener días de itinerario del primer itinerario disponible
        const itineraryDaysRequest = this.itineraryDayService
          .getAll({ itineraryId: itineraries[0].id })
          .pipe(catchError(() => of([] as IItineraryDayResponse[])));

        // Obtener continent y country
        const locationRequest = forkJoin({
          countryLocations: this.tourLocationService.getByTourAndType(tourId, 'COUNTRY').pipe(
            map((response) => Array.isArray(response) ? response : response ? [response] : []),
            catchError(() => of([] as ITourLocationResponse[]))
          ),
          continentLocations: this.tourLocationService.getByTourAndType(tourId, 'CONTINENT').pipe(
            map((response) => Array.isArray(response) ? response : response ? [response] : []),
            catchError(() => of([] as ITourLocationResponse[]))
          )
        }).pipe(
          switchMap(({ countryLocations, continentLocations }) => {
            const locationIds = [
              ...countryLocations.map(tl => tl.locationId),
              ...continentLocations.map(tl => tl.locationId)
            ].filter(id => id !== undefined && id !== null);
            
            if (locationIds.length === 0) {
              return of({ continent: '', country: '' });
            }
            
            return this.locationNetService.getLocationsByIds(locationIds).pipe(
              map((locations: Location[]) => {
                const countries = countryLocations
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map(tl => locations.find(l => l.id === tl.locationId)?.name)
                  .filter(name => name) as string[];
                
                const continents = continentLocations
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map(tl => locations.find(l => l.id === tl.locationId)?.name)
                  .filter(name => name) as string[];
                
                return {
                  continent: continents.join(', ') || '',
                  country: countries.join(', ') || ''
                };
              }),
              catchError(() => of({ continent: '', country: '' }))
            );
          })
        );

        return forkJoin({
          itineraryDays: itineraryDaysRequest,
          locationData: locationRequest,
          monthTags: this.tourService
            .getDepartureMonths(tourId, true)
            .pipe(catchError(() => of([] as number[]))),
          tour: this.tourService.getById(tourId, false),
          rating: this.reviewsService.getAverageRating({ tourId: tourId }).pipe(
            map((ratingResponse) => {
              const avgRating = ratingResponse?.averageRating;
              return avgRating && avgRating > 0 ? avgRating : null;
            }),
            catchError(() => of(null))
          )
        }).pipe(
          map(({ itineraryDays, locationData, monthTags, tour, rating }) => {
            const days = itineraryDays.length;
            const nights = days > 0 ? days - 1 : 0;
            const tourType = tour.tripTypeId === 1 ? 'FIT' : 'Grupos';

            const availableMonths: string[] = Array.isArray(monthTags)
              ? this.tourService.mapDepartureMonthNumbersToNames(
                  monthTags as number[]
                )
              : [];

            return {
              id: tourId,
              tkId: tour.tkId ?? undefined,
              name: tour.name ?? undefined,
              destination: {
                continent: locationData.continent || undefined,
                country: locationData.country || undefined
              },
              days: days > 0 ? days : undefined,
              nights: nights > 0 ? nights : undefined,
              rating: rating !== null ? rating : undefined,
              monthTags: availableMonths.length > 0 ? availableMonths : undefined,
              tourType: tourType,
              flightCity: '',
              price: tour.minPrice ?? undefined
            } as TourDataForEcommerce;
          }),
          catchError(() => of({
            id: tourId,
            days: undefined,
            nights: undefined,
            destination: { continent: undefined, country: undefined },
            monthTags: undefined,
            tourType: undefined
          } as TourDataForEcommerce))
        );
      }),
      catchError(() => of({
        id: tourId,
        days: undefined,
        nights: undefined,
        destination: { continent: undefined, country: undefined },
        monthTags: undefined,
        tourType: undefined
      } as TourDataForEcommerce))
    );
  }

  /**
   * Obtiene las actividades asignadas desde los viajeros de la reservación
   */
  private getActivitiesFromTravelers(reservationId: number): Observable<string> {
    return this.reservationService.getById(reservationId).pipe(
      switchMap((reservation) => {
        const reservationData = reservation as any;
        const itineraryId = reservationData.itineraryId;
        const departureId = reservationData.departureId || undefined;

        if (!itineraryId) {
          if (reservationData.activities && Array.isArray(reservationData.activities)) {
            const activityNames = reservationData.activities
              .map((activity: any) => activity?.description || activity?.name)
              .filter((name: string | undefined) => !!name && name.trim().length > 0);

            if (activityNames.length > 0) {
              return of(activityNames.join(', '));
            }
          }

          return of('');
        }

        // Obtener todos los viajeros de la reservación
        return this.reservationTravelerService.getByReservation(reservationId).pipe(
          switchMap((travelers) => {
            if (!travelers || travelers.length === 0) {
              return of('');
            }

            // Obtener todas las actividades asignadas (individuales y packs) de todos los viajeros
            const activityRequests = travelers.map(traveler =>
              forkJoin({
                activities: this.reservationTravelerActivityService.getByReservationTraveler(traveler.id).pipe(
                  catchError(() => of([]))
                ),
                activityPacks: this.reservationTravelerActivityPackService.getByReservationTraveler(traveler.id).pipe(
                  catchError(() => of([]))
                )
              })
            );

            return forkJoin(activityRequests).pipe(
              switchMap((results) => {
                // Recopilar todos los IDs únicos de actividades y packs
                const activityIds = new Set<number>();
                const packIds = new Set<number>();

                results.forEach(result => {
                  result.activities.forEach((activity: any) => {
                    if (activity.activityId) {
                      activityIds.add(activity.activityId);
                    }
                  });
                  result.activityPacks.forEach((pack: any) => {
                    if (pack.activityPackId) {
                      packIds.add(pack.activityPackId);
                    }
                  });
                });

                if (activityIds.size === 0 && packIds.size === 0) {
                  if (reservationData.activities && Array.isArray(reservationData.activities)) {
                    const activityNames = reservationData.activities
                      .map((activity: any) => activity?.description || activity?.name)
                      .filter((name: string | undefined) => !!name && name.trim().length > 0);

                    if (activityNames.length > 0) {
                      return of(activityNames.join(', '));
                    }
                  }

                  return of('');
                }

                // Obtener todas las actividades disponibles del itinerario
                return this.activityService.getForItineraryWithPacks(
                  itineraryId,
                  departureId,
                  undefined,
                  true, // isVisibleOnWeb
                  true  // onlyOpt
                ).pipe(
                  map((allActivities: IActivityResponse[]) => {
                    // Filtrar actividades asignadas
                    const assignedActivities = allActivities.filter(activity => {
                      if (activity.type === 'act') {
                        return activityIds.has(activity.id);
                      } else if (activity.type === 'pack') {
                        return packIds.has(activity.id);
                      }
                      return false;
                    });

                    // Formatear nombres de actividades
                    const activityNames = assignedActivities
                      .map(activity => activity.name)
                      .filter(name => name && name.trim().length > 0);

                    return activityNames.join(', ');
                  }),
                  catchError(() => of(''))
                );
              })
            );
          }),
          catchError(() => of(''))
        );
      }),
      catchError(() => of(''))
    );
  }

  /**
   * Obtiene el conteo de pasajeros adultos y niños desde los viajeros y age groups
   */
  private getPassengersCount(reservationId: number): Observable<{ adults: string; children: string }> {
    return forkJoin({
      travelers: this.reservationTravelerService.getByReservation(reservationId),
      ageGroups: this.ageGroupService.getAll()
    }).pipe(
      map(({ travelers, ageGroups }) => {
        let adultsCount = 0;
        let childrenCount = 0;

        travelers.forEach(traveler => {
          const ageGroup = ageGroups.find((group: any) => group.id === traveler.ageGroupId);
          if (ageGroup) {
            // Si upperLimitAge es null o undefined, es adulto
            // Si upperLimitAge <= 15, es niño
            // Si upperLimitAge > 15, es adulto
            if (ageGroup.upperLimitAge === null || ageGroup.upperLimitAge === undefined) {
              adultsCount++;
            } else if (ageGroup.upperLimitAge <= 15) {
              childrenCount++;
            } else {
              adultsCount++;
            }
          } else {
            // Si no se encuentra el grupo de edad, asumir adulto
            adultsCount++;
          }
        });

        return {
          adults: adultsCount.toString(),
          children: childrenCount.toString()
        };
      }),
      catchError(() => of({ adults: '0', children: '0' }))
    );
  }

  /**
   * Extrae las actividades desde el summary de la reservación
   * Método público para uso en componentes
   */
  extractActivitiesFromSummary(summary: IReservationSummaryResponse | null): string {
    if (!summary || !summary.items || summary.items.length === 0) {
      return '';
    }

    const activityDescriptions = summary.items
      .filter((item) => this.isActivitySummaryItem(item))
      .map((item) => item.description?.trim())
      .filter((description): description is string => !!description && description.length > 0);

    return activityDescriptions.join(', ');
  }

  /**
   * Extrae el seguro desde el summary de la reservación
   * Método público para uso en componentes
   */
  extractInsuranceFromSummary(
    summary: IReservationSummaryResponse | null,
    reservationData?: any,
    storedInsurance?: string
  ): string {
    if (!summary || !summary.items || summary.items.length === 0) {
      return reservationData?.insurance?.name || storedInsurance || '';
    }

    const insuranceDescriptions = summary.items
      .filter((item) => this.isInsuranceSummaryItem(item))
      .map((item) => item.description?.trim())
      .filter((description): description is string => !!description && description.length > 0);

    if (insuranceDescriptions.length > 0) {
      return insuranceDescriptions.join(', ');
    }

    return reservationData?.insurance?.name || storedInsurance || '';
  }

  private isActivitySummaryItem(item: ReservationSummaryItem): boolean {
    const type = item.itemType?.toLowerCase() || '';
    const description = item.description?.toLowerCase() || '';

    return (
      type.includes('activity') ||
      type.includes('actividad') ||
      description.includes('actividad') ||
      description.includes('excursión')
    );
  }

  private isInsuranceSummaryItem(item: ReservationSummaryItem): boolean {
    const type = item.itemType?.toLowerCase() || '';
    const description = item.description?.toLowerCase() || '';

    return (
      type.includes('insurance') ||
      type.includes('seguro') ||
      description.includes('seguro')
    );
  }

  /**
   * Extrae el vuelo desde el summary de la reservación
   * Método público para uso en componentes
   */
  extractFlightFromSummary(
    summary: IReservationSummaryResponse | null,
    reservationData?: any,
    selectedFlight?: any
  ): string {
    if (!summary || !summary.items || summary.items.length === 0) {
      return selectedFlight?.name || reservationData?.flight?.name || 'Sin vuelo';
    }

    const flightDescriptions = summary.items
      .filter((item) => this.isFlightSummaryItem(item))
      .map((item) => item.description?.trim())
      .filter((description): description is string => !!description && description.length > 0);

    if (flightDescriptions.length > 0) {
      return flightDescriptions.join(', ');
    }

    return selectedFlight?.name || reservationData?.flight?.name || 'Sin vuelo';
  }

  private isFlightSummaryItem(item: ReservationSummaryItem): boolean {
    const type = item.itemType?.toLowerCase() || '';
    const description = item.description?.toLowerCase() || '';

    return (
      type.includes('flight') ||
      type.includes('vuelo') ||
      description.includes('vuelo') ||
      description.includes('flight')
    );
  }

  // ============================================
  // EVENTOS DE USUARIO
  // ============================================

  /**
   * Evento: sign_up
   * Se dispara cuando el usuario se registra en la plataforma
   */
  signUp(method: string, userData?: UserData): void {
    this.pushEvent({
      event: 'sign_up',
      method: method,
      user_data: userData || {}
    });
  }

  /**
   * Evento: login
   * Se dispara cuando el usuario inicia sesión
   */
  login(method: string, userData?: UserData): void {
    this.pushEvent({
      event: 'login',
      method: method,
      user_data: userData || {}
    });
  }

  // ============================================
  // EVENTOS DE INTERACCIÓN
  // ============================================

  /**
   * Evento: menu_interaction
   * Se dispara cuando el usuario hace clic en el menú del header
   */
  menuInteraction(clickElement: string, userData?: UserData): void {
    this.pushEvent({
      event: 'menu_interaction',
      clic_element: clickElement,
      user_data: userData || {}
    });
  }

  /**
   * Evento: footer_interaction
   * Se dispara cuando el usuario hace clic en el footer
   */
  footerInteraction(clickElement: string, userData?: UserData): void {
    this.pushEvent({
      event: 'footer_interaction',
      clic_element: clickElement,
      user_data: userData || {}
    });
  }

  /**
   * Evento: trip_type
   * Se dispara cuando el usuario selecciona una tipología de viaje
   */
  tripType(clickElement: string, userData?: UserData): void {
    this.pushEvent({
      event: 'trip_type',
      clic_element: clickElement,
      user_data: userData || {}
    });
  }

  /**
   * Evento: click_contact
   * Se dispara cuando el usuario hace clic en elementos de contacto
   * Se mide mediante Click Classes (tel:, mailto:)
   */
  clickContact(contactType: string, contactValue: string, userData?: UserData): void {
    this.pushEvent({
      event: 'click_contact',
      contact_type: contactType,
      contact_value: contactValue,
      user_data: userData || {}
    });
  }

  /**
   * Evento: click_logo
   * Se dispara cuando el usuario hace clic en el logo
   * Se mide mediante Click ID (logo_header)
   */
  clickLogo(userData?: UserData): void {
    this.pushEvent({
      event: 'click_logo',
      user_data: userData || {}
    });
  }

  // ============================================
  // EVENTOS DE FORMULARIOS
  // ============================================

  /**
   * Evento: generated_lead
   * Se dispara cuando el usuario se suscribe a newsletter o completa formulario de contacto
   */
  generatedLead(formName: string, userData?: UserData): void {
    this.pushEvent({
      event: 'generated_lead',
      form_name: formName,
      user_data: userData || {}
    });
  }

  // ============================================
  // EVENTOS DE BÚSQUEDA Y FILTROS
  // ============================================

  /**
   * Evento: search
   * Se dispara cuando el usuario utiliza el buscador
   */
  search(searchParams: SearchParams, userData?: UserData): void {
    this.pushEvent({
      event: 'search',
      search_term: searchParams.search_term,
      start_date: searchParams.start_date,
      end_date: searchParams.end_date,
      trip_type: searchParams.trip_type,
      user_data: userData || {}
    });
  }

  /**
   * Evento: filter
   * Se dispara cuando el usuario utiliza los filtros en listados
   */
  filter(filterParams: FilterParams, userData?: UserData): void {
    this.pushEvent({
      event: 'filter',
      filter_categoria: filterParams.filter_categoria,
      filter_temporada: filterParams.filter_temporada,
      filter_mes: filterParams.filter_mes,
      filter_precio: filterParams.filter_precio,
      user_data: userData || {}
    });
  }

  /**
   * Evento: filter_order
   * Se dispara cuando el usuario cambia el orden de resultados
   */
  filterOrder(clickElement: string, userData?: UserData): void {
    this.pushEvent({
      event: 'filter_order',
      clic_element: clickElement,
      user_data: userData || {}
    });
  }

  // ============================================
  // EVENTOS DE ARCHIVOS
  // ============================================

  /**
   * Evento: file_download
   * Se dispara cuando el usuario descarga un presupuesto
   */
  fileDownload(fileName: string, userData?: UserData): void {
    this.pushEvent({
      event: 'file_download',
      file_name: fileName,
      user_data: userData || {}
    });
  }

  /**
   * Evento: share
   * Se dispara cuando el usuario comparte un presupuesto
   */
  share(fileName: string, userData?: UserData): void {
    this.pushEvent({
      event: 'share',
      file_name: fileName,
      user_data: userData || {}
    });
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  /**
   * Normaliza userData para asegurar que siempre tenga los campos, incluso si están vacíos
   */
  /**
   * Normaliza los datos de usuario para asegurar que siempre tengan los campos requeridos
   * Devuelve un objeto con campos obligatorios (no opcionales) para las estructuras específicas de eventos
   */
  private normalizeUserData(userData?: UserData): {
    email_address: string;
    phone_number: string;
    user_id: string;
  } {
    return {
      email_address: userData?.email_address || '',
      phone_number: userData?.phone_number || '',
      user_id: userData?.user_id || ''
    };
  }

  /**
   * Obtiene los datos del usuario actual si está logueado
   * Este método debe ser llamado desde los componentes que tienen acceso al AuthService
   */
  getUserData(
    email?: string,
    phone?: string,
    userId?: string
  ): UserData | undefined {
    if (!email && !phone && !userId) {
      return undefined;
    }

    return {
      email_address: email,
      phone_number: phone,
      user_id: userId
    };
  }

  /**
   * Formatea el teléfono con el prefijo y código de país
   */
  formatPhoneNumber(phone: string, countryCode: string = '+34', phonePrefix?: string): string {
    if (!phone) {
      return '';
    }
    
    // Si hay phonePrefix, formatear como "prefix + teléfono" con espacio
    if (phonePrefix) {
      return `${phonePrefix} ${phone}`;
    }
    
    // Si el teléfono ya empieza con '+', devolverlo tal cual
    if (phone.startsWith('+')) {
      return phone;
    }
    
    // Si no hay prefijo, usar el código de país por defecto
    return `${countryCode}${phone}`;
  }

  /**
   * Formatea la puntuación con un decimal (ej: 4 → "4.0", 4.6 → "4.6")
s   * Si no hay datos y defaultValue es string vacío, devuelve string vacío
   */
  formatRating(rating: number | string | undefined | null, defaultValue: string = ''): string {
    if (rating === undefined || rating === null || rating === '') {
      return defaultValue;
    }
    
    // Convertir a número si es string
    const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    
    // Verificar que sea un número válido
    if (isNaN(numericRating)) {
      return defaultValue;
    }
    
    // Si el rating es 0, devolver vacío (no hay reviews)
    if (numericRating === 0) {
      return defaultValue;
    }
    
    // Devolver el rating truncado a 1 decimal (no redondeado)
    // Ejemplo: 4.7653 -> 4.7 (no 4.8)
    return Math.floor(numericRating * 100) / 100 + '';
  }

  /**
   * Obtiene el tag VISIBLE del tour
   */
  private getTourTag(tourId: number): Observable<string> {
    if (!tourId || tourId <= 0) {
      return of('');
    }
    
    return this.tourTagService.getByTourAndType(tourId, 'VISIBLE').pipe(
      switchMap((tourTags) => {
        if (tourTags.length > 0 && tourTags[0]?.tagId && tourTags[0].tagId > 0) {
          const firstTagId = tourTags[0].tagId;
          return this.tagService.getById(firstTagId).pipe(
            map((tag) => tag?.name && tag.name.trim().length > 0 ? tag.name.trim() : ''),
            catchError(() => of(''))
          );
        }
        return of('');
      }),
      catchError(() => of(''))
    );
  }

  /**
   * Construye un EcommerceItem desde datos del tour
   * Incluye obtención automática del tag VISIBLE para item_category3
   */
  buildEcommerceItemFromTourData(
    tourData: TourDataForEcommerce,
    itemListId: string,
    itemListName: string,
    itemId?: string
  ): Observable<EcommerceItem> {
    const tourId = tourData.id;
    // Usar flightCity directamente de tourData (ya viene asignado desde trackPurchaseFromReservation)
    const flightCity = tourData.flightCity || 'Sin vuelo';
    
    // Obtener tag del tour
    return this.getTourTag(tourId || 0).pipe(
      map((tag) => {
        // Construir ID del item
        const finalItemId = itemId || 
          tourData.id?.toString() || 
          tourData.tkId?.toString() || 
          '';
        
        // Construir duración
        const days = tourData.days || 0;
        const nights = tourData.nights || (days > 0 ? days - 1 : 0);
        const duracion = days > 0 ? `${days} días, ${nights} noches` : '';
        
        // Construir item_category5
        const itemCategory5 = tourData.tourType === 'FIT' ? 'Privados' : 'Grupos';
        
        // Asegurar que totalPassengers sea un número válido o undefined
        const totalPassengers = tourData.totalPassengers !== undefined && tourData.totalPassengers !== null 
          ? tourData.totalPassengers.toString() 
          : '0';
        
        return {
          item_id: finalItemId,
          item_name: tourData.name || '',
          coupon: '',
          discount: 0,
          index: 1,
          item_brand: 'Different Roads',
          item_category: tourData.destination?.continent || '',
          item_category2: tourData.destination?.country || '',
          item_category3: tag || '',
          item_category4: tourData.monthTags?.join(', ') || '',
          item_category5: itemCategory5,
          item_list_id: itemListId,
          item_list_name: itemListName,
          item_variant: `${tourData.tkId || tourData.id} - ${flightCity}`,
          price: tourData.price || 0,
          quantity: 1,
          puntuacion: this.formatRating(tourData.rating),
          duracion: duracion,
          start_date: tourData.departureDate || '',
          end_date: tourData.returnDate || '',
          pasajeros_adultos: (tourData.totalPassengers && tourData.childrenCount) 
            ? (tourData.totalPassengers - parseInt(tourData.childrenCount || '0')).toString()
            : (tourData.totalPassengers?.toString() || '0'),
          pasajeros_niños: tourData.childrenCount || '0',
          actividades: tourData.activitiesText || '',
          seguros: tourData.selectedInsurance || '',
          vuelo: flightCity
        };
      })
    );
  }

  /**
   * Convierte un array de TourDataV2 a EcommerceItem[] para analytics
   */
  /**
   * Convierte un TourDataV2 individual a EcommerceItem
   * Método helper para mantener consistencia entre eventos
   */
  convertTourToEcommerceItem(
    tour: TourDataV2,
    itemListId: string,
    itemListName: string,
    index: number = 0
  ): EcommerceItem {
    // Calcular duración
    let duracion = '';
    if (tour.itineraryDaysCount) {
      const days = tour.itineraryDaysCount;
      const nights = days > 0 ? days - 1 : 0;
      duracion = nights > 0 ? `${days} días, ${nights} noches` : `${days} días`;
    }

    // Determinar item_category5 (tipología de viaje)
    // Usar tripType si está disponible, si no, usar fallback basado en isByDr
    const itemCategory5 = tour.tripType && tour.tripType.length > 0
      ? tour.tripType.join(', ')
      : (tour.isByDr ? 'Grupos' : 'Privados');

    // Convertir meses a minúsculas
    const monthsString = tour.availableMonths?.join(', ').toLowerCase() || '';

    // Estructura exacta según especificación
    return {
      item_id: tour.id?.toString() || '',
      item_name: tour.title || '',
      coupon: '',
      discount: 0,
      index: index + 1,
      item_brand: 'Different Roads',
      item_category: tour.continent || '',
      item_category2: tour.country || '',
      item_category3: tour.tag && tour.tag.trim().length > 0 ? tour.tag.trim() : '',
      item_category4: monthsString,
      item_category5: itemCategory5,
      item_list_id: itemListId,
      item_list_name: itemListName,
      item_variant: '',
      price: tour.price || 0,
      quantity: 1,
      puntuacion: this.formatRating(tour.rating, ''),
      duracion: duracion
    };
  }

  convertToursToEcommerceItems(
    tours: TourDataV2[],
    itemListId: string,
    itemListName: string
  ): EcommerceItem[] {
    return tours.map((tour, index) => {
      return this.convertTourToEcommerceItem(tour, itemListId, itemListName, index);
    });
  }

  /**
   * Dispara el evento view_item_list para una lista de tours
   * Maneja automáticamente la obtención de datos del usuario y la conversión de tours
   * Solo dispara un evento por itemListId para evitar duplicados
   */
  private trackedListIds = new Set<string>();

  /**
   * Limpia el registro de listas trackeadas (útil para testing o reset)
   */
  clearTrackedListIds(): void {
    this.trackedListIds.clear();
    this.firedEvents.clear();
    // El cache se mantiene para reutilizar los datos del usuario
  }

  /**
   * Verifica si una lista ya fue trackeada
   */
  isListTracked(itemListId: string): boolean {
    return this.trackedListIds.has(itemListId);
  }

  trackViewItemListFromTours(
    tours: TourDataV2[],
    itemListId: string,
    itemListName: string
  ): void {
    if (!tours || tours.length === 0 || !itemListId || !itemListName) {
      return;
    }

    // Evitar disparar múltiples eventos para la misma lista
    if (this.trackedListIds.has(itemListId)) {
      return;
    }

    // Marcar como trackeada INMEDIATAMENTE antes de hacer cualquier cosa
    this.trackedListIds.add(itemListId);

    // Convertir tours a formato EcommerceItem
    const items = this.convertToursToEcommerceItems(tours, itemListId, itemListName);

    // Obtener datos del usuario y disparar evento
    this.getCurrentUserData().subscribe(userData => {
      this.viewItemList(itemListId, itemListName, items, userData);
    });
  }

  /**
   * Obtiene los datos completos del usuario usando el mismo patrón que el header
   * Combina email, cognitoId y datos de la base de datos
   */
  getCurrentUserData(): Observable<UserData> {
    // Verificar primero si el usuario está autenticado
    const isAuthenticated = this.authService.isAuthenticatedValue();
    
    // Si NO está autenticado, devolver datos vacíos inmediatamente
    if (!isAuthenticated) {
      return of({
        email_address: '',
        phone_number: '',
        user_id: ''
      } as UserData);
    }
    
    // Si está autenticado, verificar el valor actual del email (síncrono)
    const currentEmail = this.authService.getUserEmailValue();
    
    // Si ya hay email, procesarlo directamente
    if (currentEmail && currentEmail.length > 0) {
      return this.processUserDataWithEmail(currentEmail);
    }
    
    // Si está autenticado pero no hay email, devolver los datos disponibles sin esperar
    // Obtener cognitoId si existe
    const currentCognitoId = this.authService.getCognitoIdValue();
    
    if (currentCognitoId && currentCognitoId.length > 0) {
      // Intentar obtener datos del usuario por cognitoId, pero sin esperar por email
      return this.usersNetService.getUsersByCognitoId(currentCognitoId).pipe(
        switchMap((users) => {
          if (users && users.length > 0) {
            const user = users[0];
            return this.personalInfoService.getUserData(user.id.toString()).pipe(
              map((personalInfo: any) => {
                const phone = personalInfo?.telefono ? this.formatPhoneNumber(personalInfo.telefono, '+34', personalInfo?.phonePrefix) : '';
                return {
                  email_address: personalInfo?.email || '',
                  phone_number: phone,
                  user_id: currentCognitoId
                };
              }),
              catchError(() => {
                return of({
                  email_address: '',
                  phone_number: '',
                  user_id: currentCognitoId
                });
              })
            );
          }
          return of({
            email_address: '',
            phone_number: '',
            user_id: currentCognitoId
          });
        }),
        catchError(() => {
          return of({
            email_address: '',
            phone_number: '',
            user_id: currentCognitoId
          });
        })
      );
    }
    
    // Si está autenticado pero no hay email ni cognitoId, devolver datos vacíos
    return of({
      email_address: '',
      phone_number: '',
      user_id: ''
    } as UserData);
  }

  private processUserDataWithEmail(email: string): Observable<UserData> {
    // Verificar primero el valor actual del cognitoId (síncrono)
    const currentCognitoId = this.authService.getCognitoIdValue();
    
    if (currentCognitoId && currentCognitoId.length > 0) {
      return this.processUserDataWithCognitoId(email, currentCognitoId);
    }
    
    // Si no hay cognitoId, esperar a que se actualice (asíncrono)
    return this.authService.getCognitoId().pipe(
      filter((cognitoId: string) => !!cognitoId && cognitoId.length > 0),
      first(),
      switchMap((cognitoId: string) => {
        return this.processUserDataWithCognitoId(email, cognitoId);
      }),
      catchError(() => {
        return of({
          email_address: email,
          phone_number: '',
          user_id: ''
        });
      })
    );
  }

  private processUserDataWithCognitoId(email: string, cognitoId: string): Observable<UserData> {
    if (!cognitoId) {
      return of({
        email_address: email,
        phone_number: '',
        user_id: ''
      });
    }

    return this.usersNetService.getUsersByCognitoId(cognitoId).pipe(
      switchMap((users) => {
        if (users && users.length > 0) {
          const user = users[0];
          return this.personalInfoService.getUserData(user.id.toString()).pipe(
            map((personalInfo: any) => {
              const phone = personalInfo?.telefono ? this.formatPhoneNumber(personalInfo.telefono, '+34', personalInfo?.phonePrefix) : '';
              return {
                email_address: personalInfo?.email || email,
                phone_number: phone,
                user_id: cognitoId
              };
            }),
            catchError(() => {
              return of({
                email_address: email,
                phone_number: '',
                user_id: cognitoId
              });
            })
          );
        }
        
        return this.usersNetService.getUsersByEmail(email).pipe(
          switchMap((usersByEmail) => {
            if (usersByEmail && usersByEmail.length > 0) {
              const user = usersByEmail[0];
              return this.personalInfoService.getUserData(user.id.toString()).pipe(
                map((personalInfo: any) => {
                  const phone = personalInfo?.telefono ? this.formatPhoneNumber(personalInfo.telefono, '+34', personalInfo?.phonePrefix) : '';
                  return {
                    email_address: personalInfo?.email || email,
                    phone_number: phone,
                    user_id: cognitoId
                  };
                }),
                catchError(() => {
                  return of({
                    email_address: email,
                    phone_number: '',
                    user_id: cognitoId
                  });
                })
              );
            }
            return of({
              email_address: email,
              phone_number: '',
              user_id: cognitoId
            });
          })
        );
      }),
      catchError(() => {
        return of({
          email_address: email,
          phone_number: '',
          user_id: cognitoId || ''
        });
      })
    );
  }
}

