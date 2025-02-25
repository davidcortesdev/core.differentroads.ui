import { Component, OnInit, Input, Type } from '@angular/core';
import { HomeService } from '../../../../core/services/home.service';
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
export class DynamicComponentsComponent implements OnInit {
  @Input() blocks: Block[] = [];

  constructor(private homeService: HomeService) {} // Removed injector since we won't use it

  ngOnInit(): void {
    if (this.blocks.length === 0) {
      this.homeService.getDynamicSections().subscribe({
        next: (data: Block[]) => {
          this.blocks = data;
        },
        error: (error: any) => {
          console.error('Error fetching home data:', error);
        },
      });
    }
   
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
