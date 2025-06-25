import { Component, Input } from '@angular/core';
import { Reviews } from '../../../../../../core/models/blocks/travelers/reviews.model';

@Component({
  selector: 'app-community-reviews',
  standalone: false,
  templateUrl: './community-reviews.component.html',
  styleUrls: ['./community-reviews.component.scss'],
})
export class CommunityReviewsComponent {
  @Input() reviews: Reviews | null = null;

  constructor() {}
}