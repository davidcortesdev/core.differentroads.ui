import { Component, Input, OnInit } from '@angular/core';
import { ReviewCard } from '../../../../../../shared/models/reviews/review-card.model';
import { Reviews } from '../../../../../../core/models/blocks/travelers/reviews.model';
import { ReviewsService } from '../../../../../../core/services/reviews.service';
import { TravelersNetService } from '../../../../../../core/services/travelersNet.service';
import { of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-community-reviews',
  standalone: false,
  templateUrl: './community-reviews.component.html',
  styleUrls: ['./community-reviews.component.scss'],
})
export class CommunityReviewsComponent implements OnInit {
  @Input() reviews: Reviews | null = null;
  reviewsCards: ReviewCard[] = [];
  reviewsFilter = { showOnHomePage: true };
  loading = false;

  constructor(
    private reviewsService: ReviewsService,
    private travelersNetService: TravelersNetService
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading = true;

    this.reviewsService.getTopReviews(25, {
      showOnHomePage: true,
      status: 'ACTIVE'
    }).pipe(
      take(1),
      switchMap(reviews => {
        
        if (reviews.length === 0) {
          return of([]);
        }

        // Extraer todos los traveler IDs únicos para evitar duplicados
        const travelerIds = [...new Set(reviews.map(review => review.travelerId))];
        
        // Hacer UNA SOLA consulta para obtener todos los travelers
        return this.travelersNetService.getAll({ 
          ids: travelerIds  // Pasar todos los IDs en una sola consulta
        }).pipe(
          map(travelers => {
            
            // Crear un mapa para acceso rápido a los travelers por ID
            const travelersMap = new Map(travelers.map(t => [t.id, t]));
            
            // Mapear reviews con nombres de travelers
            return reviews.map(review => ({
              ...review,
              travelerName: travelersMap.get(review.travelerId)?.name || 'Usuario desconocido'
            }));
          }),
          catchError(error => {
            console.error('❌ Error fetching travelers:', error);
            // Fallback: asignar nombre por defecto a todas las reviews
            return of(reviews.map(review => ({
              ...review,
              travelerName: 'Usuario desconocido'
            })));
          })
        );
      }),
      catchError(error => {
        console.error('❌ Error fetching reviews:', error);
        return of([]);
      })
    ).subscribe({
      next: (reviewsWithTravelers) => {
        
        // Map the API reviews to ReviewCard format with traveler names
        this.reviewsCards = reviewsWithTravelers.map(review => ({
          review: review.text,
          score: review.rating,
          traveler: review.travelerName,
          tour: '',
          date: review.reviewDate,
          tourId: review.tourId,
          travelerId: review.travelerId
        }));
        
        this.loading = false;
        this.onReviewsLoaded(this.reviewsCards);
      },
      error: (error) => {
        console.error('❌ Error in loadReviews:', error);
        this.reviewsCards = [];
        this.loading = false;
      }
    });
  }

  onReviewsLoaded(reviews: ReviewCard[]): void {
    this.reviewsCards = reviews;
  }
}