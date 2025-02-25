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
  styleUrls: ['./dynamic-components.component.scss']
})
export class DynamicComponentsComponent {
  @Input() blocks: Block[] = [];

  private readonly componentMap: Record<BlockType, Type<any>> = {
    [BlockType.SingleFeatured]: HighlightSectionComponent,
    [BlockType.BlogList]: ContentListComponent,
    [BlockType.PressList]: ContentListComponent,
    [BlockType.TourList]: ToursListComponent,
    [BlockType.CardSliderVertical]: CarouselSectionComponent,
    [BlockType.FullSlider]: FullCardSectionComponent,
    [BlockType.TourSection]: ToursSectionComponent
  };

  getComponent(block: Block): Type<any> | null {
    return this.componentMap[block.type] || null;
  }
}
