import { Component, OnInit } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ReviewsService } from '../../core/services/reviews.service';
import { PeriodsService } from '../../core/services/periods.service';
import { CommonModule } from '@angular/common';

type RatingCategory = 'tour' | 'destinos' | 'calidadPrecio' | 'actividades' | 'guias' | 'alojamientos';

interface TripInfo {
  title: string;
  date: string;
}

@Component({
  selector: 'app-reviews',
  standalone: true, // <-- set to true if you want to use standalone
  imports: [CommonModule, InputTextModule], // <-- add CommonModule here
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss'
})
export class ReviewsComponent implements OnInit {
  ratings: Record<RatingCategory, number> = {
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

  constructor(
    private route: ActivatedRoute,
    private periodsService: PeriodsService
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
      },
      error: (error) => {
        console.error('Error al cargar la información del periodo:', error);
        this.setErrorTripInfo();
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

  setHalfRating(tipo: RatingCategory, index: number, half: boolean) {
    if (half) {
        this.ratings[tipo] = index - 0.5;
    } else {
        this.ratings[tipo] = index;
    }
    console.log(`${tipo} rating set to: ${this.ratings[tipo]}`);
  }

  isFullStar(tipo: RatingCategory, index: number): boolean {
    return this.ratings[tipo] >= index;
  }

  isHalfStar(tipo: RatingCategory, index: number): boolean {
    return this.ratings[tipo] === index - 0.5;
  }
}

