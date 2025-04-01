import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Hotel } from '../../../core/models/tours/tour.model';

@Component({
  selector: 'app-hotel-card',
  standalone: false,
  templateUrl: './hotel-card.component.html',
  styleUrls: ['./hotel-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HotelCardComponent {
  @Input() hotel: Hotel | null = null;
  
  readonly bookingLogoSrc: string = 'assets/images/booking-logo.png';
}
