import { CldImage } from '../commons/cld-image.model';
import { FeaturedToursSection } from './featured-tours/featured-tours-section.model';
/* import { TravelersSection } from './travelers/travelers-section.model'; */
import { BannerSection } from './banner/banner-section.model';
import { Block } from '../blocks/block.model';
import { SEO } from '../commons/seo.model';
import { TravelersSection } from '../blocks/travelers/travelers-section.model';

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
