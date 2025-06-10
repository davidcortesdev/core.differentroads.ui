import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { map, catchError } from 'rxjs/operators';

// Interfaces para el modelo de Blog
export interface ICMSBlogResponse {
  id: number;
  code: string;
  name: string;
  visibleWeb: boolean;
  versionActiva: number;
}

export interface CMSBlogCreate {
  code: string;
  name: string;
  visibleWeb: boolean;
}

export interface CMSBlogUpdate {
  code?: string;
  name?: string;
  visibleWeb?: boolean;
  versionActiva?: number;
}

// Interfaces para el modelo de BlogVersion
export interface ICMSBlogVersionResponse {
  id: number;
  versionNumber: number;
  slug: string;
  title: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  bannerImagen: string;
  bannerTitulo: string;
  blogId: number;
}

export interface CMSBlogVersionCreate {
  versionNumber: number;
  slug: string;
  title: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  bannerImagen: string;
  bannerTitulo: string;
  blogId: number;
}

export interface CMSBlogVersionUpdate {
  versionNumber?: number;
  slug?: string;
  title?: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
  bannerImagen?: string;
  bannerTitulo?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CMSBlogService {
  private readonly API_URL = `${environment.cmsApiUrl}/CMSBlog`;
  private readonly VERSION_API_URL = `${environment.cmsApiUrl}/CMSBlogVersion`;

  constructor(private http: HttpClient) {}

  // Métodos para CMSBlog
  getAllBlogs(params?: {
    id?: number;
    code?: string;
    name?: string;
    visibleWeb?: boolean;
    versionActiva?: number;
  }): Observable<ICMSBlogResponse[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.id !== undefined) httpParams = httpParams.set('Id', params.id.toString());
      if (params.code) httpParams = httpParams.set('Code', params.code);
      if (params.name) httpParams = httpParams.set('Name', params.name);
      if (params.visibleWeb !== undefined) httpParams = httpParams.set('VisibleWeb', params.visibleWeb.toString());
      if (params.versionActiva !== undefined) httpParams = httpParams.set('VersionActiva', params.versionActiva.toString());
    }

    return this.http.get<ICMSBlogResponse[]>(this.API_URL, { params: httpParams });
  }

  getBlogById(id: number): Observable<ICMSBlogResponse> {
    return this.http.get<ICMSBlogResponse>(`${this.API_URL}/${id}`);
  }

  createBlog(blogData: CMSBlogCreate): Observable<ICMSBlogResponse> {
    return this.http.post<ICMSBlogResponse>(this.API_URL, blogData);
  }

  updateBlog(id: number, blogData: CMSBlogUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, blogData);
  }

  deleteBlog(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  // Métodos para CMSBlogVersion
  getAllBlogVersions(params?: {
    id?: number;
    versionNumber?: number;
    slug?: string;
    title?: string;
    content?: string;
    seoTitle?: string;
    seoDescription?: string;
    bannerImagen?: string;
    bannerTitulo?: string;
    blogId?: number;
  }): Observable<ICMSBlogVersionResponse[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.id !== undefined) httpParams = httpParams.set('Id', params.id.toString());
      if (params.versionNumber !== undefined) httpParams = httpParams.set('VersionNumber', params.versionNumber.toString());
      if (params.slug) httpParams = httpParams.set('Slug', params.slug);
      if (params.title) httpParams = httpParams.set('Title', params.title);
      if (params.content) httpParams = httpParams.set('Content', params.content);
      if (params.seoTitle) httpParams = httpParams.set('SeoTitle', params.seoTitle);
      if (params.seoDescription) httpParams = httpParams.set('SeoDescription', params.seoDescription);
      if (params.bannerImagen) httpParams = httpParams.set('BannerImagen', params.bannerImagen);
      if (params.bannerTitulo) httpParams = httpParams.set('BannerTitulo', params.bannerTitulo);
      if (params.blogId !== undefined) httpParams = httpParams.set('BlogId', params.blogId.toString());
    }

    return this.http.get<ICMSBlogVersionResponse[]>(this.VERSION_API_URL, { params: httpParams });
  }

  getBlogVersionById(id: number): Observable<ICMSBlogVersionResponse> {
    return this.http.get<ICMSBlogVersionResponse>(`${this.VERSION_API_URL}/${id}`);
  }

  createBlogVersion(versionData: CMSBlogVersionCreate): Observable<ICMSBlogVersionResponse> {
    return this.http.post<ICMSBlogVersionResponse>(this.VERSION_API_URL, versionData);
  }

  updateBlogVersion(id: number, versionData: CMSBlogVersionUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.VERSION_API_URL}/${id}`, versionData);
  }

  deleteBlogVersion(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.VERSION_API_URL}/${id}`);
  }
}