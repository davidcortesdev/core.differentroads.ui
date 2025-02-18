import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BlogList } from '../models/blogs/blog-list.model';
import { Blog } from '../models/blogs/blog.model';
import { map } from 'rxjs/operators';

type SelectedFields = Partial<Array<keyof Blog | 'all'>>;

@Injectable({
  providedIn: 'root',
})
export class BlogsService {
  private readonly API_URL = `${environment.apiUrl}/data/cms/collections/es/blog`;

  constructor(private http: HttpClient) {}

  getAllBlogs(): Observable<BlogList[]> {
    return this.http.get<BlogList[]>(this.API_URL);
  }

  getBlogById(
    id: string,
    selectedFields: SelectedFields = []
  ): Observable<Blog> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http.get<Blog>(`${this.API_URL}/${id}`, { params });
  }

  getBlogThumbnailById(id: string): Observable<Blog> {
    const selectedFields: SelectedFields = [
      'id',
      'title',
      'subtitle',
      'slug',
      'image',
      'travels',
    ];
    return this.getBlogById(id, selectedFields);
  }

  getBlogBySlug(
    slug: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Blog> {
    let params = new HttpParams();

    if (selectedFields && selectedFields.length) {
      params = params.set('selectedFields', selectedFields.join(','));
    }

    return this.http
      .get<Blog[]>(`${this.API_URL}/filter-by/slug/${slug}`, { params })
      .pipe(
        map((blogs: Blog[]) => {
          if (blogs.length > 0) {
            return blogs[0];
          } else {
            throw new Error('No blog found with the given slug');
          }
        })
      );
  }
}
