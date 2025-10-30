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
import { DocumentServicev2 } from '../../../../core/services/v2/document.service';
import {
  NotificationService,
  INotification,
  } from '../../../../core/services/documentation/notification.service';
import {
  NotificationServicev2,
  NotificationRequest
} from '../../../../core/services/v2/notification.service';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { PointsV2Service } from '../../../../core/services/v2/points-v2.service';
import { TravelerCategory } from '../../../../core/models/v2/profile-v2.model';
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
  @Input() parentComponent?: any;  // Referencia al componente padre

  // Almacenar qué reservas ya tienen puntos aplicados (clave: reservationId_userId)
  private reservationsWithPointsRedeemed: Set<string> = new Set();

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

  // Propiedades para modal de descuento de puntos
  pointsDiscountModalVisible: boolean = false;
  selectedBookingItem: BookingItem | null = null;
  availablePoints: number = 0;
  pointsToUse: number = 0;
  userCategory: TravelerCategory = TravelerCategory.TROTAMUNDOS;
  maxPointsPerReservation: number = 50; // Límite por reserva según documento
  maxPointsForCategory: number = 50; // Límite según categoría del usuario
  loadingUserData: boolean = false;

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
    private documentServicev2: DocumentServicev2,
    private notificationService: NotificationService,
    private notificationServicev2: NotificationServicev2,
    private authService: AuthenticateService,
    private pointsService: PointsV2Service
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
      this.loadActiveBookingsWithEmail(userId, userEmail);
    } else if (attempt < maxAttempts) {
      // No se encontró el email, reintentar después del delay
      setTimeout(() => {
        this.waitForUserEmail(userId, attempt + 1);
      }, delayMs);
    } else {
      // Se alcanzó el máximo de intentos, mostrar error
      console.error('No se pudo obtener el email del usuario después de', maxAttempts, 'intentos');
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
    
    // Cargar reservas Y transacciones de puntos EN PARALELO
    forkJoin({
      reservationsData: forkJoin({
        userReservations: this.bookingsService.getActiveBookings(userId),
        travelerReservations: this.bookingsService.getActiveBookingsByTravelerEmail(userEmail),
      }),
      pointsTransactions: this.loadPointsTransactions()
    })
      .pipe(
        switchMap(({ reservationsData }) => {
          const { userReservations, travelerReservations } = reservationsData;
          
          // Combinar y eliminar duplicados basándose en el ID de reserva
          const allReservations = [
            ...userReservations,
            ...travelerReservations,
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

    // Cargar reservas Y transacciones de puntos EN PARALELO
    forkJoin({
      reservationsData: forkJoin({
        userReservations: this.bookingsService.getTravelHistory(userId),
        travelerReservations: this.bookingsService.getTravelHistoryByTravelerEmail(userEmail)
      }),
      pointsTransactions: this.loadPointsTransactions()
    })
      .pipe(
        switchMap(({ reservationsData }) => {
          const { userReservations, travelerReservations } = reservationsData;
          
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
    item.image = 'https://picsum.photos/300/200';
    item.imageLoading = false;
    item.imageLoaded = false;
  }

  // ------------- ACTION METHODS -------------
  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewItem(item: BookingItem) {
    if (this.listType === 'active-bookings') {
      this.router.navigate(['/bookings', item.id]).then(
        (success) => {
          if (!success) {
            this.messageService.add({
              severity: 'error',
              summary: 'Error de navegación',
              detail: 'No se pudo acceder al detalle de la reserva. Por favor, recargue la página.',
              life: 5000
            });
          }
        },
        (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Ha ocurrido un error al intentar acceder al detalle de la reserva.',
            life: 5000
          });
        }
      );
    } else if (this.listType === 'recent-budgets') {
      // Para presupuestos, navegar al tour en lugar del checkout
      if (item.tourID) {
        this.router.navigate(['/tour', item.tourID]);
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Información',
          detail: 'No se pudo encontrar el tour asociado a este presupuesto.',
        });
      }
    }
  }

  sendItem(item: BookingItem) {
    // Check if the listType is 'recent-budgets'
    if (this.listType === 'recent-budgets') {
      this.sendBudgetNotification(item);
    } else if (this.listType === 'active-bookings') {
      this.sendReservationNotification(item);
    } else {
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
  }

  /**
   * Envía una notificación de presupuesto utilizando el NotificationService.
   * @param item El BookingItem que representa el presupuesto.
   */
  sendBudgetNotification(item: BookingItem): void {
    this.notificationLoading[item.id] = true;
    
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

    
  
    const notificationData: NotificationRequest = {
      reservationId: parseInt(item.id, 10), // Convertir el ID a número
      code: "BUDGET",
      email: userEmail 
    };

    this.notificationServicev2.sendNotification(notificationData).subscribe({
      next: (response) => {
        this.notificationLoading[item.id] = false;
        if (response.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Notificación de presupuesto enviada correctamente',
          });
          this.loadNotificationsForReservation(item.id); // Recargar notificaciones para el item
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: response.message || 'Error al enviar la notificación de presupuesto',
          });
        }
      },
      error: (error) => {
        this.notificationLoading[item.id] = false;
        console.error('Error sending budget notification:', error);
        let errorMessage = 'Error al enviar la notificación de presupuesto';
        if (error.status === 500) {
          errorMessage = 'Error interno del servidor. Inténtalo más tarde.';
        } else if (error.status === 404) {
          errorMessage = 'Presupuesto no encontrado.';
        }
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
        });
      },
    });
  }

  sendReservationNotification(item: BookingItem): void {
    this.notificationLoading[item.id] = true;
    
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
  
    const notificationData: NotificationRequest = {
      reservationId: parseInt(item.id, 10),
      code: "RESERVATION_VOUCHER",
      email: userEmail 
    };
  
    this.notificationServicev2.sendNotification(notificationData).subscribe({
      next: (response) => {
        this.notificationLoading[item.id] = false;
        if (response.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Notificación de reserva enviada correctamente',
          });
          this.loadNotificationsForReservation(item.id);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: response.message || 'Error al enviar la notificación de reserva',
          });
        }
      },
      error: (error) => {
        this.notificationLoading[item.id] = false;
        console.error('Error sending reservation notification:', error);
        let errorMessage = 'Error al enviar la notificación de reserva';
        if (error.status === 500) {
          errorMessage = 'Error interno del servidor. Inténtalo más tarde.';
        } else if (error.status === 404) {
          errorMessage = 'Reserva no encontrada.';
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
    if (this.listType === 'recent-budgets') {
      // Lógica para descargar presupuestos
      this.downloadBudgetDocument(item);
    } else if (this.listType === 'active-bookings') {
      // Lógica para descargar reserva
      this.downloadReservationDocument(item);
    } else {
      // Lógica para descargar reservas activas/historial
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
  }

  downloadBudgetDocument(item: BookingItem): void {
    const BUDGET_ID =parseInt(item.id, 10);
    const TYPE_DOCUMENT = 'BUDGET';
    this.documentServicev2.getDocumentInfo(BUDGET_ID, TYPE_DOCUMENT).subscribe({
      next: (documentInfo) => {
        const fileName = documentInfo.fileName;
        
        this.documentServicev2.getDocument(fileName).subscribe({
          next: (blob) => {
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error al descargar documento',
              detail: 'No se pudo descargar el documento. Por favor, inténtalo más tarde.'
            });
          }
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error al obtener información del documento',
          detail: 'No se pudo obtener la información del documento. Por favor, inténtalo más tarde.'
        });
      }
    });
  }

  downloadReservationDocument(item: BookingItem): void {
    const RESERVATION_ID = parseInt(item.id, 10);
    const TYPE_DOCUMENT = 'RESERVATION_VOUCHER';
    
    this.downloadLoading[item.id] = true;
    
    this.documentServicev2.getDocumentInfo(RESERVATION_ID, TYPE_DOCUMENT).subscribe({
      next: (documentInfo) => {
        const fileName = documentInfo.fileName;
        
        this.documentServicev2.getDocument(fileName).subscribe({
          next: (blob) => {
            this.downloadLoading[item.id] = false;
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Voucher de reserva descargado exitosamente',
            });
          },
          error: (error) => {
            this.downloadLoading[item.id] = false;
            console.error('Error al descargar documento:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error al descargar documento',
              detail: 'No se pudo descargar el documento. Por favor, inténtalo más tarde.'
            });
          }
        });
      },
      error: (error) => {
        this.downloadLoading[item.id] = false;
        console.error('Error al obtener información del documento:', error);
        
        let errorDetail = 'No se pudo obtener la información del documento.';
        
        // Manejo específico para el error de viajero no encontrado
        if (error.status === 500 && error.error?.message?.includes('KeyNotFoundException')) {
          errorDetail = 'Hay datos incompletos en esta reserva. Por favor, contacta con soporte.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error al obtener información del documento',
          detail: errorDetail
        });
      }
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

  /**
   * Carga las transacciones de puntos y actualiza el Set de reservas con puntos aplicados
   * Retorna un Observable para poder sincronizarlo con la carga de reservas
   */
  private loadPointsTransactions() {
    if (!this.userId) {
      return of(null);
    }

    return this.pointsService.getLoyaltyTransactionsFromAPI(this.userId).pipe(
      map((transactions) => {
        // Filtrar transacciones de canje (transactionTypeId = 4)
        const redemptionTransactions = transactions.filter(
          t => t.transactionTypeId === 4 && t.referenceType === 'RESERVATION'
        );

        // Agregar las claves únicas (reservationId + userId) al Set
        this.reservationsWithPointsRedeemed.clear();
        redemptionTransactions.forEach(transaction => {
          if (transaction.referenceId) {
            const uniqueKey = `${transaction.referenceId}_${this.userId}`;
            this.reservationsWithPointsRedeemed.add(uniqueKey);
          }
        });

        return this.reservationsWithPointsRedeemed;
      }),
      catchError((error) => {
        console.error('Error cargando transacciones de puntos:', error);
        return of(new Set());
      })
    );
  }

  /**
   * Verifica si este viajero específico ya ha canjeado puntos para esta reserva
   */
  hasPointsApplied(item: BookingItem): boolean {
    const uniqueKey = `${item.id}_${this.userId}`;
    return this.reservationsWithPointsRedeemed.has(uniqueKey);
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

  shouldShowView(item: BookingItem): boolean {
    // No mostrar botón de ver detalle si el estado es 3 (budget/presupuesto reservado)
    return item.reservationStatusId !== 3;
  }

  shouldShowReserve(): boolean {
    return this.listType === 'recent-budgets';
  }

  shouldShowPointsDiscount(item: BookingItem): boolean {
    // Solo mostrar para reservas activas con reservationStatusId === 11 (prebooked)
    return this.listType === 'active-bookings' && item.reservationStatusId === 11;
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

  getPointsDiscountLabel(item: BookingItem): string {
    return this.hasPointsApplied(item) ? 'Puntos ya aplicados' : 'Descontar Puntos';
  }

  // ===== MÉTODOS PARA DOCUMENTACIÓN Y NOTIFICACIONES =====

  /**
   * Carga la documentación para una reserva específica
   * @param reservationId - ID de la reserva
   */
  loadDocumentsForReservation(reservationId: string): void {
    this.documentsLoading[reservationId] = true;

    this.documentationService
      .getDocumentsByReservationId(parseInt(reservationId, 10))
      .subscribe({
        next: (documents: IDocumentReservationResponse[]) => {
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


    this.notificationService
      .getNotificationsByReservationId(parseInt(reservationId, 10))
      .subscribe({
        next: (notifications: INotification[]) => {

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
    // Probar servicio de notificaciones
    this.notificationService
      .getNotificationsByReservationId(parseInt(reservationId, 10))
      .subscribe({
        next: (notifications) => {
          console.log('TEST: Notifications service working:', notifications);
        },
        error: (error) => {
          console.error('TEST: Notifications service error:', error);
        },
      });

    // Probar servicio de documentación
    this.documentationService
      .getDocumentsByReservationId(parseInt(reservationId, 10))
      .subscribe({
        next: (documents) => {
          console.log('TEST: Documentation service working:', documents);
        },
        error: (error) => {
          console.error('TEST: Documentation service error:', error);
        },
      });
  }

  /**
   * Método para probar manualmente la carga de datos
   * @param reservationId - ID de la reserva
   */
  testLoadData(reservationId: string = '847'): void {
    this.loadDocumentsForReservation(reservationId);
    this.loadNotificationsForReservation(reservationId);
  }

  /**
   * Método para probar la llamada HTTP directa con fetch
   * @param reservationId - ID de la reserva
   */
  testDirectHttpCall(reservationId: string = '847'): void {


    const url = `https://documentation-dev.differentroads.es/api/Notification/by-reservation/${reservationId}`;

    fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
      })
  }

  // ===== MÉTODOS PARA DESCUENTO DE PUNTOS =====

  /**
   * Abre la modal de descuento de puntos
   * @param item - Item de reserva seleccionado
   */
  openPointsDiscountModal(item: BookingItem): void {
    this.selectedBookingItem = item;
    this.pointsToUse = 0;
    
    // Obtener puntos reales del usuario
    this.loadUserPointsData();
    
    this.pointsDiscountModalVisible = true;
  }

  /**
   * Cierra la modal de descuento de puntos
   */
  closePointsDiscountModal(): void {
    this.pointsDiscountModalVisible = false;
    this.selectedBookingItem = null;
    this.pointsToUse = 0;
    this.availablePoints = 0;
  }

  /**
   * Carga los datos de puntos del usuario
   */
  private loadUserPointsData(): void {
    this.loadingUserData = true;
    if (!this.userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el ID del usuario',
      });
      this.setDefaultCategory();
      this.loadingUserData = false;
      return;
    }

    // Obtener saldo de puntos del usuario
    this.pointsService.getLoyaltyBalanceFromAPI(this.userId).subscribe({
      next: (balance) => {
        // Usar la misma lógica que points-section-v2
        this.availablePoints = balance?.pointsAvailable || balance?.totalPoints || balance?.balance || 0;
        this.loadingUserData = false;
      },
      error: (error: any) => {
        console.error('Error cargando saldo de puntos:', error);
        this.availablePoints = 0;
        this.loadingUserData = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail: 'No se pudieron cargar los puntos del usuario. Usando valor por defecto.',
        });
      }
    });

    // Obtener categoría del usuario
    this.pointsService.getUserLoyaltyCategory(this.userId).then((userCategory: any) => {
      if (userCategory && userCategory.loyaltyCategoryId) {
        this.pointsService.getLoyaltyProgramCategory(userCategory.loyaltyCategoryId).then((category: any) => {
          if (category) {
            this.userCategory = this.mapCategoryNameToEnum(category.name);
            this.maxPointsForCategory = category.maxDiscountPerPurchase || 50;
            this.maxPointsPerReservation = Math.min(50, this.maxPointsForCategory);
          } else {
            this.setDefaultCategory();
          }
        }).catch((error: any) => {
          this.setDefaultCategory();
        });
      } else {
        this.setDefaultCategory();
      }
    }).catch((error: any) => {
      this.setDefaultCategory();
    });
  }

  /**
   * Mapea el nombre de categoría a enum
   */
  private mapCategoryNameToEnum(categoryName: string): TravelerCategory {
    const categoryMap: { [key: string]: TravelerCategory } = {
      'Trotamundos': TravelerCategory.TROTAMUNDOS,
      'Viajero': TravelerCategory.VIAJERO,
      'Nómada': TravelerCategory.NOMADA
    };
    return categoryMap[categoryName] || TravelerCategory.TROTAMUNDOS;
  }

  /**
   * Establece la categoría por defecto
   */
  private setDefaultCategory(): void {
    this.userCategory = TravelerCategory.TROTAMUNDOS;
    this.maxPointsForCategory = 50;
    this.maxPointsPerReservation = 50;
  }

  /**
   * Calcula el precio final después del descuento
   * @returns Precio final
   */
  getCategoryDisplayName(): string {
    return this.pointsService.getCategoryDisplayName(this.userCategory);
  }

  /**
   * Valida y limita el número de dígitos en el input de puntos
   */
  validatePointsInput(): void {
    if (this.pointsToUse) {
      // Limitar a 5 dígitos máximo (99999 puntos)
      const pointsStr = this.pointsToUse.toString();
      if (pointsStr.length > 5) {
        this.pointsToUse = parseInt(pointsStr.substring(0, 5));
      }
      
      // Asegurar que sea un número positivo
      if (this.pointsToUse < 0) {
        this.pointsToUse = 0;
      }
      
      // No permitir valores mayores al disponible
      if (this.pointsToUse > this.availablePoints) {
        this.pointsToUse = this.availablePoints;
      }
    }
  }

  /**
   * Verifica si el botón de aplicar descuento debe estar habilitado
   */
  isApplyDiscountButtonEnabled(): boolean {
    if (!this.selectedBookingItem || this.pointsToUse <= 0) {
      return false;
    }

    const validation = this.validatePointsUsage();
    return validation.isValid;
  }

  getFinalPrice(): number {
    if (!this.selectedBookingItem || this.pointsToUse <= 0) {
      return this.selectedBookingItem?.price || 0;
    }
    
    const originalPrice = this.selectedBookingItem.price || 0;
    const discount = this.pointsToUse; // 1 punto = 1 euro
    const finalPrice = originalPrice - discount;
    
    return Math.max(0, finalPrice); // No permitir precio negativo
  }

  /**
   * Aplica el descuento de puntos
   */
  applyPointsDiscount(): void {
    if (!this.selectedBookingItem || this.pointsToUse <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debes seleccionar una cantidad de puntos válida',
      });
      return;
    }

    const validation = this.validatePointsUsage();
    
    if (!validation.isValid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de validación',
        detail: validation.message,
      });
      return;
    }

    const reservationId = parseInt(this.selectedBookingItem.id, 10);

    if (!this.userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el ID del usuario',
      });
      return;
    }

    const userIdNumber = parseInt(this.userId, 10);

    if (isNaN(userIdNumber) || isNaN(reservationId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'IDs inválidos',
      });
      return;
    }

    this.pointsService.redeemPointsForReservation(reservationId, userIdNumber, this.pointsToUse)
      .then(result => {
        if (result.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Descuento Aplicado',
            detail: result.message,
          });
          
          // Marcar esta reserva como que ya tiene puntos aplicados para este viajero
          const uniqueKey = `${this.selectedBookingItem!.id}_${this.userId}`;
          this.reservationsWithPointsRedeemed.add(uniqueKey);
          
          // Recargar la sección de puntos en el componente padre
          if (this.parentComponent && this.parentComponent.reloadPointsSection) {
            this.parentComponent.reloadPointsSection();
          }
          
          // Recargar datos de reservas para reflejar cambios en precio
          this.loadData();
          
          // Cerrar modal
          this.closePointsDiscountModal();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: result.message,
          });
        }
      })
      .catch(error => {
        console.error('Error aplicando descuento:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al procesar el descuento. Inténtalo de nuevo.',
        });
      });
  }

  /**
   * Valida el uso de puntos según las reglas del documento
   */
  private validatePointsUsage(): { isValid: boolean; message: string } {
    // 1. Validar saldo disponible
    if (this.pointsToUse > this.availablePoints) {
      return {
        isValid: false,
        message: `No tienes suficientes puntos. Disponibles: ${this.availablePoints}`
      };
    }

    // 2. Validar límite por reserva (50€ máximo por reserva según documento)
    if (this.pointsToUse > this.maxPointsPerReservation) {
      return {
        isValid: false,
        message: `Máximo ${this.maxPointsPerReservation} puntos por reserva según las reglas`
      };
    }

    // 3. Validar límite por categoría
    if (this.pointsToUse > this.maxPointsForCategory) {
      const categoryName = this.pointsService.getCategoryDisplayName(this.userCategory);
      return {
        isValid: false,
        message: `Como ${categoryName} puedes usar máximo ${this.maxPointsForCategory} puntos por reserva`
      };
    }

    // 4. Validar que no exceda el precio de la reserva
    if (this.selectedBookingItem && this.pointsToUse > (this.selectedBookingItem.price || 0)) {
      return {
        isValid: false,
        message: 'No puedes canjear más puntos que el precio total de la reserva'
      };
    }

    return { isValid: true, message: '' };
  }

  /**
   * Calcula el máximo de puntos permitidos según todas las reglas
   */
  getMaxAllowedPoints(): number {
    if (!this.selectedBookingItem) return 0;

    const reservationPrice = this.selectedBookingItem.price || 0;
    const limits = [
      this.availablePoints,                    // Puntos disponibles
      this.maxPointsPerReservation,           // Límite por reserva (50€)
      this.maxPointsForCategory,              // Límite por categoría
      reservationPrice                        // No exceder el precio de la reserva
    ];

    return Math.min(...limits);
  }

  /**
   * Verifica si el usuario tiene puntos suficientes
   */
  hasEnoughPoints(): boolean {
    return this.availablePoints > 0;
  }

  /**
   * Obtiene el mensaje de estado de puntos
   */
  getPointsStatusMessage(): string {
    if (this.availablePoints === 0) {
      return 'No tienes puntos disponibles para canjear';
    } else if (this.availablePoints < this.maxPointsPerReservation) {
      return `Tienes ${this.availablePoints} puntos. Puedes usar hasta ${this.availablePoints} en esta reserva.`;
    } else {
      return `Tienes ${this.availablePoints} puntos. Puedes usar hasta ${this.maxPointsPerReservation} en esta reserva.`;
    }
  }
}
