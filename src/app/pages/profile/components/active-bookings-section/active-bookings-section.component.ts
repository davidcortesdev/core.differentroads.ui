import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router'; 
import { BookingsService } from '../../../../core/services/bookings.service';
import { forkJoin } from 'rxjs';
import { ToursService } from '../../../../core/services/tours.service';
import { CldImage } from '../../../../core/models/commons/cld-image.model';
import { Tour } from '../../../../core/models/tours/tour.model';

interface Booking {
  id: string;
  title: string;
  reservationNumber: string;
  creationDate: Date;
  status: string;
  departureDate: Date;
  image: string;
  tourID?: string;
}

@Component({
  selector: 'app-active-bookings-section',
  standalone: false,
  templateUrl: './active-bookings-section.component.html',
  styleUrls: ['./active-bookings-section.component.scss'],
})
export class ActiveBookingsSectionComponent implements OnInit {
  bookings: Booking[] = [];
  isExpanded: boolean = true;
  @Input() userEmail!: string;
  
  // Agregamos un EventEmitter para avisar al componente padre cuando se selecciona una reserva
  @Output() bookingSelected = new EventEmitter<string>();

  constructor(
    private bookingsService: BookingsService,
    private router: Router,
    private toursService: ToursService,
    private cdr: ChangeDetectorRef // Añadir ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.fetchBookingsWithMultipleStatuses(this.userEmail);
  }

  fetchBookingsWithMultipleStatuses(email: string, page: number = 1) {
    // Obtenemos las reservas tanto con estado "Booked" como "RQ"
    const bookedRequest = this.bookingsService.getBookingsByEmail(email, 'Booked', page, 1000);
    const rqRequest = this.bookingsService.getBookingsByEmail(email, 'RQ', page, 1000);
    
    // Utilizamos forkJoin para hacer ambas peticiones en paralelo
    forkJoin([bookedRequest, rqRequest]).subscribe(([bookedResponse, rqResponse]) => {
      
      // Mapea las reservas Booked
      const bookedBookings = bookedResponse?.data?.map((booking: any) => this.mapBooking(booking)) || [];
      
      // Mapea las reservas RQ
      const rqBookings = rqResponse?.data?.map((booking: any) => this.mapBooking(booking)) || [];
      
      // Combina ambos arrays
      this.bookings = [...bookedBookings, ...rqBookings];
      
      // Ordena las reservas por fecha de creación (más reciente primero - de la más nueva a la más antigua)
      this.bookings.sort((a, b) => b.creationDate.getTime() - a.creationDate.getTime());
      
      // Cargar las imágenes después de que las reservas estén disponibles
      this.loadTourImages();
    });
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
    };
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewBooking(booking: Booking) {

    // Opción 1: Navegar a una ruta con el ID
    this.router.navigate(['bookings', booking.id]);
    
    // Opción 2: Emitir el evento para que el componente padre cargue los datos
    // Descomentar esta línea si prefieres esta opción
    // this.bookingSelected.emit(booking.id);
  }
  
  // Método de utilidad para obtener el estilo según el estado de la reserva
  getStatusStyle(status: string) {
    switch (status) {
      case 'Booked':
        return 'bg-green-100 text-green-800';
      case 'RQ':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

    // Método para cargar todas las imágenes de los tours
    loadTourImages() {
      console.log('Cargando imágenes de los tours...');
      console.log('Reservas:', this.bookings);
      if (!this.bookings || this.bookings.length === 0) return;
  
      // Para cada reserva, cargamos su imagen correspondiente
      this.bookings.forEach((booking) => {
        if (booking.tourID) {
          this.loadBookingImage(booking);
        }
      });
    }

  async loadBookingImage(booking: Booking) {
    if (!booking.tourID) return;
    const image = await this.getImage(booking.tourID);
    if (image && image.url) {
      booking.image = image.url; // Actualizamos la URL de la imagen
      console.log('Imagen actualizada:', booking.image);
      this.cdr.detectChanges(); // Forzar la detección de cambios
    }
    console.log(booking.image);
  }

  getImage(id: string): Promise<CldImage | null> {
    return new Promise((resolve) => {
      const filters = {
        externalID: id,
      };
      this.toursService.getFilteredToursList(filters).subscribe({
        next: (tourData) => {
          if (
            tourData &&
            tourData.data &&
            tourData.data.length > 0 &&
            tourData.data[0].image &&
            tourData.data[0].image.length > 0
          ) {
            resolve(tourData.data[0].image[0]);
          } else {
            console.log('No image data available for tour:', id);
            resolve(null);
          }
        },
        error: (err) => {
          console.error('Error fetching tour image:', err);
          resolve(null);
        },
      });
    });
  }
}