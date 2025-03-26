import { Component, OnInit, Input } from '@angular/core';
import { BookingsService } from '../../../../core/services/bookings.service';
import { Router } from '@angular/router';

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

  constructor(
    private router: Router,
    private bookingsService: BookingsService
  ) {}

  ngOnInit() {
    this.fetchBookingsByEmail(this.userEmail);
  }

  fetchBookingsByEmail(email: string, page: number = 1) {
    this.bookingsService
      .getBookingsByEmail(email, 'Booked', page, 1000)
      .subscribe((response) => {
        this.bookings = response?.data?.map((booking) => ({
          id: booking?.id ?? '',
          title: booking?.periodData?.['tour']?.name || '',
          reservationNumber: booking?.ID ?? '',
          creationDate: new Date(booking?.createdAt ?? ''),
          status: booking?.status ?? '',
          departureDate: new Date(booking?.periodData?.['dayOne'] ?? ''),
          image: 'https://picsum.photos/200',
        }));
      });
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  viewBooking(booking: Booking) {
    console.log('Ver reserva:', booking);

    this.router.navigate(['bookings', booking.id]);
  }
}
