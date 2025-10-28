import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ReviewV2 } from '../../../../core/models/v2/profile-v2.model';


@Component({
  selector: 'app-review-section-v2',
  standalone: false,
  templateUrl: './review-section-v2.component.html',
  styleUrls: ['./review-section-v2.component.scss'],
})

export class ReviewSectionV2Component implements OnInit, OnChanges {
  @Input() userId: string = '';
  reviewsCards: ReviewV2[] = [];
  loading = false;
  isExpanded = true;
  
  constructor() {}

  ngOnInit(): void {
    if (this.userId) {
      this.generateMockData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && changes['userId'].currentValue) {
      this.generateMockData();
    }
  }

  private generateMockData(): void {
    this.loading = true;
    
    // Simular carga de datos
    setTimeout(() => {
      this.reviewsCards = this.generateMockReviews();
      this.loading = false;
    }, 1000);
  }

  private generateMockReviews(): ReviewV2[] {
    const userSuffix = this.userId.slice(-3);
    
    return [
      {
        id: `review-1-${userSuffix}`,
        review: 'Excelente experiencia en Italia. Los guías fueron muy profesionales y conocían perfectamente la historia de cada lugar. Recomiendo totalmente este tour.',
        score: 5,
        traveler: `Usuario ${userSuffix}`,
        tour: 'Tour por Italia - Roma, Florencia y Venecia',
        date: '2024-01-15',
        tourId: 'TOUR-001'
      },
      {
        id: `review-2-${userSuffix}`,
        review: 'Una aventura increíble en Tailandia. Las playas son espectaculares y la cultura es fascinante. El alojamiento fue excelente.',
        score: 4,
        traveler: `Usuario ${userSuffix}`,
        tour: 'Aventura en Tailandia',
        date: '2023-11-20',
        tourId: 'TOUR-003'
      },
      {
        id: `review-3-${userSuffix}`,
        review: 'París es siempre una buena idea. Aunque el tiempo fue corto, pudimos ver los lugares más emblemáticos. Muy bien organizado.',
        score: 4,
        traveler: `Usuario ${userSuffix}`,
        tour: 'Escapada a París',
        date: '2023-08-10',
        tourId: 'TOUR-002'
      }
    ];
  }

  toggleContent(): void {
    this.isExpanded = !this.isExpanded;
  }

  getRatingArray(rating: number): number[] {
    return Array(rating).fill(0);
  }
}