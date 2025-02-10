import { Component, OnInit, Injector, Type } from '@angular/core';
import { HomeService } from '../../../../core/services/home.service';
import { Block, BlockType } from '../../../../core/models/blocks/block.model';
import { HighlightSectionComponent } from '../highlight-section/highlight-section.component';
import { SingleFeaturedContent } from '../../../../core/models/blocks/single-featured-content.model';
import { BlogListContent } from '../../../../core/models/blocks/blog-list-content.model';
import { CommonModule } from '@angular/common';
import { ContentListComponent } from '../content-list/content-list-section.component';

@Component({
  selector: 'app-dynamic-components',
  standalone: false,
  
  templateUrl: './dynamic-components.component.html',
  styleUrls: ['./dynamic-components.component.scss'],
})
export class DynamicComponentsComponent implements OnInit {
  blocks: Block[] = [];

  constructor(private homeService: HomeService) {} // Removed injector since we won't use it

  ngOnInit(): void {
    this.homeService.getDynamicSections().subscribe({
      next: (data: Block[]) => {
        console.log('Blocks', data);
        this.blocks = data;
      },
      error: (error: any) => {
        console.error('Error fetching home data:', error);
        // Handle the error
      },
    });
  }

  getComponent(block: Block): Type<any> | null {
    switch (block.type) {
      case BlockType.SingleFeatured:
        return HighlightSectionComponent;
      case BlockType.BlogList:
        return ContentListComponent;
      case BlockType.PressList:
        return ContentListComponent;
      /* 
      case BlockType.BlogList:
        return BlogSectionComponent;
      case BlockType.PressList:
        return PressListComponent;
      case BlockType.TourList:
        return TourListComponent;
      case BlockType.CardSliderVertical:
        return CardSliderVerticalComponent;
      case BlockType.FullSlider:
        return FullSliderComponent;
      */
      default:
        return null;
    }
  }

  createInjector(block: Block): Injector {
    if (!block.content) {
      console.error('Block content is undefined for block:', block);
    }
    return Injector.create({
      providers: [
        {
          provide: 'content',
          useValue: block.content as BlogListContent | SingleFeaturedContent,
        },
        {
          provide: 'type',
          useValue: block.type === BlockType.BlogList ? 'blog' : 'press',
        },
        {
          provide: 'title',
          useValue:
            block.type === BlockType.BlogList
              ? 'No te pierdas nuestro blog'
              : 'Lo que dicen sobre nosotros',
        },
      ],
      parent: this.injector,
    });
  }
}
