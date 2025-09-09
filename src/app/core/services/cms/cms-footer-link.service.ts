import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface IFooterLinkResponse {
  id: number;
  name?: string;
  footerColumnId: number;
  url?: string;
  esExterno: boolean;
  orden: number;
  isActive: boolean;
}

/**
 * Interfaz para los filtros disponibles en el método getAllFooterLinks.
 */
export interface FooterLinkFilters {
  id?: number;
  name?: string;
  footerColumnId?: number;
  url?: string;
  esExterno?: boolean;
  orden?: number;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CMSFooterLinkService {
  private readonly API_URL = `${environment.cmsApiUrl}/FooterLink`;

  constructor(private http: HttpClient) {}

  getAllFooterLinks(
    params?: FooterLinkFilters
  ): Observable<IFooterLinkResponse[]> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.id !== undefined)
        httpParams = httpParams.set('Id', params.id.toString());
      if (params.name) httpParams = httpParams.set('name', params.name);
      if (params.footerColumnId !== undefined)
        httpParams = httpParams.set(
          'footerColumnId',
          params.footerColumnId.toString()
        );
      if (params.url) httpParams = httpParams.set('url', params.url);
      if (params.esExterno !== undefined)
        httpParams = httpParams.set('esExterno', params.esExterno.toString());
      if (params.orden !== undefined)
        httpParams = httpParams.set('orden', params.orden.toString());
      if (params.isActive !== undefined)
        httpParams = httpParams.set('isActive', params.isActive.toString());
    }

    return this.http.get<IFooterLinkResponse[]>(this.API_URL, {
      params: httpParams,
    });
  }

  getFooterLinkById(id: number): Observable<IFooterLinkResponse> {
    return this.http.get<IFooterLinkResponse>(`${this.API_URL}/${id}`);
  }

  getFooterLinksByColumnId(
    footerColumnId: number
  ): Observable<IFooterLinkResponse[]> {
    return this.getAllFooterLinks({ footerColumnId });
  }
}
