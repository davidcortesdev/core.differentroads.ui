import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ReviewsService } from '../../../../core/services/reviews/reviews.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-tour-reviews-v2',
  standalone: false,
  templateUrl: './tour-reviews-v2.component.html',
  styleUrl: './tour-reviews-v2.component.scss'
})
export class TourReviewsV2Component implements OnInit, OnChanges {
  @Input() tourId: number | undefined;
  hasReviews: boolean = false;
  loading: boolean = true;

  constructor(private reviewsService: ReviewsService) {}

  ngOnInit(): void {
    this.checkReviews();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tourId'] && !changes['tourId'].firstChange) {
      this.checkReviews();
    }
  }

  private checkReviews(): void {
    if (!this.tourId) {
      this.hasReviews = false;
      this.loading = false;
      return;
    }

    this.loading = true;
    
    // Verificar si hay reviews para este tour que se muestren en la página del tour
    this.reviewsService.getCount({
      tourId: this.tourId,
      showOnTourPage: true
    }).pipe(
      catchError((error) => {
        console.error('Error al verificar reviews:', error);
        return of(0);
      })
    ).subscribe((count: number) => {
      this.hasReviews = count > 0;
      this.loading = false;
    });
  }
}