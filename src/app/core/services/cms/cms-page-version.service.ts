import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces para el modelo de PageVersion
export interface ICMSPageVersionResponse {
  id: number;
  versionNumber: number;
  slug: string;
  title: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  createdAt: Date;
  updatedAt: Date | null;
  pageId: number;
}

export interface CMSPageVersionCreate {
  versionNumber?: number;
  slug: string;
  title: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  pageId: number;
}

export interface CMSPageVersionUpdate {
  versionNumber?: number;
  slug?: string;
  title?: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
  pageId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CMSPageVersionService {
  private readonly API_URL = `${environment.cmsApiUrl}/CMSPageVersion`;

  constructor(private http: HttpClient) {}

  getAllPageVersions(params?: {
    id?: number;
    versionNumber?: number;
    slug?: string;
    title?: string;
    content?: string;
    seoTitle?: string;
    seoDescription?: string;
    pageId?: number;
  }): Observable<ICMSPageVersionResponse[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.id !== undefined) httpParams = httpParams.set('Id', params.id.toString());
      if (params.versionNumber !== undefined) httpParams = httpParams.set('VersionNumber', params.versionNumber.toString());
      if (params.slug) httpParams = httpParams.set('Slug', params.slug);
      if (params.title) httpParams = httpParams.set('Title', params.title);
      if (params.content) httpParams = httpParams.set('Content', params.content);
      if (params.seoTitle) httpParams = httpParams.set('SeoTitle', params.seoTitle);
      if (params.seoDescription) httpParams = httpParams.set('SeoDescription', params.seoDescription);
      if (params.pageId !== undefined) httpParams = httpParams.set('PageId', params.pageId.toString());
    }

    return this.http.get<ICMSPageVersionResponse[]>(this.API_URL, { params: httpParams });
  }

  getPageVersionById(id: number): Observable<ICMSPageVersionResponse> {
    return this.http.get<ICMSPageVersionResponse>(`${this.API_URL}/${id}`);
  }

  createPageVersion(versionData: CMSPageVersionCreate): Observable<ICMSPageVersionResponse> {
    return this.http.post<ICMSPageVersionResponse>(this.API_URL, versionData);
  }

  updatePageVersion(id: number, versionData: CMSPageVersionUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, versionData);
  }

  deletePageVersion(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}