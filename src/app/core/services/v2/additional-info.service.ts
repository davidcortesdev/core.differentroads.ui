import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, concatMap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { AuthenticateService } from '../auth/auth-service.service';
import { AnalyticsService, TourDataForEcommerce } from '../analytics/analytics.service';
import { ReservationService, ReservationCreate, ReservationUpdate, ReservationCompleteCreate, IReservationTravelerData } from '../reservation/reservation.service';
import { ReservationStatusService } from '../reservation/reservation-status.service';
import { UsersNetService } from '../users/usersNet.service';
import { NotificationServicev2 } from './notification.service';
import { DocumentServicev2 } from './document.service';
import { TourService } from '../tour/tour.service';
import { ItineraryService, ItineraryFilters } from '../itinerary/itinerary.service';
import { ItineraryDayService, IItineraryDayResponse } from '../itinerary/itinerary-day/itinerary-day.service';
import { TourLocationService, ITourLocationResponse } from '../tour/tour-location.service';
import { LocationNetService, Location } from '../locations/locationNet.service';
import { DepartureService, IDepartureResponse } from '../departure/departure.service';
import { TourTagService } from '../tag/tour-tag.service';
import { TagService } from '../tag/tag.service';
import { ReviewsService } from '../reviews/reviews.service';
import { environment } from '../../../../environments/environment';

/**
 * Servicio para la gestión de presupuestos y funcionalidades adicionales
 * 
 * Este servicio maneja todas las operaciones relacionadas con presupuestos:
 * - Creación y actualización de presupuestos
 * - Descarga de PDFs
 * - Compartir presupuestos por email
 * - Validación de datos del contexto
 * 
 * Endpoints del backend utilizados:
 * - POST /api/budgets - Crear presupuesto
 * - PUT /api/budgets/{id} - Actualizar presupuesto
 * - POST /api/budgets/share - Compartir por email
 * - POST /api/budgets/download - Descargar PDF
 */
@Injectable({
  providedIn: 'root'
})
export class AdditionalInfoService {
  /**
   * URL base de la API de producción
   * Configuración del endpoint principal para todas las operaciones de presupuestos
   */
  private readonly API_BASE_URL = 'https://tour-dev.differentroads.es/api';
  
