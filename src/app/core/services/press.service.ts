import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PressList } from '../models/press/press-list.model';
import { Press } from '../models/press/press.model';
import { map } from 'rxjs/operators';

type SelectedFields = Partial<Array<keyof Press | 'all'>>;

@Injectable({
  providedIn: 'root',
})
export class PressService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/press`;

  constructor(private http: HttpClient) {}

  // Método auxiliar para verificar si un press está publicado (insensible a mayúsculas/minúsculas)
  private isPublished(status: string | undefined): boolean {
    return status?.toLowerCase() === 'published';
  }

  // Método auxiliar para asegurar que status esté incluido en selectedFields
  private ensureStatusField(selectedFields: SelectedFields): SelectedFields {
    if (selectedFields.includes('all')) {
      return selectedFields;
    }

    // Si no incluye 'all', asegurarse de que 'status' esté incluido
    if (!selectedFields.includes('status' as keyof Press)) {
      return [...selectedFields, 'status' as keyof Press];
    }

    return selectedFields;
  }

  getAllPress(): Observable<PressList[]> {
    return this.http.get<PressList[]>(this.API_URL).pipe(
      map((press: PressList[]) => {
        // Filtrar solo los press con status published (insensible a mayúsculas/minúsculas)
        return press.filter((item) => this.isPublished(item.status));
      })
    );
  }

  getPressById(
    id: string,
    selectedFields: SelectedFields = []
  ): Observable<Press> {
    // Asegurar que status esté incluido
    const fieldsWithStatus = this.ensureStatusField(selectedFields);

    let params = new HttpParams();

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http.get<Press>(`${this.API_URL}/${id}`, { params }).pipe(
      map((press: Press) => {
        if (press && !this.isPublished(press.status)) {
          throw new Error('Press not found or not published');
        }
        return press;
      })
    );
  }

  getPressThumbnailById(id: string): Observable<Press> {
    const selectedFields: SelectedFields = [
      'id',
      'title',
      'subtitle',
      'slug',
      'image',
      'status', // Añadido status aquí
    ];
    return this.getPressById(id, selectedFields);
  }

  getPressBySlug(
    slug: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Press> {
    // Asegurar que status esté incluido
    const fieldsWithStatus = this.ensureStatusField(selectedFields);

    let params = new HttpParams();

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http
      .get<Press[]>(`${this.API_URL}/filter-by/slug/${slug}`, { params })
      .pipe(
        map((press: Press[]) => {
          // Filtrar solo los press con status published
          const publishedPress = press.filter((item) =>
            this.isPublished(item.status)
          );

          if (publishedPress.length > 0) {
            return publishedPress[0];
          } else {
            throw new Error('No published press found with the given slug');
          }
        })
      );
  }
}
