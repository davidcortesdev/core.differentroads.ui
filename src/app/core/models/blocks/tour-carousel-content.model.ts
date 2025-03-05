export interface FeaturedTour {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export interface TourCarouselContent {
  title: string;
  textButton: string;
  link: string;
  showSubtitle: boolean;
  showMonthTags: boolean;
  showMkTag: boolean;
  showMkText: boolean;
  'featured-tours': FeaturedTour[];
  order: number;
}
