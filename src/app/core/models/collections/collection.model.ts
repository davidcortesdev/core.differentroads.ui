import { CldImage } from '../commons/cld-image.model';
import { CMSCollections } from '../commons/cms-collections.model';

export interface Collection extends CMSCollections {
  title: string;
  slug: string;
  tag: string;
  description: string;
  bannerTitle: string;
  banner: CldImage[];
  titleContent: string;
  content: string;
  seo: SEO;
}

export interface SEO {
  title: string;
  description: string;
}
