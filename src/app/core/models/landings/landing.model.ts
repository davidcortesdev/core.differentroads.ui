import { Block } from '../blocks/block.model';
import { CldImage } from '../commons/cld-image.model';
import { CMSCollections } from '../commons/cms-collections.model';
import { SEO } from '../commons/seo.model';

export interface Landing extends CMSCollections {
  title: string;
  slug: string;
  bannerTitle: string;
  banner: CldImage[];
  seo: SEO;
  content: string;
  blocks: Block[];
  titleContent: string;
}
