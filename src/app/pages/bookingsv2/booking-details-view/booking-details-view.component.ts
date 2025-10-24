import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

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
export class BookingDetailsViewV2Component implements OnInit, OnChanges {
  @Input() bookingImages: BookingImage[] = [];
  @Input() tourName: string = '';
  @Input() refreshTrigger: any = null; // Trigger para refrescar los datos

  constructor() {}

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshTrigger'] && changes['refreshTrigger'].currentValue) {
      console.log('🔄 Refrescando datos de booking details por trigger...');
      this.refreshBookingDetails();
    }
  }

  private refreshBookingDetails(): void {
    // Aquí se pueden recargar los datos si es necesario
    // Por ahora solo logueamos que se recibió el trigger
    console.log('📊 Datos de booking details actualizados');
  }
}