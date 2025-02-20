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

  getAllLandings(): Observable<LandingList[]> {
    return this.http.get<LandingList[]>(this.API_URL);
  }

  getLandingById(
    id: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Landing> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http.get<Landing>(`${this.API_URL}/${id}`, { params });
  }

  getLandingThumbnailById(id: string): Observable<Landing> {
    const selectedFields: SelectedFields = ['id', 'title', 'slug', 'banner'];
    return this.getLandingById(id, selectedFields);
  }

  getLandingBySlug(
    slug: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Landing> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http
      .get<Landing[]>(`${this.API_URL}/filter-by/slug/${slug}`, { params })
      .pipe(
        map((landings: Landing[]) => {
          if (landings.length > 0) {
            return landings[0];
          } else {
            throw new Error('No landing found with the given slug');
          }
        })
      );
  }
}
