import { Pagination } from '../commons/pagination.model';
import { CMSCollections } from '../commons/cms-collections.model';

export interface PressList extends CMSCollections {
  id: string;
  title: string;
  status: string;
  slug: string;
}

export interface PressListResponse {
  data: PressList[];
  pagination: Pagination;
}
