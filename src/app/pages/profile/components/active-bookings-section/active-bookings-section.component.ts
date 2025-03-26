import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router'; 
import { BookingsService } from '../../../../core/services/bookings.service';

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
    this.fetchBookingsByEmail(this.userEmail);
  }

  fetchBookingsByEmail(email: string, page: number = 1) {
    this.bookingsService
      .getBookingsByEmail(email, 'Booked', page, 1000)
      .subscribe((response) => {
        console.log('Respuesta completa:', response);
        
        this.bookings = response?.data?.map((booking: any) => {
          console.log('Booking original:', booking);
          
          return {
            id: booking?._id ?? '',
            title: booking?.periodData?.['tour']?.name || '',
            reservationNumber: booking?.ID ?? '',
            creationDate: new Date(booking?.createdAt ?? ''),
            status: booking?.status ?? '',
            departureDate: new Date(booking?.periodData?.['dayOne'] ?? ''),
            image: 'https://picsum.photos/200',
          };
        });
        
        console.log('Bookings mapeados:', this.bookings);
      });
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewBooking(booking: Booking) {
    console.log('Navegando a booking con ID:', booking.id);
    
    // Opción 1: Navegar a una ruta con el ID
    this.router.navigate(['bookings', booking.id]);
    
    // Opción 2: Emitir el evento para que el componente padre cargue los datos
    // Descomentar esta línea si prefieres esta opción
    // this.bookingSelected.emit(booking.id);
  }
}