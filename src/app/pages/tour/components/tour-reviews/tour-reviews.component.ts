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
        return this.reviewsService.getTopReviews(20, { 
          showOnTourPage: true,
          status: 'ACTIVE',
          tourId: tours[0].id
        });
      }),
      switchMap(reviews => {
        if (!reviews || reviews.length === 0) {
          return of([]);
        }
        
        // Create an array of observables for each tour and traveler request
        const reviewRequests = reviews.map(review => this.enrichReviewData(review));
        
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

  private enrichReviewData(review: any) {
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
              travelerName: traveler.name
            })),
            catchError(() => of(reviewWithTour))
          );
        }
        return of(reviewWithTour);
      })
    );
  }
}
