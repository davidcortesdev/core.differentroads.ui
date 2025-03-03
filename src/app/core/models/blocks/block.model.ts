import { BlogListContent } from './blog-list-content.model';
import { CardSliderVerticalContent } from './card-slider-vertical-content.model';
import { FullSliderContent } from './full-slider-content.model';
import { PressListContent } from './press-list-content.model';
import { SingleFeaturedContent } from './single-featured-content.model';
import { TourCarouselContent } from './tour-carousel-content.model';
import { TourListContent } from './tour-list-content.model';
import { TravelersSection } from './travelers/travelers-section.model';

export interface Block {
  type: BlockType;
  name: string;
  content: BlockContent;
}

export enum BlockType {
  TourList = 'tour-list',
  CardSliderVertical = 'card-slider-vertical',
  SingleFeatured = 'single-featured',
  FullSlider = 'full-slider',
  PressList = 'press-list',
  BlogList = 'blog-list',
  TourSection = 'tour-carousel',
  TravelersSection = 'travelers-section',
}

export type BlockContent =
  | TourListContent
  | TourCarouselContent
  | CardSliderVerticalContent
  | SingleFeaturedContent
  | FullSliderContent
  | PressListContent
  | BlogListContent
  | TravelersSection;