  /**
   * Propiedades para almacenar datos del contexto del presupuesto
   * Estos datos se utilizan para construir las peticiones al backend
   */
  private tourId: string = '';
  private periodId: string = '';
  private travelersData: any = null;
  private selectedFlight: any = null;
  private totalPrice: number = 0;
  private selectedActivities: any[] = [];
  private ageGroupCategories: any = null;
  private selectedActivityPackId: number | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthenticateService,
    private analyticsService: AnalyticsService,
    private messageService: MessageService,
    private reservationService: ReservationService,
    private usersNetService: UsersNetService,
    private reservationStatusService: ReservationStatusService,
    private notificationService: NotificationServicev2,
    private documentService: DocumentServicev2,
    private tourService: TourService,
    private itineraryService: ItineraryService,
    private itineraryDayService: ItineraryDayService,
    private tourLocationService: TourLocationService,
    private locationService: LocationNetService,
    private departureService: DepartureService,
    private tourTagService: TourTagService,
    private tagService: TagService,
    private reviewsService: ReviewsService
  ) {}

  /**
   * Establece los datos del contexto para crear/actualizar reservaciones
   */
  setContextData(data: {
    tourId?: string;
    periodId?: string;
    travelersData?: any;
    selectedFlight?: any;
    totalPrice?: number;
    selectedActivities?: any[];
    ageGroupCategories?: any;
    selectedActivityPackId?: number | null;
  }): void {
    if (data.tourId) this.tourId = data.tourId;
    if (data.periodId) this.periodId = data.periodId;
    if (data.travelersData) this.travelersData = data.travelersData;
    if (data.selectedFlight) this.selectedFlight = data.selectedFlight;
    if (data.totalPrice) this.totalPrice = data.totalPrice;
    if (data.selectedActivities) this.selectedActivities = data.selectedActivities;
    if (data.ageGroupCategories) this.ageGroupCategories = data.ageGroupCategories;
    if (data.selectedActivityPackId !== undefined) this.selectedActivityPackId = data.selectedActivityPackId;
  }

  /**
   * Limpia los datos del contexto
   */
  clearContextData(): void {
    this.tourId = '';
    this.periodId = '';
    this.travelersData = null;
    this.selectedFlight = null;
    this.totalPrice = 0;
    this.selectedActivities = [];
    this.ageGroupCategories = null;
    this.selectedActivityPackId = null;
  }

  /**
   * Obtiene el email del usuario autenticado
   */
  getUserEmail(): Observable<string> {
    return this.authService.getUserEmail();
  }

  /**
   * Obtiene el ID del usuario autenticado
   */
  getUserId(): Observable<string | null> {
    return this.authService.getUserAttributes().pipe(
      map(attributes => attributes?.sub || null)
    );
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): Observable<boolean> {
    return this.authService.isLoggedIn();
  }

  /**
   * Obtiene los atributos del usuario desde Cognito
   */
  getUserAttributes(): Observable<any> {
    return this.authService.getUserAttributes();
  }

  /**
   * ✅ MÉTODO NUEVO: Preparar datos de viajeros para createComplete
   */
  private prepareTravelersData(): IReservationTravelerData[] {
    const travelersData: IReservationTravelerData[] = [];
    let travelerNumber = 1;

    // Si no hay datos de viajeros, crear un viajero por defecto
    if (!this.travelersData) {
      return [{
        ageGroupId: 1, // ID por defecto para adultos
        isLeadTraveler: true,
        tkId: null,
      }];
    }

    // Validar que existan los age groups necesarios
    if (this.travelersData.adults > 0 && (!this.ageGroupCategories?.adults?.id)) {
      throw new Error('Age group for adults not found');
    }
    if (this.travelersData.childs > 0 && (!this.ageGroupCategories?.children?.id)) {
      throw new Error('Age group for children not found');
    }
    if (this.travelersData.babies > 0 && (!this.ageGroupCategories?.babies?.id)) {
      throw new Error('Age group for babies not found');
    }

    // Crear viajeros para adultos
    for (let i = 0; i < (this.travelersData.adults || 0); i++) {
      const isLeadTraveler = travelerNumber === 1;
      travelersData.push({
        ageGroupId: this.ageGroupCategories?.adults?.id || 1,
        isLeadTraveler: isLeadTraveler,
        tkId: null,
      });
      travelerNumber++;
    }

    // Crear viajeros para niños
    for (let i = 0; i < (this.travelersData.childs || 0); i++) {
      travelersData.push({
        ageGroupId: this.ageGroupCategories?.children?.id || 2,
        isLeadTraveler: false,
        tkId: null,
      });
      travelerNumber++;
    }

    // Crear viajeros para bebés
    for (let i = 0; i < (this.travelersData.babies || 0); i++) {
      travelersData.push({
        ageGroupId: this.ageGroupCategories?.babies?.id || 3,
        isLeadTraveler: false,
        tkId: null,
      });
      travelerNumber++;
    }

    return travelersData;
  }

  /**
   * ✅ MÉTODO NUEVO: Preparar datos de actividades para createComplete
   */
  private prepareActivitiesData(): {
    activityIds: number[];
    activityPackIds: number[];
  } {
    const activityIds: number[] = [];
    const activityPackIds: number[] = [];

    // Procesar actividades seleccionadas manualmente
    if (this.selectedActivities && this.selectedActivities.length > 0) {
      this.selectedActivities.forEach((activity) => {
        if (activity.added) {
          const activityId = parseInt(activity.id);
          if (!isNaN(activityId) && activityId > 0) {
            if (activity.type === 'act') {
              activityIds.push(activityId);
            } else if (activity.type === 'pack') {
              activityPackIds.push(activityId);
            }
          }
        }
      });
    }

    // Procesar paquete automático del departure
    if (this.selectedActivityPackId && this.selectedActivityPackId > 0) {
      activityPackIds.push(this.selectedActivityPackId);
    }

    return { activityIds, activityPackIds };
  }

  /**
   * Construye los datos de reservación para el backend
   * 
   * Este método prepara la estructura de datos que el backend espera
   * para crear una nueva reservación/presupuesto. Diferencia entre
   * contexto de tour (datos mínimos) y checkout (datos completos).
   * 
   * @param userId - ID del usuario autenticado
   * @returns Objeto ReservationCreate con los datos estructurados para el backend
   */
  private buildReservationData(userId: number | null): ReservationCreate {
    return {
      tkId: '',
      reservationStatusId: 3, // 3 = BUDGET (presupuesto)
      retailerId: environment.retaileriddefault,
      tourId: parseInt(this.tourId) || 0,
      departureId: parseInt(this.periodId) || 0,
      userId: userId,
      totalPassengers: this.travelersData ? 
        (this.travelersData.adults || 0) + (this.travelersData.childs || 0) + (this.travelersData.babies || 0) : 1,
      totalAmount: this.totalPrice || 0,
    };
  }
  
  /**
   * ✅ MÉTODO MODIFICADO: Crea un nuevo presupuesto usando createComplete
   * @returns Observable con la reserva creada
   */
  createBudget(): Observable<any> {
    return this.authService.getCognitoId().pipe(
      switchMap(cognitoId => {
        if (!cognitoId) {
          console.warn('⚠️ No se encontró Cognito ID, creando presupuesto sin userId');
          return this.createCompleteBudget(null);
        }
        
        // Buscar el usuario por Cognito ID para obtener su ID en la base de datos
        return this.usersNetService.getUsersByCognitoId(cognitoId).pipe(
          map((users: any[]) => {
            const userId = users && users.length > 0 ? users[0].id : null;
            return userId;
          }),
          switchMap((userId: number | null) => this.createCompleteBudget(userId))
        );
      }),
      catchError(error => {
        console.error('Error en createBudget:', error);
        throw error;
      })
    );
  }

  /**
   * ✅ MÉTODO NUEVO: Crear presupuesto completo usando createComplete
   */
  private createCompleteBudget(userId: number | null): Observable<any> {
    try {
      // ✅ OBTENER ID DEL ESTADO BUDGET DINÁMICAMENTE
      return this.reservationStatusService.getByCode('BUDGET').pipe(
        switchMap((budgetStatuses) => {
          if (!budgetStatuses || budgetStatuses.length === 0) {
            throw new Error('BUDGET status not found');
          }

          const budgetStatusId = budgetStatuses[0].id;

          // ✅ PREPARAR DATOS DE LA RESERVA
          const reservationData: ReservationCreate = {
            tkId: '',
            reservationStatusId: budgetStatusId, // ✅ USAR ID DINÁMICO DE BUDGET
            retailerId: environment.retaileriddefault,
            tourId: parseInt(this.tourId) || 0,
            departureId: parseInt(this.periodId) || 0,
            userId: userId,
            totalPassengers: this.travelersData ? 
              (this.travelersData.adults || 0) + (this.travelersData.childs || 0) + (this.travelersData.babies || 0) : 1,
            totalAmount: this.totalPrice || 0,
          };

          // ✅ PREPARAR DATOS DE VIAJEROS
          const travelersData: IReservationTravelerData[] = this.prepareTravelersData();

          // ✅ PREPARAR ACTIVIDADES Y PAQUETES
          const { activityIds, activityPackIds } = this.prepareActivitiesData();

          // ✅ CREAR RESERVA COMPLETA
          const completeData: ReservationCompleteCreate = {
            reservation: reservationData,
            travelers: travelersData,
            activityIds: activityIds.length > 0 ? activityIds : null,
            activityPackIds: activityPackIds.length > 0 ? activityPackIds : null,
          };

          console.log('📋 Creando PRESUPUESTO COMPLETO (BUDGET):', completeData);

          return this.reservationService.createComplete(completeData);
        }),
        catchError((error) => {
          console.error('💥 Error en preparación de datos del presupuesto:', error);
          throw error;
        })
      );
    } catch (error) {
      console.error('💥 Error en preparación de datos del presupuesto:', error);
      throw error;
    }
  }

  /**
   * Genera un token ID único para la reservación
   */
  private generateTokenId(): string {
    return 'TK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Valida que los datos necesarios estén disponibles según el contexto
   * Retorna true si la validación pasa, o un mensaje de error específico si falla
   */
  private validateContextData(): { valid: boolean; message?: string } {
    // Datos mínimos requeridos en cualquier contexto
    if (!this.tourId) {
      return { valid: false, message: 'Falta seleccionar el tour' };
    }
    
    if (!this.periodId) {
      return { valid: false, message: 'Falta seleccionar la fecha de salida' };
    }
    
    // Para contexto de checkout, validar datos completos
    const totalPassengers = this.travelersData ? 
      (this.travelersData.adults || 0) + (this.travelersData.childs || 0) + (this.travelersData.babies || 0) : 0;
    
    const isCheckoutContext = totalPassengers > 0 && this.totalPrice > 0;
    
    if (isCheckoutContext) {
      // En checkout, validar que tenemos datos completos
      if (!this.travelersData || this.travelersData.adults === 0) {
        return { valid: false, message: 'Falta indicar el número de pasajeros' };
      }
      if (this.totalPrice <= 0) {
        return { valid: false, message: 'No se ha calculado el precio del presupuesto' };
      }
    }
    
    // Para contexto de tour, solo necesitamos tour y período (ya validados arriba)
    return { valid: true };
  }

  /**
   * Guarda un nuevo presupuesto en el backend
   * 
   * Endpoint: POST /api/budgets
   * Descripción: Crea una nueva reserva/presupuesto en el sistema
   * 
   * @param userEmail Email del usuario autenticado
   * @returns Observable con la respuesta del servidor
   */
  saveNewBudget(userEmail: string): Observable<any> {
    // Validación previa de datos requeridos
    const validation = this.validateContextData();
    
    if (!validation.valid) {
      return of({ 
        success: false, 
        message: validation.message || 'Datos incompletos'
      });
    }

    // Construcción de datos para el backend
    const reservationData = this.buildReservationData(null);
    
    // TEMPORAL: Simular respuesta exitosa hasta que el backend implemente el endpoint
    return of({
      success: true,
      message: 'Tour añadido a tus favoritos',
      data: { id: 'temp_' + Date.now(), status: 'saved' }
    });
    
    // TODO: Descomentar cuando el backend implemente el endpoint
    /*
    return this.http.post(`${this.API_BASE_URL}/budgets`, reservationData).pipe(
      map((response: any) => {
        
        // Procesamiento de la respuesta del backend
        const totalPassengers = this.travelersData ? 
          (this.travelersData.adults || 0) + (this.travelersData.childs || 0) + (this.travelersData.babies || 0) : 0;
        
        const isCheckoutContext = totalPassengers > 0 && this.totalPrice > 0;
        const message = isCheckoutContext 
          ? 'Presupuesto guardado correctamente'
          : 'Tour añadido a tus favoritos';
        
        const result = {
          success: true,
          message: message,
          data: response
        };
        
        return result;
      }),
      catchError((error) => {
        return of({
          success: false,
          message: 'Error de conexión con el servidor',
          error: error
        });
      })
    );
    */
  }

  /**
   * Construye los datos de actualización para el backend
   * 
   * Este método prepara la estructura de datos que el backend espera
   * para actualizar una reservación/presupuesto existente. Combina
   * los datos existentes con los nuevos datos del contexto.
   * 
   * @param existingOrder Datos de la orden existente
   * @returns Objeto ReservationUpdate con los datos estructurados para el backend
   */
  private buildReservationUpdateData(existingOrder: any): ReservationUpdate {
    const totalPassengers = this.travelersData ? 
      (this.travelersData.adults || 0) + (this.travelersData.childs || 0) + (this.travelersData.babies || 0) : 0;

    return {
      tkId: existingOrder.tkId || existingOrder.tokenId || this.generateTokenId(),
      reservationStatusId: existingOrder.reservationStatusId || 1,
      retailerId: existingOrder.retailerId || 1,
      tourId: parseInt(this.tourId) || existingOrder.tourId || 0,
      departureId: parseInt(this.periodId) || existingOrder.departureId || 0,
      userId: existingOrder.userId || null,
      totalPassengers: totalPassengers,
      totalAmount: this.totalPrice || existingOrder.totalAmount || 0,
    };
  }

  /**
   * Actualiza un presupuesto existente en el backend
   * 
   * Endpoint: PUT /api/budgets/{budgetId}
   * Descripción: Modifica una reservación/presupuesto existente en el sistema
   * 
   * @param existingOrder Datos de la orden existente a actualizar
   * @param userEmail Email del usuario autenticado
   * @returns Observable con la respuesta del servidor
   */
  updateExistingBudget(existingOrder: any, userEmail: string): Observable<any> {
    // Validación previa de datos requeridos
    const validation = this.validateContextData();
    
    if (!validation.valid) {
      return of({ 
        success: false, 
        message: validation.message || 'Datos incompletos para actualizar el presupuesto'
      });
    }

    // Validación de existencia de la orden
    if (!existingOrder || (!existingOrder.id && !existingOrder._id)) {
      return of({ 
        success: false, 
        message: 'No se encontró información de la orden existente' 
      });
    }

    // Construcción de datos de actualización para el backend
    const updateData = this.buildReservationUpdateData(existingOrder);
    const budgetId = existingOrder.id || existingOrder._id;
    
    return of({
      success: true,
      message: 'Presupuesto actualizado correctamente',
      data: { id: budgetId, status: 'updated' }
    });
    
    // TODO: Descomentar cuando el backend implemente el endpoint
    /*
    return this.http.put(`${this.API_BASE_URL}/budgets/${budgetId}`, updateData).pipe(
      map((response: any) => ({
        success: true,
        message: 'Presupuesto actualizado correctamente',
        data: response
      }))
    );
    */
  }

  /**
   * Dispara evento de analytics para generated_lead
   */
  trackContactForm(userEmail: string, location: string = 'ficha_tour'): void {
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.generatedLead(location, userData);
      },
      error: () => {
        this.analyticsService.generatedLead(
          location,
          this.analyticsService.getUserData(
            userEmail,
            '',
            this.authService.getCognitoIdValue()
          )
        );
      }
    });
  }

  // MÉTODOS DE ANALYTICS ESPECÍFICOS

  /**
   * Dispara evento add_to_wishlist cuando se guarda un presupuesto
   */
  trackAddToWishlist(
    tourId: string,
    tourName: string,
    periodId: string,
    periodName: string,
    periodDates: string,
    travelers: any,
    userEmail: string,
    tourData?: any
  ): void {
    const tourIdNumber = parseInt(tourId, 10);
    if (!tourIdNumber || isNaN(tourIdNumber)) {
      console.error('Invalid tourId for add_to_wishlist:', tourId);
      return;
    }

    const itemListId = typeof tourData?.listId === 'number' ? tourData.listId.toString() : (tourData?.listId || 'saved_budgets');
    const itemListName = tourData?.listName || 'Presupuestos guardados';

    // Obtener todos los datos completos del tour
    this.getCompleteTourDataForWishlist(tourIdNumber).pipe(
      switchMap((tourDataForEcommerce: TourDataForEcommerce) => {
        // Actualizar con datos adicionales del contexto si están disponibles
        if (tourData?.category || tourData?.subcategory) {
          tourDataForEcommerce.destination = tourDataForEcommerce.destination || { continent: undefined, country: undefined };
        }
        if (tourData?.category && tourDataForEcommerce.destination && !tourDataForEcommerce.destination.continent) {
          tourDataForEcommerce.destination.continent = tourData.category;
        }
        if (tourData?.subcategory && tourDataForEcommerce.destination && !tourDataForEcommerce.destination.country) {
          tourDataForEcommerce.destination.country = tourData.subcategory;
        }
        if (tourData?.rating) tourDataForEcommerce.rating = tourData.rating;
        if (this.totalPrice) tourDataForEcommerce.price = this.totalPrice;
        if (travelers?.adults) tourDataForEcommerce.totalPassengers = travelers.adults;
        if (travelers?.childs) tourDataForEcommerce.childrenCount = travelers.childs.toString();

        return this.analyticsService.buildEcommerceItemFromTourData(
          tourDataForEcommerce,
          itemListId,
          itemListName,
          tourId
        ).pipe(
          switchMap((item) => {
            return this.analyticsService.getCurrentUserData().pipe(
              map((userData) => ({ item, userData }))
            );
          }),
          catchError(() => {
            // Fallback sin datos de usuario
            return this.analyticsService.buildEcommerceItemFromTourData(
              tourDataForEcommerce,
              itemListId,
              itemListName,
              tourId
            ).pipe(
              map((item) => ({ 
                item, 
                userData: { email_address: userEmail } as any 
              }))
            );
          })
        );
      }),
      catchError((error) => {
        console.error('Error obteniendo datos completos del tour para add_to_wishlist:', error);
        // Fallback con datos básicos
        return this.analyticsService.buildEcommerceItemFromTourData(
          {
            id: tourIdNumber,
            name: tourName,
            destination: {
              continent: tourData?.category || undefined,
              country: tourData?.subcategory || undefined
            },
            price: this.totalPrice || undefined,
            totalPassengers: travelers?.adults || undefined,
            childrenCount: travelers?.childs?.toString() || undefined
          } as TourDataForEcommerce,
          itemListId,
          itemListName,
          tourId
        ).pipe(
          switchMap((item) => {
            return this.analyticsService.getCurrentUserData().pipe(
              map((userData) => ({ item, userData })),
              catchError(() => of({ item, userData: { email_address: userEmail } as any }))
            );
          })
        );
      })
    ).subscribe(({ item, userData }) => {
      // Ajustar item_category4 a minúsculas si es necesario
      const adjustedItem = {
        ...item,
        item_category4: item.item_category4?.toLowerCase() || '',
        item_list_id: itemListId,
        item_list_name: itemListName,
        price: this.totalPrice || item.price || 0
      };

      this.analyticsService.addToWishlist(
        itemListId,
        itemListName,
        adjustedItem,
        userData
      );
    });
  }

  /**
   * Obtiene todos los datos completos del tour desde los servicios adicionales para add_to_wishlist
   */
  private getCompleteTourDataForWishlist(tourId: number): Observable<TourDataForEcommerce> {
    const itineraryFilters: ItineraryFilters = {
      tourId: tourId,
      isVisibleOnWeb: true,
      isBookable: true,
    };

    return this.itineraryService.getAll(itineraryFilters, false).pipe(
      concatMap((itineraries) => {
        if (itineraries.length === 0) {
          return this.tourService.getById(tourId, false).pipe(
            map((tour) => ({
              id: tourId,
              tkId: tour.tkId ?? undefined,
              name: tour.name ?? undefined,
              destination: { continent: undefined, country: undefined },
              days: undefined,
              nights: undefined,
              rating: undefined,
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
            
            return this.locationService.getLocationsByIds(locationIds).pipe(
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

        // Obtener departures para extraer monthTags desde las fechas
        const departureRequests = itineraries.map((itinerary) =>
          this.departureService.getByItinerary(itinerary.id, false).pipe(
            catchError(() => of([] as IDepartureResponse[]))
          )
        );

        const monthTagsRequest = departureRequests.length > 0 
          ? forkJoin(departureRequests).pipe(
              map((departureArrays: IDepartureResponse[][]) => {
                const allDepartures = departureArrays.flat();
                const availableMonths: string[] = [];
                
                // Extraer meses de las fechas de departure
                allDepartures.forEach((departure: IDepartureResponse) => {
                  if (departure.departureDate) {
                    const date = new Date(departure.departureDate);
                    const monthIndex = date.getMonth(); // 0-11
                    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    if (monthIndex >= 0 && monthIndex < 12) {
                      const monthName = monthNames[monthIndex];
                      if (!availableMonths.includes(monthName)) {
                        availableMonths.push(monthName);
                      }
                    }
                  }
                });
                
                return availableMonths;
              }),
              catchError(() => of([]))
            )
          : of([]);

        return forkJoin({
          itineraryDays: itineraryDaysRequest,
          locationData: locationRequest,
          monthTags: monthTagsRequest,
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
              monthTags: monthTags.length > 0 ? monthTags : undefined,
              tourType: tourType,
              flightCity: 'Sin vuelo',
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
   * Dispara evento file_download cuando se descarga un presupuesto
   */
  trackFileDownload(fileName: string, userEmail: string): void {
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.fileDownload(fileName, userData);
      },
      error: () => {
        // Fallback sin datos de usuario - incluir todos los campos según estructura requerida
        this.analyticsService.fileDownload(fileName, {
          email_address: userEmail || '',
          phone_number: '',
          user_id: ''
        });
      }
    });
  }

  /**
   * Dispara evento share cuando se comparte un presupuesto
   */
  trackShare(fileName: string, userEmail: string): void {
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.share(fileName, userData);
      },
      error: () => {
        // Fallback sin datos de usuario - incluir todos los campos según estructura requerida
        this.analyticsService.share(fileName, {
          email_address: userEmail || '',
          phone_number: '',
          user_id: ''
        });
      }
    });
  }

  /**
   * Muestra mensaje de éxito
   */
  showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: '¡Éxito!',
      detail: message,
      life: 3000
    });
  }

  /**
   * Muestra mensaje de error
   */
  showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000
    });
  }

  /**
   * Muestra mensaje de información
   */
  showInfo(message: string): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Información',
      detail: message,
      life: 4000
    });
  }


  // ============================================
  // MÉTODOS PARA OBTENER DATOS DEL TOUR
  // ============================================

  /**
   * Obtiene la categoría del tour desde los datos disponibles
   */
  private getTourCategory(): string | undefined {
    // Si no hay datos reales, no devolver nada
    return undefined;
  }

  /**
   * Obtiene la subcategoría del tour desde los datos disponibles
   */
  private getTourSubcategory(): string | undefined {
    // Si no hay datos reales, no devolver nada
    return undefined;
  }

  /**
   * Obtiene el tipo del tour desde los datos disponibles
   */
  private getTourType(): string | undefined {
    // Si no hay datos reales, no devolver nada
    return undefined;
  }

  /**
   * Obtiene el tipo de viaje desde los datos disponibles
   */
  private getTripType(): string | undefined {
    // Si no hay datos reales, no devolver nada
    return undefined;
  }

  /**
   * Obtiene la puntuación del tour desde los datos disponibles
   */
  private getTourRating(): string | undefined {
    // Si no hay datos reales, no devolver nada
    return undefined;
  }

  /**
   * Obtiene la duración del tour desde los datos disponibles
   */
  private getTourDuration(): string | undefined {
    // Si no hay datos reales, no devolver nada
    return undefined;
  }

  // ============================================
  // MÉTODOS PARA MANEJAR PRESUPUESTOS CON NUEVOS ENDPOINTS
  // ============================================

  /**
   * Envía notificación de presupuesto usando el nuevo endpoint
   * @param reservationId ID de la reserva
   * @param email Email del destinatario
   * @returns Observable con la respuesta
   */
  sendBudgetNotification(reservationId: number, email: string): Observable<any> {
    return this.notificationService.sendBudgetNotification(reservationId, email);
  }

  /**
   * Obtiene o genera un documento de presupuesto
   * @param reservationId ID de la reserva
   * @returns Observable con el blob del documento
   */
  getBudgetDocument(reservationId: number): Observable<Blob> {
    return this.documentService.getBudgetDocument(reservationId);
  }

  /**
   * Descarga un presupuesto como PDF
   * @param reservationId ID de la reserva
   * @param fileName Nombre del archivo (opcional)
   * @returns Observable con el resultado de la descarga
   */
  downloadBudgetPDF(reservationId: number, fileName?: string): Observable<any> {
    return this.getBudgetDocument(reservationId).pipe(
      map((blob: Blob) => {
        const finalFileName = fileName || `presupuesto-${reservationId}-${new Date().toISOString().slice(0, 10)}.pdf`;
        this.documentService.downloadDocument(blob, finalFileName);
        
        return {
          success: true,
          message: 'Presupuesto descargado correctamente',
          fileName: finalFileName
        };
      }),
      catchError((error) => {
        console.error('Error al descargar presupuesto:', error);
        return of({
          success: false,
          message: 'Error al descargar el presupuesto. Inténtalo de nuevo.',
          error: error
        });
      })
    );
  }

  /**
   * Envía un presupuesto por email usando notificaciones
   * @param reservationId ID de la reserva
   * @param recipientEmail Email del destinatario
   * @param recipientName Nombre del destinatario (opcional)
   * @param message Mensaje personalizado (opcional)
   * @returns Observable con la respuesta
   */
  sendBudgetByEmail(reservationId: number, recipientEmail: string, recipientName?: string, message?: string): Observable<any> {
    return this.sendBudgetNotification(reservationId, recipientEmail).pipe(
      map((response) => {
        if (response.success) {
          return {
            success: true,
            message: `Presupuesto enviado exitosamente a ${recipientEmail}`,
            data: response
          };
        } else {
          return {
            success: false,
            message: 'Error al enviar el presupuesto por email',
            data: response
          };
        }
      }),
      catchError((error) => {
        console.error('Error al enviar presupuesto por email:', error);
        return of({
          success: false,
          message: 'Error al enviar el presupuesto por email. Inténtalo de nuevo.',
          error: error
        });
      })
    );
  }

  /**
   * Procesa el envío de presupuesto con datos del formulario
   * @param budgetData Datos del formulario de compartir
   * @returns Observable con la respuesta
   */
  processBudgetShare(budgetData: any): Observable<any> {
    const reservationId = budgetData.reservationId || this.getReservationIdFromContext();
    
    if (!reservationId) {
      return of({
        success: false,
        message: 'No se encontró información de la reserva'
      });
    }

    return this.sendBudgetByEmail(
      reservationId,
      budgetData.recipientEmail,
      budgetData.recipientName,
      budgetData.message
    );
  }

  /**
   * Procesa la descarga de presupuesto con datos del formulario
   * @param budgetData Datos del formulario de descarga
   * @returns Observable con la respuesta
   */
  processBudgetDownload(budgetData: any): Observable<any> {
    const reservationId = budgetData.reservationId || this.getReservationIdFromContext();
    
    if (!reservationId) {
      return of({
        success: false,
        message: 'No se encontró información de la reserva'
      });
    }

    const fileName = budgetData.tourName ? 
      `presupuesto-${budgetData.tourName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf` :
      undefined;

    return this.downloadBudgetPDF(reservationId, fileName);
  }

  /**
   * Obtiene el ID de reserva desde el contexto actual
   * @returns ID de la reserva o null si no está disponible
   */
  private getReservationIdFromContext(): number | null {
    // Intentar obtener el ID desde los datos del contexto
    // Esto puede venir de existingOrder o de otros datos disponibles
    return null; // Por ahora retornamos null, se puede implementar según la lógica específica
  }

  /**
   * Método unificado para manejar presupuestos (crear, actualizar, descargar, compartir)
   * @param action Acción a realizar: 'create', 'update', 'download', 'share'
   * @param data Datos necesarios para la acción
   * @returns Observable con la respuesta
   */
  handleBudgetAction(action: 'create' | 'update' | 'download' | 'share', data: any): Observable<any> {
    switch (action) {
      case 'create':
        return this.createBudget();
      
      case 'update':
        return this.updateExistingBudget(data.existingOrder, data.userEmail);
      
      case 'download':
        return this.processBudgetDownload(data);
      
      case 'share':
        return this.processBudgetShare(data);
      
      default:
        return of({
          success: false,
          message: 'Acción no válida'
        });
    }
  }

}

