import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CMSCreatorCreate {
  code: string | null;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  isActive: boolean;
}

export interface CMSCreatorUpdate {
  code: string | null;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  isActive: boolean;
}

export interface ICMSCreatorResponse {
  id: number;
  code: string | null;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CMSCreatorService {
  private readonly API_URL = `${environment.cmsApiUrl}/CMSCreator`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ICMSCreatorResponse[]> {
    return this.http.get<ICMSCreatorResponse[]>(this.API_URL);
  }

  getById(id: number): Observable<ICMSCreatorResponse> {
    return this.http.get<ICMSCreatorResponse>(`${this.API_URL}/${id}`);
  }

  create(data: CMSCreatorCreate): Observable<ICMSCreatorResponse> {
    return this.http.post<ICMSCreatorResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  update(id: number, data: CMSCreatorUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}
