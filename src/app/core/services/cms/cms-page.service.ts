import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces para el modelo de Page
// Nota: Estas interfaces son aproximadas ya que no se proporcionaron detalles específicos en el Swagger
export interface ICMSPageResponse {
  id: number;
  code: string;
  name: string;
  visibleWeb: boolean;
  versionActiva: number;
}

export interface CMSPageCreate {
  code: string;
  name: string;
  visibleWeb: boolean;
}

export interface CMSPageUpdate {
  code?: string;
  name?: string;
  visibleWeb?: boolean;
  versionActiva?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CMSPageService {
  private readonly API_URL = `${environment.cmsApiUrl}/CMSPage`;

  constructor(private http: HttpClient) {}

  getAllPages(params?: {
    id?: number;
    code?: string;
    name?: string;
    visibleWeb?: boolean;
    versionActiva?: number;
  }): Observable<ICMSPageResponse[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.id !== undefined) httpParams = httpParams.set('Id', params.id.toString());
      if (params.code) httpParams = httpParams.set('Code', params.code);
      if (params.name) httpParams = httpParams.set('Name', params.name);
      if (params.visibleWeb !== undefined) httpParams = httpParams.set('VisibleWeb', params.visibleWeb.toString());
      if (params.versionActiva !== undefined) httpParams = httpParams.set('VersionActiva', params.versionActiva.toString());
    }

    return this.http.get<ICMSPageResponse[]>(this.API_URL, { params: httpParams });
  }

  getPageById(id: number): Observable<ICMSPageResponse> {
    return this.http.get<ICMSPageResponse>(`${this.API_URL}/${id}`);
  }

  createPage(pageData: CMSPageCreate): Observable<ICMSPageResponse> {
    return this.http.post<ICMSPageResponse>(this.API_URL, pageData);
  }

  updatePage(id: number, pageData: CMSPageUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, pageData);
  }

  deletePage(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}