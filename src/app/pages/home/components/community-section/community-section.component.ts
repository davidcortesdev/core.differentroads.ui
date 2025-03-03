import { Component, Input, OnInit } from '@angular/core';
import { HomeService } from '../../../../core/services/home.service';
import { TravelersSection } from '../../../../core/models/blocks/travelers/travelers-section.model';

@Component({
  selector: 'app-community-section',
  standalone: false,
  templateUrl: './community-section.component.html',
  styleUrls: ['./community-section.component.scss'],
})
export class CommunitySectionComponent implements OnInit {
  @Input() content!: any;
  travelersSection: TravelersSection | null = null;

  constructor(private homeService: HomeService) {}

  ngOnInit() {
    // Si content ya es un TravelersSection válido, usarlo directamente
    if (this.content && this.isValidTravelersSection(this.content)) {
      this.travelersSection = this.content;
    }
    // Si content tiene un name que podría ser un ID
    else if (this.content && this.content.name) {
      this.homeService.getTravelersSection(this.content.name).subscribe({
        next: (data) => {
          this.travelersSection = data;
        },
        error: (error) => {
          console.error(
            `Error fetching travelers section with name ${this.content.name}:`,
            error
          );
        },
      });
    }
    // Fallback a obtener la sección de viajeros por defecto
    else {
      this.homeService.getTravelersSection().subscribe({
        next: (data) => {
          this.travelersSection = data;
        },
        error: (error) => {
          console.error('Error fetching travelers section data:', error);
        },
      });
    }
  }

  // Helper method to validate if the provided content has the expected structure
  private isValidTravelersSection(content: any): content is TravelersSection {
    return (
      content &&
      typeof content.title === 'string' &&
      content['travelers-cards'] !== undefined &&
      content.featured !== undefined &&
      content.reviews !== undefined &&
      content.reviews['reviews-cards'] !== undefined
    );
  }

  get reviews() {
    // Devuelve todo el objeto reviews, no solo el array
    return this.travelersSection?.reviews;
  }

  get communityImages() {
    const images = this.travelersSection?.['travelers-cards'] || [];
    return images.slice(2); // Rest the first two images
  }

  get communityHeroData() {
    return {
      title: this.travelersSection?.title || 'Titular para sección comunidad',
      googleRating: 4.5,
      featured: {
        images:
          this.travelersSection?.['travelers-cards']
            .slice(0, 2)
            .map((img) => img.image?.[0].url) || [],
        content: this.travelersSection?.featured.description || '',
      },
    };
  }

  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '991px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '767px',
      numVisible: 1,
      numScroll: 1,
    },
  ];
}
