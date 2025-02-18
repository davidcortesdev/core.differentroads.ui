import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageList } from '../models/pages/page-list.model';
import { Page } from '../models/pages/page.model';
import { map } from 'rxjs/operators';

type SelectedFields = Partial<Array<keyof Page | 'all'>>;

@Injectable({
  providedIn: 'root',
})
export class PagesService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/pages`;

  constructor(private http: HttpClient) {}

  getAllPages(): Observable<PageList[]> {
    return this.http.get<PageList[]>(this.API_URL);
  }

  getPageById(
    id: string,
    selectedFields: SelectedFields = []
  ): Observable<Page> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http.get<Page>(`${this.API_URL}/${id}`, { params });
  }

  getPageBySlug(
    slug: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Page> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http
      .get<Page[]>(`${this.API_URL}/filter-by/slug/${slug}`, { params })
      .pipe(
        map((pages: Page[]) => {
          if (pages.length > 0) {
            return pages[0];
          } else {
            throw new Error('No page found with the given slug');
          }
        })
      );
  }
}
