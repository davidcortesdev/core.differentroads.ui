/**
 * Represents a single featured tour
 */
export interface FeaturedTour {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export interface FeaturedToursSection {
  title: string;
  textButton: string;
  link: string;
  order: number;
  showSubtitle: boolean;
  showMonthTags: boolean;
  showMkTag: boolean;
  showMkText: boolean;
  'featured-tours': FeaturedTour[];
}
