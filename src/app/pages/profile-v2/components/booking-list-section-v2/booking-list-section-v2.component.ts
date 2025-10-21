import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BookingItem } from '../../../../core/models/v2/profile-v2.model';
import { BookingsServiceV2 } from '../../../../core/services/v2/bookings-v2.service';
import { ReservationResponse } from '../../../../core/models/v2/profile-v2.model';
import { ToursServiceV2 } from '../../../../core/services/v2/tours-v2.service';
import { DataMappingV2Service } from '../../../../core/services/v2/data-mapping-v2.service';
import {
  CMSTourService,
  ICMSTourResponse,
} from '../../../../core/services/cms/cms-tour.service';
import { DocumentPDFService } from '../../../../core/services/documentation/document-pdf.service';
import { EmailSenderService } from '../../../../core/services/documentation/email-sender.service';
import {
  DocumentationService,
  IDocumentReservationResponse,
} from '../../../../core/services/documentation/documentation.service';
import {
  NotificationService,
  INotification,
} from '../../../../core/services/documentation/notification.service';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { switchMap, map, catchError, of, forkJoin } from 'rxjs';

@Component({
  selector: 'app-booking-list-section-v2',
  standalone: false,
  templateUrl: './booking-list-section-v2.component.html',
  styleUrls: ['./booking-list-section-v2.component.scss'],
})
export class BookingListSectionV2Component implements OnInit, OnChanges {
  @Input() userId: string = '';
  @Input() listType: 'active-bookings' | 'travel-history' | 'recent-budgets' =
    'active-bookings';

  bookingItems: BookingItem[] = [];
  isExpanded: boolean = true;
  loading: boolean = false;
  downloadLoading: { [key: string]: boolean } = {};
  notificationLoading: { [key: string]: boolean } = {};

  // Propiedades para documentación y notificaciones
  documentsLoading: { [key: string]: boolean } = {};
  notificationsLoading: { [key: string]: boolean } = {};
  documents: { [key: string]: IDocumentReservationResponse[] } = {};
  notifications: { [key: string]: INotification[] } = {};

  constructor(
    private router: Router,
    private messageService: MessageService,
    private bookingsService: BookingsServiceV2,
    private toursService: ToursServiceV2,
    private dataMappingService: DataMappingV2Service,
    private cmsTourService: CMSTourService,
    private documentPDFService: DocumentPDFService,
    private emailSenderService: EmailSenderService,
    private documentationService: DocumentationService,
    private notificationService: NotificationService,
    private authService: AuthenticateService
  ) {}

  ngOnInit() {
    if (this.userId) {
      this.loadData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && changes['userId'].currentValue) {
      this.loadData();
    }
  }

  private loadData(): void {
    this.loading = true;

    // Convertir userId de string a number para la API
    const userIdNumber = parseInt(this.userId, 10);

    if (isNaN(userIdNumber)) {
      this.bookingItems = [];
      this.loading = false;
      return;
    }

    // Usar servicios v2 según el tipo de lista
    switch (this.listType) {
      case 'active-bookings':
        this.loadActiveBookings(userIdNumber);
        break;
      case 'travel-history':
        this.loadTravelHistory(userIdNumber);
        break;
      case 'recent-budgets':
        this.loadRecentBudgets(userIdNumber);
        break;
      default:
        this.bookingItems = [];
        this.loading = false;
    }
  }

  /**
   * Carga reservas activas usando servicios v2
   * Incluye reservas donde el usuario es titular + reservas donde aparece como viajero
   */
  private loadActiveBookings(userId: number): void {
    // Esperar hasta obtener el email del usuario con reintentos
    this.waitForUserEmail(userId);
  }

