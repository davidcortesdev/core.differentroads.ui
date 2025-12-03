import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Order } from '../../../core/models/orders/order.model';
import { AdditionalInfoService } from '../../../core/services/v2/additional-info.service';
import { ReservationService } from '../../../core/services/reservation/reservation.service';
import { ReservationStatusService } from '../../../core/services/reservation/reservation-status.service';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-additional-info',
  standalone: false,
  templateUrl: './additional-info.component.html',
  styleUrl: './additional-info.component.scss',
})
export class AdditionalInfoComponent implements OnInit, OnDestroy {
  // Inputs para recibir datos del contexto donde se use (tour-v2 o checkout-v2)
  // Puede ser Order (desde el contexto de profile) o IReservationResponse (desde checkout)
  @Input() existingOrder: any | null = null;
  @Input() tourId: string = ''; // ID del tour
  @Input() tourName: string = '';
  @Input() periodName: string = '';
  @Input() periodDates: string = '';
  @Input() selectedFlight: any = null;
  @Input() travelersSelected: any = { adults: 0, childs: 0, babies: 0 };
  @Input() periodID: string = '';
  @Input() selectedDeparture: any = null; // Para compatibilidad con tour
  @Input() isAuthenticated: boolean = false;
  @Input() infoCards: any[] = []; // Para mostrar información adicional si es necesario
  @Input() context: 'checkout' | 'tour' = 'checkout'; // Contexto para aplicar estilos específicos
  @Input() totalPrice: number = 0; // Precio total del tour
  @Input() selectedActivities: any[] = []; // Actividades seleccionadas
  @Input() totalPassengers: number = 1; // Total de pasajeros
  
  // Inputs para datos del tour (analytics)
  @Input() tourCountry: string = '';
  @Input() tourContinent: string = '';
  @Input() tourRating: number | null = null;
  @Input() tourDuration: string = '';
  @Input() tourTripType: string = '';
  @Input() tourProductStyle: string = '';
  @Input() tourListId: string = ''; // ID de la lista del tour para analytics
  @Input() tourListName: string = ''; // Nombre de la lista del tour para analytics
  @Input() isStandaloneMode: boolean = false; // Modo standalone desde checkout (TourOperator)

  // Estados del componente
  visible: boolean = false;
  loginDialogVisible: boolean = false;
  loading: boolean = false;
  userEmail: string = '';

  // Flags para controlar el comportamiento de los modales
  shouldClearFields: boolean = false;
  isDownloadMode: boolean = false;
  isShareMode: boolean = false;

  // ID de la reserva generada para evitar crear múltiples reservas
  private generatedReservationId: number | null = null;
  
  // Flag para controlar si ya se actualizó el estado a BUDGET (solo una vez)
  private budgetStatusUpdated: boolean = false;

  // Configuración de diálogos
  dialogBreakpoints = { '1199px': '80vw', '575px': '90vw' };
  dialogStyle = { width: '50vw' };

  // Formulario para compartir/descargar
  shareForm!: FormGroup;

  // Suscripciones
  private subscription: Subscription = new Subscription();

  // Getter para determinar si estamos en modo actualización (checkout) o creación (tour detail)
  get isUpdateMode(): boolean {
    return !!this.existingOrder;
  }

  // Getter para verificar si hay tarjetas de información
  get hasInfoCards(): boolean {
    return this.infoCards.length > 0;
  }

  // Getter para información de viajeros formateada
  get formattedInfoCards(): any[] {
    return this.infoCards;
  }

  // ✅ GETTER: Verificar si hay fecha seleccionada
  get hasSelectedDate(): boolean {
    // En modo checkout siempre hay fecha (ya hay una reserva)
    if (this.context === 'checkout') {
      return true;
    }
    // En modo tour, verificar si hay selectedDeparture con fecha
    return !!(
      this.selectedDeparture &&
      this.selectedDeparture.departureDate
    );
  }

  constructor(
    private additionalInfoService: AdditionalInfoService,
    private router: Router,
    private formBuilder: FormBuilder,
    private reservationService: ReservationService,
    private reservationStatusService: ReservationStatusService
  ) {
    // Inicializar formulario
    this.initializeForm();
  }

