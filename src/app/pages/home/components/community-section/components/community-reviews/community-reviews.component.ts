import { Component } from '@angular/core';

interface CommunityReview {
  name: string;
  destination: string;
  description: string;
  date: string;
  rating: number;
}

@Component({
  selector: 'app-community-reviews',
  standalone: false,
  templateUrl: './community-reviews.component.html',
  styleUrl: './community-reviews.component.scss',
})
export class CommunityReviewsComponent {
  reviews: CommunityReview[] = [
    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },
    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },
    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },
    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },
    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },
    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },
    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },
    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },
    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },
    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },
    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },

    {
      name: 'Nombre',
      destination: 'Destino',
      description: 'Descripción',
      date: '2024-02-20',
      rating: 5,
    },
    // Add more reviews as needed
  ];

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