  /**
   * Espera hasta que el email del usuario esté disponible y luego carga las reservas
   * Intenta hasta 10 veces con un delay de 300ms entre intentos
   */
  private waitForUserEmail(userId: number, attempt: number = 0): void {
    const maxAttempts = 10;
    const delayMs = 300;

    const userEmail = this.authService.getUserEmailValue();

    if (userEmail) {
      // Email encontrado, proceder a cargar las reservas
      console.log('✅ Email del usuario encontrado:', userEmail);
      this.loadActiveBookingsWithEmail(userId, userEmail);
    } else if (attempt < maxAttempts) {
      // No se encontró el email, reintentar después del delay
      console.log(`⏳ Esperando email del usuario (intento ${attempt + 1}/${maxAttempts})...`);
      setTimeout(() => {
        this.waitForUserEmail(userId, attempt + 1);
      }, delayMs);
    } else {
      // Se alcanzó el máximo de intentos, mostrar error
      console.error('❌ No se pudo obtener el email del usuario después de', maxAttempts, 'intentos');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cargar las reservas. Por favor, recarga la página.',
      });
      this.bookingItems = [];
      this.loading = false;
    }
  }

  /**
   * Carga las reservas activas una vez que el email está disponible
   */
  private loadActiveBookingsWithEmail(userId: number, userEmail: string): void {
    console.log('🔍 DEBUG: loadActiveBookingsWithEmail llamado con userId:', userId, 'email:', userEmail);
    
    // Combinar reservas del usuario como titular + reservas donde aparece como viajero
    forkJoin({
      userReservations: this.bookingsService.getActiveBookings(userId),
      travelerReservations:
        this.bookingsService.getActiveBookingsByTravelerEmail(userEmail),
    })
      .pipe(
        switchMap(({ userReservations, travelerReservations }) => {
          console.log('📊 DEBUG: Reservas como titular:', userReservations.length);
          console.log('📊 DEBUG: Reservas como viajero:', travelerReservations.length);
          
          // Combinar y eliminar duplicados basándose en el ID de reserva
          const allReservations = [
            ...userReservations,
            ...travelerReservations,
          ];
          
          console.log('📊 DEBUG: Total combinado:', allReservations.length);
          
          const uniqueReservations = allReservations.filter(
            (reservation, index, self) =>
              index === self.findIndex((r) => r.id === reservation.id)
          );
          
          console.log('📊 DEBUG: Después de eliminar duplicados:', uniqueReservations.length);

          if (uniqueReservations.length === 0) {
            return of([]);
          }

          // Obtener información de tours y imágenes CMS para cada reserva
          const tourPromises = uniqueReservations.map((reservation) =>
            forkJoin({
              tour: this.toursService.getTourById(reservation.tourId).pipe(
                catchError((error) => {
                  console.warn(
                    `Error obteniendo tour ${reservation.tourId}:`,
                    error
                  );
                  return of(null);
                })
              ),
              cmsTour: this.cmsTourService
                .getAllTours({ tourId: reservation.tourId })
                .pipe(
                  map((cmsTours: ICMSTourResponse[]) =>
                    cmsTours.length > 0 ? cmsTours[0] : null
                  ),
                  catchError((error) => {
                    console.warn(
                      `Error obteniendo CMS tour ${reservation.tourId}:`,
                      error
                    );
                    return of(null);
                  })
                ),
            }).pipe(
              map(({ tour, cmsTour }) => ({ reservation, tour, cmsTour }))
            )
          );

          return forkJoin(tourPromises);
        }),
        map((reservationTourPairs: any[]) => {
          // Mapear usando el servicio de mapeo con imágenes CMS
          return this.dataMappingService.mapReservationsToBookingItems(
            reservationTourPairs.map((pair) => pair.reservation),
            reservationTourPairs.map((pair) => pair.tour),
            'active-bookings',
            reservationTourPairs.map((pair) => pair.cmsTour)
          );
        }),
        catchError((error) => {
          console.error('Error obteniendo reservas activas:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar las reservas activas',
          });
          return of([]);
        })
      )
      .subscribe({
        next: (bookingItems: BookingItem[]) => {
          this.bookingItems = bookingItems;
          this.loading = false;
          // Cargar documentación y notificaciones para todas las reservas
          this.loadDocumentationAndNotifications();
        },
        error: (error) => {
          console.error('Error en la suscripción:', error);
          this.bookingItems = [];
          this.loading = false;
        },
      });
  }

  /**
   * Carga historial de viajes usando servicios v2
   * Incluye reservas donde el usuario es titular + reservas donde aparece como viajero
   */
  private loadTravelHistory(userId: number): void {
    const userEmail = this.authService.getUserEmailValue();
    
    if (!userEmail) {
      this.bookingItems = [];
      this.loading = false;
      return;
    }

    forkJoin({
      userReservations: this.bookingsService.getTravelHistory(userId),
      travelerReservations: this.bookingsService.getTravelHistoryByTravelerEmail(userEmail)
    })
      .pipe(
        switchMap(({ userReservations, travelerReservations }) => {
          const allReservations = [
            ...userReservations,
            ...travelerReservations
          ];
          
          const uniqueReservations = allReservations.filter(
            (reservation, index, self) =>
              index === self.findIndex((r) => r.id === reservation.id)
          );
          
          if (uniqueReservations.length === 0) {
            return of([]);
          }

          // Obtener información de tours y imágenes CMS para cada reserva
          const tourPromises = uniqueReservations.map((reservation) =>
            forkJoin({
              tour: this.toursService.getTourById(reservation.tourId).pipe(
                catchError((error) => {
                  console.warn(
                    `Error obteniendo tour ${reservation.tourId}:`,
                    error
                  );
                  return of(null);
                })
              ),
              cmsTour: this.cmsTourService
                .getAllTours({ tourId: reservation.tourId })
                .pipe(
                  map((cmsTours: ICMSTourResponse[]) =>
                    cmsTours.length > 0 ? cmsTours[0] : null
                  ),
                  catchError((error) => {
                    console.warn(
                      `Error obteniendo CMS tour ${reservation.tourId}:`,
                      error
                    );
                    return of(null);
                  })
                ),
            }).pipe(
              map(({ tour, cmsTour }) => ({ reservation, tour, cmsTour }))
            )
          );

          return forkJoin(tourPromises);
        }),
        map((reservationTourPairs: any[]) => {
          // Mapear usando el servicio de mapeo con imágenes CMS
          return this.dataMappingService.mapReservationsToBookingItems(
            reservationTourPairs.map((pair) => pair.reservation),
            reservationTourPairs.map((pair) => pair.tour),
            'travel-history',
            reservationTourPairs.map((pair) => pair.cmsTour)
          );
        }),
        catchError((error) => {
          console.error('Error obteniendo historial de viajes:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar el historial de viajes',
          });
          return of([]);
        })
      )
      .subscribe({
        next: (bookingItems: BookingItem[]) => {
          this.bookingItems = bookingItems;
          this.loading = false;
          // Cargar documentación y notificaciones para todas las reservas
          this.loadDocumentationAndNotifications();
        },
        error: (error) => {
          console.error('Error en la suscripción:', error);
          this.bookingItems = [];
          this.loading = false;
        },
      });
  }

  /**
   * Carga presupuestos recientes usando servicios v2
   * Incluye presupuestos donde el usuario es titular + presupuestos donde aparece como viajero
   */
  private loadRecentBudgets(userId: number): void {
    this.bookingsService
      .getRecentBudgets(userId)
      .pipe(
        switchMap((reservations: ReservationResponse[]) => {
          if (!reservations || reservations.length === 0) {
            return of([]);
          }

          // Obtener información de tours y imágenes CMS para cada presupuesto
          const tourPromises = reservations.map((reservation) =>
            forkJoin({
              tour: this.toursService.getTourById(reservation.tourId).pipe(
                catchError((error) => {
                  console.warn(
                    `Error obteniendo tour ${reservation.tourId}:`,
                    error
                  );
                  return of(null);
                })
              ),
              cmsTour: this.cmsTourService
                .getAllTours({ tourId: reservation.tourId })
                .pipe(
                  map((cmsTours: ICMSTourResponse[]) =>
                    cmsTours.length > 0 ? cmsTours[0] : null
                  ),
                  catchError((error) => {
                    console.warn(
                      `Error obteniendo CMS tour ${reservation.tourId}:`,
                      error
                    );
                    return of(null);
                  })
                ),
            }).pipe(
              map(({ tour, cmsTour }) => ({ reservation, tour, cmsTour }))
            )
          );

          return forkJoin(tourPromises);
        }),
        map((reservationTourPairs: any[]) => {
          // Mapear usando el servicio de mapeo con imágenes CMS
          return this.dataMappingService.mapReservationsToBookingItems(
            reservationTourPairs.map((pair) => pair.reservation),
            reservationTourPairs.map((pair) => pair.tour),
            'recent-budgets',
            reservationTourPairs.map((pair) => pair.cmsTour)
          );
        }),
        catchError((error) => {
          console.error('Error obteniendo presupuestos recientes:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar los presupuestos recientes',
          });
          return of([]);
        })
      )
      .subscribe({
        next: (bookingItems: BookingItem[]) => {
          this.bookingItems = bookingItems;
          this.loading = false;
          // Cargar documentación y notificaciones para todas las reservas
          this.loadDocumentationAndNotifications();
        },
        error: (error) => {
          console.error('Error en la suscripción:', error);
          this.bookingItems = [];
          this.loading = false;
        },
      });
  }

  // Format date for budget display (Day Month format)
  formatShortDate(date: Date): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Fecha no disponible';
    }

    const day = date.getDate();
    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const month = monthNames[date.getMonth()];

    return `${day} ${month}`;
  }

  // Calculate total price from summary items (for budgets)
  calculateTotalFromSummary(summaryItems: any[]): number {
    if (!summaryItems || summaryItems.length === 0) return 0;

    return summaryItems.reduce((total, item) => {
      return total + item.value * item.qty;
    }, 0);
  }

  // Add this method to the component
  imageLoadError(item: BookingItem) {
    item.image = 'https://via.placeholder.com/300x200?text=Image+Error';
    item.imageLoading = false;
    item.imageLoaded = false;
  }

  // ------------- ACTION METHODS -------------
  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewItem(item: BookingItem) {
    if (this.listType === 'active-bookings') {
      this.router.navigate(['bookings', item.id]);
    } else if (this.listType === 'recent-budgets') {
      this.router.navigate(['/checkout', item.id]);
    }
  }

  sendItem(item: BookingItem) {
    this.notificationLoading[item.id] = true;

    // Get the logged user's email
    const userEmail = this.authService.getUserEmailValue();

    if (!userEmail) {
      this.notificationLoading[item.id] = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el email del usuario logueado',
      });
      return;
    }

    // Prepare the request body
    const requestBody = {
      event: 'BUDGET',
      email: userEmail,
    };

    // Call the email service
    this.emailSenderService
      .sendReservationWithoutDocuments(parseInt(item.id, 10), requestBody)
      .subscribe({
        next: (response) => {
          this.notificationLoading[item.id] = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Email enviado correctamente',
          });
        },
        error: (error) => {
          this.notificationLoading[item.id] = false;
          console.error('Error sending email:', error);

          let errorMessage = 'Error al enviar el email';
          if (error.status === 500) {
            errorMessage = 'Error interno del servidor. Inténtalo más tarde.';
          } else if (error.status === 404) {
            errorMessage = 'Reserva no encontrada.';
          } else if (error.status === 403) {
            errorMessage = 'No tienes permisos para enviar este email.';
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
          });
        },
      });
  }

  downloadItem(item: BookingItem) {
    this.downloadLoading[item.id] = true;

    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Generando documento PDF...',
    });

    // Download PDF as blob
    this.documentPDFService
      .downloadReservationPDFAsBlob(parseInt(item.id, 10), 'BUDGET')
      .subscribe({
        next: (blob) => {
          this.downloadLoading[item.id] = false;

          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `presupuesto_${item.id}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Documento PDF descargado exitosamente',
          });
        },
        error: (error) => {
          console.error('Error downloading PDF:', error);
          this.downloadLoading[item.id] = false;

          let errorMessage = 'Error al generar el documento PDF';
          if (error.status === 500) {
            errorMessage = 'Error interno del servidor. Inténtalo más tarde.';
          } else if (error.status === 404) {
            errorMessage = 'Documento no encontrado.';
          } else if (error.status === 403) {
            errorMessage = 'No tienes permisos para descargar este documento.';
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
          });
        },
      });
  }

  reserveItem(item: BookingItem) {
    if (this.listType === 'recent-budgets') {
      this.router.navigate(['/checkout', item.id]);
    }
  }

  trackById(index: number, item: BookingItem): string {
    return item.id;
  }

  // ------------- DYNAMIC CONFIGURATION METHODS -------------

  // Get title based on list type
  getTitle(): string {
    switch (this.listType) {
      case 'active-bookings':
        return 'Reservas Activas';
      case 'recent-budgets':
        return 'Presupuestos Recientes';
      case 'travel-history':
        return 'Historial de Viajes';
      default:
        return 'Lista de Elementos';
    }
  }

  getEmptyMessage(): string {
    switch (this.listType) {
      case 'active-bookings':
        return 'No tienes reservas activas';
      case 'recent-budgets':
        return 'No tienes presupuestos recientes';
      case 'travel-history':
        return 'No tienes historial de viajes';
      default:
        return 'No hay elementos disponibles';
    }
  }

  // Button visibility methods
  shouldShowDownload(): boolean {
    return (
      this.listType === 'active-bookings' || this.listType === 'recent-budgets'
    );
  }

  shouldShowSend(): boolean {
    return (
      this.listType === 'active-bookings' || this.listType === 'recent-budgets'
    );
  }

  shouldShowView(): boolean {
    return true; // Always show view button
  }

  shouldShowReserve(): boolean {
    return this.listType === 'recent-budgets';
  }

  // Button label methods
  getDownloadLabel(): string {
    return 'Descargar';
  }

  getSendLabel(): string {
    return 'Enviar';
  }

  getViewLabel(): string {
    return 'Ver detalle';
  }

  getReserveLabel(): string {
    return 'Reservar';
  }

  // ===== MÉTODOS PARA DOCUMENTACIÓN Y NOTIFICACIONES =====

  /**
   * Carga la documentación para una reserva específica
   * @param reservationId - ID de la reserva
   */
  loadDocumentsForReservation(reservationId: string): void {
    this.documentsLoading[reservationId] = true;

    console.log('🔍 DEBUG: Loading documents for reservation:', reservationId);

    this.documentationService
      .getDocumentsByReservationId(parseInt(reservationId, 10))
      .subscribe({
        next: (documents: IDocumentReservationResponse[]) => {
          console.log('🔍 DEBUG: Documents loaded successfully:', documents);
          this.documents[reservationId] = documents;
          this.documentsLoading[reservationId] = false;
        },
        error: (error) => {
          console.error(
            'Error loading documents for reservation:',
            reservationId,
            error
          );
          this.documents[reservationId] = [];
          this.documentsLoading[reservationId] = false;
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar los documentos de la reserva',
          });
        },
      });
  }

  /**
   * Carga las notificaciones para una reserva específica
   * @param reservationId - ID de la reserva
   */
  loadNotificationsForReservation(reservationId: string): void {
    this.notificationsLoading[reservationId] = true;

    console.log(
      '🔍 DEBUG: Loading notifications for reservation:',
      reservationId
    );

    this.notificationService
      .getNotificationsByReservationId(parseInt(reservationId, 10))
      .subscribe({
        next: (notifications: INotification[]) => {
          console.log(
            '🔍 DEBUG: Notifications loaded successfully:',
            notifications
          );
          this.notifications[reservationId] = notifications;
          this.notificationsLoading[reservationId] = false;
        },
        error: (error) => {
          console.error(
            'Error loading notifications for reservation:',
            reservationId,
            error
          );
          this.notifications[reservationId] = [];
          this.notificationsLoading[reservationId] = false;
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se pudieron cargar las notificaciones de la reserva',
          });
        },
      });
  }

  /**
   * Carga documentación y notificaciones para todas las reservas
   */
  loadDocumentationAndNotifications(): void {
    this.bookingItems.forEach((item) => {
      this.loadDocumentsForReservation(item.id);
      this.loadNotificationsForReservation(item.id);
    });
  }

  /**
   * Obtiene los documentos de una reserva específica
   * @param reservationId - ID de la reserva
   * @returns Array de documentos o array vacío
   */
  getDocumentsForReservation(
    reservationId: string
  ): IDocumentReservationResponse[] {
    return this.documents[reservationId] || [];
  }

  /**
   * Obtiene las notificaciones de una reserva específica
   * @param reservationId - ID de la reserva
   * @returns Array de notificaciones o array vacío
   */
  getNotificationsForReservation(reservationId: string): INotification[] {
    return this.notifications[reservationId] || [];
  }

  /**
   * Verifica si se están cargando documentos para una reserva
   * @param reservationId - ID de la reserva
   * @returns true si se están cargando documentos
   */
  isLoadingDocuments(reservationId: string): boolean {
    return this.documentsLoading[reservationId] || false;
  }

  /**
   * Verifica si se están cargando notificaciones para una reserva
   * @param reservationId - ID de la reserva
   * @returns true si se están cargando notificaciones
   */
  isLoadingNotifications(reservationId: string): boolean {
    return this.notificationsLoading[reservationId] || false;
  }

  /**
   * Obtiene el estado de carga de documentación y notificaciones para una reserva
   * @param reservationId - ID de la reserva
   * @returns true si se están cargando documentos o notificaciones
   */
  isLoadingDocumentationAndNotifications(reservationId: string): boolean {
    return (
      this.isLoadingDocuments(reservationId) ||
      this.isLoadingNotifications(reservationId)
    );
  }

  /**
   * Formatea la fecha de creación de un documento
   * @param dateString - Fecha en formato string
   * @returns Fecha formateada
   */
  formatDocumentDate(dateString: string): string {
    if (!dateString) return 'Fecha no disponible';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Fecha no válida';
    }
  }

  /**
   * Formatea la fecha de creación de una notificación
   * @param dateString - Fecha en formato string
   * @returns Fecha formateada
   */
  formatNotificationDate(dateString: string): string {
    if (!dateString) return 'Fecha no disponible';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Fecha no válida';
    }
  }

  /**
   * Obtiene el estado de una notificación en texto legible
   * @param notificationStatusId - ID del estado de la notificación
   * @returns Estado en texto legible
   */
  getNotificationStatusText(notificationStatusId: number): string {
    const statusMap: { [key: number]: string } = {
      1: 'Pendiente',
      2: 'Enviada',
      3: 'Fallida',
      4: 'Cancelada',
    };
    return statusMap[notificationStatusId] || 'Desconocido';
  }

  /**
   * Obtiene el color del estado de una notificación
   * @param notificationStatusId - ID del estado de la notificación
   * @returns Color del estado
   */
  getNotificationStatusColor(notificationStatusId: number): string {
    const colorMap: { [key: number]: string } = {
      1: 'warning', // Pendiente
      2: 'success', // Enviada
      3: 'danger', // Fallida
      4: 'secondary', // Cancelada
    };
    return colorMap[notificationStatusId] || 'secondary';
  }

  // ===== MÉTODOS DE PRUEBA Y DEBUG =====

  /**
   * Método de prueba para verificar que los servicios funcionan correctamente
   * @param reservationId - ID de la reserva para probar
   */
  testServices(reservationId: string = '847'): void {
    console.log('🧪 TEST: Testing services for reservation:', reservationId);

    // Probar servicio de notificaciones
    this.notificationService
      .getNotificationsByReservationId(parseInt(reservationId, 10))
      .subscribe({
        next: (notifications) => {
          console.log('✅ TEST: Notifications service working:', notifications);
        },
        error: (error) => {
          console.error('❌ TEST: Notifications service error:', error);
        },
      });

    // Probar servicio de documentación
    this.documentationService
      .getDocumentsByReservationId(parseInt(reservationId, 10))
      .subscribe({
        next: (documents) => {
          console.log('✅ TEST: Documentation service working:', documents);
        },
        error: (error) => {
          console.error('❌ TEST: Documentation service error:', error);
        },
      });
  }

  /**
   * Método para probar manualmente la carga de datos
   * @param reservationId - ID de la reserva
   */
  testLoadData(reservationId: string = '847'): void {
    console.log('🧪 TEST: Testing data load for reservation:', reservationId);
    this.loadDocumentsForReservation(reservationId);
    this.loadNotificationsForReservation(reservationId);
  }

  /**
   * Método para probar la llamada HTTP directa con fetch
   * @param reservationId - ID de la reserva
   */
  testDirectHttpCall(reservationId: string = '847'): void {
    console.log(
      '🧪 TEST: Testing direct HTTP call with fetch for reservation:',
      reservationId
    );

    const url = `https://documentation-dev.differentroads.es/api/Notification/by-reservation/${reservationId}`;

    console.log('🧪 TEST: Making direct HTTP call to:', url);

    fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        console.log('🧪 TEST: Fetch response status:', response.status);
        console.log('🧪 TEST: Fetch response headers:', response.headers);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
      })
      .then((data) => {
        console.log('✅ TEST: Direct fetch call successful:', data);
      })
      .catch((error) => {
        console.error('❌ TEST: Direct fetch call failed:', error);
      });
  }
}
