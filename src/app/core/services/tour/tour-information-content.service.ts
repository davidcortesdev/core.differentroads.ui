import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TourInformationContentFilter {
  id?: number;
  tourId?: number;
  tourInformationSectionId?: number;
  content?: string;
  isVisibleOnTourPage?: boolean;
  isVisibleInDocumentation?: boolean;
}

export interface TourInformationContent {
  id: number;
  tourId: number;
  tourInformationSectionId: number;
  content: string;
  isVisibleOnTourPage: boolean;
  isVisibleInDocumentation: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TourInformationContentService {
  private readonly API_URL = `${environment.toursApiUrl}/TourInformationContent`;

  constructor(private http: HttpClient) {}

  /**
   * Get tour information content by filter criteria
   * @param filter Filter criteria for tour information content
   * @returns Observable of TourInformationContent array
   */
  getTourInformationContent(
    filter?: TourInformationContentFilter
  ): Observable<TourInformationContent[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<TourInformationContent[]>(this.API_URL, {
      params,
      headers: {
        Accept: 'text/plain',
      },
    });
  }

  /**
   * Get a specific tour information content by ID
   * @param id Tour Information Content ID
   * @returns Observable of TourInformationContent
   */
  getTourInformationContentById(
    id: number
  ): Observable<TourInformationContent> {
    let params = new HttpParams().set('Id', id.toString());

    return this.http
      .get<TourInformationContent>(this.API_URL, {
        params,
        headers: {
          Accept: 'text/plain',
        },
      })
      .pipe(
        map((response) => {
          // Check if response is an array and take the first item
          if (Array.isArray(response) && response.length > 0) {
            return response[0];
          }
          // If it's a single object, return it directly
          return response;
        }),
        map((content) => {
          // Ensure we have default values if missing
          return {
            ...content,
            content: content.content || '',
            isVisibleOnTourPage:
              content.isVisibleOnTourPage !== undefined
                ? content.isVisibleOnTourPage
                : true,
            isVisibleInDocumentation:
              content.isVisibleInDocumentation !== undefined
                ? content.isVisibleInDocumentation
                : true,
          };
        }),
        catchError((error) => {
          console.error(
            `Error fetching tour information content with ID ${id}:`,
            error
          );
          // Return a default content object on error
          return of({
            id: id,
            tourId: 0,
            tourInformationSectionId: 0,
            content: '',
            isVisibleOnTourPage: true,
            isVisibleInDocumentation: true,
          });
        })
      );
  }

  /**
   * Get tour information content by tour ID
   * @param tourId Tour ID
   * @returns Observable of TourInformationContent array
   */
  getTourInformationContentByTourId(
    tourId: number
  ): Observable<TourInformationContent[]> {
    const filter: TourInformationContentFilter = {
      tourId: tourId,
    };

    console.log('Buscando contenido de información para tour ID:', tourId);

    return this.getTourInformationContent(filter).pipe(
      map((content) => {
        console.log('Respuesta de contenido de información:', content);
        return content;
      }),
      catchError((error) => {
        console.error('Error al buscar contenido de información:', error);
        return of([]);
      })
    );
  }

  /**
   * Get tour information content by section ID
   * @param sectionId Section ID
   * @returns Observable of TourInformationContent array
   */
  getTourInformationContentBySectionId(
    sectionId: number
  ): Observable<TourInformationContent[]> {
    const filter: TourInformationContentFilter = {
      tourInformationSectionId: sectionId,
    };

    console.log(
      'Buscando contenido de información para sección ID:',
      sectionId
    );

    return this.getTourInformationContent(filter).pipe(
      map((content) => {
        console.log(
          'Respuesta de contenido de información por sección:',
          content
        );
        return content;
      }),
      catchError((error) => {
        console.error(
          'Error al buscar contenido de información por sección:',
          error
        );
        return of([]);
      })
    );
  }

  /**
   * Create new tour information content
   * @param content Tour Information Content object to create
   * @returns Observable of the created content
   */
  createTourInformationContent(
    content: Omit<TourInformationContent, 'id'>
  ): Observable<TourInformationContent> {
    return this.http
      .post<TourInformationContent>(this.API_URL, content, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .pipe(
        catchError((error) => {
          console.error('Error creating tour information content:', error);
          throw error;
        })
      );
  }

  /**
   * Update existing tour information content
   * @param id ID of the content to update
   * @param content Tour Information Content object with updated data
   * @returns Observable of the update result
   */
  updateTourInformationContent(
    id: number,
    content: TourInformationContent
  ): Observable<any> {
    const url = `${this.API_URL}/${id}`;
    return this.http
      .put(url, content, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .pipe(
        catchError((error) => {
          console.error(
            `Error updating tour information content with ID ${id}:`,
            error
          );
          return of(null);
        })
      );
  }

  /**
   * Delete tour information content
   * @param id ID of the content to delete
   * @returns Observable of the delete result
   */
  deleteTourInformationContent(id: number): Observable<any> {
    const url = `${this.API_URL}/${id}`;
    return this.http
      .delete(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .pipe(
        catchError((error) => {
          console.error(
            `Error deleting tour information content with ID ${id}:`,
            error
          );
          return of(null);
        })
      );
  }
}
