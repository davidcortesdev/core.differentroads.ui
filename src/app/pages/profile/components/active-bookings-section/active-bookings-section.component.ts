import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router'; 
import { BookingsService } from '../../../../core/services/bookings.service';
import { forkJoin } from 'rxjs';

interface Booking {
  id: string;
  title: string;
  reservationNumber: string;
  creationDate: Date;
  status: string;
  departureDate: Date;
  image: string;
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
    private router: Router
  ) {}

  ngOnInit() {
    this.fetchBookingsWithMultipleStatuses(this.userEmail);
  }

  fetchBookingsWithMultipleStatuses(email: string, page: number = 1) {
    // Obtenemos las reservas tanto con estado "Booked" como "RQ"
    const bookedRequest = this.bookingsService.getBookingsByEmail(email, 'Booked', page, 1000);
    const rqRequest = this.bookingsService.getBookingsByEmail(email, 'RQ', page, 1000);
    
    // Utilizamos forkJoin para hacer ambas peticiones en paralelo
    forkJoin([bookedRequest, rqRequest]).subscribe(([bookedResponse, rqResponse]) => {;
      
      // Mapea las reservas Booked
      const bookedBookings = bookedResponse?.data?.map((booking: any) => this.mapBooking(booking)) || [];
      
      // Mapea las reservas RQ
      const rqBookings = rqResponse?.data?.map((booking: any) => this.mapBooking(booking)) || [];
      
      // Combina ambos arrays
      this.bookings = [...bookedBookings, ...rqBookings];
      
      // Ordena las reservas por fecha de creación (más reciente primero - de la más nueva a la más antigua)
      this.bookings.sort((a, b) => b.creationDate.getTime() - a.creationDate.getTime());
      
    });
  }
  
  mapBooking(booking: any): Booking {
    
    return {
      id: booking?._id ?? '',
      title: booking?.periodData?.['tour']?.name || '',
      reservationNumber: booking?.ID ?? '',
      creationDate: new Date(booking?.createdAt ?? ''),
      status: booking?.status ?? '',
      departureDate: new Date(booking?.periodData?.['dayOne'] ?? ''),
      image: 'https://picsum.photos/200',
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
}