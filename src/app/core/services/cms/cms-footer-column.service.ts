import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface IFooterColumnResponse {
  id: number;
  code?: string;
  name?: string;
  description?: string;
  orden: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CMSFooterColumnService {
  private readonly API_URL = `${environment.cmsApiUrl}/FooterColumn`;

  constructor(private http: HttpClient) {}

  getAllFooterColumns(params?: {
    id?: number;
    code?: string;
    name?: string;
    description?: string;
    orden?: number;
    isActive?: boolean;
  }): Observable<IFooterColumnResponse[]> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.id !== undefined)
        httpParams = httpParams.set('Id', params.id.toString());
      if (params.code) httpParams = httpParams.set('code', params.code);
      if (params.name) httpParams = httpParams.set('name', params.name);
      if (params.description)
        httpParams = httpParams.set('description', params.description);
      if (params.orden !== undefined)
        httpParams = httpParams.set('orden', params.orden.toString());
      if (params.isActive !== undefined)
        httpParams = httpParams.set('isActive', params.isActive.toString());
    }

    return this.http.get<IFooterColumnResponse[]>(this.API_URL, {
      params: httpParams,
    });
  }

  getFooterColumnById(id: number): Observable<IFooterColumnResponse> {
    return this.http.get<IFooterColumnResponse>(`${this.API_URL}/${id}`);
  }
}
