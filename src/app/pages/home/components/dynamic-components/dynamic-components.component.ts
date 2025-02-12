import { Component, OnInit, Type } from '@angular/core';
import { HomeService } from '../../../../core/services/home.service';
import { Block, BlockType } from '../../../../core/models/blocks/block.model';
import { HighlightSectionComponent } from '../highlight-section/highlight-section.component';
import { ContentListComponent } from '../content-list/content-list-section.component';
import { ToursSectionComponent } from '../tours-section/tours-section.component';
import { ToursListComponent } from '../tours-list-section/tours-list-section.component';

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
      case BlockType.TourList:
        return ToursListComponent;
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
}
