import { Pagination } from '../commons/pagination.model';
import { CMSCollections } from '../commons/cms-collections.model';

export interface BlogList extends CMSCollections {
  id: string;
  title: string;
  status: string;
  slug: string;
}

export interface BlogListResponse {
  data: BlogList[];
  pagination: Pagination;
}
