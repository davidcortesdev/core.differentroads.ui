import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Collection } from '../models/collections/collection.model';
import { CollectionList } from '../models/collections/collection-list.model';
import { map } from 'rxjs/operators';

type SelectedFields = Partial<Array<keyof Collection | 'all'>>;

@Injectable({
  providedIn: 'root',
})
export class CollectionsService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/collections`;

  constructor(private http: HttpClient) {}

  getAllCollections(): Observable<CollectionList[]> {
    return this.http.get<CollectionList[]>(this.API_URL);
  }

  getCollectionById(
    id: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Collection> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http.get<Collection>(`${this.API_URL}/${id}`, { params });
  }

  getCollectionThumbnailById(id: string): Observable<Collection> {
    const selectedFields: SelectedFields = ['id', 'title', 'slug', 'banner'];
    return this.getCollectionById(id, selectedFields);
  }

  getCollectionBySlug(
    slug: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Collection> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http
      .get<Collection[]>(`${this.API_URL}/filter-by/slug/${slug}`, { params })
      .pipe(
        map((collections: Collection[]) => {
          if (collections.length > 0) {
            return collections[0];
          } else {
            throw new Error('No collection found with the given slug');
          }
        })
      );
  }
}
