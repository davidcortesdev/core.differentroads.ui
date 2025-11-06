import { Injectable, Injector } from '@angular/core';
import { UsersNetService } from '../users/usersNet.service';
import { PersonalInfoV2Service } from '../v2/personal-info-v2.service';
import { Observable, of, map, switchMap, catchError, first, take, shareReplay, tap, defaultIfEmpty, filter, skipWhile } from 'rxjs';
import { TourTagService } from '../tag/tour-tag.service';
import { TagService } from '../tag/tag.service';
import { TripTypeService } from '../trip-type/trip-type.service';
import { TourDataV2 } from '../../../shared/components/tour-card-v2/tour-card-v2.model';

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
    private tripTypeService: TripTypeService
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
    // Estructura específica para add_to_cart
    const eventData: AddToCartEventData = {
      event: 'add_to_cart',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: currency,
        value: value,
        items: [item]
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
    // Estructura específica para view_cart
    const eventData: ViewCartEventData = {
      event: 'view_cart',
      user_data: this.normalizeUserData(userData),
      ecommerce: {
        currency: currency,
        value: value,
        items: [item]
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
    // Estructura específica para begin_checkout
    const eventData: BeginCheckoutEventData = {
      event: 'begin_checkout',
      user_data: this.normalizeUserData(userData),
      ecommerce: ecommerceData
    };
    
    this.pushEvent(eventData);
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
    // Estructura específica para view_flights_info
    const eventData: ViewFlightsInfoEventData = {
      event: 'view_flights_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: ecommerceData
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
    // Estructura específica para add_flights_info
    const eventData: AddFlightsInfoEventData = {
      event: 'add_flights_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: ecommerceData
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
    // Estructura específica para view_personal_info
    const eventData: ViewPersonalInfoEventData = {
      event: 'view_personal_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: ecommerceData
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
    // Estructura específica para add_personal_info
    const eventData: AddPersonalInfoEventData = {
      event: 'add_personal_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: ecommerceData
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
    // Estructura específica para view_payment_info
    const eventData: ViewPaymentInfoEventData = {
      event: 'view_payment_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: ecommerceData
    };
    
    this.pushEvent(eventData);
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
    // Estructura específica para add_payment_info
    const eventData: AddPaymentInfoEventData = {
      event: 'add_payment_info',
      user_data: this.normalizeUserData(userData),
      ecommerce: ecommerceData
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
    // Estructura específica para purchase
    const eventData: PurchaseEventData = {
      event: 'purchase',
      user_data: this.normalizeUserData(userData),
      ecommerce: ecommerceData
    };
    
    this.pushEvent(eventData);
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
   * Formatea el teléfono con el código de país
   */
  formatPhoneNumber(phone: string, countryCode: string = '+34'): string {
    if (phone.startsWith('+')) {
      return phone;
    }
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
          pasajeros_adultos: totalPassengers,
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
    // Verificar primero el valor actual del email (síncrono)
    const currentEmail = this.authService.getUserEmailValue();
    
    // Si ya hay email, procesarlo directamente
    if (currentEmail && currentEmail.length > 0) {
      return this.processUserDataWithEmail(currentEmail);
    }
    
    // Si no hay email, esperar a que se actualice (asíncrono)
    return this.authService.getUserEmail().pipe(
      // Filtrar valores vacíos
      filter((email: string) => !!email && email.length > 0),
      // Tomar el primer valor válido
      first(),
      switchMap((email: string) => {
        return this.processUserDataWithEmail(email);
      }),
      catchError(() => {
        // Devolver objeto con campos vacíos en lugar de undefined
        return of({
          email_address: '',
          phone_number: '',
          user_id: ''
        } as UserData);
      })
    );
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
              const phone = personalInfo?.telefono ? this.formatPhoneNumber(personalInfo.telefono) : '';
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
                  const phone = personalInfo?.telefono ? this.formatPhoneNumber(personalInfo.telefono) : '';
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


