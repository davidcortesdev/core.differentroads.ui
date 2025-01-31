import { Component } from '@angular/core';

interface CommunityReview {
  name: string;
  destination: string;
  date: string;
  rating: number;
}

@Component({
  selector: 'app-community-reviews',
  standalone: false,
  templateUrl: './community-reviews.component.html',
  styleUrls: ['./community-reviews.component.scss'],
})
export class CommunityReviewsComponent {
  reviews: CommunityReview[] = [
    {
      name: 'Nombre',
      destination: 'Destino',
      date: '2024-02-20',
      rating: 5,
    },
    // Add more reviews as needed
  ];
}
