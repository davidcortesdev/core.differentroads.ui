import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BookingItem } from '../../../../core/models/v2/profile-v2.model';
import { BookingsServiceV2 } from '../../../../core/services/v2/bookings-v2.service';
import { ReservationResponse } from '../../../../core/models/v2/profile-v2.model';
import { ToursServiceV2, TourV2 } from '../../../../core/services/v2/tours-v2.service';
import { DataMappingV2Service } from '../../../../core/services/v2/data-mapping-v2.service';
import { NotificationsServiceV2 } from '../../../../core/services/v2/notifications-v2.service';
import { CMSTourService, ICMSTourResponse } from '../../../../core/services/cms/cms-tour.service';
import { switchMap, map, catchError, of, forkJoin } from 'rxjs';


@Component({
  selector: 'app-booking-list-section-v2',
  standalone: false,
  templateUrl: './booking-list-section-v2.component.html',
  styleUrls: ['./booking-list-section-v2.component.scss'],
})
export class BookingListSectionV2Component implements OnInit {
  @Input() userId: string = '';
  @Input() listType: 'active-bookings' | 'travel-history' | 'recent-budgets' = 'active-bookings';

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
    private notificationsService: NotificationsServiceV2,
    private cmsTourService: CMSTourService
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
    this.bookingsService.getActiveBookings(userId).pipe(
      switchMap((reservations: ReservationResponse[]) => {
        if (!reservations || reservations.length === 0) {
          return of([]);
        }

        // Obtener información de tours y imágenes CMS para cada reserva
        const tourPromises = reservations.map(reservation => 
          forkJoin({
            tour: this.toursService.getTourById(reservation.tourId).pipe(
              catchError(error => {
                console.warn(`Error obteniendo tour ${reservation.tourId}:`, error);
                return of(null);
              })
            ),
            cmsTour: this.cmsTourService.getAllTours({ tourId: reservation.tourId }).pipe(
              map((cmsTours: ICMSTourResponse[]) => cmsTours.length > 0 ? cmsTours[0] : null),
              catchError(error => {
                console.warn(`Error obteniendo CMS tour ${reservation.tourId}:`, error);
                return of(null);
              })
            )
          }).pipe(
            map(({ tour, cmsTour }) => ({ reservation, tour, cmsTour }))
          )
        );

        return forkJoin(tourPromises);
      }),
      map((reservationTourPairs: any[]) => {
        // Mapear usando el servicio de mapeo con imágenes CMS
        return this.dataMappingService.mapReservationsToBookingItems(
          reservationTourPairs.map(pair => pair.reservation),
          reservationTourPairs.map(pair => pair.tour),
          'active-bookings',
          reservationTourPairs.map(pair => pair.cmsTour)
        );
      }),
      catchError(error => {
        console.error('Error obteniendo reservas activas:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las reservas activas'
        });
        return of([]);
      })
    ).subscribe({
      next: (bookingItems: BookingItem[]) => {
        this.bookingItems = bookingItems;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error en la suscripción:', error);
        this.bookingItems = [];
        this.loading = false;
      }
    });
  }

  /**
   * Carga historial de viajes usando servicios v2
   */
  private loadTravelHistory(userId: number): void {
    this.bookingsService.getTravelHistory(userId).pipe(
      switchMap((reservations: ReservationResponse[]) => {
        if (!reservations || reservations.length === 0) {
          return of([]);
        }

        // Obtener información de tours y imágenes CMS para cada reserva
        const tourPromises = reservations.map(reservation => 
          forkJoin({
            tour: this.toursService.getTourById(reservation.tourId).pipe(
              catchError(error => {
                console.warn(`Error obteniendo tour ${reservation.tourId}:`, error);
                return of(null);
              })
            ),
            cmsTour: this.cmsTourService.getAllTours({ tourId: reservation.tourId }).pipe(
              map((cmsTours: ICMSTourResponse[]) => cmsTours.length > 0 ? cmsTours[0] : null),
              catchError(error => {
                console.warn(`Error obteniendo CMS tour ${reservation.tourId}:`, error);
                return of(null);
              })
            )
          }).pipe(
            map(({ tour, cmsTour }) => ({ reservation, tour, cmsTour }))
          )
        );

        return forkJoin(tourPromises);
      }),
      map((reservationTourPairs: any[]) => {
        // Mapear usando el servicio de mapeo con imágenes CMS
        return this.dataMappingService.mapReservationsToBookingItems(
          reservationTourPairs.map(pair => pair.reservation),
          reservationTourPairs.map(pair => pair.tour),
          'travel-history',
          reservationTourPairs.map(pair => pair.cmsTour)
        );
      }),
      catchError(error => {
        console.error('Error obteniendo historial de viajes:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar el historial de viajes'
        });
        return of([]);
      })
    ).subscribe({
      next: (bookingItems: BookingItem[]) => {
        this.bookingItems = bookingItems;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error en la suscripción:', error);
        this.bookingItems = [];
        this.loading = false;
      }
    });
  }

  /**
   * Carga presupuestos recientes usando servicios v2
   */
  private loadRecentBudgets(userId: number): void {
    //TODO: Pendiente de modificar, hay que usar lo mismo que this.bookingsService.getActiveBookings pero filtrando por el id de presupuesto
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
      this.router.navigate(['bookingsv2', item.id]);
    } else if (this.listType === 'recent-budgets') {
      this.router.navigate(['/checkout', item.id]);
    }
  }


  sendItem(item: BookingItem) {
    this.notificationLoading[item.id] = true;
    
    this.notificationsService.sendDocument({
      userId: this.userId,
      documentType: 'voucher',
      documentId: item.id,
      recipientEmail: 'user@example.com' // TODO: Obtener email real del usuario
    }).subscribe({
      next: (response) => {
        this.notificationLoading[item.id] = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: response.message,
        });
      },
      error: (error) => {
        this.notificationLoading[item.id] = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al enviar el documento',
        });
      }
    });
  }


  downloadItem(item: BookingItem) {
    // TEMPORAL: Deshabilitar descarga hasta que la API esté disponible
    this.messageService.add({
      severity: 'warn',
      summary: 'Función no disponible',
      detail: 'La descarga de documentos no está disponible temporalmente. Contacta con soporte si necesitas el documento.',
    });
    return;

    // Código original comentado hasta que la API funcione
    /*
    this.downloadLoading[item.id] = true;
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Generando documento...',
    });

    // Intentar descarga con NotificationsServiceV2
    this.notificationsService.downloadBookingDocument(item.id).subscribe({
      next: (response) => {
        this.downloadLoading[item.id] = false;
        // Abrir el documento en una nueva pestaña
        window.open(response.fileUrl, '_blank');
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Documento descargado exitosamente',
        });
      },
      error: (error) => {
        console.error('Error con NotificationsServiceV2:', error);
        
        // Fallback: Intentar con BookingsServiceV2
        this.bookingsService.downloadBookingDocument(item.id).subscribe({
          next: (response) => {
            this.downloadLoading[item.id] = false;
            window.open(response.fileUrl, '_blank');
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Documento descargado exitosamente',
            });
          },
          error: (fallbackError) => {
            this.downloadLoading[item.id] = false;
            console.error('Error con BookingsServiceV2:', fallbackError);
            
            // Mostrar error final
            let errorMessage = 'Error al descargar el documento';
            if (fallbackError.status === 500) {
              errorMessage = 'El documento no está disponible en este momento. Inténtalo más tarde.';
            } else if (fallbackError.status === 404) {
              errorMessage = 'Documento no encontrado.';
            } else if (fallbackError.status === 403) {
              errorMessage = 'No tienes permisos para descargar este documento.';
            }
            
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage,
            });
          }
        });
      }
    });
    */
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
    return this.listType === 'active-bookings' || this.listType === 'recent-budgets';
  }

  shouldShowSend(): boolean {
    return this.listType === 'active-bookings' || this.listType === 'recent-budgets';
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