import { Component, Input, OnInit } from '@angular/core';

// Interface para los elementos del dataview de imágenes
export interface BookingImage {
  id: number;
  name: string;
  imageUrl: string;
  retailer: string;
  creationDate: string;
  departureDate: string;
  passengers: number;
  price: string;
  tourName?: string;
}

@Component({
  selector: 'app-booking-details-view',
  templateUrl: './booking-details-view.component.html',
  styleUrls: ['./booking-details-view.component.scss'],
  standalone: false,
})
export class BookingDetailsViewComponent implements OnInit {
  @Input() bookingImages: BookingImage[] = [];
  @Input() tourName: string = '';

  constructor() {}

  ngOnInit(): void {console.log('this.bookingImages',this.bookingImages);}
}