import { CMSCollections } from '../commons/cms-collections.model';
import { Pagination } from '../commons/pagination.model';

export interface CollectionList {
  id: string;
  title: string;
  status: string;
  slug: string;
}

export interface CollectionListResponse {
  data: CollectionList[];
  pagination: Pagination;
}
