import { Component, OnInit } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

type RatingCategory = 'tour' | 'destinos' | 'calidadPrecio' | 'actividades' | 'guias' | 'alojamientos';

interface TripInfo {
  title: string;
  date: string;
}

@Component({
  selector: 'app-reviews',
  standalone: false,
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
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadTripInfo(params['id']);
      }
    });
  }

  // Método para cargar la información del viaje desde el servidor
  loadTripInfo(id: string): void {
    const url = `${environment.apiUrl}/trips/${id}`;
    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.tripInfo = {
          title: response.title || 'Título no disponible',
          date: response.startDate || 'Fecha no disponible'
        };
      },
      error: (error) => {
        console.error('Error al cargar la información del viaje:', error);
        this.tripInfo = {
          title: 'Error al cargar el título',
          date: 'Error al cargar la fecha'
        };
      }
    });
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

