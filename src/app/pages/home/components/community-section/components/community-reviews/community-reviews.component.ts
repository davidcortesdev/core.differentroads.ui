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
}
