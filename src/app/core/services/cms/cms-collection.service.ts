import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces para el modelo de Collection
export interface ICMSCollectionResponse {
  id: number;
  code: string;
  name: string;
  visibleWeb: boolean;
  versionActiva: number;
}

export interface CMSCollectionCreate {
  code: string;
  name: string;
  visibleWeb: boolean;
}

export interface CMSCollectionUpdate {
  code?: string;
  name?: string;
  visibleWeb?: boolean;
  versionActiva?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CMSCollectionService {
  private readonly API_URL = `${environment.cmsApiUrl}/CMSCollection`;

  constructor(private http: HttpClient) {}

  getAllCollections(params?: {
    id?: number;
    code?: string;
    name?: string;
    visibleWeb?: boolean;
    versionActiva?: number;
  }): Observable<ICMSCollectionResponse[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.id !== undefined) httpParams = httpParams.set('Id', params.id.toString());
      if (params.code) httpParams = httpParams.set('Code', params.code);
      if (params.name) httpParams = httpParams.set('Name', params.name);
      if (params.visibleWeb !== undefined) httpParams = httpParams.set('VisibleWeb', params.visibleWeb.toString());
      if (params.versionActiva !== undefined) httpParams = httpParams.set('VersionActiva', params.versionActiva.toString());
    }

    return this.http.get<ICMSCollectionResponse[]>(this.API_URL, { params: httpParams });
  }

  getCollectionById(id: number): Observable<ICMSCollectionResponse> {
    return this.http.get<ICMSCollectionResponse>(`${this.API_URL}/${id}`);
  }

  createCollection(collectionData: CMSCollectionCreate): Observable<ICMSCollectionResponse> {
    return this.http.post<ICMSCollectionResponse>(this.API_URL, collectionData);
  }

  updateCollection(id: number, collectionData: CMSCollectionUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, collectionData);
  }

  deleteCollection(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}