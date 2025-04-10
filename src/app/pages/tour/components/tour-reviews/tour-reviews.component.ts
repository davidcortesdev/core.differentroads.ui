import { Component, Input } from '@angular/core';
import { ReviewCard } from '../../../../shared/models/reviews/review-card.model';
import { Reviews } from '../../../../core/models/blocks/travelers/reviews.model';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ReviewsService } from '../../../../core/services/reviews.service';
import { TourFilter, TourNetService } from '../../../../core/services/tourNet.service';
import { TravelersNetService } from '../../../../core/services/travelersNet.service';

@Component({
  selector: 'app-tour-reviews',
  standalone: false,

  templateUrl: './tour-reviews.component.html',
  styleUrl: './tour-reviews.component.scss',
})
export class TourReviewsComponent {
  @Input() reviews: Reviews | null = null;
  reviewsCards: ReviewCard[] = [];

  constructor(
    private reviewsService: ReviewsService,
    private tourNetService: TourNetService,
    private travelersNetService: TravelersNetService
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  @Input() tourExternalId: string | undefined = undefined; // Add this input to receive the tour external ID

  loadReviews(): void {
    // First, get the tour ID using the external ID
    if (!this.tourExternalId) {
      console.error('No tour external ID provided');
      return;
    }
console.log(this.tourExternalId);
    let filter: TourFilter = {
      tkId: this.tourExternalId,
    }
    this.tourNetService.getTours(filter).pipe(
      switchMap(tour => {
        // Now that we have the tour, we can filter reviews by its ID
        return this.reviewsService.getTopReviews(20, { 
          showOnTourPage: true,
          status: 'ACTIVE',
          tourId: tour[0].id
        });
      }),
      switchMap(reviews => {
        // Create an array of observables for each tour and traveler request
        const reviewRequests = reviews.map(review => {
          // Get tour information
          const tourRequest = this.tourNetService.getTourById(review.tourId).pipe(
            map(tour => ({
              ...review,
              tourName: tour.name
            })),
            catchError(() => of(review))
          );
          
          // Get traveler information if travelerId exists
          return tourRequest.pipe(
            switchMap(reviewWithTour => {
              if (reviewWithTour.travelerId) {
                return this.travelersNetService.getTravelerById(reviewWithTour.travelerId).pipe(
                  map(traveler => ({
                    ...reviewWithTour,
                    travelerName: traveler.name // Update travelerName with the name from traveler service
                  })),
                  catchError(() => of(reviewWithTour))
                );
              }
              return of(reviewWithTour);
            })
          );
        });
        
        // Wait for all requests to complete
        return forkJoin(reviewRequests);
      })
    ).subscribe({
      next: (reviewsWithData) => {
        // Map the API reviews to ReviewCard format
        this.reviewsCards = reviewsWithData.map(review => ({
          review: review.text,
          score: review.rating,
          traveler: review.travelerName,
          tour: review.tourName || '',
          date: review.reviewDate,
        }));

      },
      error: (error) => {
        console.error('Error fetching reviews:', error);
        // Initialize with empty array on error
        this.reviewsCards = [];
      }
    });
  }
}
