import { Pagination } from '../commons/pagination.model';

export interface TourList {
  id: string;
  status: string;
  externalID: string;
  name: string;
  webSlug: string;
}

export interface TourListResponse {
  data: TourList[];
  pagination: Pagination;
}
