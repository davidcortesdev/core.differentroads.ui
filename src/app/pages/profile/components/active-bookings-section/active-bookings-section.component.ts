import { Component, OnInit } from '@angular/core';

interface Booking {
  id: number;
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

  ngOnInit() {
    this.bookings = [
      {
        id: 1,
        title: 'VIVE EL CARNAVAL DE VENECIA',
        reservationNumber: '907622P',
        creationDate: new Date('2024-02-03'),
        status: 'Reservada',
        departureDate: new Date('2024-06-03'),
        image: 'https://picsum.photos/id/1/200/300',
      },
      {
        id: 2,
        title: 'VIVE EL CARNAVAL DE ESPAÑA',
        reservationNumber: '907622P',
        creationDate: new Date('2024-02-03'),
        status: 'Reservada',
        departureDate: new Date('2024-06-03'),
        image: 'https://picsum.photos/id/2/200/300',
      },
      // Puedes agregar más reservas aquí
    ];
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewBooking(booking: Booking) {
    console.log('Ver reserva:', booking);
  }
}
