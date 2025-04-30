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

  // Método auxiliar para verificar si un blog está publicado (insensible a mayúsculas/minúsculas)
  private isPublished(status: string | undefined): boolean {
    return status?.toLowerCase() === 'published';
  }

  // Método auxiliar para asegurar que status esté incluido en selectedFields
  private ensureStatusField(selectedFields: SelectedFields): SelectedFields {
    if (selectedFields.includes('all')) {
      return selectedFields;
    }
    
    // Si no incluye 'all', asegurarse de que 'status' esté incluido
    if (!selectedFields.includes('status' as keyof Blog)) {
      return [...selectedFields, 'status' as keyof Blog];
    }
    
    return selectedFields;
  }

  getAllBlogs(): Observable<BlogList[]> {
    
    return this.http.get<BlogList[]>(this.API_URL).pipe(
      map((blogs: BlogList[]) => {
        // Filtrar solo los blogs con status published (insensible a mayúsculas/minúsculas)
        return blogs.filter(blog => this.isPublished(blog.status));
      })
    );
  }

  getBlogById(
    id: string,
    selectedFields: SelectedFields = []
  ): Observable<Blog> {
    // Asegurar que status esté incluido
    const fieldsWithStatus = this.ensureStatusField(selectedFields);
    
    let params = new HttpParams();

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http.get<Blog>(`${this.API_URL}/${id}`, { params }).pipe(
      map((blog: Blog) => {
        if (blog && !this.isPublished(blog.status)) {
          throw new Error('Blog not found or not published');
        }
        return blog;
      })
    );
  }

  getBlogThumbnailById(id: string): Observable<Blog> {
    const selectedFields: SelectedFields = [
      'id',
      'title',
      'subtitle',
      'slug',
      'image',
      'travels',
      'status', // Añadido status aquí
    ];
    return this.getBlogById(id, selectedFields);
  }

  getBlogBySlug(
    slug: string,
    selectedFields: SelectedFields = ['all']
  ): Observable<Blog> {
    // Asegurar que status esté incluido
    const fieldsWithStatus = this.ensureStatusField(selectedFields);
    
    let params = new HttpParams();

    if (fieldsWithStatus && fieldsWithStatus.length) {
      params = params.set('selectedFields', fieldsWithStatus.join(','));
    }

    return this.http
      .get<Blog[]>(`${this.API_URL}/filter-by/slug/${slug}`, { params })
      .pipe(
        map((blogs: Blog[]) => {
          // Filtrar solo los blogs con status published
          const publishedBlogs = blogs.filter(blog => this.isPublished(blog.status));
          
          if (publishedBlogs.length > 0) {
            return publishedBlogs[0];
          } else {
            throw new Error('No published blog found with the given slug');
          }
        })
      );
  }
}
