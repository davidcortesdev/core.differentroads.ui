import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  HomeSectionService,
  IHomeSectionResponse,
} from '../../../../../../core/services/home/home-section.service';
import {
  HomeSectionConfigurationService,
  IHomeSectionConfigurationResponse,
} from '../../../../../../core/services/home/home-section-configuration.service';
import {
  HomeSectionCardService,
  IHomeSectionCardResponse,
} from '../../../../../../core/services/home/home-section-card.service';

interface CommunityHero {
  title: string;
  googleRating: number;
  featured: {
    images: string[];
    content: string; // This will contain the Quill HTML content
    featuredCards: IHomeSectionCardResponse[]; // Store the featured images data
    orderOneCard?: IHomeSectionCardResponse; // Store the order 1 card data for information
  };
}

@Component({
  selector: 'app-community-hero-v2',
  standalone: false,
  templateUrl: './community-hero-v2.component.html',
  styleUrl: './community-hero-v2.component.scss',
})
export class CommunityHeroV2Component implements OnInit {
  data: CommunityHero = {
    title: 'Titular para sección comunidad',
    googleRating: 4.5,
    featured: {
      images: [],
      content: '',
      featuredCards: [],
      orderOneCard: undefined,
    },
  };
  loading = true;
  error: string | null = null;

  constructor(
    private sanitizer: DomSanitizer,
    private homeSectionService: HomeSectionService,
    private homeSectionConfigurationService: HomeSectionConfigurationService,
    private homeSectionCardService: HomeSectionCardService
  ) {}

  ngOnInit() {
    this.loadCommunityHeroData();
  }

  get sanitizedContent(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.data.featured.content);
  }

  private loadCommunityHeroData() {
    // First, get the community section (TRAVELER_SECTION)
    this.homeSectionService.getAll({ code: 'TRAVELER_SECTION' }).subscribe({
      next: (sections: IHomeSectionResponse[]) => {
        if (sections.length > 0) {
          const communitySection = sections[0];
          this.loadSectionConfigurations(communitySection.id);
        } else {
          this.error = 'Community section not found';
          this.loading = false;
        }
      },
      error: (error) => {
        this.error = 'Error loading community section';
        this.loading = false;
      },
    });
  }

  private loadSectionConfigurations(sectionId: number) {
    this.homeSectionConfigurationService
      .getBySectionType(sectionId, true)
      .subscribe({
        next: (configurations: IHomeSectionConfigurationResponse[]) => {
          if (configurations.length > 0) {
            // Get the first active configuration
            const configuration = configurations[0];

            // Update the title from configuration
            if (configuration.title) {
              this.data.title = configuration.title;
            }

            this.loadFeaturedImages(configuration.id);
          } else {
            this.error = 'No active community section configurations found';
            this.loading = false;
          }
        },
        error: (error) => {
          this.error = 'Error loading section configurations';
          this.loading = false;
        },
      });
  }

  private loadFeaturedImages(configurationId: number) {
    this.homeSectionCardService
      .getByConfiguration(configurationId, true)
      .subscribe({
        next: (cards: IHomeSectionCardResponse[]) => {
          // Get featured cards for images
          const featuredCards = cards
            .filter((card) => card.isFeatured)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .slice(0, 2);

          // Get card with displayOrder: 1 for information display
          const orderOneCard = cards
            .filter((card) => card.displayOrder === 1)
            .find((card) => card.isActive);

          // Store the featured images
          this.data.featured.featuredCards = featuredCards;
          this.data.featured.images = featuredCards.map(
            (card) => card.imageUrl
          );

          // Store the order 1 card information separately
          this.data.featured.orderOneCard = orderOneCard;

          // Use the content from the order 1 card if available
          if (orderOneCard && orderOneCard.content) {
            this.data.featured.content = orderOneCard.content;
          }

          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error loading featured images';
          this.loading = false;
        },
      });
  }
}
