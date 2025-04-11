import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ReviewCard } from '../../models/reviews/review-card.model';
import { CAROUSEL_CONFIG } from '../../constants/carousel.constants';
import { TourNetService } from '../../../core/services/tourNet.service';
import { TravelersNetService } from '../../../core/services/travelersNet.service';
import { ToursService } from '../../../core/services/tours.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

interface EnrichedReviewData {
  tourId: string | number;
  travelerId: string | number;
  tourName: string;
  travelerName: string;
}

@Component({
  selector: 'app-reviews',
  standalone: false,
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsComponent implements OnInit {
  @Input() reviews: ReviewCard[] = [];
  
  enrichedReviews: ReviewCard[] = [];
  loading = true;
  skeletonArray = Array(6).fill({});
  showFullReviewModal = false;
  selectedReview: ReviewCard | null = null;

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
    private tourNetService: TourNetService,
    private travelersNetService: TravelersNetService,
    private toursService: ToursService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.reviews?.length) {
      this.loading = true;
      this.loadMissingNames();
    } else {
      this.loading = false;
    }
  }

  loadMissingNames(): void {
    if (!this.reviews?.length) {
      this.loading = false;
      return;
    }

    const reviewsToProcess = [...this.reviews];
    
    const reviewsNeedingEnrichment = reviewsToProcess
      .filter(review => (review.tourId && !review.tour) || (review.travelerId && !review.traveler));
    
    if (!reviewsNeedingEnrichment.length) {
      this.enrichedReviews = reviewsToProcess;
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    
    const reviewRequests = reviewsNeedingEnrichment
      .map(review => this.enrichReviewData(review));
    
    forkJoin(reviewRequests).subscribe({
      next: (enrichedData) => {
        this.processEnrichedData(reviewsToProcess, enrichedData);
      },
      error: () => {
        this.enrichedReviews = reviewsToProcess;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private processEnrichedData(reviewsToProcess: ReviewCard[], enrichedData: EnrichedReviewData[]): void {
    this.enrichedReviews = reviewsToProcess.map(review => {
      const enriched = enrichedData.find(data => 
        String(data.tourId) === String(review.tourId) && String(data.travelerId) === String(review.travelerId)
      );
      
      if (enriched) {
        return {
          ...review,
          tour: enriched.tourName || review.tour || 'Unknown Tour',
          traveler: enriched.travelerName || review.traveler || 'Unknown Traveler'
        };
      }
      
      return review;
    });
    
    this.loading = false;
    this.cdr.markForCheck();
  }

  private enrichReviewData(review: ReviewCard): Observable<EnrichedReviewData> {
    const reviewData: EnrichedReviewData = {
      tourId: review.tourId || '',
      travelerId: review.travelerId || '',
      tourName: review.tour || '',
      travelerName: review.traveler || ''
    };

    let observable = of(reviewData);
    
    if (review.tourId && !review.tour) {
      observable = this.tourNetService.getTourById(review.tourId).pipe(
        switchMap(tour => {
          const idext: string = tour.tkId || '';
          
          if (idext) {
            return this.toursService.getTourDetailByExternalID(idext).pipe(
              map(tourDetail => ({
                ...reviewData,
                tourName: tourDetail?.name || tour?.name || 'Unknown Tour'
              })),
              catchError(() => of({
                ...reviewData,
                tourName: tour?.name || 'Unknown Tour'
              }))
            );
          }
          
          return of({
            ...reviewData,
            tourName: tour?.name || 'Unknown Tour'
          });
        }),
        catchError(() => of({
          ...reviewData,
          tourName: 'Unknown Tour'
        }))
      );
    }
    
    return observable.pipe(
      switchMap(data => {
        if (review.travelerId && !review.traveler) {
          return this.travelersNetService.getTravelerById(review.travelerId).pipe(
            map(traveler => ({
              ...data,
              travelerName: traveler?.name || 'Unknown Traveler'
            })),
            catchError(() => of({
              ...data,
              travelerName: 'Unknown Traveler'
            }))
          );
        }
        return of(data);
      })
    );
  }

  openFullReview(review: ReviewCard): void {
    this.selectedReview = review;
    this.showFullReviewModal = true;
  }
}
