import { Injectable, Injector, forwardRef, Inject } from '@angular/core';
import { UsersNetService } from './usersNet.service';
import { PersonalInfoV2Service } from './v2/personal-info-v2.service';
import { Observable, of, map, switchMap } from 'rxjs';

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
    private personalInfoService: PersonalInfoV2Service
  ) {
    this.initDataLayer();
  }
  
  /**
   * Obtiene AuthenticateService de forma lazy para evitar dependencia circular
   */
  private getAuthService(): any {
    if (!this._authService) {
      // Importar dinámicamente para evitar dependencia circular
      const AuthenticateService = require('./auth-service.service').AuthenticateService;
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

  /**
   * Evento: view_item_list
   * Se dispara cuando el usuario visualiza una lista de viajes
   */
  viewItemList(
    itemListId: string,
    itemListName: string,
    items: EcommerceItem[],
    userData?: UserData
  ): void {
    this.clearEcommerce();
    this.pushEvent({
      event: 'view_item_list',
      user_data: userData || {},
      ecommerce: {
        item_list_id: itemListId,
        item_list_name: itemListName,
        items: items
      }
    });
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
    this.pushEvent({
      event: 'select_item',
      user_data: userData || {},
      ecommerce: {
        item_list_id: itemListId,
        item_list_name: itemListName,
        items: [item]
      }
    });
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
    this.clearEcommerce();
    this.pushEvent({
      event: 'view_item',
      user_data: userData || {},
      ecommerce: {
        item_list_id: itemListId,
        item_list_name: itemListName,
        items: [item]
      }
    });
  }

  /**
   * Evento: add_to_wishlist
   * Se dispara cuando el usuario añade un artículo a favoritos
   */
  addToWishlist(
    itemListId: string,
    itemListName: string,
    item: EcommerceItem,
    userData?: UserData
  ): void {
    this.clearEcommerce();
    this.pushEvent({
      event: 'add_to_wishlist',
      user_data: userData || {},
      ecommerce: {
        item_list_id: itemListId,
        item_list_name: itemListName,
        items: [item]
      }
    });
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
    this.pushEvent({
      event: 'add_to_cart',
      user_data: userData || {},
      ecommerce: {
        currency: currency,
        value: value,
        items: [item]
      }
    });
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
    this.pushEvent({
      event: 'view_cart',
      user_data: userData || {},
      ecommerce: {
        currency: currency,
        value: value,
        items: [item]
      }
    });
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
    this.pushEvent({
      event: 'begin_checkout',
      user_data: userData || {},
      ecommerce: ecommerceData
    });
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
    this.pushEvent({
      event: 'view_flights_info',
      user_data: userData || {},
      ecommerce: ecommerceData
    });
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
    this.pushEvent({
      event: 'add_flights_info',
      user_data: userData || {},
      ecommerce: ecommerceData
    });
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
    this.pushEvent({
      event: 'view_personal_info',
      user_data: userData || {},
      ecommerce: ecommerceData
    });
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
    this.pushEvent({
      event: 'add_personal_info',
      user_data: userData || {},
      ecommerce: ecommerceData
    });
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
    this.pushEvent({
      event: 'view_payment_info',
      user_data: userData || {},
      ecommerce: ecommerceData
    });
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
    this.pushEvent({
      event: 'add_payment_info',
      user_data: userData || {},
      ecommerce: ecommerceData
    });
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
    this.pushEvent({
      event: 'purchase',
      user_data: userData || {},
      ecommerce: ecommerceData
    });
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
   * Obtiene los datos completos del usuario usando el mismo patrón que el header
   * Combina email, cognitoId y datos de la base de datos
   */
  getCurrentUserData(): Observable<UserData | undefined> {
    return this.authService.getUserEmail().pipe(
      switchMap((email: string) => {
        if (!email) {
          return of(undefined);
        }

        return this.authService.getCognitoId().pipe(
          switchMap((cognitoId: string) => {
            if (!cognitoId) {
              return of({
                email_address: email,
                phone_number: '',
                user_id: ''
              });
            }

            // Usar el mismo patrón que el header pero con PersonalInfoV2Service
            return this.usersNetService.getUsersByCognitoId(cognitoId).pipe(
              switchMap((users) => {
                if (users && users.length > 0) {
                  const user = users[0];
                  // Obtener datos completos usando PersonalInfoV2Service
                  return this.personalInfoService.getUserData(user.id.toString()).pipe(
                    map((personalInfo: any) => {
                      const phone = personalInfo?.telefono ? this.formatPhoneNumber(personalInfo.telefono) : '';
                      return {
                        email_address: personalInfo?.email || email,
                        phone_number: phone,
                        user_id: cognitoId
                      };
                    })
                  );
                }
                // Si no encuentra usuario, intentar con email directamente
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
                        })
                      );
                    }
                    // Fallback final
                    return of({
                      email_address: email,
                      phone_number: '',
                      user_id: cognitoId
                    });
                  })
                );
              })
            );
          })
        );
      })
    );
  }
}


