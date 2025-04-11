import { Component, Input, OnInit } from '@angular/core';
import { ReviewCard } from '../../../../shared/models/reviews/review-card.model';
import { Reviews } from '../../../../core/models/blocks/travelers/reviews.model';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { ReviewsService } from '../../../../core/services/reviews.service';
import { TourFilter, TourNetService } from '../../../../core/services/tourNet.service';
import { TravelersNetService } from '../../../../core/services/travelersNet.service';

@Component({
  selector: 'app-tour-reviews',
  standalone: false,
  templateUrl: './tour-reviews.component.html',
  styleUrl: './tour-reviews.component.scss',
})
export class TourReviewsComponent implements OnInit {
  @Input() reviews: Reviews | null = null;
  @Input() tourExternalId: string | undefined = undefined;
  
  reviewsCards: ReviewCard[] = [];
  loading = false;

  constructor(
    private reviewsService: ReviewsService,
    private tourNetService: TourNetService,
    private travelersNetService: TravelersNetService
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    if (!this.tourExternalId) {
      console.error('No tour external ID provided');
      return;
    }

    this.loading = true;
    const filter: TourFilter = {
      tkId: this.tourExternalId,
    };
    
    this.tourNetService.getTours(filter).pipe(
      take(1),
      switchMap(tours => {
        if (!tours || tours.length === 0) {
          return of([]);
        }
        // Now that we have the tour, we can filter reviews by its ID
        return this.reviewsService.getTopReviews(25, { 
          showOnTourPage: true,
          status: 'ACTIVE',
          tourId: tours[0].id
        });
      })
    ).subscribe({
      next: (reviews) => {
        // Map the API reviews to ReviewCard format
        this.reviewsCards = reviews.map(review => ({
          review: review.text,
          score: review.rating,
          traveler: '',
          tour: '',
          date: review.reviewDate,
          tourId: review.tourId,
          travelerId: review.travelerId
        }));
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching reviews:', error);
        this.reviewsCards = [];
        this.loading = false;
      }
    });
  }

  // Remove the enrichReviewData method as it's now moved to reviews.component.ts
}
