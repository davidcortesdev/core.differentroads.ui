import { CldImage } from '../commons/cld-image.model';

export interface User {
  _id?: string;
  email: string;
  names?: string;
  password?: string;
  lastname?: string;
  phone?: number;
  sex?: string;
  birthdate?: string;
  dni?: string;
  rol?: string;
  nationality?: string;
  passportIssueDate?: string;
  passportExpirationDate?: string;
  profileImage?: string;
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
