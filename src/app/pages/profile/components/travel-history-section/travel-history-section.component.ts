import { Component, OnInit, Input } from '@angular/core';
import { BookingsService } from '../../../../core/services/bookings.service';

interface TravelHistory {
  bookingNumber: string;
  date: string;
  destination: string;
  departure: string;
  origin: string;
  passengers: number;
  image: string; // Agregada la propiedad image
}

@Component({
  selector: 'app-travel-history-section',
  standalone: false,
  templateUrl: './travel-history-section.component.html',
  styleUrls: ['./travel-history-section.component.scss'],
})
export class TravelHistorySectionComponent implements OnInit {
  travels: TravelHistory[] = [];
  isExpanded: boolean = true;
  @Input() userEmail!: string;

  constructor(private bookingsService: BookingsService) {}

  private getRandomPicsumUrl(): string {
    const randomId = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/id/${randomId}/400/300`;
  }

  ngOnInit() {
    this.fetchTravelHistory(this.userEmail);
  }

  fetchTravelHistory(email: string) {
    this.bookingsService
      .getBookingsByEmail(email, 'Pending,Canceled', 1, 1000)
      .subscribe((response) => {
        console.log(response);

        this.travels = response?.data?.map((booking) => ({
          bookingNumber: booking?.ID ?? '',
          date: new Date(booking?.createdAt ?? '').toLocaleDateString(),
          destination: booking?.periodData?.['tour']?.name || '',
          departure: new Date(
            booking?.periodData?.['dayOne'] ?? ''
          ).toLocaleDateString(),
          origin: booking?.flights ?? 'MAD',
          passengers: booking?.travelersNumber ?? 0,
          image: this.getRandomPicsumUrl(), // Agregada la imagen
        }));
      });
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }
}
