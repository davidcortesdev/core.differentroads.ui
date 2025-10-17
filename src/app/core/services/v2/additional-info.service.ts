import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { AuthenticateService } from '../auth/auth-service.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ReservationService, ReservationCreate, ReservationUpdate } from '../reservation/reservation.service';

@Injectable({
  providedIn: 'root'
})
export class AdditionalInfoService {
  // Propiedades para almacenar datos del contexto
  private tourId: string = '';
  private periodId: string = '';
  private travelersData: any = null;
  private selectedFlight: any = null;
  private totalPrice: number = 0;

  constructor(
    private authService: AuthenticateService,
    private analyticsService: AnalyticsService,
    private messageService: MessageService,
    private reservationService: ReservationService
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
   * Construye los datos de reservación para crear una nueva orden
   * Diferencia entre contexto de tour (mínimo) y checkout (completo)
   */
  private buildReservationData(): ReservationCreate {
    const totalPassengers = this.travelersData ? 
      (this.travelersData.adults || 0) + (this.travelersData.childs || 0) + (this.travelersData.babies || 0) : 0;

    // Determinar si es contexto de checkout (datos completos) o tour (datos mínimos)
    const isCheckoutContext = totalPassengers > 0 && this.totalPrice > 0;
    
    return {
      id: 0, // Se asignará en el backend
      tkId: this.generateTokenId(),
      reservationStatusId: isCheckoutContext ? 1 : 0, // 1=draft (checkout), 0=interest (tour)
      retailerId: 1, // Default retailer - se puede configurar
      tourId: parseInt(this.tourId) || 0,
      departureId: parseInt(this.periodId) || 0,
      userId: null, // TODO: Obtener del usuario autenticado
      totalPassengers: isCheckoutContext ? totalPassengers : 0,
      totalAmount: isCheckoutContext ? this.totalPrice : 0,
      budgetAt: new Date().toISOString(),
      cartAt: '',
      abandonedAt: '',
      reservedAt: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
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
   * Guarda un nuevo presupuesto (crear nueva orden)
   */
  saveNewBudget(userEmail: string): Observable<any> {
    // Validar datos antes de proceder
    const validation = this.validateContextData();
    
    if (!validation.valid) {
      return of({ 
        success: false, 
        message: validation.message || 'Datos incompletos'
      });
    }

    // TODO: Conectar con API real cuando esté disponible
    // const reservationData = this.buildReservationData();
    // return this.reservationService.create(reservationData);
    
    // Determinar el tipo de guardado según el contexto
    const totalPassengers = this.travelersData ? 
      (this.travelersData.adults || 0) + (this.travelersData.childs || 0) + (this.travelersData.babies || 0) : 0;
    
    const isCheckoutContext = totalPassengers > 0 && this.totalPrice > 0;
    const message = isCheckoutContext 
      ? 'Presupuesto guardado correctamente'
      : 'Tour añadido a tus favoritos';
    
    // Simulación temporal
    return of({ 
      success: true, 
      message: message,
      data: this.buildReservationData()
    });
  }

  /**
   * Construye los datos de actualización para una orden existente
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
   * Actualiza un presupuesto existente (actualizar orden)
   */
  updateExistingBudget(existingOrder: any, userEmail: string): Observable<any> {
    // Validar datos antes de proceder
    const validation = this.validateContextData();
    
    if (!validation.valid) {
      return of({ 
        success: false, 
        message: validation.message || 'Datos incompletos para actualizar el presupuesto'
      });
    }

    if (!existingOrder || (!existingOrder.id && !existingOrder._id)) {
      return of({ 
        success: false, 
        message: 'No se encontró información de la orden existente' 
      });
    }

    // TODO: Conectar con API real cuando esté disponible
    // const updateData = this.buildReservationUpdateData(existingOrder);
    // return this.reservationService.update(existingOrder.id, updateData);
    
    // Simulación temporal
    return of({ 
      success: true, 
      message: 'Presupuesto actualizado correctamente',
      data: this.buildReservationUpdateData(existingOrder)
    });
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
   * Envía el presupuesto por email a otra persona
   */
  sendBudgetByEmail(budgetData: any): Observable<any> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          success: true,
          message: 'Email enviado correctamente',
          data: budgetData
        });
        observer.complete();
      }, 2000);
    });
  }

  /**
   * Descarga el presupuesto como PDF y lo envía por email
   */
  downloadBudgetPDF(budgetData: any): Observable<any> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          success: true,
          message: 'PDF generado y enviado por email',
          pdfUrl: '#',
          fileName: `presupuesto-${budgetData.tourName.replace(/\s+/g, '-')}.pdf`
        });
        observer.complete();
      }, 2000);
    });
  }

}

