import { CldImage } from './cloudinary/cld-image.model';
import { FeaturedToursSection } from './featured-tours/featured-tours-section.model';
import { TravelersSection } from './travelers/travelers-section.model';
import { BannerSection } from './banner/banner-section.model';
import { SEO } from './seo/seo.model';
import { Block } from './blocks/block.model';

/**
 * Represents the main home page schema structure
 */
export interface HomeSchema {
  id: string;
  status: string;
  'featured-tours': FeaturedToursSection;
  'travelers-section': TravelersSection;
  blocks: Block[];
  seo: SEO;
  'banner-section': BannerSection;
}