  ngOnInit(): void {
    // Verificar autenticación y obtener email del usuario
    this.checkAuthentication();
    // Establecer datos del contexto para el servicio
    this.setContextData();
  }

  /**
   * Establece los datos del contexto en el servicio
   */
  private setContextData(): void {
    // Usar tourId si está disponible, sino usar selectedDeparture
    const tourId = this.tourId || (this.selectedDeparture?.tourId?.toString()) || '';
    const periodId = this.periodID || (this.selectedDeparture?.id?.toString()) || '';
    
    this.additionalInfoService.setContextData({
      tourId: tourId,
      periodId: periodId,
      travelersData: this.travelersSelected,
      selectedFlight: this.selectedFlight,
      totalPrice: this.calculateTotalPrice(),
      selectedActivities: this.selectedActivities,
      ageGroupCategories: this.getAgeGroupCategories(),
      selectedActivityPackId: this.getSelectedActivityPackId()
    });
  }

  /**
   * Calcula el precio total basado en los datos disponibles
   * Incluye actividades como tour-header-v2
   */
  private calculateTotalPrice(): number {
    const activitiesTotal = this.selectedActivities
      .filter((activity) => activity.added)
      .reduce((sum, activity) => sum + (activity.price || 0), 0);

    return (this.totalPrice || 0) + activitiesTotal;
  }

  /**
   * ✅ MÉTODO NUEVO: Obtener age group categories desde el contexto
   * En el contexto de additional-info, estos datos pueden no estar disponibles
   */
  private getAgeGroupCategories(): any {
    // En el contexto de additional-info, es posible que no tengamos age groups
    // Por ahora retornamos valores por defecto que funcionarán para presupuestos básicos
    return {
      adults: { id: 1 }, // ID por defecto para adultos
      children: { id: 2 }, // ID por defecto para niños
      babies: { id: 3 } // ID por defecto para bebés
    };
  }

  /**
   * ✅ MÉTODO NUEVO: Obtener selected activity pack ID desde el contexto
   */
  private getSelectedActivityPackId(): number | null {
    // En el contexto de additional-info, es posible que no tengamos este dato
    // Por ahora retornamos null, pero se puede extender si es necesario
    return null;
  }

  /**
   * Obtiene el texto del botón según el contexto
   */
  getSaveButtonText(): string {
    return 'Guarda tu presupuesto';
  }

  /**
   * ✅ MÉTODO: Obtener tooltip para el botón de guardar
   */
  getSaveButtonTooltip(): string {
    if (!this.hasSelectedDate && this.context === 'tour') {
      return 'Debes seleccionar una fecha de salida para poder guardar el presupuesto';
    }
    if (!this.isAuthenticated) {
      return 'Para guardar tu presupuesto debes iniciar sesión o registrarte en la plataforma';
    }
    return 'Guarda este presupuesto en tu perfil para consultarlo más tarde';
  }

  /**
   * ✅ MÉTODO: Obtener tooltip para el botón de descargar
   */
  getDownloadButtonTooltip(): string {
    if (!this.hasSelectedDate && this.context === 'tour') {
      return 'Debes seleccionar una fecha de salida para poder descargar el presupuesto';
    }
    return 'Envia un email con un PDF con toda la información de este presupuesto';
  }

  /**
   * ✅ MÉTODO: Obtener tooltip para el botón de compartir
   */
  getShareButtonTooltip(): string {
    if (!this.hasSelectedDate && this.context === 'tour') {
      return 'Debes seleccionar una fecha de salida para poder compartir el presupuesto';
    }
    return 'Comparte este presupuesto con amigos o familiares';
  }

