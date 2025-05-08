import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReviewsService } from '../../core/services/reviews.service';
import { PeriodsService } from '../../core/services/periods.service';
import { DatePipe } from '@angular/common';

type RatingCategory = 'tour' | 'destinos' | 'calidadPrecio' | 'actividades' | 'guias' | 'alojamientos';

interface TripInfo {
  title: string;
  date: string;
}

@Component({
  selector: 'app-reviews',
  standalone: false, 
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
})
export class ReviewsComponent implements OnInit {
  nombre: string = '';
  email: string = '';
  comentario: string = '';
  ratings = {
    tour: 0,
    destinos: 0,
    calidadPrecio: 0,
    actividades: 0,
    guias: 0,
    alojamientos: 0
  };

  tripInfo: TripInfo = {
    title: 'Cargando...',
    date: 'Cargando...'
  };
  formattedDate: string = '';

  constructor(
    private route: ActivatedRoute,
    private periodsService: PeriodsService,
    private reviewsService: ReviewsService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadTripInfoFromPeriod(params['id']);
      }
    });
  }

  // Método para cargar la información del viaje desde el periodo
  loadTripInfoFromPeriod(externalId: string): void {
    this.periodsService.getPeriodNameAndDepartureDate(externalId).subscribe({
      next: (info) => {
        this.tripInfo = {
          title: info.tourName || 'Título no disponible',
          date: info.dayOne || 'Fecha no disponible'
        };
        
        // Formatear la fecha usando DatePipe
        if (this.tripInfo.date && this.tripInfo.date !== 'Fecha no disponible') {
          this.formattedDate = this.datePipe.transform(this.tripInfo.date, 'dd/MM/yyyy') || 'dd/MM/yyyy';
        } else {
          this.formattedDate = 'dd/MM/yyyy';
        }
      },
      error: (error) => {
        console.error('Error al cargar la información del periodo:', error);
        this.setErrorTripInfo();
        this.formattedDate = 'dd/MM/yyyy';
      }
    });
  }

  // Método para establecer información de error
  private setErrorTripInfo(): void {
    this.tripInfo = {
      title: 'Error al cargar el título',
      date: 'Error al cargar la fecha'
    };
  }

  // Método para obtener la información del título y la fecha
  getTripInfo(): TripInfo {
    return this.tripInfo;
  }

  setRating(category: RatingCategory, rating: number): void {
    if (this.ratings[category] === rating) {
      this.ratings[category] = 0;
    } else {
      this.ratings[category] = rating;
    }
  }

  isFullStar(tipo: RatingCategory, index: number): boolean {
    return this.ratings[tipo] >= index;
  }

  isHalfStar(tipo: RatingCategory, index: number): boolean {
    return false; // Ya no usamos medias estrellas
  }

  submitReview(): void {
    const review = {
      nombre: this.nombre,
      email: this.email,
      comentario: this.comentario,
      ratings: this.ratings,
      tripInfo: this.tripInfo
    };
    this.reviewsService.saveReview(review).subscribe({
      next: (resp) => {
        alert('¡Opinión enviada con éxito!');
      },
      error: (err) => {
        alert('Error al enviar la opinión');
      }
    });
  }
}

