import { CMSCollections } from '../commons/cms-collections.model';
import { Pagination } from '../commons/pagination.model';

export interface LandingList {
  id: string;
  title: string;
  status: string;
  slug: string;
}

export interface LandingListResponse {
  data: LandingList[];
  pagination: Pagination;
}
