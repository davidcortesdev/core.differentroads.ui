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

export interface Pagination {
  totalDocuments: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}
