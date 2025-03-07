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

  getAllPress(): Observable<PressList[]> {
    return this.http.get<PressList[]>(this.API_URL);
  }

  getPressById(
    id: string,
    selectedFields: SelectedFields = []
  ): Observable<Press> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http.get<Press>(`${this.API_URL}/${id}`, { params });
  }

  getPressThumbnailById(id: string): Observable<Press> {
    const selectedFields: SelectedFields = [
      'id',
      'title',
      'subtitle',
      'slug',
      'image',
      ,
    ];
    return this.getPressById(id, selectedFields);
  }

  getPressBySlug(
    slug: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Press> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http
    .get<Press[]>(`${this.API_URL}/filter-by/slug/${slug}`, { params })
    .pipe(
      map((press: Press[]) => {
        if (press.length > 0) {
          return press[0];
        } else {
          throw new Error('No press found with the given slug');
        }
      })
    );
  }
}
