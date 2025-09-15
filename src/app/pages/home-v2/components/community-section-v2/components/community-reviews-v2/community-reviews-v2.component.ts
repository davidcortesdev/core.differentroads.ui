import { Component, Input } from '@angular/core';
import { Reviews } from '../../../../../../core/models/blocks/travelers/reviews.model';

@Component({
  selector: 'app-community-reviews-v2',
  standalone: false,
  templateUrl: './community-reviews-v2.component.html',
  styleUrls: ['./community-reviews-v2.component.scss'],
})
export class CommunityReviewsV2Component {
  @Input() reviews: Reviews | null = null;

  constructor() {}
}
