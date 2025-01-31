import { Component } from '@angular/core';

interface CommunityReview {
  name: string;
  destination: string;
  date: string;
  rating: number;
}

@Component({
  selector: 'app-community-section',
  standalone: false,
  templateUrl: './community-section.component.html',
  styleUrls: ['./community-section.component.scss']
})
export class CommunitySectionComponent {
  reviews: CommunityReview[] = [
    {
      name: 'Nombre',
      destination: 'Destino',
      date: '2024-02-20',
      rating: 5
    },
    // Add more reviews as needed
  ];

  communityImages = [
    {
      url: 'assets/images/community/1.jpg',
      location: 'Islandia',
      username: '@nombre_user22'
    },
    // Add more images as needed
  ];

  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 3,
      numScroll: 1
    },
    {
      breakpoint: '991px',
      numVisible: 2,
      numScroll: 1
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1
    }
  ];
}
