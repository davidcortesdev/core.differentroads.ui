import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router'; 
import { BookingsService } from '../../../../core/services/bookings.service';
import { forkJoin, Subscription } from 'rxjs';
import { ToursService } from '../../../../core/services/tours.service';
import { CldImage } from '../../../../core/models/commons/cld-image.model';

interface Booking {
  id: string;
  title: string;
  reservationNumber: string;
  creationDate: Date;
  status: string;
  departureDate: Date;
  image: string;
  tourID?: string;
  passengers?: number;
  price?: number;
}

@Component({
  selector: 'app-active-bookings-section',
  standalone: false,
  templateUrl: './active-bookings-section.component.html',
  styleUrls: ['./active-bookings-section.component.scss'],
})
export class ActiveBookingsSectionComponent implements OnInit, OnDestroy {
  bookings: Booking[] = [];
  isExpanded: boolean = true;
  @Input() userEmail!: string;
  loading: boolean = false;  
  // Agregamos un EventEmitter para avisar al componente padre cuando se selecciona una reserva
  @Output() bookingSelected = new EventEmitter<string>();
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private bookingsService: BookingsService,
    private router: Router,
    private toursService: ToursService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loading = true;
    if (this.userEmail) {
      this.fetchBookingsWithMultipleStatuses(this.userEmail);
    }
  }
  
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  fetchBookingsWithMultipleStatuses(email: string, page: number = 1) {
    // Obtenemos las reservas tanto con estado "Booked" como "RQ"
    const bookedRequest = this.bookingsService.getBookingsByEmail(email, 'Booked', page, 1000);
    const rqRequest = this.bookingsService.getBookingsByEmail(email, 'RQ', page, 1000);
    
    const subscription = forkJoin([bookedRequest, rqRequest]).subscribe({
      next: ([bookedResponse, rqResponse]) => {
        const bookedBookings = bookedResponse?.data?.map((booking: any) => this.mapBooking(booking)) || [];
        const rqBookings = rqResponse?.data?.map((booking: any) => this.mapBooking(booking)) || [];
        
        this.bookings = [...bookedBookings, ...rqBookings];
        
        // Ordenar por fecha de creación (más reciente primero)
        this.bookings.sort((a, b) => b.creationDate.getTime() - a.creationDate.getTime());
        
        // Cargar las imágenes después de que las reservas estén disponibles
        this.loadTourImages();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching bookings:', error);
        this.loading = false;
      }
    });
    
    this.subscriptions.add(subscription);
  }
  
  mapBooking(booking: any): Booking {
    const tourID = booking?.periodData?.tourID || '';
    
    return {
      id: booking?._id ?? '',
      title: booking?.periodData?.['tour']?.name || '',
      reservationNumber: booking?.ID ?? '',
      creationDate: new Date(booking?.createdAt ?? ''),
      status: booking?.status ?? '',
      departureDate: new Date(booking?.periodData?.['dayOne'] ?? ''),
      image: '', // Imagen por defecto
      tourID: tourID,
      passengers: booking?.passengers?.length || 0,
      price: booking?.totalPrice || 0
    };
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewBooking(booking: Booking) {
    this.router.navigate(['bookings', booking.id]);
  }
  
  loadTourImages() {
    if (!this.bookings || this.bookings.length === 0) return;

    // Procesar en lotes para evitar demasiadas solicitudes simultáneas
    const batchSize = 5;
    for (let i = 0; i < this.bookings.length; i += batchSize) {
      const batch = this.bookings.slice(i, i + batchSize);
      batch.forEach(booking => {
        if (booking.tourID) {
          this.loadBookingImage(booking);
        }
      });
    }
  }

  async loadBookingImage(booking: Booking) {
    if (!booking.tourID) return;
    const image = await this.getImage(booking.tourID);
    if (image && image.url) {
      booking.image = image.url; // Actualizamos la URL de la imagen
      this.cdr.detectChanges(); // Forzar la detección de cambios
    }
  }

  getImage(id: string): Promise<CldImage | null> {
    return new Promise((resolve) => {
      const filters = { externalID: id };
      const subscription = this.toursService.getFilteredToursList(filters).subscribe({
        next: (tourData) => {
          if (
            tourData?.data?.length > 0 &&
            tourData.data[0].image?.length > 0
          ) {
            resolve(tourData.data[0].image[0]);
          } else {
            console.warn('No image data available for tour:', id);
            resolve(null);
          }
        },
        error: (err) => {
          console.error('Error fetching tour image:', err);
          resolve(null);
        },
      });
      
      this.subscriptions.add(subscription);
    });
  }
  
  // Add this function for trackBy
  trackByBookingId(index: number, booking: Booking): string {
    return booking.id;
  }
}