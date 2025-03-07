import { Block } from '../blocks/block.model';
import { CldImage } from '../commons/cld-image.model';
import { CMSCollections } from '../commons/cms-collections.model';
import { SEO } from '../commons/seo.model';

export interface Blog {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedDate: string;
  status: string;
  slug: string;
  image: CldImage[];
  seo: SEO;
  subtitle: string;
  travels: {
    btntext: string;
    'link-travels': string;
  };
  blocks: Block[];
}
