import { Block } from '../blocks/block.model';
import { CldImage } from '../commons/cld-image.model';
import { SEO } from '../commons/seo.model';

export interface Press {
  id: string;
  subtitle: string;
  title: string;
  content: string;
  slug: string;
  image: CldImage[];
  seo: SEO;
  blocks: Block[];
}
