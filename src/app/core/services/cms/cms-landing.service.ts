import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces para el modelo de Landing
// Nota: Estas interfaces son aproximadas ya que no se proporcionaron detalles específicos en el Swagger
export interface ICMSLandingResponse {
  id: number;
  code: string;
  name: string;
  visibleWeb: boolean;
  versionActiva: number;
}

export interface CMSLandingCreate {
  code: string;
  name: string;
  visibleWeb: boolean;
}

export interface CMSLandingUpdate {
  code?: string;
  name?: string;
  visibleWeb?: boolean;
  versionActiva?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CMSLandingService {
  private readonly API_URL = `${environment.cmsApiUrl}/CMSLanding`;

  constructor(private http: HttpClient) {}

  getAllLandings(params?: {
    id?: number;
    code?: string;
    name?: string;
    visibleWeb?: boolean;
    versionActiva?: number;
  }): Observable<ICMSLandingResponse[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.id !== undefined) httpParams = httpParams.set('Id', params.id.toString());
      if (params.code) httpParams = httpParams.set('Code', params.code);
      if (params.name) httpParams = httpParams.set('Name', params.name);
      if (params.visibleWeb !== undefined) httpParams = httpParams.set('VisibleWeb', params.visibleWeb.toString());
      if (params.versionActiva !== undefined) httpParams = httpParams.set('VersionActiva', params.versionActiva.toString());
    }

    return this.http.get<ICMSLandingResponse[]>(this.API_URL, { params: httpParams });
  }

  getLandingById(id: number): Observable<ICMSLandingResponse> {
    return this.http.get<ICMSLandingResponse>(`${this.API_URL}/${id}`);
  }

  createLanding(landingData: CMSLandingCreate): Observable<ICMSLandingResponse> {
    return this.http.post<ICMSLandingResponse>(this.API_URL, landingData);
  }

  updateLanding(id: number, landingData: CMSLandingUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, landingData);
  }

  deleteLanding(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}