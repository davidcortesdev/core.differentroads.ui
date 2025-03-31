import { Component, Input, OnInit } from '@angular/core';
import { Hotel } from '../../../core/models/tours/tour.model';

@Component({
  selector: 'app-hotel-card',
  standalone: false,
  templateUrl: './hotel-card.component.html',
  styleUrls: ['./hotel-card.component.scss']
})
export class HotelCardComponent implements OnInit {
  @Input() hotel: Hotel | null = null;
  @Input() bookingLogoSrc: string = 'assets/images/booking-logo.png';
  
  ngOnInit(): void {
    // Removed console.log for production
    if (!this.bookingLogoSrc) {
      this.bookingLogoSrc = 'assets/images/booking-logo.png';
    }
  }
}
