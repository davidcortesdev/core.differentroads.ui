import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TourInformationSectionFilter {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface TourInformationSection {
  id: number;
  code: string;
  name: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TourInformationSectionService {
  private readonly API_URL = `${environment.toursApiUrl}/TourInformationSection`;

  constructor(private http: HttpClient) {}

  /**
   * Get tour information sections by filter criteria
   * @param filter Filter criteria for tour information sections
   * @returns Observable of TourInformationSection array
   */
  getTourInformationSections(
    filter?: TourInformationSectionFilter
  ): Observable<TourInformationSection[]> {
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

    return this.http.get<TourInformationSection[]>(this.API_URL, {
      params,
      headers: {
        Accept: 'text/plain',
      },
    });
  }

  /**
   * Get a specific tour information section by ID
   * @param id Tour Information Section ID
   * @returns Observable of TourInformationSection
   */
  getTourInformationSectionById(
    id: number
  ): Observable<TourInformationSection> {
    let params = new HttpParams().set('Id', id.toString());

    return this.http
      .get<TourInformationSection>(this.API_URL, {
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
        map((section) => {
          // Ensure we have default values if missing
          return {
            ...section,
            name: section.name || `Section ${id}`,
            code: section.code || 'unknown',
            description: section.description || '',
            displayOrder: section.displayOrder || 0,
            isActive: section.isActive !== undefined ? section.isActive : true,
          };
        }),
        catchError((error) => {
          console.error(
            `Error fetching tour information section with ID ${id}:`,
            error
          );
          // Return a default section object on error
          return of({
            id: id,
            code: 'unknown',
            name: `Section ${id}`,
            description: '',
            displayOrder: 0,
            isActive: true,
          });
        })
      );
  }

  /**
   * Create a new tour information section
   * @param section Tour Information Section object to create
   * @returns Observable of the created section
   */
  createTourInformationSection(
    section: Omit<TourInformationSection, 'id'>
  ): Observable<TourInformationSection> {
    return this.http
      .post<TourInformationSection>(this.API_URL, section, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .pipe(
        catchError((error) => {
          console.error('Error creating tour information section:', error);
          throw error;
        })
      );
  }

  /**
   * Update an existing tour information section
   * @param id ID of the section to update
   * @param section Tour Information Section object with updated data
   * @returns Observable of the update result
   */
  updateTourInformationSection(
    id: number,
    section: TourInformationSection
  ): Observable<any> {
    const url = `${this.API_URL}/${id}`;
    return this.http
      .put(url, section, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .pipe(
        catchError((error) => {
          console.error(
            `Error updating tour information section with ID ${id}:`,
            error
          );
          return of(null);
        })
      );
  }

  /**
   * Delete a tour information section
   * @param id ID of the section to delete
   * @returns Observable of the delete result
   */
  deleteTourInformationSection(id: number): Observable<any> {
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
            `Error deleting tour information section with ID ${id}:`,
            error
          );
          return of(null);
        })
      );
  }
}
