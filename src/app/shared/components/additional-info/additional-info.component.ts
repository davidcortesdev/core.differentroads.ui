import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Order } from '../../../core/models/orders/order.model';
import { AdditionalInfoService } from '../../../core/services/v2/additional-info.service';

@Component({
  selector: 'app-additional-info',
  standalone: false,
  templateUrl: './additional-info.component.html',
  styleUrl: './additional-info.component.scss',
})
export class AdditionalInfoComponent implements OnInit, OnDestroy {
  // Inputs para recibir datos del contexto donde se use (tour-v2 o checkout-v2)
  @Input() existingOrder: Order | null = null;
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

  // Estados del componente
  visible: boolean = false;
  loginDialogVisible: boolean = false;
  loading: boolean = false;
  userEmail: string = '';

  // Flags para controlar el comportamiento de los modales
  shouldClearFields: boolean = false;
  isDownloadMode: boolean = false;
  isShareMode: boolean = false;

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

  constructor(
    private additionalInfoService: AdditionalInfoService,
    private router: Router,
    private formBuilder: FormBuilder
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
      totalPrice: this.calculateTotalPrice()
    });
  }

  /**
   * Calcula el precio total basado en los datos disponibles
   */
  private calculateTotalPrice(): number {
    // TODO: Implementar cálculo real del precio
    // Por ahora retorna un valor por defecto
    return 0;
  }

  /**
   * Obtiene el texto del botón según el contexto
   */
  getSaveButtonText(): string {
    return 'Guarda tu presupuesto';
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
    this.isDownloadMode = false;
    this.isShareMode = false;

    if (!this.isAuthenticated) {
      const currentUrl = window.location.pathname;
      sessionStorage.setItem('redirectUrl', currentUrl);
      this.loginDialogVisible = true;
      this.additionalInfoService.showInfo(
        'Debes iniciar sesión para guardar el presupuesto.'
      );
      return;
    }

    this.saveBudget();
  }

  /**
   * Maneja la descarga directa del presupuesto
   */
  handleDownloadTrip(): void {
    if (!this.isAuthenticated) {
      const currentUrl = window.location.pathname;
      sessionStorage.setItem('redirectUrl', currentUrl);
      this.loginDialogVisible = true;
      this.additionalInfoService.showInfo(
        'Debes iniciar sesión para descargar el presupuesto.'
      );
      return;
    }

    this.downloadBudget();
  }

  /**
   * Descarga el presupuesto directamente
   */
  private downloadBudget(): void {
    if (!this.userEmail) {
      this.additionalInfoService.showError(
        'No se pudo obtener la información del usuario. Por favor, inténtalo de nuevo.'
      );
      return;
    }

    this.loading = true;

    // Simular descarga exitosa inmediatamente
    this.loading = false;
    this.additionalInfoService.showSuccess('Presupuesto descargado correctamente');
    
    // Disparar evento de analytics: file_download
    this.trackFileDownload();
  }

  /**
   * Maneja compartir el presupuesto con alguien
   */
  handleInviteFriend(): void {
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
    if (!this.userEmail) {
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
      this.updateBudget();
    } else {
      // Modo creación (desde tour detail)
      this.createBudget();
    }
  }

  /**
   * Crea un nuevo presupuesto
   */
  private createBudget(): void {
    // Simular respuesta exitosa inmediatamente
    this.loading = false;
    this.additionalInfoService.showSuccess('Tour añadido a tus favoritos');
    
    // Disparar evento de analytics: add_to_wishlist
    this.trackAddToWishlist();
  }

  /**
   * Actualiza un presupuesto existente
   */
  private updateBudget(): void {
    if (!this.existingOrder) {
      this.additionalInfoService.showError('No se encontró información de la orden existente.');
      this.loading = false;
      return;
    }

    // Simular respuesta exitosa inmediatamente
    this.loading = false;
    this.additionalInfoService.showSuccess('Presupuesto actualizado correctamente');
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
    if (this.shareForm.invalid) {
      Object.keys(this.shareForm.controls).forEach(key => {
        this.shareForm.get(key)?.markAsTouched();
      });
      return;
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
      reservationId: this.existingOrder?._id || null,
      isShareMode: true
    };

    // Simular envío exitoso inmediatamente
    this.loading = false;
    this.additionalInfoService.showSuccess(
      `Presupuesto compartido exitosamente con ${formData.recipientEmail}`
    );
    
    // Disparar evento de analytics: share
    this.trackShare();
    
    this.handleCloseModal();
  }

  /**
   * Procesa la descarga del presupuesto en PDF
   */
  private handleDownloadMode(formData: any): void {
    const budgetData = {
      recipientEmail: formData.recipientEmail,
      message: formData.message || '',
      tourName: this.tourName,
      periodName: this.periodName,
      periodDates: this.periodDates,
      flightInfo: this.selectedFlight?.name || 'Sin vuelo',
      travelers: this.travelersSelected,
      reservationId: this.existingOrder?._id || null
    };

    const downloadSub = this.additionalInfoService.downloadBudgetPDF(
      JSON.stringify(budgetData)
    ).subscribe({
      next: (response) => {
        this.loading = false;

        if (response instanceof Blob) {
          this.downloadPDFFromBlob(response, `presupuesto-${this.tourName}.pdf`);
        } else if (response.pdfUrl) {
          this.downloadPDFFromURL(response.pdfUrl, response.fileName);
        }

        this.additionalInfoService.showSuccess(
          `Presupuesto descargado y enviado a ${formData.recipientEmail}`
        );
        this.handleCloseModal();
      },
      error: () => {
        this.loading = false;
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
      duration: this.getTourDuration()
    };
  }

  /**
   * Obtiene la categoría del tour desde los datos disponibles
   */
  private getTourCategory(): string | undefined {
    // Intentar obtener desde selectedDeparture si está disponible
    if (this.selectedDeparture?.continent) {
      return this.selectedDeparture.continent;
    }
    // Si no hay datos reales, no devolver nada
    return undefined;
  }

  /**
   * Obtiene la subcategoría del tour desde los datos disponibles
   */
  private getTourSubcategory(): string | undefined {
    // Intentar obtener desde selectedDeparture si está disponible
    if (this.selectedDeparture?.tripType) {
      return this.selectedDeparture.tripType;
    }
    // Si no hay datos reales, no devolver nada
    return undefined;
  }

  /**
   * Obtiene el tipo del tour desde los datos disponibles
   */
  private getTourType(): string | undefined {
    // Intentar obtener desde selectedDeparture si está disponible
    if (this.selectedDeparture?.productStyle) {
      return this.selectedDeparture.productStyle;
    }
    // Si no hay datos reales, no devolver nada
    return undefined;
  }

  /**
   * Obtiene el tipo de viaje desde los datos disponibles
   */
  private getTripType(): string | undefined {
    // Intentar obtener desde selectedDeparture si está disponible
    if (this.selectedDeparture?.tripType) {
      return this.selectedDeparture.tripType;
    }
    // Si no hay datos reales, no devolver nada
    return undefined;
  }

  /**
   * Obtiene la puntuación del tour desde los datos disponibles
   */
  private getTourRating(): string | undefined {
    // Intentar obtener desde selectedDeparture si está disponible
    if (this.selectedDeparture?.rating) {
      return this.selectedDeparture.rating.toString();
    }
    // Si no hay datos reales, no devolver nada
    return undefined;
  }

  /**
   * Obtiene la duración del tour desde los datos disponibles
   */
  private getTourDuration(): string | undefined {
    // Intentar obtener desde selectedDeparture si está disponible
    if (this.selectedDeparture?.duration) {
      return this.selectedDeparture.duration;
    }
    // Si no hay datos reales, no devolver nada
    return undefined;
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
}
