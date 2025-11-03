import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
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
import { switchMap, map, catchError, of, forkJoin, Subscription } from 'rxjs';

@Component({
  selector: 'app-booking-list-section-v2',
  standalone: false,
  templateUrl: './booking-list-section-v2.component.html',
  styleUrls: ['./booking-list-section-v2.component.scss'],
})
export class BookingListSectionV2Component implements OnInit, OnChanges, OnDestroy {
  @Input() userId: string = '';
  @Input() listType: 'active-bookings' | 'pending-bookings' | 'travel-history' | 'recent-budgets' =
    'active-bookings';
  @Input() parentComponent?: any;  // Referencia al componente padre

  // Almacenar qué reservas ya tienen puntos aplicados (clave: reservationId_userId)
  private reservationsWithPointsRedeemed: Set<string> = new Set();
  
  // Suscripción para poder cancelarla si se inicia una nueva carga
  private activeBookingsSubscription: Subscription | null = null;

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

  /**
   * Maneja el evento cuando se aplican puntos desde el componente modal
   */
  onPointsApplied(): void {
    // Recargar datos para reflejar cambios en precio y estado de puntos
    this.loadData();
  }

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

  ngOnDestroy(): void {
    // Cancelar suscripciones activas al destruir el componente
    if (this.activeBookingsSubscription) {
      this.activeBookingsSubscription.unsubscribe();
      this.activeBookingsSubscription = null;
    }
  }

  private loadData(): void {
    // Inicializar bookingItems como array vacío al inicio para evitar mostrar mensaje prematuro
    this.bookingItems = [];
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
      case 'pending-bookings':
        this.loadPendingBookings(userIdNumber);
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
   * Carga reservas pendientes (DRAFT/CART) solo por userId (no aplica por viajero)
   */
  private loadPendingBookings(userId: number): void {
    this.loading = true;
    this.bookingItems = [];
    
    this.bookingsService.getPendingBookings(userId)
      .pipe(
        map((reservations: ReservationResponse[]) =>
          this.dataMappingService.mapReservationsToBookingItems(
            reservations,
            [],
            'active-bookings' // reutilizamos el mapeo genérico
          )
        ),
        catchError((error) => {
          console.error('Error obteniendo reservas pendientes:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar las reservas pendientes',
          });
          return of([]);
        })
      )
      .subscribe({
        next: (bookingItems: BookingItem[]) => {
          this.bookingItems = bookingItems;
          this.loading = false;
        },
        error: () => {
          this.bookingItems = [];
          this.loading = false;
        }
      });
  }

  /**
   * Espera hasta que el email del usuario esté disponible y luego carga las reservas
   * Intenta hasta 10 veces con un delay de 300ms entre intentos
   */
  private waitForUserEmail(userId: number, attempt: number = 0): void {
    const maxAttempts = 10;
    const delayMs = 300;

    // Asegurar que loading esté en true mientras esperamos
    this.loading = true;
    this.bookingItems = [];

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
    // Cancelar cualquier suscripción previa para evitar múltiples cargas simultáneas
    if (this.activeBookingsSubscription) {
      this.activeBookingsSubscription.unsubscribe();
      this.activeBookingsSubscription = null;
    }
    
    // Asegurar que loading esté en true y bookingItems esté vacío al inicio
    this.loading = true;
    this.bookingItems = [];
    
    // Cargar reservas Y transacciones de puntos EN PARALELO
    // Agregar catchError a cada llamada para evitar que un error haga fallar todo el observable
    const subscription = forkJoin({
      reservationsData: forkJoin({
        userReservations: this.bookingsService.getActiveBookings(userId).pipe(
          catchError((error) => {
            console.error('Error obteniendo reservas activas del usuario:', error);
            // Retornar array vacío en caso de error para que no falle todo el forkJoin
            return of([]);
          })
        ),
        travelerReservations: this.bookingsService.getActiveBookingsByTravelerEmail(userEmail).pipe(
          catchError((error) => {
            console.error('Error obteniendo reservas activas del viajero:', error);
            // Retornar array vacío en caso de error para que no falle todo el forkJoin
            return of([]);
          })
        ),
      }),
      pointsTransactions: this.loadPointsTransactions()
    })
      .pipe(
        switchMap(({ reservationsData }) => {
          const { userReservations, travelerReservations } = reservationsData;
          
          // Combinar y eliminar duplicados basándose en el ID de reserva
          const allReservations = [
            ...(userReservations || []),
            ...(travelerReservations || []),
          ];
                    
          const uniqueReservations = allReservations.filter(
            (reservation, index, self) =>
              index === self.findIndex((r) => r.id === reservation.id)
          );
          
          if (uniqueReservations.length === 0) {
            // Retornar un observable que se complete después de un pequeño delay
            // para asegurar que el loading se muestre por un tiempo mínimo
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

          return forkJoin(tourPromises).pipe(
            catchError((error) => {
              console.error('Error obteniendo información de tours:', error);
              // Si falla la obtención de tours, retornar las reservas sin información de tour
              return of(uniqueReservations.map(reservation => ({
                reservation,
                tour: null,
                cmsTour: null
              })));
            })
          );
        }),
        map((reservationTourPairs: any[]) => {
          // Verificar que reservationTourPairs tenga datos
          if (!reservationTourPairs || reservationTourPairs.length === 0) {
            return [];
          }
          
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
          // Solo actualizar después de que toda la carga esté completa
          this.bookingItems = bookingItems || [];
          this.loading = false;
          // Limpiar la suscripción activa
          this.activeBookingsSubscription = null;
          // Cargar documentación y notificaciones para todas las reservas (asíncrono, no bloquea UI)
          this.loadDocumentationAndNotifications();
        },
        error: (error) => {
          console.error('Error en la suscripción:', error);
          this.bookingItems = [];
          this.loading = false;
          // Limpiar la suscripción activa
          this.activeBookingsSubscription = null;
        },
      });
    
    // Guardar la suscripción para poder cancelarla si es necesario
    this.activeBookingsSubscription = subscription;
  }

  /**
   * Carga historial de viajes usando servicios v2
   * Incluye reservas donde el usuario es titular + reservas donde aparece como viajero
   */
  private loadTravelHistory(userId: number): void {
    this.loading = true;
    this.bookingItems = [];
    
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
    this.loading = true;
    this.bookingItems = [];
    
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
    
    this.downloadLoading[item.id] = true;
    
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Generando voucher de reserva...',
    });
    
