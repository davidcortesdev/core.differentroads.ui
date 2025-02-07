import { Component, Input, OnInit, Injector, Type } from '@angular/core';
import { HomeService } from '../../../../core/services/home.service';
import {
  Block,
  BlockContent,
  BlockType,
} from '../../../../core/models/blocks/block.model';
import { BlogSectionComponent } from '../blog-section/blog-section.component';
import { HighlightSectionComponent } from '../highlight-section/highlight-section.component';
import { SingleFeaturedContent } from '../../../../core/models/blocks/single-featured-content.model';
import { BlogListContent } from '../../../../core/models/blocks/blog-list-content.model';

@Component({
  selector: 'app-dynamic-components',
  standalone: false,
  templateUrl: './dynamic-components.component.html',
  styleUrls: ['./dynamic-components.component.scss'],
})
export class DynamicComponentsComponent implements OnInit {
  blocks: Block[] = [];

  constructor(private homeService: HomeService, private injector: Injector) {}

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
      /*   case BlockType.BlogList:
        return BlogSectionComponent; */
      case BlockType.SingleFeatured:
        return HighlightSectionComponent;
      // Add other cases as needed
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
      ],
      parent: this.injector,
    });
  }
}
