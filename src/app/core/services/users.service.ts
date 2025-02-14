import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) {}

  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.API_URL, user, this.httpOptions);
  }

  getUserDetails(id: string): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/${id}`, this.httpOptions);
  }

  getUserByEmail(email: string): Observable<User> {
    return this.http.get<User>(
      `${this.API_URL}/by-email/${email}`,
      this.httpOptions
    );
  }

  updateUser(id: string, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/${id}`, user, this.httpOptions);
  }

  getUsers(params?: GetAllUsersParams): Observable<UserListResponse> {
    const httpParams = params
      ? new HttpParams({ fromObject: params as any })
      : undefined;
    return this.http.get<UserListResponse>(this.API_URL, {
      params: httpParams,
      ...this.httpOptions,
    });
  }
}
