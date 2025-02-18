import { CMSCollections } from '../commons/cms-collections.model';
import { SEO } from '../commons/seo.model';

export interface Page extends CMSCollections {
  title: string;
  description: string;
  seo: SEO;
}
