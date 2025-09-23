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
  price: number;
  tourName?: string;
}

@Component({
  selector: 'app-booking-details-view-v2',
  templateUrl: './booking-details-view.component.html',
  styleUrls: ['./booking-details-view.component.scss'],
  standalone: false,
})
export class BookingDetailsViewV2Component implements OnInit {
  @Input() bookingImages: BookingImage[] = [];
  @Input() tourName: string = '';

  constructor() {}

  ngOnInit(): void {}
}