import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
} from '@angular/core';
import { ReviewCard } from '../../models/reviews/review-card.model';
import { CAROUSEL_CONFIG } from '../../constants/carousel.constants';
import { ReviewsService } from '../../../core/services/reviews.service';
import { TourNetService } from '../../../core/services/tourNet.service';
import { TravelersNetService } from '../../../core/services/travelersNet.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-reviews',
  standalone: false,
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent implements OnInit {
  @Input() reviews: ReviewCard[] = [];
  @Input() reviewsFilter: any = {};
  @Input() tourExternalId: string | undefined = undefined;
  @Output() reviewsLoaded = new EventEmitter<ReviewCard[]>();
  @Output() loadingChange = new EventEmitter<boolean>();

  readonly responsiveOptions = [
    {
      breakpoint: '3500px',
      numVisible: 6,
      numScroll: 1,
    },
    {
      breakpoint: '2500px',
      numVisible: 5,
      numScroll: 1,
    },
    {
      breakpoint: '2000px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '1500px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '1200px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '850px',
      numVisible: 1,
      numScroll: 1,
    },
  ];

  protected carouselConfig = CAROUSEL_CONFIG;

  constructor(
    private reviewsService: ReviewsService,
    private tourNetService: TourNetService,
    private travelersNetService: TravelersNetService
  ) {}

  ngOnInit(): void {
    if (this.reviewsFilter || this.tourExternalId) {
      this.loadReviews();
    } else if (!this.reviews?.length) {
      console.warn('No reviews provided to ReviewsComponent');
    }
  }

  loadReviews(): void {
    this.loadingChange.emit(true);
    
    let reviewsObservable: Observable<any[]>;
    
    if (this.tourExternalId) {
      // Tour page specific logic
      const filter = { tkId: this.tourExternalId };
      
      reviewsObservable = this.tourNetService.getTours(filter).pipe(
        take(1),
        switchMap(tours => {
          if (!tours || tours.length === 0) {
            return of([]);
          }
          return this.reviewsService.getTopReviews(20, { 
            showOnTourPage: true,
            status: 'ACTIVE',
            tourId: tours[0].id,
            ...this.reviewsFilter
          });
        })
      );
    } else {
      // Home page or general reviews
      reviewsObservable = this.reviewsService.getTopReviews(20, { 
        status: 'ACTIVE',
        ...this.reviewsFilter
      });
    }
    
    reviewsObservable.pipe(
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
        const reviewCards = reviewsWithData.map(review => ({
          travelerId: review.travelerId,
          tourId: review.tourId,
          review: review.text,
          score: review.rating,
          traveler: review.travelerName,
          tour: review.tourName || '',
          date: review.reviewDate,
        }));
        
        this.reviews = reviewCards;
        this.reviewsLoaded.emit(reviewCards);
        this.loadingChange.emit(false);
      },
      error: (error) => {
        console.error('Error fetching reviews:', error);
        this.reviews = [];
        this.reviewsLoaded.emit([]);
        this.loadingChange.emit(false);
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
