import { Component, Input, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ReviewCard } from '../../../../shared/models/reviews/review-card.model';
import {
  TourFilter,
  TourNetService,
} from '../../../../core/services/tourNet.service';
import { take, switchMap, of } from 'rxjs';
import { ReviewsService } from '../../../../core/services/reviews.service';
import {
  TravelerFilter,
  TravelersNetService,
} from '../../../../core/services/travelersNet.service';

interface Review {
  destination: string;
  description: string;
  date: string;
  rating: number;
}

@Component({
  selector: 'app-review-section',
  standalone: false,
  templateUrl: './review-section.component.html',
  styleUrls: ['./review-section.component.scss'],
})
export class ReviewSectionComponent implements OnInit {
  @Input() userEmail!: string;
  reviewsCards: ReviewCard[] = [];
  loading = false;

  isExpanded: boolean = true;

  constructor(
    private reviewsService: ReviewsService,
    private tourNetService: TourNetService,
    private travelersNetService: TravelersNetService
  ) {}

  ngOnInit() {
    this.loadReviews();
  }

  loadReviews(): void {
    if (!this.userEmail) {
      console.error('No user email provided');
      return;
    }

    this.loading = true;
    const filterTravel: TravelerFilter = {
      email: this.userEmail,
    };

    this.travelersNetService
      .getTravelers(filterTravel)
      .pipe(
        take(1),
        switchMap((travelers) => {
          if (!travelers || travelers.length === 0) {
            return of([]);
          }

          return this.reviewsService.getReviews({
            travelerId: travelers[0].id,
          });
        })
      )
      .subscribe({
        next: (reviews) => {
          // Map the API reviews to ReviewCard format
          this.reviewsCards = reviews.map((review) => ({
            review: review.text,
            score: review.rating,
            traveler: '',
            tour: '',
            date: review.reviewDate,
            tourId: review.tourId,
            travelerId: review.travelerId,
          }));
          this.loading = false;
        },
        error: (error) => {
          console.error('Error fetching reviews:', error);
          this.reviewsCards = [];
          this.loading = false;
        },
      });
  }

  toggleContent() {
    this.isExpanded = !this.isExpanded;
  }

  getRatingArray(rating: number): number[] {
    return Array(rating).fill(0);
  }
}
