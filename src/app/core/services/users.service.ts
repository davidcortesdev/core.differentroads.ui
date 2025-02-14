import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  User,
  GetAllUsersParams,
  UserListResponse,
} from '../models/users/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly API_URL = `${environment.dataApiUrl}/wusers`;

  constructor(private http: HttpClient) {}

  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.API_URL, user);
  }

  getUserDetails(id: string): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/${id}`);
  }

  getUserByEmail(email: string): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/by-email/${email}`);
  }

  updateUser(id: string, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/${id}`, user);
  }

  getUsers(params?: GetAllUsersParams): Observable<UserListResponse> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<UserListResponse>(this.API_URL, {
      params: httpParams,
    });
  }
}
