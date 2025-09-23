import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BookingItem } from '../../../../core/models/v2/profile-v2.model';
import { BookingsServiceV2, ReservationResponse } from '../../../../core/services/v2/bookings-v2.service';
import { ToursServiceV2, TourV2 } from '../../../../core/services/v2/tours-v2.service';
import { OrdersServiceV2, OrderV2 } from '../../../../core/services/v2/orders-v2.service';
import { DataMappingV2Service } from '../../../../core/services/v2/data-mapping-v2.service';
import { NotificationsServiceV2 } from '../../../checkout-v2/services/notifications.service';
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
    private ordersService: OrdersServiceV2,
    private dataMappingService: DataMappingV2Service,
    private notificationsService: NotificationsServiceV2
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

        // Obtener información de tours para cada reserva
        const tourPromises = reservations.map(reservation => 
          this.toursService.getTourById(reservation.tourId).pipe(
            map(tour => ({ reservation, tour })),
            catchError(error => {
              console.warn(`Error obteniendo tour ${reservation.tourId}:`, error);
              return of({ reservation, tour: null });
            })
          )
        );

        return forkJoin(tourPromises);
      }),
      map((reservationTourPairs: any[]) => {
        // Mapear usando el servicio de mapeo
        return this.dataMappingService.mapReservationsToBookingItems(
          reservationTourPairs.map(pair => pair.reservation),
          reservationTourPairs.map(pair => pair.tour),
          'active-bookings'
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

        // Obtener información de tours para cada reserva
        const tourPromises = reservations.map(reservation => 
          this.toursService.getTourById(reservation.tourId).pipe(
            map(tour => ({ reservation, tour })),
            catchError(error => {
              console.warn(`Error obteniendo tour ${reservation.tourId}:`, error);
              return of({ reservation, tour: null });
            })
          )
        );

        return forkJoin(tourPromises);
      }),
      map((reservationTourPairs: any[]) => {
        // Mapear usando el servicio de mapeo
        return this.dataMappingService.mapReservationsToBookingItems(
          reservationTourPairs.map(pair => pair.reservation),
          reservationTourPairs.map(pair => pair.tour),
          'travel-history'
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
    // Para presupuestos, usar el servicio de órdenes
    // Nota: El servicio de órdenes usa email, no userId
    // Por ahora usamos el userId como email (esto se puede mejorar)
    this.ordersService.getRecentBudgets(this.userId).pipe(
      switchMap((response: any) => {
        const orders: OrderV2[] = response.data || response || [];
        if (!orders || orders.length === 0) {
          return of([]);
        }

        // Obtener información de tours para cada orden
        const tourPromises = orders.map((order: OrderV2) => 
          this.toursService.getTourById(parseInt(order.periodID)).pipe(
            map(tour => ({ order, tour })),
            catchError(error => {
              console.warn(`Error obteniendo tour ${order.periodID}:`, error);
              return of({ order, tour: null });
            })
          )
        );

        return forkJoin(tourPromises);
      }),
      map((orderTourPairs: any[]) => {
        // Mapear usando el servicio de mapeo
        return this.dataMappingService.mapOrdersToBookingItems(
          orderTourPairs.map(pair => pair.order),
          orderTourPairs.map(pair => pair.tour)
        );
      }),
      catchError(error => {
        console.error('Error obteniendo presupuestos:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los presupuestos'
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
    this.downloadLoading[item.id] = true;
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Generando documento...',
    });

    // TODO: Implementar downloadBookingDocument en BookingsServiceV2
    // Por ahora usar datos mock
    of({ fileUrl: `https://mock-api.com/documents/${item.id}/voucher.pdf` }).subscribe({
      next: (response) => {
        this.downloadLoading[item.id] = false;
        // Simular descarga del archivo
          window.open(response.fileUrl, '_blank');
          this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Documento descargado exitosamente',
        });
      },
      error: (error) => {
        this.downloadLoading[item.id] = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al descargar el documento',
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