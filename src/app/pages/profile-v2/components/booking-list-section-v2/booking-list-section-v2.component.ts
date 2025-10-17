import { Component, Input, OnInit } from '@angular/core';
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
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { switchMap, map, catchError, of, forkJoin } from 'rxjs';

@Component({
  selector: 'app-booking-list-section-v2',
  standalone: false,
  templateUrl: './booking-list-section-v2.component.html',
  styleUrls: ['./booking-list-section-v2.component.scss'],
})
export class BookingListSectionV2Component implements OnInit {
  @Input() userId: string = '';
  @Input() listType: 'active-bookings' | 'travel-history' | 'recent-budgets' =
    'active-bookings';

  bookingItems: BookingItem[] = [];
  isExpanded: boolean = true;
  loading: boolean = false;
  downloadLoading: { [key: string]: boolean } = {};
  notificationLoading: { [key: string]: boolean } = {};

  constructor(
    private router: Router,
    private messageService: MessageService,
    private bookingsService: BookingsServiceV2,
    private toursService: ToursServiceV2,
    private dataMappingService: DataMappingV2Service,
    private cmsTourService: CMSTourService,
    private documentPDFService: DocumentPDFService,
    private emailSenderService: EmailSenderService,
    private authService: AuthenticateService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;

    // Convertir userId de string a number para la API
    const userIdNumber = parseInt(this.userId, 10);

    if (isNaN(userIdNumber)) {
      console.error('Error: userId no es un número válido:', this.userId);
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
   */
  private loadActiveBookings(userId: number): void {
    this.bookingsService
      .getActiveBookings(userId)
      .pipe(
        switchMap((reservations: ReservationResponse[]) => {
          if (!reservations || reservations.length === 0) {
            return of([]);
          }

          // Obtener información de tours y imágenes CMS para cada reserva
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
   */
  private loadTravelHistory(userId: number): void {
    this.bookingsService
      .getTravelHistory(userId)
      .pipe(
        switchMap((reservations: ReservationResponse[]) => {
          if (!reservations || reservations.length === 0) {
            return of([]);
          }

          // Obtener información de tours y imágenes CMS para cada reserva
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
}
