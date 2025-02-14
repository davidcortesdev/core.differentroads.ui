import { Component, Input } from '@angular/core';
import { ReviewCard } from '../../models/reviews/review-card.model';

@Component({
  selector: 'app-reviews',
  standalone: false,
  
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss']
})
export class ReviewsComponent {
  @Input() reviews: ReviewCard[] = [];

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
