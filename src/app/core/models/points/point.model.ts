export interface Point {
  travelerID: string;
  type: string;
  points: number;
  extraData: {
    bookingID: string;
    tourName: string;
  };
  category: string;
  concept: string;
  origin: string;
  transactionEmail: string;
}

export interface GetAllPointsParams {
  page?: number;
  limit?: number;
  keyword?: string;
}

export interface PointListResponse {
  data: Point[];
  totalpoints: number;
  pagination: {
    totalDocuments: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}
