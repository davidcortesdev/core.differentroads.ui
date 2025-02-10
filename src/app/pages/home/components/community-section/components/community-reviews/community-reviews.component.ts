import { Component, Input } from '@angular/core';
import { Reviews } from '../../../../../../core/models/home/travelers/reviews.model';
import { ReviewCard } from '../../../../../../core/models/home/travelers/review-card.model';

@Component({
  selector: 'app-community-reviews',
  standalone: false,
  templateUrl: './community-reviews.component.html',
  styleUrls: ['./community-reviews.component.scss'],
})
export class CommunityReviewsComponent {
  @Input() reviews: Reviews | null = null;

  get reviewsCards(): ReviewCard[] {
    return this.reviews ? this.reviews['reviews-cards'] : [];
  }

  responsiveOptions = [
    {
      breakpoint: '1200px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '992px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '768px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '576px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '425px',
      numVisible: 1,
      numScroll: 1,
    },
  ];
}
