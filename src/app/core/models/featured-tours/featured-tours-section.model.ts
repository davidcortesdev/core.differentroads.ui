import { FeaturedTour } from './featured-tour.model';

/**
 * Represents the featured tours section configuration
 */
export interface FeaturedToursSection {
  title: string;
  textButton: string;
  link: string;
  showSubtitle: boolean;
  showMonthTags: boolean;
  showMkTag: boolean;
  showMkText: boolean;
  'featured-tours': FeaturedTour[];
}