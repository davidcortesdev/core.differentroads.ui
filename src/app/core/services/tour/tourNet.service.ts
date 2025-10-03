import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TourFilter {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  tkId?: string;
  slug?: string;
  subtitle?: string;
  responsible?: string;
  isVisibleOnWeb?: boolean;
  isBookable?: boolean;
  isConsolidadorVuelosActive?: boolean;
  tripTypeId?: number;
  tourStatusId?: number;
  productStyleId?: number;
  minPrice?: number;
}

export interface Tour {
  id: number;
  code: string;
  name: string;
  description?: string;
  tkId?: string;
  slug?: string;
  subtitle: string | null;
  responsible: string | null;
  isVisibleOnWeb: boolean;
  isBookable: boolean;
  isConsolidadorVuelosActive?: boolean;
  tripTypeId: number | null;
  tourStatusId: number | null;
  productStyleId: number | null;
  minPrice?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourNetService {
  private readonly Reviews_API_URL = `${environment.toursApiUrl}/tour`;

  constructor(private http: HttpClient) {}

  /**
   * Get tour by filter criteria
   * @param filter Filter criteria for tours
   * @returns Observable of Tour array
   */
  getTours(filter?: TourFilter): Observable<Tour[]> {
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

    return this.http.get<Tour[]>(this.Reviews_API_URL, {
      params,
      headers: {
        Accept: 'text/plain',
      },
    });
  }

  /**
   * Get a specific tour by ID
   * @param id Tour ID
   * @returns Observable of Tour
   */
  getTourById(id: number): Observable<Tour> {
    let params = new HttpParams().set('Id', id.toString());

    return this.http
      .get<Tour>(this.Reviews_API_URL, {
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
        map((tour) => {
          // Ensure we have a default name if it's missing
          return {
            ...tour,
            name: tour.name,
          };
        }),
        catchError((error) => {
          console.error(`Error fetching tour with ID ${id}:`, error);
          // Return a default tour object on error with all required properties
          return of({
            id: id,
            code: 'unknown',
            name: `Tour ${id}`,
            description: '',
            subtitle: null,
            responsible: null,
            isBookable: false,
            isVisibleOnWeb: false,
            isConsolidadorVuelosActive: false,
            productStyleId: null,
            tourStatusId: null,
            tripTypeId: null,
            minPrice: 0,
          });
        })
      );
  }

  /**
   * Get tour ID by TK ID
   * @param tkId TK identifier
   * @returns Observable of tour ID number
   */
  getTourIdByTKId(tkId: string): Observable<number> {
    const filter: TourFilter = {
      tkId: tkId,
    };

    console.log('Buscando tour con tkId:', tkId);

    return this.getTours(filter).pipe(
      map((tours) => {
        console.log('Respuesta de tours:', tours);
        if (tours.length > 0 && tours[0].id) {
          const id = Number(tours[0].id);
          console.log('ID encontrado:', id);
          return id;
        }
        console.warn('No se encontró ningún tour con ese tkId');
        return 0;
      }),
      catchError((error) => {
        console.error('Error al buscar tours:', error);
        return of(0);
      })
    );
  }

  /**
   * Obtener tour por tkId o externalId
   * @param value Valor del identificador (tkId o externalId)
   * @param tipo Tipo de identificador: 'tkId' o 'externalId'
   * @returns Observable de Tour array
   */
  getTourByTkIdOrExternalId(
    value: string,
    tipo: 'tkId' | 'externalId'
  ): Observable<Tour[]> {
    const filter: TourFilter = {};
    if (tipo === 'tkId') {
      filter.tkId = value;
    } else if (tipo === 'externalId') {
      (filter as any).externalId = value;
    }
    return this.getTours(filter);
  }

  /**
   * Actualiza un tour existente
   * @param id ID del tour a actualizar
   * @param tour Objeto Tour con los datos actualizados
   * @returns Observable del resultado de la operación
   */
  updateTour(id: number, tour: Tour): Observable<any> {
    const url = `${this.Reviews_API_URL}/${id}`;
    return this.http
      .put(url, tour, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .pipe(
        catchError((error) => {
          console.error(`Error al actualizar el tour con ID ${id}:`, error);
          return of(null);
        })
      );
  }

  /**
   * Crea un nuevo tour
   * @param tour Objeto Tour con los datos del nuevo tour
   * @returns Observable del Tour creado
   */
  createTour(tour: Omit<Tour, 'id'>): Observable<Tour> {
    return this.http
      .post<Tour>(this.Reviews_API_URL, tour, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .pipe(
        catchError((error) => {
          console.error('Error al crear el tour:', error);
          throw error;
        })
      );
  }

  /**
   * Elimina un tour
   * @param id ID del tour a eliminar
   * @returns Observable del resultado de la operación
   */
  deleteTour(id: number): Observable<any> {
    const url = `${this.Reviews_API_URL}/${id}`;
    return this.http.delete(url).pipe(
      catchError((error) => {
        console.error(`Error al eliminar el tour con ID ${id}:`, error);
        return of(null);
      })
    );
  }
}
