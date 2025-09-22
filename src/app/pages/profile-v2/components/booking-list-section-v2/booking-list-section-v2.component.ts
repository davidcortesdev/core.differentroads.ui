import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BookingsServiceV2 } from '../../../checkout-v2/services/bookings-v2.service';
import { NotificationsServiceV2 } from '../../../checkout-v2/services/notifications.service';
import { BookingItem } from '../../../../core/models/v2/profile-v2.model';


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
    private notificationsService: NotificationsServiceV2
  ) {}

  ngOnInit() {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    
    // Usar servicios V2 para obtener datos
    switch (this.listType) {
      case 'active-bookings':
        this.bookingsService.getActiveBookings(this.userId).subscribe({
          next: (data) => {
            this.bookingItems = data;
            this.loading = false;
          },
          error: (error) => {
            this.bookingItems = [];
            this.loading = false;
          }
        });
        break;
      case 'recent-budgets':
        this.bookingsService.getRecentBudgets(this.userId).subscribe({
          next: (data) => {
            this.bookingItems = data;
            this.loading = false;
          },
          error: (error) => {
            this.bookingItems = [];
            this.loading = false;
          }
        });
        break;
      case 'travel-history':
        this.bookingsService.getTravelHistory(this.userId).subscribe({
          next: (data) => {
            this.bookingItems = data;
            this.loading = false;
          },
          error: (error) => {
            this.bookingItems = [];
            this.loading = false;
          }
        });
        break;
      default:
        this.bookingItems = [];
        this.loading = false;
    }
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

    this.bookingsService.downloadBookingDocument(item.id, 'voucher').subscribe({
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