  /**
   * Inicializa el formulario reactivo
   */
  private initializeForm(): void {
    this.shareForm = this.formBuilder.group({
      recipientEmail: ['', [Validators.required, Validators.email]],
      recipientName: [''],
      message: [''],
      includeDetails: [true]
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    // Limpiar datos del contexto
    this.additionalInfoService.clearContextData();
    // Limpiar ID de reserva generada
    this.generatedReservationId = null;
    // Resetear flag de estado actualizado
    this.budgetStatusUpdated = false;
  }

  /**
   * Limpia el ID de la reserva generada
   * Útil cuando el usuario cambia de tour o quiere empezar de nuevo
   */
  clearGeneratedReservationId(): void {
    this.generatedReservationId = null;
    this.budgetStatusUpdated = false; // Resetear para permitir nueva actualización
  }

  /**
   * Verifica el estado de autenticación del usuario
   */
  private checkAuthentication(): void {
    const authSub = this.additionalInfoService.isAuthenticated().subscribe({
      next: (isAuthenticated) => {
        this.isAuthenticated = isAuthenticated;
        if (isAuthenticated) {
          this.loadUserEmail();
        }
      },
      error: () => {}
    });
    this.subscription.add(authSub);
  }

  /**
   * Carga el email del usuario autenticado
   */
  private loadUserEmail(): void {
    const emailSub = this.additionalInfoService.getUserEmail().subscribe({
      next: (email) => {
        this.userEmail = email;
      },
      error: () => {}
    });
    this.subscription.add(emailSub);
  }

  /**
   * Maneja el guardado del presupuesto
   */
  handleSaveTrip(): void {
    // Verificar que haya fecha seleccionada en modo tour
    if (this.context === 'tour' && !this.hasSelectedDate) {
      this.additionalInfoService.showInfo(
        'Debes seleccionar una fecha de salida para poder guardar el presupuesto.'
      );
      return;
    }

    this.isDownloadMode = false;
    this.isShareMode = false;

    // Si es standalone (TourOperator), no pedir autenticación
    if (!this.isStandaloneMode && !this.isAuthenticated) {
      const currentUrl = window.location.pathname;
      sessionStorage.setItem('redirectUrl', currentUrl);
      this.loginDialogVisible = true;
      return;
    }

    this.saveBudget();
  }

  /**
   * Maneja la descarga directa del presupuesto
   */
  handleDownloadTrip(): void {
    // Verificar que haya fecha seleccionada en modo tour
    if (this.context === 'tour' && !this.hasSelectedDate) {
      this.additionalInfoService.showInfo(
        'Debes seleccionar una fecha de salida para poder descargar el presupuesto.'
      );
      return;
    }

    // Si es standalone (TourOperator), no pedir autenticación
    if (!this.isStandaloneMode && !this.isAuthenticated) {
      const currentUrl = window.location.pathname;
      sessionStorage.setItem('redirectUrl', currentUrl);
      this.loginDialogVisible = true;
      this.additionalInfoService.showInfo(
        'Debes iniciar sesión para descargar el presupuesto.'
      );
      return;
    }

    // Disparar evento de analytics: file_download al hacer clic en el botón
    this.trackFileDownload();
    this.downloadBudget();
  }

  /**
   * Descarga el presupuesto directamente
   */
  private downloadBudget(): void {
    // En modo standalone (TourOperator), permitir continuar sin userEmail si hay una reserva existente
    if (!this.isStandaloneMode && !this.userEmail) {
      this.additionalInfoService.showError(
        'No se pudo obtener la información del usuario. Por favor, inténtalo de nuevo.'
      );
      return;
    }

    this.loading = true;

    // Obtener el ID de la reserva desde el contexto
    const reservationId = this.getReservationId();
    
    if (!reservationId) {
      // En modo tour, no hay reserva existente, necesitamos crear una primero
      if (this.context === 'tour') {
        this.createBudgetAndDownload();
        return;
      } else {
        this.loading = false;
        this.additionalInfoService.showError(
          'No se encontró información de la reserva para descargar el presupuesto.'
        );
        return;
      }
    }

    // Usar el nuevo método para descargar el presupuesto
    this.additionalInfoService.downloadBudgetPDF(reservationId).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.additionalInfoService.showSuccess(response.message);
        } else {
          this.additionalInfoService.showError(response.message);
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al descargar presupuesto:', error);
        this.additionalInfoService.showError('Error al descargar el presupuesto. Inténtalo de nuevo.');
      }
    });
  }

  /**
   * Maneja compartir el presupuesto con alguien
   */
  handleInviteFriend(): void {
    // Verificar que haya fecha seleccionada en modo tour
    if (this.context === 'tour' && !this.hasSelectedDate) {
      this.additionalInfoService.showInfo(
        'Debes seleccionar una fecha de salida para poder compartir el presupuesto.'
      );
      return;
    }

    this.shouldClearFields = true;
    this.isShareMode = true;
    this.isDownloadMode = false;
    
    this.shareForm.reset({
      recipientEmail: '',
      recipientName: '',
      message: '',
      includeDetails: true
    });
    
    this.visible = true;
  }

  /**
   * Guarda el presupuesto (crear nuevo o actualizar existente)
   */
  private saveBudget(): void {
    // En modo standalone (TourOperator), permitir continuar sin userEmail si hay una reserva existente
    if (!this.isStandaloneMode && !this.userEmail) {
      this.additionalInfoService.showError(
        'No se pudo obtener la información del usuario. Por favor, inténtalo de nuevo.'
      );
      return;
    }

    // Actualizar datos del contexto antes de guardar
    this.setContextData();

    this.loading = true;

    if (this.isUpdateMode) {
      // Modo actualización (desde checkout)
      // Cambia el estado de la reserva existente de 'Cart' o similar a 'BUDGET'
      this.updateBudget();
    } else {
      // Modo creación (desde tour detail)
      // Crea una nueva reserva con estado 'BUDGET'
      this.createBudget();
    }
  }

  /**
   * Crea un nuevo presupuesto
   */
  private createBudget(): void {
    // Delegar la creación al servicio
    this.additionalInfoService.createBudget().subscribe({
      next: (createdReservation) => {
        this.loading = false;
        this.additionalInfoService.showSuccess(
          'Presupuesto guardado correctamente. Puedes verlo en tu perfil en el apartado "Presupuestos recientes".'
        );
        
        // Disparar evento de analytics: add_to_wishlist
        this.trackAddToWishlist();
        
        // No navegar al checkout, solo mostrar notificación
      },
      error: (error) => {
        console.error('Error al crear presupuesto:', error);
        this.loading = false;
        this.additionalInfoService.showError('No se pudo guardar el presupuesto. Inténtalo de nuevo.');
      }
    });
  }

  /**
   * Actualiza un presupuesto existente
   * El estado se actualiza automáticamente a BUDGET al obtener el ID de la reserva
   */
  private updateBudget(): void {
    if (!this.existingOrder) {
      this.additionalInfoService.showError('No se encontró información de la orden existente.');
      this.loading = false;
      return;
    }

    // Obtener ID de reserva (esto automáticamente actualiza el estado a BUDGET si es necesario)
    const reservationId = this.getReservationId();
    if (!reservationId) {
      this.additionalInfoService.showError('No se pudo obtener el ID de la reserva.');
      this.loading = false;
      return;
    }

    // Mostrar mensaje de éxito
    this.loading = false;
    this.additionalInfoService.showSuccess('Presupuesto actualizado correctamente');
    // Disparar evento de analytics: add_to_wishlist (también en modo actualización)
    this.trackAddToWishlist();
  }

  /**
   * Cierra el modal de presupuesto
   */
  handleCloseModal(): void {
    this.visible = false;
    // Restablecer flags y formulario después de cerrar
    setTimeout(() => {
      this.shouldClearFields = false;
      this.isDownloadMode = false;
      this.isShareMode = false;
      this.shareForm.reset({
        recipientEmail: '',
        recipientName: '',
        message: '',
        includeDetails: true
      });
    }, 100);
  }

  /**
   * Maneja el envío del formulario de compartir/descargar
   */
  onSubmitShare(): void {
    // En modo compartir, solo validar el email
    if (this.isShareMode) {
      const emailControl = this.shareForm.get('recipientEmail');
      if (!emailControl || emailControl.invalid) {
        emailControl?.markAsTouched();
        return;
      }
    } else {
      // En modo descarga, validar todo el formulario
      if (this.shareForm.invalid) {
        Object.keys(this.shareForm.controls).forEach(key => {
          this.shareForm.get(key)?.markAsTouched();
        });
        return;
      }
    }

    this.loading = true;
    const formData = this.shareForm.value;

    if (this.isShareMode) {
      this.handleShareMode(formData);
    } else {
      this.handleDownloadMode(formData);
    }
  }

  /**
   * Procesa el envío de presupuesto a otra persona
   */
  private handleShareMode(formData: any): void {
    // Disparar evento de analytics: share al hacer clic en el botón
    this.trackShare();
    
    const budgetData = {
      recipientEmail: formData.recipientEmail,
      recipientName: formData.recipientName || '',
      message: formData.message || '',
      includeDetails: formData.includeDetails,
      tourName: this.tourName,
      periodName: this.periodName,
      periodDates: this.periodDates,
      flightInfo: this.selectedFlight?.name || 'Sin vuelo',
      travelers: this.travelersSelected,
      reservationId: this.getReservationId(),
      isShareMode: true
    };

    // Obtener el ID de la reserva
    const reservationId = this.getReservationId();
    
    if (!reservationId) {
      // En modo tour, no hay reserva existente, necesitamos crear una primero
      if (this.context === 'tour') {
        this.createBudgetAndShare(formData);
        return;
      } else {
        this.loading = false;
        this.additionalInfoService.showError(
          'No se encontró información de la reserva para compartir el presupuesto.'
        );
        return;
      }
    }

    // Usar el nuevo método para enviar el presupuesto por email
    this.additionalInfoService.sendBudgetByEmail(
      reservationId,
      formData.recipientEmail,
      formData.recipientName,
      formData.message
    ).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.additionalInfoService.showSuccess(response.message);
        } else {
          this.additionalInfoService.showError(response.message);
        }
        this.handleCloseModal();
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al compartir presupuesto:', error);
        this.additionalInfoService.showError('Error al compartir el presupuesto. Inténtalo de nuevo.');
      }
    });
  }

  /**
   * Procesa la descarga del presupuesto en PDF
   */
  private handleDownloadMode(formData: any): void {
    // Disparar evento de analytics: file_download al hacer clic en el botón
    this.trackFileDownload();
    
    const budgetData = {
      recipientEmail: formData.recipientEmail,
      message: formData.message || '',
      tourName: this.tourName,
      periodName: this.periodName,
      periodDates: this.periodDates,
      flightInfo: this.selectedFlight?.name || 'Sin vuelo',
      travelers: this.travelersSelected,
      reservationId: this.getReservationId()
    };

    // Obtener el ID de la reserva
    const reservationId = this.getReservationId();
    
    if (!reservationId) {
      // En modo tour, no hay reserva existente, necesitamos crear una primero
      if (this.context === 'tour') {
        this.createBudgetAndDownloadWithEmail(formData);
        return;
      } else {
        this.loading = false;
        this.additionalInfoService.showError(
          'No se encontró información de la reserva para descargar el presupuesto.'
        );
        return;
      }
    }

    const downloadSub = this.additionalInfoService.downloadBudgetPDF(reservationId).subscribe({
      next: (response) => {
        this.loading = false;

        if (response.success) {
          this.additionalInfoService.showSuccess(
            `Presupuesto descargado y enviado a ${formData.recipientEmail}`
          );
        } else {
          this.additionalInfoService.showError(response.message);
        }
        
        this.handleCloseModal();
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al descargar presupuesto:', error);
        this.additionalInfoService.showError(
          'Ha ocurrido un error al descargar el presupuesto. Por favor, inténtalo de nuevo.'
        );
      }
    });

    this.subscription.add(downloadSub);
  }

  /**
   * Descarga un archivo PDF desde un Blob
   */
  private downloadPDFFromBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Descarga un archivo PDF desde una URL
   */
  private downloadPDFFromURL(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.click();
  }

  /**
   * Cierra el modal de login
   */
  closeLoginModal(): void {
    this.loginDialogVisible = false;
  }

  /**
   * Navega a la página de login
   */
  navigateToLogin(): void {
    this.closeLoginModal();
    this.router.navigate(['/login']);
  }

  /**
   * Navega a la página de registro
   */
  navigateToRegister(): void {
    this.closeLoginModal();
    this.router.navigate(['/sign-up']);
  }

  // ============================================
  // MÉTODOS DE ANALYTICS
  // ============================================

  /**
   * Dispara evento add_to_wishlist cuando se guarda un presupuesto
   * Evento 4 del plan de medición
   */
  private trackAddToWishlist(): void {
    this.additionalInfoService.trackAddToWishlist(
      this.tourId,
      this.tourName,
      this.periodID,
      this.periodName,
      this.periodDates,
      this.travelersSelected,
      this.userEmail,
      this.getTourData() // Pasar datos completos del tour
    );
  }

  /**
   * Obtiene los datos completos del tour para analytics
   */
  private getTourData(): any {
    return {
      category: this.getTourCategory(),
      subcategory: this.getTourSubcategory(),
      type: this.getTourType(),
      tripType: this.getTripType(),
      rating: this.getTourRating(),
      duration: this.getTourDuration(),
      listId: this.tourListId || '',
      listName: this.tourListName || ''
    };
  }

  /**
   * Obtiene la categoría del tour (continente) desde los datos disponibles
   */
  private getTourCategory(): string {
    return this.tourContinent || '';
  }

  /**
   * Obtiene la subcategoría del tour (país) desde los datos disponibles
   */
  private getTourSubcategory(): string {
    return this.tourCountry || '';
  }

  /**
   * Obtiene el tipo del tour (estilo de producto) desde los datos disponibles
   */
  private getTourType(): string {
    return this.tourProductStyle || '';
  }

  /**
   * Obtiene el tipo de viaje desde los datos disponibles
   */
  private getTripType(): string {
    return this.tourTripType || '';
  }

  /**
   * Obtiene la puntuación del tour desde los datos disponibles
   */
  private getTourRating(): string {
    return this.tourRating ? this.tourRating.toString() : '';
  }

  /**
   * Obtiene la duración del tour desde los datos disponibles
   */
  private getTourDuration(): string {
    return this.tourDuration || '';
  }

  /**
   * Dispara evento file_download cuando se descarga un presupuesto
   * Evento 28 del plan de medición
   */
  private trackFileDownload(): void {
    this.additionalInfoService.trackFileDownload(
      'Presupuesto',
      this.userEmail
    );
  }

  /**
   * Dispara evento share cuando se comparte un presupuesto
   * Evento 29 del plan de medición
   */
  private trackShare(): void {
    this.additionalInfoService.trackShare(
      'Presupuesto',
      this.userEmail
    );
  }

  /**
   * Obtiene el ID de la reserva desde el contexto actual
   * Si es modo checkout, actualiza el estado a BUDGET la primera vez
   * @returns ID de la reserva o null si no está disponible
   */
  private getReservationId(): number | null {
    // Intentar obtener el ID desde existingOrder (modo actualización)
    if (this.existingOrder && (this.existingOrder._id || this.existingOrder.ID || this.existingOrder.id)) {
      const id = this.existingOrder._id || this.existingOrder.ID || this.existingOrder.id;
      const reservationId = typeof id === 'string' ? parseInt(id, 10) : id;
      
      // Si es modo checkout y aún no se ha actualizado el estado, hacerlo ahora
      if (this.isUpdateMode && !this.budgetStatusUpdated) {
        this.updateStatusToBudget(reservationId);
      }
      
      return reservationId;
    }

    // Si hay una reserva generada previamente, usar esa
    if (this.generatedReservationId) {
      return this.generatedReservationId;
    }

    // En modo creación, no tenemos ID de reserva aún
    return null;
  }

  /**
   * Actualiza el estado de la reserva a BUDGET (solo una vez)
   */
  private updateStatusToBudget(reservationId: number): void {
    this.budgetStatusUpdated = true; // Marcar como actualizado para evitar múltiples llamadas
    
    this.reservationStatusService.getByCode('BUDGET').subscribe({
      next: (budgetStatuses) => {
        if (budgetStatuses && budgetStatuses.length > 0) {
          const budgetStatusId = budgetStatuses[0].id;
          
          this.reservationService.updateStatus(reservationId, budgetStatusId).subscribe({
            next: (success) => {
              if (success) {
                console.log('✅ Estado de reserva actualizado a BUDGET:', reservationId);
              } else {
                console.warn('⚠️ No se pudo actualizar el estado de la reserva:', reservationId);
              }
            },
            error: (error) => {
              console.error('❌ Error al actualizar estado de reserva:', error);
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ Error al obtener estado BUDGET:', error);
      }
    });
  }

  /**
   * Crea un presupuesto y luego procede con la descarga
   */
  private createBudgetAndDownload(): void {
    // Actualizar datos del contexto antes de crear la reserva
    this.setContextData();
    
    this.additionalInfoService.createBudget().subscribe({
      next: (createdReservation) => {
        // Una vez creada la reserva, guardar el ID y proceder con la descarga
        const reservationId = createdReservation.id || createdReservation.ID;
        if (reservationId) {
          // Guardar el ID de la reserva generada para futuras operaciones
          this.generatedReservationId = reservationId;
          
          this.additionalInfoService.downloadBudgetPDF(reservationId).subscribe({
            next: (response) => {
              this.loading = false;
              if (response.success) {
                this.additionalInfoService.showSuccess(response.message);
                // NO disparar evento file_download aquí - solo cuando el usuario hace clic explícitamente en "Descargar"
              } else {
                this.additionalInfoService.showError(response.message);
              }
            },
            error: (error) => {
              this.loading = false;
              console.error('Error al descargar presupuesto:', error);
              this.additionalInfoService.showError('Error al descargar el presupuesto. Inténtalo de nuevo.');
            }
          });
        } else {
          this.loading = false;
          this.additionalInfoService.showError('No se pudo obtener el ID de la reserva creada.');
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al crear presupuesto:', error);
        this.additionalInfoService.showError('No se pudo crear el presupuesto. Inténtalo de nuevo.');
      }
    });
  }

  /**
   * Crea un presupuesto y luego procede con compartir
   */
  private createBudgetAndShare(formData: any): void {
    // Actualizar datos del contexto antes de crear la reserva
    this.setContextData();
    
    this.additionalInfoService.createBudget().subscribe({
      next: (createdReservation) => {
        // Una vez creada la reserva, guardar el ID y proceder con compartir
        const reservationId = createdReservation.id || createdReservation.ID;
        if (reservationId) {
          // Guardar el ID de la reserva generada para futuras operaciones
          this.generatedReservationId = reservationId;
          
          this.additionalInfoService.sendBudgetByEmail(
            reservationId,
            formData.recipientEmail,
            formData.recipientName,
            formData.message
          ).subscribe({
            next: (response) => {
              this.loading = false;
              if (response.success) {
                this.additionalInfoService.showSuccess(response.message);
                // NO disparar evento share aquí - ya se disparó al hacer clic en el botón
              } else {
                this.additionalInfoService.showError(response.message);
              }
              this.handleCloseModal();
            },
            error: (error) => {
              this.loading = false;
              console.error('Error al compartir presupuesto:', error);
              this.additionalInfoService.showError('Error al compartir el presupuesto. Inténtalo de nuevo.');
            }
          });
        } else {
          this.loading = false;
          this.additionalInfoService.showError('No se pudo obtener el ID de la reserva creada.');
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al crear presupuesto:', error);
        this.additionalInfoService.showError('No se pudo crear el presupuesto. Inténtalo de nuevo.');
      }
    });
  }

  /**
   * Crea un presupuesto y luego procede con la descarga y envío por email
   */
  private createBudgetAndDownloadWithEmail(formData: any): void {
    // Actualizar datos del contexto antes de crear la reserva
    this.setContextData();
    
    this.additionalInfoService.createBudget().subscribe({
      next: (createdReservation) => {
        // Una vez creada la reserva, guardar el ID y proceder con la descarga
        const reservationId = createdReservation.id || createdReservation.ID;
        if (reservationId) {
          // Guardar el ID de la reserva generada para futuras operaciones
          this.generatedReservationId = reservationId;
          
          this.additionalInfoService.downloadBudgetPDF(reservationId).subscribe({
            next: (response) => {
              this.loading = false;
              if (response.success) {
                this.additionalInfoService.showSuccess(
                  `Presupuesto descargado y enviado a ${formData.recipientEmail}`
                );
                // NO disparar evento file_download aquí - solo cuando el usuario hace clic explícitamente en "Descargar"
              } else {
                this.additionalInfoService.showError(response.message);
              }
              this.handleCloseModal();
            },
            error: (error) => {
              this.loading = false;
              console.error('Error al descargar presupuesto:', error);
              this.additionalInfoService.showError('Error al descargar el presupuesto. Inténtalo de nuevo.');
            }
          });
        } else {
          this.loading = false;
          this.additionalInfoService.showError('No se pudo obtener el ID de la reserva creada.');
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al crear presupuesto:', error);
        this.additionalInfoService.showError('No se pudo crear el presupuesto. Inténtalo de nuevo.');
      }
    });
  }
}
