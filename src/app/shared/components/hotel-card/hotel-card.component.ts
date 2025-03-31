import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Hotel } from '../../../core/models/tours/tour.model';

@Component({
  selector: 'app-hotel-card',
  standalone: false,
  templateUrl: './hotel-card.component.html',
  styleUrls: ['./hotel-card.component.scss']
})
export class HotelCardComponent implements OnChanges {
  @Input() hotel: Hotel | null = null;
  @Input() bookingScore: number = 8.9;
  @Input() bookingLogoSrc: string = 'booking-logo.png';
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['hotel']) {
      console.log('Hotel data received in HotelCardComponent:', this.hotel);
    }
  }
}
