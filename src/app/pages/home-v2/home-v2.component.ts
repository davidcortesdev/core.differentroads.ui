import { Component, OnInit } from '@angular/core';
import { HomeService } from '../../core/services/home.service';
import { Block, BlockType } from '../../core/models/blocks/block.model';
import { FullSliderContent } from '../../core/models/blocks/full-slider-content.model';
import { SingleFeaturedContent } from '../../core/models/blocks/single-featured-content.model';
import { TravelersSection } from '../../core/models/blocks/travelers/travelers-section.model';
import { FeaturedToursSection } from '../../core/models/home/featured-tours/featured-tour.model';
import { AuthenticateService } from '../../core/services/auth-service.service';
import { BlogListContent } from '../../core/models/blocks/blog-list-content.model';
import { PressListContent } from '../../core/models/blocks/press-list-content.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home-v2',
  standalone: false,
  templateUrl: './home-v2.component.html',
  styleUrls: ['./home-v2.component.scss'],
})
export class HomeV2Component implements OnInit {
  blocks$: Observable<Block[]>;
  featuredTours?: FeaturedToursSection;
  tourSectionContent: any = null;

  constructor(
    private homeService: HomeService,
    private authService: AuthenticateService
  ) {
    this.blocks$ = this.homeService.getDynamicSections();
  }

  ngOnInit() {
    this.homeService.getHomeData().subscribe({
      next: (data) => {
        console.log('Home data:', data);
        this.featuredTours = data['featured-tours'];

        // Crear el contenido para el tour-carrussel-v2
        this.tourSectionContent = {
          title: 'Planea tu viaje de este verano',
          'featured-tours': this.featuredTours?.['featured-tours'] || [],
        };
      },
      error: (error) => {
        console.error('Error fetching home data:', error);
      },
    });

    // Debug: Log blocks data
    this.blocks$.subscribe((blocks) => {
      console.log('Blocks received in home-v2:', blocks);
      blocks.forEach((block, index) => {
        console.log(`Block ${index}:`, {
          type: block.type,
          name: block.name,
          content: block.content,
        });
        if (
          block.type === BlockType.BlogList ||
          block.type === BlockType.PressList
        ) {
          console.log('Found BlogList or PressList block:', block);
        }
      });
    });
  }

  getFullSliderContent(block: Block): FullSliderContent | null {
    if (block.type === BlockType.FullSlider && block.content) {
      return block.content as FullSliderContent;
    }
    return null;
  }

  getCarouselContent(block: Block): FullSliderContent | null {
    if (block.type === BlockType.CardSliderVertical && block.content) {
      return block.content as FullSliderContent;
    }
    return null;
  }

  getCommunityContent(block: Block): TravelersSection | null {
    if (block.type === BlockType.TravelersSection && block.content) {
      return block.content as TravelersSection;
    }
    return null;
  }

  getHighlightContent(block: Block): SingleFeaturedContent | null {
    if (block.type === BlockType.SingleFeatured && block.content) {
      return block.content as SingleFeaturedContent;
    }
    return null;
  }

  getContentListContent(
    block: Block
  ): BlogListContent | PressListContent | null {
    console.log('getContentListContent called with block:', block);
    console.log(
      'Block type:',
      block.type,
      'BlockType.BlogList:',
      BlockType.BlogList,
      'BlockType.PressList:',
      BlockType.PressList
    );

    if (
      (block.type === BlockType.BlogList ||
        block.type === BlockType.PressList) &&
      block.content
    ) {
      console.log('Returning content for content-list:', block.content);
      return block.content as BlogListContent | PressListContent;
    }
    console.log('No content returned for content-list');
    return null;
  }
}
