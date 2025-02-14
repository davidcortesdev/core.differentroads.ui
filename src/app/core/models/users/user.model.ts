export interface User {
  email: string;
  names?: string;
  password?: string;
  lastname?: string;
  phone?: number;
  sex?: string;
  birthdate?: Date;
  dni?: string;
  rol?: string;
  nationality?: string;
  passportIssueDate?: Date;
  passportExpirationDate?: Date;
  profileImage?: Object;
  passportID?: string;
}

export interface GetAllUsersParams {
  page?: number;
  limit?: number;
  keyword?: string;
}

export interface UserListResponse {
  data: User[];
  pagination: {
    totalDocuments: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}
