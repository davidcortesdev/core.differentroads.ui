import { CldImage } from '../commons/cld-image.model';

// Modelo basado en el swagger de auth-dev.differentroads.es
export interface IUserResponse {
  id: number;
  name?: string;
  cognitoId?: string;
  email?: string;
  lastName?: string;
  phone?: string;
  hasWebAccess: boolean;
  hasMiddleAccess: boolean;
  createdAt: string;
  updatedAt?: string;
  hasMiddleAtcAccess: boolean;
  hasTourOperationAccess: boolean;
  retailerId?: number;
}

export interface UserCreate {
  cognitoId: string;
  name: string;
  email: string;
  lastName?: string;
  phone?: string;
  hasWebAccess?: boolean;
  hasMiddleAccess?: boolean;
  hasMiddleAtcAccess?: boolean;
  hasTourOperationAccess?: boolean;
  retailerId?: number;
  politicasAceptadas?: boolean;
  detalleDeLaFuenteDeRegistro1?: string;
}

export interface UserUpdate {
  cognitoId: string;
  name: string;
  email: string;
  lastName?: string;
  phone?: string;
  hasWebAccess?: boolean;
  hasMiddleAccess?: boolean;
  hasMiddleAtcAccess?: boolean;
  hasTourOperationAccess?: boolean;
  retailerId?: number;
}

// Filtros para la búsqueda de usuarios según el swagger
export interface UserFilter {
  Id?: number | number[];
  Name?: string;
  Email?: string;
  CognitoId?: string;
  HasWebAccess?: boolean;
  HasMiddleAccess?: boolean;
  HasMiddleAtcAccess?: boolean;
  HasTourOperationAccess?: boolean;
  RetailerId?: number;
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
