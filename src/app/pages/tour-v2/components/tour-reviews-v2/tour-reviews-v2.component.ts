import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-tour-reviews-v2',
  standalone: false,
  templateUrl: './tour-reviews-v2.component.html',
  styleUrl: './tour-reviews-v2.component.scss'
})
export class TourReviewsV2Component {
  @Input() tourId: number | undefined;
}