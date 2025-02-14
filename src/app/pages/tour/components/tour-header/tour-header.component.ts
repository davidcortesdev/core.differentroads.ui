import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToursService } from '../../../../core/services/tours.service';
import { Tour } from '../../../../core/models/tours/tour.model';

@Component({
  selector: 'app-tour-header',
  standalone: false,
  templateUrl: './tour-header.component.html',
  styleUrls: ['./tour-header.component.scss'],
})
export class TourHeaderComponent implements OnInit {
  tour: Partial<Tour> = {};
  marketingTag: string = '';

  constructor(
    private route: ActivatedRoute,
    private toursService: ToursService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        this.loadTourData(slug);
      }
    });
  }

  private loadTourData(slug: string) {
    this.toursService.getTourDetailBySlug(slug).subscribe({
      next: (tourData) => {
        console.log('Tour Data:', tourData);
        this.tour = {
          ...this.tour,
          ...tourData,
        };
        // Extraer el marketingTag si existe
        this.marketingTag = tourData.marketingSection?.marketingTag || '';
      },
      error: (error) => {
        console.error('Error loading tour:', error);
      },
    });
  }

  getDuration(): string {
    if (this.tour.activePeriods && this.tour.activePeriods.length > 0) {
      return this.getDuration2(this.tour.activePeriods[0].days);
    }
    return '';
  }

  getDuration2(days: number | undefined): string {
    if (!days) return '';
    return `${days} días, ${days - 1} noches`;
  }
}
