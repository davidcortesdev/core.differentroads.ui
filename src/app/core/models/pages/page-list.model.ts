import { Pagination } from '../commons/pagination.model';
import { CMSCollections } from '../commons/cms-collections.model';
import { SEO } from '../commons/seo.model';

export interface PageList {
  id: string;
  title: string;
  slug: string;
  status: string;
}

export interface PageListResponse {
  data: PageList[];
  pagination: Pagination;
}