    this.documentServicev2.getReservationVoucherDocument(RESERVATION_ID).subscribe({
      next: (blob) => {
        this.downloadLoading[item.id] = false;
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voucher_reserva_${item.id}.pdf`;
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
        console.error('Error al descargar voucher de reserva:', error);
        
        let errorDetail = 'No se pudo descargar el voucher de reserva.';
        
        // Manejo específico de errores
        if (error.status === 500) {
          if (error.error?.message?.includes('KeyNotFoundException')) {
            errorDetail = 'Hay datos incompletos en esta reserva. Por favor, contacta con soporte.';
          } else {
            errorDetail = 'Error interno del servidor. Inténtalo más tarde.';
          }
        } else if (error.status === 404) {
          errorDetail = 'Voucher de reserva no encontrado.';
        } else if (error.status === 403) {
          errorDetail = 'No tienes permisos para descargar este documento.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error al descargar documento',
          detail: errorDetail
        });
      }
    });
  }

  reserveItem(item: BookingItem) {
    // Navegar al checkout para presupuestos recientes
    if (this.listType === 'recent-budgets') {
      this.router.navigate(['/checkout', item.id]);
    }
    // Navegar al checkout para reservas pendientes o carrito en proceso
    else if (this.listType === 'pending-bookings' || this.isCartInProcess(item)) {
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
      case 'pending-bookings':
        return 'Reservas Pendientes';
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
      case 'pending-bookings':
        return 'No tienes reservas pendientes';
      case 'recent-budgets':
        return 'No tienes presupuestos recientes';
      case 'travel-history':
        return 'No tienes historial de viajes';
      default:
        return 'No hay elementos disponibles';
    }
  }

  // Button visibility methods
  shouldShowDownload(item: BookingItem): boolean {
    // Ocultar cuando es borrador (1) o carrito en proceso (2)
    if (this.isDraft(item) || this.isCartInProcess(item)) return false;
    return (
      this.listType === 'active-bookings' ||
      this.listType === 'recent-budgets' ||
      this.listType === 'pending-bookings'
    );
  }

  shouldShowSend(item: BookingItem): boolean {
    // Ocultar cuando es borrador (1) o carrito en proceso (2)
    if (this.isDraft(item) || this.isCartInProcess(item)) return false;
    return (
      this.listType === 'active-bookings' ||
      this.listType === 'recent-budgets' ||
      this.listType === 'pending-bookings'
    );
  }

  shouldShowView(item: BookingItem): boolean {
    // Ocultar ver detalle para estados 1 (DRAFT) y 2 (CART) y para 3 (BUDGET)
    if ([1, 2, 3].includes(item.reservationStatusId as any)) return false;
    // Además ocultar si estamos en la sección de pendientes
    if (this.listType === 'pending-bookings') return false;
    return true;
  }

  shouldShowReserve(item?: BookingItem): boolean {
    // Si es carrito en proceso (2), mostrar siempre Reservar
    if (item && this.isCartInProcess(item)) return true;
    // Mostrar "Reservar" para presupuestos y para toda la sección de pendientes
    if (this.listType === 'recent-budgets') return true;
    if (this.listType === 'pending-bookings') return true;
    return false;
  }

  isCartInProcess(item: BookingItem): boolean {
    // Estado 2 = Carrito en proceso
    return item?.reservationStatusId === 2;
  }

  isDraft(item: BookingItem): boolean {
    // Estado 1 = Borrador
    return item?.reservationStatusId === 1;
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
    return 'Compartir';
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
    this.pointsDiscountModalVisible = true;
  }
}
