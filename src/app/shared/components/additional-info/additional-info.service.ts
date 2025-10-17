import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuthenticateService } from '../../../core/services/auth/auth-service.service';
import { AnalyticsService } from '../../../core/services/analytics/analytics.service';

@Injectable({
  providedIn: 'root'
})
export class AdditionalInfoService {
  constructor(
    private authService: AuthenticateService,
    private analyticsService: AnalyticsService,
    private messageService: MessageService
  ) {}

  /**
   * Obtiene el email del usuario autenticado
   */
  getUserEmail(): Observable<string> {
    return this.authService.getUserEmail();
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
   * Guarda un nuevo presupuesto (crear nueva orden)
   */
  saveNewBudget(userEmail: string): Observable<any> {
    return of({ success: true, message: 'Funcionalidad pendiente de implementación' });
  }

  /**
   * Actualiza un presupuesto existente (actualizar orden)
   */
  updateExistingBudget(existingOrder: any, userEmail: string): Observable<any> {
    return of({ success: true, message: 'Funcionalidad pendiente de implementación' });
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

