export interface Pagination {
  totalDocuments: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface PressList {
  id: string;
  title: string;
  status: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  availableLangs: string[];
  isLangAvailable: boolean;
}

export interface PressListResponse {
  data: PressList[];
  pagination: Pagination;
}
