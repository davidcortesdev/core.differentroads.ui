import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interfaces para el modelo de Prensa
// Nota: Estas interfaces son aproximadas ya que no se proporcionaron detalles específicos en el Swagger
export interface ICMSPrensaResponse {
  id: number;
  code: string;
  name: string;
  visibleWeb: boolean;
  versionActiva: number;
}

export interface CMSPrensaCreate {
  code: string;
  name: string;
  visibleWeb: boolean;
}

export interface CMSPrensaUpdate {
  code?: string;
  name?: string;
  visibleWeb?: boolean;
  versionActiva?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CMSPrensaService {
  private readonly API_URL = `${environment.cmsApiUrl}/CMSPrensa`;

  constructor(private http: HttpClient) {}

  getAllPrensa(params?: {
    id?: number;
    code?: string;
    name?: string;
    visibleWeb?: boolean;
    versionActiva?: number;
  }): Observable<ICMSPrensaResponse[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.id !== undefined) httpParams = httpParams.set('Id', params.id.toString());
      if (params.code) httpParams = httpParams.set('Code', params.code);
      if (params.name) httpParams = httpParams.set('Name', params.name);
      if (params.visibleWeb !== undefined) httpParams = httpParams.set('VisibleWeb', params.visibleWeb.toString());
      if (params.versionActiva !== undefined) httpParams = httpParams.set('VersionActiva', params.versionActiva.toString());
    }

    return this.http.get<ICMSPrensaResponse[]>(this.API_URL, { params: httpParams });
  }

  getPrensaById(id: number): Observable<ICMSPrensaResponse> {
    return this.http.get<ICMSPrensaResponse>(`${this.API_URL}/${id}`);
  }

  createPrensa(prensaData: CMSPrensaCreate): Observable<ICMSPrensaResponse> {
    return this.http.post<ICMSPrensaResponse>(this.API_URL, prensaData);
  }

  updatePrensa(id: number, prensaData: CMSPrensaUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, prensaData);
  }

  deletePrensa(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }
}