import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { AuthenticateService } from '../auth/auth-service.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ReservationService, ReservationCreate, ReservationUpdate } from '../reservation/reservation.service';
import { UsersNetService } from '../users/usersNet.service';
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

  constructor(
    private http: HttpClient,
    private authService: AuthenticateService,
    private analyticsService: AnalyticsService,
    private messageService: MessageService,
    private reservationService: ReservationService,
    private usersNetService: UsersNetService
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
  }): void {
    if (data.tourId) this.tourId = data.tourId;
    if (data.periodId) this.periodId = data.periodId;
    if (data.travelersData) this.travelersData = data.travelersData;
    if (data.selectedFlight) this.selectedFlight = data.selectedFlight;
    if (data.totalPrice) this.totalPrice = data.totalPrice;
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
      id: 0,
      tkId: '',
      reservationStatusId: 3, // 3 = BUDGET (presupuesto)
      retailerId: environment.retaileriddefault,
      tourId: parseInt(this.tourId) || 0,
      departureId: parseInt(this.periodId) || 0,
      userId: userId,
      totalPassengers: this.travelersData ? 
        (this.travelersData.adults || 0) + (this.travelersData.childs || 0) + (this.travelersData.babies || 0) : 1,
      totalAmount: this.totalPrice || 0,
      budgetAt: new Date().toISOString(),
      cartAt: '',
      abandonedAt: '',
      reservedAt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Crea un nuevo presupuesto en el backend
   * @returns Observable con la reserva creada
   */
  createBudget(): Observable<any> {
    return this.authService.getCognitoId().pipe(
      switchMap(cognitoId => {
        if (!cognitoId) {
          console.warn('⚠️ No se encontró Cognito ID, creando presupuesto sin userId');
          const reservationData = this.buildReservationData(null);
          console.log('📋 Creando PRESUPUESTO desde additional-info (sin userId):', reservationData);
          return this.reservationService.create(reservationData);
        }
        
        // Buscar el usuario por Cognito ID para obtener su ID en la base de datos
        return this.usersNetService.getUsersByCognitoId(cognitoId).pipe(
          map((users: any[]) => {
            const userId = users && users.length > 0 ? users[0].id : null;
            console.log('👤 Usuario encontrado:', { cognitoId, userId });
            return userId;
          }),
          map((userId: number | null) => this.buildReservationData(userId)),
          map((reservationData: ReservationCreate) => {
            console.log('📋 Creando PRESUPUESTO desde additional-info:', reservationData);
            console.log('📋 Datos completos enviados al backend:', JSON.stringify(reservationData, null, 2));
            return reservationData;
          }),
          switchMap((reservationData: ReservationCreate) => this.reservationService.create(reservationData))
        );
      }),
      catchError(error => {
        console.error('Error en createBudget:', error);
        throw error;
      })
    );
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
      id: existingOrder.id || existingOrder._id,
      tkId: existingOrder.tkId || existingOrder.tokenId || this.generateTokenId(),
      reservationStatusId: existingOrder.reservationStatusId || 1,
      retailerId: existingOrder.retailerId || 1,
      tourId: parseInt(this.tourId) || existingOrder.tourId || 0,
      departureId: parseInt(this.periodId) || existingOrder.departureId || 0,
      userId: existingOrder.userId || null,
      totalPassengers: totalPassengers,
      totalAmount: this.totalPrice || existingOrder.totalAmount || 0,
      budgetAt: existingOrder.budgetAt || new Date().toISOString(),
      cartAt: existingOrder.cartAt || '',
      abandonedAt: existingOrder.abandonedAt || '',
      reservedAt: existingOrder.reservedAt || '',
      createdAt: existingOrder.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
    // Obtener datos del usuario para analytics
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        // Construir item para el evento ecommerce con todas las propiedades obligatorias
        const item: any = {
          item_id: tourId,
          item_name: tourName,
          coupon: '',
          discount: 0,
          index: 1,
          item_brand: 'Different Roads',
          item_category: tourData?.category || '',
          item_category2: tourData?.subcategory || '',
          item_category3: tourData?.type || '',
          item_category4: periodDates,
          item_category5: tourData?.tripType || '',
          item_list_id: tourData?.listId || '',
          item_list_name: tourData?.listName || '',
          item_variant: '',
          price: this.totalPrice || 0,
          quantity: 1,
          puntuacion: tourData?.rating || '',
          duracion: tourData?.duration || ''
        };

        // Disparar evento add_to_wishlist
        this.analyticsService.addToWishlist(
          tourData?.listId || '',
          tourData?.listName || '',
          item,
          userData
        );
      },
      error: (error) => {
        // Fallback sin datos de usuario
        const item: any = {
          item_id: tourId,
          item_name: tourName,
          coupon: '',
          discount: 0,
          index: 1,
          item_brand: 'Different Roads',
          item_category: tourData?.category || '',
          item_category2: tourData?.subcategory || '',
          item_category3: tourData?.type || '',
          item_category4: periodDates,
          item_category5: tourData?.tripType || '',
          item_list_id: tourData?.listId || '',
          item_list_name: tourData?.listName || '',
          item_variant: '',
          price: this.totalPrice || 0,
          quantity: 1,
          puntuacion: tourData?.rating || '',
          duracion: tourData?.duration || ''
        };

        this.analyticsService.addToWishlist(
          tourData?.listId || '',
          tourData?.listName || '',
          item,
          { email_address: userEmail }
        );
      }
    });
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
        // Fallback sin datos de usuario
        this.analyticsService.fileDownload(fileName, { email_address: userEmail });
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
        // Fallback sin datos de usuario
        this.analyticsService.share(fileName, { email_address: userEmail });
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

  /**
   * Envía el presupuesto por email a través del backend
   * 
   * Endpoint: POST /api/budgets/share
   * Descripción: Comparte un presupuesto con otra persona mediante email
   * 
   * @param budgetData Datos del presupuesto y destinatario
   * @returns Observable con la respuesta del servidor
   */
  sendBudgetByEmail(budgetData: any): Observable<any> {
    return of({
      success: true,
      message: 'Email enviado correctamente',
      data: { id: 'share_' + Date.now(), status: 'sent' }
    });
    
    // TODO: Descomentar cuando el backend implemente el endpoint
    /*
    return this.http.post(`${this.API_BASE_URL}/budgets/share`, budgetData).pipe(
      map((response: any) => ({
        success: true,
        message: 'Email enviado correctamente',
        data: response
      }))
    );
    */
  }

  /**
   * Descarga el presupuesto como PDF desde el backend
   * 
   * Endpoint: POST /api/budgets/download
   * Descripción: Genera y descarga un PDF del presupuesto
   * Response-Type: application/pdf (blob)
   * 
   * @param userEmail Email del usuario autenticado
   * @returns Observable con la respuesta del servidor
   */
  downloadBudgetPDF(userEmail: string): Observable<any> {
    // Validación previa de datos requeridos
    const validation = this.validateContextData();
    
    if (!validation.valid) {
      return of({ 
        success: false, 
        message: validation.message || 'Datos incompletos para descargar el presupuesto'
      });
    }

    // Construcción de datos para la generación del PDF
    const downloadData = this.buildReservationData(null);
    
    // Simular descarga de PDF
    const fileName = `presupuesto-${this.tourId}-${Date.now()}.pdf`;
    const mockContent = 'Presupuesto simulado - ' + new Date().toISOString();
    const blob = new Blob([mockContent], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return of({
      success: true,
      message: 'Presupuesto descargado correctamente',
      fileName: fileName
    });
    
    // TODO: Descomentar cuando el backend implemente el endpoint
    /*
    return this.http.post(`${this.API_BASE_URL}/budgets/download`, downloadData, { 
      responseType: 'blob' 
    }).pipe(
      map((blob: Blob) => {
        // Procesamiento del blob PDF recibido del backend
        const fileName = `presupuesto-${this.tourId}-${Date.now()}.pdf`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        return {
          success: true,
          message: 'Presupuesto descargado correctamente',
          fileName: fileName
        };
      })
    );
    */
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

}

