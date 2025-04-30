import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LandingList } from '../models/landings/landing-list.model';
import { Landing } from '../models/landings/landing.model';
import { map } from 'rxjs/operators';

type SelectedFields = Partial<Array<keyof Landing | 'all'>>;

@Injectable({
  providedIn: 'root',
})
export class LandingsService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/landings`;

  constructor(private http: HttpClient) {}

  // Método auxiliar para verificar si un landing está publicado (insensible a mayúsculas/minúsculas)
  private isPublished(status: string | undefined): boolean {
    return status?.toLowerCase() === 'published';
  }

  // Método auxiliar para asegurar que status esté incluido en selectedFields
  private ensureStatusField(selectedFields: SelectedFields): SelectedFields {
    if (selectedFields.includes('all')) {
      return selectedFields;
    }

    // Si no incluye 'all', asegurarse de que 'status' esté incluido
    if (!selectedFields.includes('status' as keyof Landing)) {
      return [...selectedFields, 'status' as keyof Landing];
    }

    return selectedFields;
  }

  getAllLandings(): Observable<LandingList[]> {
    return this.http.get<LandingList[]>(this.API_URL).pipe(
      map((landings: LandingList[]) => {
        // Filtrar solo los landings con status published
        return landings.filter((landing) => this.isPublished(landing.status));
      })
    );
  }

  getLandingById(
    id: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Landing> {
    // Asegurar que status esté incluido
    const fieldsWithStatus = this.ensureStatusField(selectedFields);

    let params = new HttpParams();

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http.get<Landing>(`${this.API_URL}/${id}`, { params }).pipe(
      map((landing: Landing) => {
        if (landing && !this.isPublished(landing.status)) {
          throw new Error('Landing not found or not published');
        }
        return landing;
      })
    );
  }

  getLandingThumbnailById(id: string): Observable<Landing> {
    const selectedFields: SelectedFields = [
      'id',
      'title',
      'slug',
      'banner',
      'status',
    ];
    return this.getLandingById(id, selectedFields);
  }

  getLandingBySlug(
    slug: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Landing> {
    // Asegurar que status esté incluido
    const fieldsWithStatus = this.ensureStatusField(selectedFields);

    let params = new HttpParams();

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http
      .get<Landing[]>(`${this.API_URL}/filter-by/slug/${slug}`, { params })
      .pipe(
        map((landings: Landing[]) => {
          // Filtrar solo los landings con status published
          const publishedLandings = landings.filter((landing) =>
            this.isPublished(landing.status)
          );

          if (publishedLandings.length > 0) {
            return publishedLandings[0];
          } else {
            throw new Error('No published landing found with the given slug');
          }
        })
      );
  }
}
