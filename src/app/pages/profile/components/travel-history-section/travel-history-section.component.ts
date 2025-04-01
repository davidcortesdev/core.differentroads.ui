import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { BookingsService } from '../../../../core/services/bookings.service';
import { ToursService } from '../../../../core/services/tours.service';
import { CldImage } from '../../../../core/models/commons/cld-image.model';
import { Tour } from '../../../../core/models/tours/tour.model';

interface TravelHistory {
  bookingNumber: string;
  date: string;
  destination: string;
  departure: string;
  origin: string;
  passengers: number;
  image: string;
  tourID?: string; // Añadido tourID para obtener imágenes
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
  loading: boolean = false;
  @Input() userEmail!: string;

  constructor(
    private bookingsService: BookingsService,
    private toursService: ToursService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loading = true;
    this.fetchTravelHistory(this.userEmail);
  }

  fetchTravelHistory(email: string) {
    this.bookingsService
      .getBookingsByEmail(email, 'Pending,Canceled', 1, 1000)
      .subscribe((response) => {

        this.travels = response?.data?.map((booking) => this.mapTravel(booking)) || [];
        this.loading = false;
        // Cargar las imágenes después de que los viajes estén disponibles
        this.loadTourImages();
      });
  }

  mapTravel(booking: any): TravelHistory {
    const tourID = booking?.periodData?.tourID || '';
    
    return {
      bookingNumber: booking?.ID ?? '',
      date: new Date(booking?.createdAt ?? '').toLocaleDateString(),
      destination: booking?.periodData?.['tour']?.name || '',
      departure: new Date(
        booking?.periodData?.['dayOne'] ?? ''
      ).toLocaleDateString(),
      origin: booking?.flights?.[0]?.name ?? 'MAD',
      passengers: booking?.travelersNumber ?? 0,
      image: '', // Imagen por defecto
      tourID: tourID,
    };
  }

  // Método para cargar todas las imágenes de los tours
  loadTourImages() {
    if (!this.travels || this.travels.length === 0) return;

    // Para cada viaje, cargamos su imagen correspondiente
    this.travels.forEach((travel) => {
      if (travel.tourID) {
        this.loadTravelImage(travel);
      }
    });
  }

  async loadTravelImage(travel: TravelHistory) {
    if (!travel.tourID) return;
    const image = await this.getImage(travel.tourID);
    if (image && image.url) {
      travel.image = image.url; // Actualizamos la URL de la imagen
      this.cdr.detectChanges(); // Forzar la detección de cambios
    }
  }

  getImage(id: string): Promise<CldImage | null> {
    return new Promise((resolve) => {
      const filters = {
        externalID: id,
      };
      this.toursService.getFilteredToursList(filters).subscribe({
        next: (tourData) => {
          if (
            tourData &&
            tourData.data &&
            tourData.data.length > 0 &&
            tourData.data[0].image &&
            tourData.data[0].image.length > 0
          ) {
            resolve(tourData.data[0].image[0]);
          } else {
            console.log('No image data available for tour:', id);
            resolve(null);
          }
        },
        error: (err) => {
          console.error('Error fetching tour image:', err);
          resolve(null);
        },
      });
    });
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }
}
