import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ReviewsService } from '../../../../core/services/reviews.service';
import { TourNetService } from '../../../../core/services/tourNet.service';

interface TourHeaderData {
  imageUrl: string;
  title: string;
  rating: number;
  isByDr?: boolean;
  tag?: string;
  description: string;
  webSlug: string;
  externalID?: string; // Añadimos el ID externo para poder obtener el rating
}

@Component({
  selector: 'app-tour-card-header',
  standalone: false,
  templateUrl: './tour-card-header.component.html',
  styleUrls: ['./tour-card-header.component.scss'],
})
export class TourCardHeaderComponent implements OnInit, OnDestroy {
  @Input() tourData!: TourHeaderData;
  @Output() tourClick = new EventEmitter<void>();

  // Añadimos propiedades para el rating y conteo de reseñas
  averageRating?: number = undefined;
  reviewCount: number = 0;

  private subscriptions = new Subscription();

  constructor(
    private reviewsService: ReviewsService,
    private tourNetService: TourNetService
  ) {}

  ngOnInit() {
    console.log('Tour data:', this.tourData);
    // Si tenemos un ID externo, cargamos el rating
    if (this.tourData.externalID) {
      this.loadRatingAndReviewCount(this.tourData.externalID);
    } else {
        console.error('No se ha proporcionado un ID externo para cargar el rating');
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  handleTourClick(): void {
    this.tourClick.emit();
  }

  // Método para cargar el rating y conteo de reseñas
  private loadRatingAndReviewCount(tkId: string) {
    if (!tkId) return;

    // Obtenemos el ID del tour a partir del ID externo
    this.subscriptions.add(
      this.tourNetService.getTourIdByTKId(tkId).subscribe({
        next: (id) => {
          if (id) {
            const filter = { tourId: id };

            // Obtenemos el rating promedio
            this.subscriptions.add(
              this.reviewsService.getAverageRating(filter).subscribe({
                next: (rating) => {
                  this.averageRating = rating || 990;
                  console.log('Rating promedio:', this.averageRating);
                  // Actualizamos el rating en tourData para que se muestre en la plantilla
                  this.tourData.rating = this.averageRating;
                },
                error: (error) => {
                  console.error('Error al cargar el rating promedio:', error);
                },
              })
            );

            // Obtenemos el conteo de reseñas
            this.subscriptions.add(
              this.reviewsService.getReviewCount(filter).subscribe({
                next: (count) => {
                  this.reviewCount = count || 0;
                },
                error: (error) => {
                  console.error('Error al cargar el conteo de reseñas:', error);
                },
              })
            );
          }
        },
        error: (error) => {
          console.error('Error al obtener el ID del tour:', error);
        },
      })
    );
  }
}
