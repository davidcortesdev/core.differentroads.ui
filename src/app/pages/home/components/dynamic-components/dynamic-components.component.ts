import { Component, Input, Type } from '@angular/core';
import { Block, BlockType } from '../../../../core/models/blocks/block.model';
import { HighlightSectionComponent } from '../highlight-section/highlight-section.component';
import { ContentListComponent } from '../content-list/content-list-section.component';
import { ToursSectionComponent } from '../tours-section/tours-section.component';
import { ToursListComponent } from '../tours-list-section/tours-list-section.component';
import { FullCardSectionComponent } from '../full-card-section/full-card-section.component';
import { CarouselSectionComponent } from '../carousel-section/carousel-section.component';

@Component({
  selector: 'app-dynamic-components',
  standalone: false,
  templateUrl: './dynamic-components.component.html',
  styleUrls: ['./dynamic-components.component.scss'],
})
export class DynamicComponentsComponent {
  @Input() blocks: Block[] = [];

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
      case BlockType.CardSliderVertical:
        return CarouselSectionComponent;
      case BlockType.FullSlider:
        return FullCardSectionComponent;
      case BlockType.TourSection:
        return ToursSectionComponent;
      default:
        return null;
    }
  }
}
