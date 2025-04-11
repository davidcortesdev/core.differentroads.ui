import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ReviewCard } from '../../../../shared/models/reviews/review-card.model';
import { TourNetService } from '../../../../core/services/tourNet.service';
import { take, switchMap, of, Subject, takeUntil, finalize, catchError } from 'rxjs';
import { ReviewsService } from '../../../../core/services/reviews.service';
import { TravelerFilter, TravelersNetService } from '../../../../core/services/travelersNet.service';

@Component({
  selector: 'app-review-section',
  standalone: false,
  templateUrl: './review-section.component.html',
  styleUrls: ['./review-section.component.scss'],
})
export class ReviewSectionComponent implements OnInit, OnDestroy {
  @Input() userEmail!: string;
  reviewsCards: ReviewCard[] = [];
  loading = false;
  isExpanded = true;
  
  private destroy$ = new Subject<void>();

  constructor(
    private reviewsService: ReviewsService,
    private tourNetService: TourNetService,
    private travelersNetService: TravelersNetService
  ) {}

  ngOnInit(): void {
    if (this.userEmail) {
      this.loadReviews();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReviews(): void {
    if (!this.userEmail) {
      console.error('No user email provided');
      return;
    }

    this.loading = true;
    const filterTravel: TravelerFilter = {
      email: this.userEmail
    };
    
    this.travelersNetService.getTravelers(filterTravel).pipe(
      take(1),
      switchMap(travelers => {
        if(!travelers || travelers.length === 0){
          return of([]);
        }
        return this.reviewsService.getReviews({travelerId: travelers[0].id});
      }),
      catchError(error => {
        console.error('Error fetching reviews:', error);
        return of([]);
      }),
      finalize(() => this.loading = false),
      takeUntil(this.destroy$)
    ).subscribe(reviews => {
      this.reviewsCards = reviews.map(review => ({
        review: review.text,
        score: review.rating,
        traveler: '',
        tour: '',
        date: review.reviewDate,
        tourId: review.tourId,
        travelerId: review.travelerId
      }));
    });
  }

  toggleContent(): void {
    this.isExpanded = !this.isExpanded;
  }

  getRatingArray(rating: number): number[] {
    return Array(rating).fill(0);
  }
}
