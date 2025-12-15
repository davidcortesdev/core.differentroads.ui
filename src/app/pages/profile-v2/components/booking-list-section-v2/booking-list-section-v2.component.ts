import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
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
import { EmailSenderService } from '../../../../core/services/documentation/email-sender.service';
import { DocumentServicev2 } from '../../../../core/services/v2/document.service';
import {
  NotificationServicev2,
  NotificationRequest,
} from '../../../../core/services/v2/notification.service';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { PointsV2Service } from '../../../../core/services/v2/points-v2.service';
import { DepartureService } from '../../../../core/services/departure/departure.service';
import { switchMap, map, catchError, of, forkJoin, Subscription, takeUntil } from 'rxjs';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-booking-list-section-v2',
  standalone: false,
  templateUrl: './booking-list-section-v2.component.html',
  styleUrls: ['./booking-list-section-v2.component.scss'],
})
export class BookingListSectionV2Component
  implements OnInit, OnChanges, OnDestroy
{
  @Input() userId: string = '';
  @Input() listType:
    | 'active-bookings'
    | 'pending-bookings'
    | 'travel-history'
    | 'recent-budgets' = 'active-bookings';
  @Input() parentComponent?: any; // Referencia al componente padre

  // Almacenar qué reservas ya tienen puntos aplicados (clave: reservationId_userId)
  private reservationsWithPointsRedeemed: Set<string> = new Set();

  // Suscripción para poder cancelarla si se inicia una nueva carga
  private activeBookingsSubscription: Subscription | null = null;

  // Subject para manejar la destrucción del componente y cancelar suscripciones
  private destroy$ = new Subject<void>();

  bookingItems: BookingItem[] = [];
  isExpanded: boolean = true;
  loading: boolean = false;
  downloadLoading: { [key: string]: boolean } = {};
  notificationLoading: { [key: string]: boolean } = {};

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
    private emailSenderService: EmailSenderService,
    private documentServicev2: DocumentServicev2,
    private notificationServicev2: NotificationServicev2,
    private authService: AuthenticateService,
    private pointsService: PointsV2Service,
    private departureService: DepartureService
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
    // Emitir señal de destrucción para cancelar todas las suscripciones con takeUntil
    this.destroy$.next();
    this.destroy$.complete();
    
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
   * Carga reservas activas usando el nuevo endpoint by-bucket
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

    // Asegurar que loading esté en true mientras esperamos
    this.loading = true;
    this.bookingItems = [];

    const userEmail = this.authService.getUserEmailValue();

    if (userEmail) {
      // Email encontrado, proceder a cargar las reservas usando el nuevo endpoint
      this.loadActiveBookingsWithEmail(userId, userEmail);
    } else if (attempt < maxAttempts) {
      // No se encontró el email, reintentar después del delay
      setTimeout(() => {
        this.waitForUserEmail(userId, attempt + 1);
      }, delayMs);
    } else {
      // Se alcanzó el máximo de intentos, intentar solo con userId
      console.warn('No se pudo obtener el email del usuario después de', maxAttempts, 'intentos. Cargando solo con userId.');
      this.loadActiveBookingsWithUserIdOnly(userId);
    }
  }

  /**
   * Carga las reservas activas usando el nuevo endpoint by-bucket con userId y email
   */
  private loadActiveBookingsWithEmail(userId: number, userEmail: string): void {
    // Solo cancelar si hay una suscripción activa Y está cargando
    if (this.activeBookingsSubscription && this.loading) {
      console.log('Cancelando carga previa de reservas activas para iniciar una nueva');
      this.activeBookingsSubscription.unsubscribe();
    }
    
    this.activeBookingsSubscription = null;

    // Asegurar que loading esté en true y bookingItems esté vacío al inicio
    this.loading = true;
    this.bookingItems = [];

    // Usar el nuevo método que combina userId y email
    const subscription = this.bookingsService.getActiveBookingsByBucket(userId, userEmail)
      .pipe(
        // Agregar operador para evitar que se ejecute si la suscripción fue cancelada
        takeUntil(this.destroy$), // Necesitarás agregar destroy$ si no existe
        switchMap((reservations: ReservationResponse[]) => {
          if (!reservations || reservations.length === 0) {
            console.log('No se encontraron reservas activas');
            return of([]);
          }

          console.log(`Cargando ${reservations.length} reservas activas`);

          // Obtener información de tours, imágenes CMS y departures para cada reserva
          const tourPromises = reservations.map((reservation) =>
            forkJoin({
              tour: this.toursService.getTourById(reservation.tourId).pipe(
                catchError((error) => {
                  console.warn(`Error obteniendo tour ${reservation.tourId}:`, error);
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
                    console.warn(`Error obteniendo CMS tour ${reservation.tourId}:`, error);
                    return of(null);
                  })
                ),
              departure: reservation.departureId
                ? this.departureService.getById(reservation.departureId).pipe(
                    catchError((error) => {
                      console.warn(`Error obteniendo departure ${reservation.departureId}:`, error);
                      return of(null);
                    })
                  )
                : of(null),
            }).pipe(
              map(({ tour, cmsTour, departure }) => ({
                reservation,
                tour,
                cmsTour,
                departureDate: departure?.departureDate || null,
              }))
            )
          );

          return forkJoin(tourPromises).pipe(
            catchError((error) => {
              console.error('Error obteniendo información de tours:', error);
              // Si falla la obtención de tours, retornar las reservas sin información de tour
              return of(
                reservations.map((reservation) => ({
                  reservation,
                  tour: null,
                  cmsTour: null,
                  departureDate: null,
                }))
              );
            })
          );
        }),
        map((reservationTourPairs: any[]) => {
          // Verificar que reservationTourPairs tenga datos
          if (!reservationTourPairs || reservationTourPairs.length === 0) {
            return [];
          }

          // Mapear usando el servicio de mapeo con imágenes CMS y fechas de salida
          return this.dataMappingService.mapReservationsToBookingItems(
            reservationTourPairs.map((pair) => pair.reservation),
            reservationTourPairs.map((pair) => pair.tour),
            'active-bookings',
            reservationTourPairs.map((pair) => pair.cmsTour),
            reservationTourPairs.map((pair) => pair.departureDate)
          );
        }),
        catchError((error) => {
          console.error('Error obteniendo reservas activas:', error);
          
          // Log detallado del error
          if (error.status) {
            console.error('Detalles del error HTTP:', {
              status: error.status,
              statusText: error.statusText,
              message: error.error?.message || error.message,
              url: error.url
            });
          }
          
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar las reservas activas. Por favor, recarga la página.',
          });
          return of([]);
        })
      )
      .subscribe({
        next: (bookingItems: BookingItem[]) => {
          // Solo actualizar si la suscripción sigue activa
          if (!this.activeBookingsSubscription || this.activeBookingsSubscription === subscription) {
            this.bookingItems = bookingItems || [];
            this.loading = false;
            console.log(`Reservas activas cargadas: ${bookingItems.length} items`);
          }
          this.activeBookingsSubscription = null;
        },
        error: (error) => {
          console.error('Error en la suscripción de reservas activas:', error);
          this.bookingItems = [];
          this.loading = false;
          this.activeBookingsSubscription = null;
        },
      });

    // Guardar la suscripción para poder cancelarla si es necesario
    this.activeBookingsSubscription = subscription;
  }

  /**
   * Carga las reservas activas usando solo userId (fallback cuando no hay email)
   */
  private loadActiveBookingsWithUserIdOnly(userId: number): void {
    this.loading = true;
    this.bookingItems = [];

    this.bookingsService.getReservationsByBucket('Active', userId)
      .pipe(
        switchMap((reservations: ReservationResponse[]) => {
          if (!reservations || reservations.length === 0) {
            return of([]);
          }

          // Obtener información de tours, imágenes CMS y departures para cada reserva
          const tourPromises = reservations.map((reservation) =>
            forkJoin({
              tour: this.toursService.getTourById(reservation.tourId).pipe(
                catchError((error) => {
                  console.warn(`Error obteniendo tour ${reservation.tourId}:`, error);
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
                    console.warn(`Error obteniendo CMS tour ${reservation.tourId}:`, error);
                    return of(null);
                  })
                ),
              departure: reservation.departureId
                ? this.departureService.getById(reservation.departureId).pipe(
                    catchError((error) => {
                      console.warn(`Error obteniendo departure ${reservation.departureId}:`, error);
                      return of(null);
                    })
                  )
                : of(null),
            }).pipe(
              map(({ tour, cmsTour, departure }) => ({
                reservation,
                tour,
                cmsTour,
                departureDate: departure?.departureDate || null,
              }))
            )
          );

          return forkJoin(tourPromises);
        }),
        map((reservationTourPairs: any[]) => {
          if (!reservationTourPairs || reservationTourPairs.length === 0) {
            return [];
          }

          return this.dataMappingService.mapReservationsToBookingItems(
            reservationTourPairs.map((pair) => pair.reservation),
            reservationTourPairs.map((pair) => pair.tour),
            'active-bookings',
            reservationTourPairs.map((pair) => pair.cmsTour),
            reservationTourPairs.map((pair) => pair.departureDate)
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
          this.bookingItems = bookingItems || [];
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
   * Carga reservas pendientes usando el nuevo endpoint by-bucket
   */
  private loadPendingBookings(userId: number): void {
    this.loading = true;
    this.bookingItems = [];

    this.bookingsService
      .getPendingBookingsByBucket(userId)
      .pipe(
        switchMap((reservations: ReservationResponse[]) => {
          if (!reservations || reservations.length === 0) {
            return of([]);
          }

          // Obtener información de tours, imágenes CMS y departures para cada reserva
          const tourPromises = reservations.map((reservation) =>
            forkJoin({
              tour: this.toursService.getTourById(reservation.tourId).pipe(
                catchError((error) => {
                  console.warn(`Error obteniendo tour ${reservation.tourId}:`, error);
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
                    console.warn(`Error obteniendo CMS tour ${reservation.tourId}:`, error);
                    return of(null);
                  })
                ),
              departure: reservation.departureId
                ? this.departureService.getById(reservation.departureId).pipe(
                    catchError((error) => {
                      console.warn(`Error obteniendo departure ${reservation.departureId}:`, error);
                      return of(null);
                    })
                  )
                : of(null),
            }).pipe(
              map(({ tour, cmsTour, departure }) => ({
                reservation,
                tour,
                cmsTour,
                departureDate: departure?.departureDate || null,
              }))
            )
          );

          return forkJoin(tourPromises).pipe(
            catchError((error) => {
              console.error('Error obteniendo información de tours:', error);
              return of(
                reservations.map((reservation) => ({
                  reservation,
                  tour: null,
                  cmsTour: null,
                  departureDate: null,
                }))
              );
            })
          );
        }),
        map((reservationTourPairs: any[]) => {
          if (!reservationTourPairs || reservationTourPairs.length === 0) {
            return [];
          }

          return this.dataMappingService.mapReservationsToBookingItems(
            reservationTourPairs.map((pair) => pair.reservation),
            reservationTourPairs.map((pair) => pair.tour),
            'active-bookings',
            reservationTourPairs.map((pair) => pair.cmsTour),
            reservationTourPairs.map((pair) => pair.departureDate)
          );
        }),
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
        },
      });
  }

  /**
   * Carga historial de viajes usando el nuevo endpoint by-bucket
   * Incluye reservas donde el usuario es titular + reservas donde aparece como viajero
   */
  private loadTravelHistory(userId: number): void {
    this.loading = true;
    this.bookingItems = [];

    const userEmail = this.authService.getUserEmailValue();

    // Usar el nuevo método que combina userId y email
    this.bookingsService.getTravelHistoryByBucket(userId, userEmail)
      .pipe(
        switchMap((reservations: ReservationResponse[]) => {
          if (!reservations || reservations.length === 0) {
            return of([]);
          }

          // Obtener información de tours, imágenes CMS y departures para cada reserva
          const tourPromises = reservations.map((reservation) =>
            forkJoin({
              tour: this.toursService.getTourById(reservation.tourId).pipe(
                catchError((error) => {
                  console.warn(`Error obteniendo tour ${reservation.tourId}:`, error);
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
                    console.warn(`Error obteniendo CMS tour ${reservation.tourId}:`, error);
                    return of(null);
                  })
                ),
              departure: reservation.departureId
                ? this.departureService.getById(reservation.departureId).pipe(
                    catchError((error) => {
                      console.warn(`Error obteniendo departure ${reservation.departureId}:`, error);
                      return of(null);
                    })
                  )
                : of(null),
            }).pipe(
              map(({ tour, cmsTour, departure }) => ({
                reservation,
                tour,
                cmsTour,
                departureDate: departure?.departureDate || null,
              }))
            )
          );

          return forkJoin(tourPromises);
        }),
        map((reservationTourPairs: any[]) => {
          return this.dataMappingService.mapReservationsToBookingItems(
            reservationTourPairs.map((pair) => pair.reservation),
            reservationTourPairs.map((pair) => pair.tour),
            'travel-history',
            reservationTourPairs.map((pair) => pair.cmsTour),
            reservationTourPairs.map((pair) => pair.departureDate)
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
   * Carga presupuestos recientes usando el nuevo endpoint by-bucket
   */
  private loadRecentBudgets(userId: number): void {
    this.loading = true;
    this.bookingItems = [];

    this.bookingsService
      .getRecentBudgetsByBucket(userId)
      .pipe(
        switchMap((reservations: ReservationResponse[]) => {
          if (!reservations || reservations.length === 0) {
            return of([]);
          }

          // Obtener información de tours, imágenes CMS y departures para cada presupuesto
          const tourPromises = reservations.map((reservation) =>
            forkJoin({
              tour: this.toursService.getTourById(reservation.tourId).pipe(
                catchError((error) => {
                  console.warn(`Error obteniendo tour ${reservation.tourId}:`, error);
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
                    console.warn(`Error obteniendo CMS tour ${reservation.tourId}:`, error);
                    return of(null);
                  })
                ),
              departure: reservation.departureId
                ? this.departureService.getById(reservation.departureId).pipe(
                    catchError((error) => {
                      console.warn(`Error obteniendo departure ${reservation.departureId}:`, error);
                      return of(null);
                    })
                  )
                : of(null),
            }).pipe(
              map(({ tour, cmsTour, departure }) => ({
                reservation,
                tour,
                cmsTour,
                departureDate: departure?.departureDate || null,
              }))
            )
          );

          return forkJoin(tourPromises);
        }),
        map((reservationTourPairs: any[]) => {
          return this.dataMappingService.mapReservationsToBookingItems(
            reservationTourPairs.map((pair) => pair.reservation),
            reservationTourPairs.map((pair) => pair.tour),
            'recent-budgets',
            reservationTourPairs.map((pair) => pair.cmsTour),
            reservationTourPairs.map((pair) => pair.departureDate)
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
    item.image = 'https://picsum.photos/300/200';
    item.imageLoading = false;
    item.imageLoaded = false;
  }

  // ------------- ACTION METHODS -------------
  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewItem(item: BookingItem) {
    if (this.listType === 'active-bookings' || this.listType === 'travel-history') {
      // Para reservas activas e historial de viajes, navegar al detalle de la reserva
      this.router.navigate(['/bookings', item.id]).then(
        (success) => {
          if (!success) {
            this.messageService.add({
              severity: 'error',
              summary: 'Error de navegación',
              detail:
                'No se pudo acceder al detalle de la reserva. Por favor, recargue la página.',
              life: 5000,
            });
          }
        },
        (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              'Ha ocurrido un error al intentar acceder al detalle de la reserva.',
            life: 5000,
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
      code: 'BUDGET',
      email: userEmail,
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
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              response.message ||
              'Error al enviar la notificación de presupuesto',
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
      code: 'RESERVATION_VOUCHER',
      email: userEmail,
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
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              response.message || 'Error al enviar la notificación de reserva',
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
      this.downloadBudgetDocument(item);
    } else if (this.listType === 'active-bookings') {
      this.downloadReservationDocument(item);
    }
  }

  /**
   * Descarga un documento de presupuesto usando el código BUDGET
   */
  downloadBudgetDocument(item: BookingItem): void {
    const reservationId = parseInt(item.id, 10);
    if (isNaN(reservationId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de reserva inválido',
        life: 3000,
      });
      return;
    }

    this.downloadLoading[item.id] = true;
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Generando presupuesto...',
      life: 3000,
    });

    this.documentServicev2
      .downloadDocumentByCode(reservationId, 'BUDGET')
      .subscribe({
        next: (result) => {
          this.handleDownloadSuccess(
            result.blob,
            result.fileName,
            'Presupuesto descargado exitosamente',
            item.id
          );
        },
        error: (error) => this.handleDownloadError(error, item.id),
      });
  }

  /**
   * Descarga un voucher de reserva usando el código RESERVATION_VOUCHER
   */
  downloadReservationDocument(item: BookingItem): void {
    const reservationId = parseInt(item.id, 10);
    if (isNaN(reservationId)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de reserva inválido',
        life: 3000,
      });
      return;
    }

    this.downloadLoading[item.id] = true;
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Generando voucher de reserva...',
      life: 3000,
    });

    this.documentServicev2
      .downloadDocumentByCode(reservationId, 'RESERVATION_VOUCHER')
      .subscribe({
        next: (result) => {
          this.handleDownloadSuccess(
            result.blob,
            result.fileName,
            'Voucher de reserva descargado exitosamente',
            item.id
          );
        },
        error: (error) => this.handleDownloadError(error, item.id),
      });
  }

  /**
   * Maneja el éxito de la descarga
   */
  private handleDownloadSuccess(
    blob: Blob,
    fileName: string,
    message: string,
    itemId?: string
  ): void {
    if (itemId) {
      this.downloadLoading[itemId] = false;
    }

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
      detail: message,
      life: 3000,
    });
  }

  /**
   * Maneja errores de descarga
   */
  private handleDownloadError(error: any, itemId: string): void {
    this.downloadLoading[itemId] = false;
    console.error('Error downloading document:', error);

    let errorMessage = 'Error al descargar el documento';
    if (error.status === 500) {
      errorMessage = error.error?.message?.includes('KeyNotFoundException')
        ? 'Hay datos incompletos en esta reserva. Por favor, contacta con soporte.'
        : 'Error interno del servidor. Inténtalo más tarde.';
    } else if (error.status === 404) {
      errorMessage = 'Documento no encontrado.';
    } else if (error.status === 403) {
      errorMessage = 'No tienes permisos para descargar este documento.';
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Error al descargar documento',
      detail: errorMessage,
      life: 3000,
    });
  }

  reserveItem(item: BookingItem) {
    // Navegar al checkout para presupuestos recientes
    if (this.listType === 'recent-budgets') {
      this.router.navigate(['/checkout', item.id]);
    }
    // Navegar al checkout para reservas pendientes o carrito en proceso
    else if (
      this.listType === 'pending-bookings' ||
      this.isCartInProcess(item)
    ) {
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
          (t) => t.transactionTypeId === 4 && t.referenceType === 'RESERVATION'
        );

        // Agregar las claves únicas (reservationId + userId) al Set
        this.reservationsWithPointsRedeemed.clear();
        redemptionTransactions.forEach((transaction) => {
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
    // No mostrar el botón de compartir para presupuestos
    if (this.listType === 'recent-budgets') {
      return false;
    }
    // No mostrar el botón de compartir para reservas activas
    if (this.listType === 'active-bookings') {
      return false;
    }
    // Ocultar cuando es borrador (1) o carrito en proceso (2)
    if (this.isDraft(item) || this.isCartInProcess(item)) return false;
    return (
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
    return (
      this.listType === 'active-bookings' && item.reservationStatusId === 11
    );
  }

  // Button label methods
  getDownloadLabel(): string {
    // Para presupuestos, mostrar "Descargar presupuesto"
    if (this.listType === 'recent-budgets') {
      return 'Descargar presupuesto';
    }
    return 'Descargar';
  }

  getSendLabel(): string {
    return 'Compartir';
  }

  getViewLabel(): string {
    return 'Ver detalle';
  }

  getReserveLabel(item?: BookingItem): string {
    // Si es carrito en proceso (estado 2), mostrar "Terminar reserva"
    if (item && this.isCartInProcess(item)) {
      return 'Terminar reserva';
    }
    // Si es reserva pendiente, mostrar "Continuar reserva"
    if (this.listType === 'pending-bookings') {
      return 'Continuar reserva';
    }
    // Para presupuestos, mantener "Reservar"
    return 'Reservar';
  }

  getPointsDiscountLabel(item: BookingItem): string {
    return this.hasPointsApplied(item)
      ? 'Puntos ya aplicados'
      : 'Descontar Puntos';
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
