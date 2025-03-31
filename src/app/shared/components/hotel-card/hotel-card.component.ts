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
  @Input() bookingScore: number = 8.9;
  @Input() bookingLogoSrc: string = 'booking-logo.png';
  
  ngOnInit(): void {
    // Set default booking logo if not provided
    if (!this.bookingLogoSrc) {
      this.bookingLogoSrc = 'assets/images/booking-logo.png';
    }
  }
}
