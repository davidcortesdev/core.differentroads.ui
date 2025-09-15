import { Component, OnInit } from '@angular/core';
import { HomeService } from '../../core/services/home.service';
import { Block, BlockType } from '../../core/models/blocks/block.model';
import { FullSliderContent } from '../../core/models/blocks/full-slider-content.model';
import { TravelersSection } from '../../core/models/blocks/travelers/travelers-section.model';
import { FeaturedToursSection } from '../../core/models/home/featured-tours/featured-tour.model';
import { AuthenticateService } from '../../core/services/auth-service.service';
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
        // console.log('Home data:', data);
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
}
