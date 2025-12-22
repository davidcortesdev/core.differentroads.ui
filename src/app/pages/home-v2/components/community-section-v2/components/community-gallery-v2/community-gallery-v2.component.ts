import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-community-gallery-v2',
  standalone: false,
  templateUrl: './community-gallery-v2.component.html',
  styleUrls: ['./community-gallery-v2.component.scss'],
})
export class CommunityGalleryV2Component implements OnInit {
  communityImages: IHomeSectionCardResponse[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private homeSectionService: HomeSectionService,
    private homeSectionConfigurationService: HomeSectionConfigurationService,
    private homeSectionCardService: HomeSectionCardService
  ) {}

  ngOnInit() {
    this.loadCommunityImages();
  }

  private loadCommunityImages() {
    // First, get the community section (assuming it has a specific code)
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
            this.loadSectionCards(configuration.id);
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

  private loadSectionCards(configurationId: number) {
    this.homeSectionCardService
      .getByConfiguration(configurationId, true)
      .subscribe({
        next: (cards: IHomeSectionCardResponse[]) => {
          // Filtrar solo las cards que NO son destacadas (isFeatured: false)
          this.communityImages = cards
            .filter((card) => !card.isFeatured)
            .sort((a, b) => a.displayOrder - b.displayOrder);
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error loading section cards';
          this.loading = false;
        },
      });
  }
}
