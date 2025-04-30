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

  // Método auxiliar para verificar si una página está publicada (insensible a mayúsculas/minúsculas)
  private isPublished(status: string | undefined): boolean {
    return status?.toLowerCase() === 'published';
  }

  // Método auxiliar para asegurar que status esté incluido en selectedFields
  private ensureStatusField(selectedFields: SelectedFields): SelectedFields {
    if (selectedFields.includes('all')) {
      return selectedFields;
    }
    
    // Si no incluye 'all', asegurarse de que 'status' esté incluido
    if (!selectedFields.includes('status' as keyof Page)) {
      return [...selectedFields, 'status' as keyof Page];
    }
    
    return selectedFields;
  }

  getAllPages(): Observable<PageList[]> {

    
    return this.http.get<PageList[]>(this.API_URL).pipe(
      map((pages: PageList[]) => {
        // Filtrar solo las páginas con status published
        return pages.filter(page => this.isPublished(page.status));
      })
    );
  }

  getPageById(
    id: string,
    selectedFields: SelectedFields = []
  ): Observable<Page> {
    // Asegurar que status esté incluido
    const fieldsWithStatus = this.ensureStatusField(selectedFields);
    
    let params = new HttpParams();

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http.get<Page>(`${this.API_URL}/${id}`, { params }).pipe(
      map((page: Page) => {
        if (page && !this.isPublished(page.status)) {
          throw new Error('Page not found or not published');
        }
        return page;
      })
    );
  }

  getPageBySlug(
    slug: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Page> {
    // Asegurar que status esté incluido
    const fieldsWithStatus = this.ensureStatusField(selectedFields);
    
    let params = new HttpParams();

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http
      .get<Page[]>(`${this.API_URL}/filter-by/slug/${slug}`, { params })
      .pipe(
        map((pages: Page[]) => {
          // Filtrar solo las páginas con status published
          const publishedPages = pages.filter(page => this.isPublished(page.status));
          
          if (publishedPages.length > 0) {
            return publishedPages[0];
          } else {
            throw new Error('No published page found with the given slug');
          }
        })
      );
  }
}
