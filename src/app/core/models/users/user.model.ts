import { CldImage } from '../commons/cld-image.model';

// Modelo basado en el swagger de auth-dev.differentroads.es
export interface IUserResponse {
  id: number;
  name?: string;
  lastName?: string;
  cognitoId?: string;
  email?: string;
  phone?: string;
  hasWebAccess: boolean;
  hasMiddleAccess: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserCreate {
  cognitoId?: string;
  name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  hasWebAccess?: boolean;
  hasMiddleAccess?: boolean;
}

export interface UserUpdate extends UserCreate {

}

// Filtros para la búsqueda de usuarios según el swagger
export interface UserFilter {
  Id?: number;
  Name?: string;
  Email?: string;
  CognitoId?: string;
  HasWebAccess?: boolean;
  HasMiddleAccess?: boolean;
}

// Modelo legacy para compatibilidad (mantener si es necesario)
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
  city?: string;
  postalCode?: string;
  dniExpirationDate?: string;
  dniIssueDate?: string;
  passportCountry?: string;
  cognitoUserId?: string;
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
