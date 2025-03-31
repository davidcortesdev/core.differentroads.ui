import { Component, Input } from '@angular/core';
import { Hotel } from '../../../core/models/tours/tour.model';

@Component({
  selector: 'app-hotel-card',
  standalone: false,
  templateUrl: './hotel-card.component.html',
  styleUrls: ['./hotel-card.component.scss']
})
export class HotelCardComponent {
  @Input() hotel: Hotel | null = null;
  
  // Definir como propiedad normal en lugar de Input
  bookingLogoSrc: string = 'assets/images/booking-logo.png';
  
}
