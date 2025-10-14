import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TourFilters {
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
  filterByVisible?: boolean;
  orderByDeparture?: boolean;
  orderByBookableDeparture?: boolean;
}

/**
 * Modelo para crear un tour.
 */
export interface TourCreate {
  code: string;
  name: string;
  description?: string | null;
  tkId?: string | null;
  slug?: string | null;
  subtitle?: string | null;
  responsible?: string | null;
  isVisibleOnWeb: boolean;
  isBookable: boolean;
  isConsolidadorVuelosActive?: boolean;
  tripTypeId?: number | null;
  tourStatusId?: number | null;
  productStyleId?: number | null;
  minPrice?: number | null;
}

/**
 * Modelo para actualizar un tour existente.
 */
export interface TourUpdate {
  code?: string | null;
  name?: string | null;
  description?: string | null;
  tkId?: string | null;
  slug?: string | null;
  subtitle?: string | null;
  responsible?: string | null;
  isVisibleOnWeb?: boolean;
  isBookable?: boolean;
  isConsolidadorVuelosActive?: boolean;
  tripTypeId?: number | null;
  tourStatusId?: number | null;
  productStyleId?: number | null;
  minPrice?: number | null;
}

/**
 * Respuesta del backend para un tour.
 */
export interface ITourResponse {
  id: number;
  code: string | null;
  name: string | null;
  description: string | null;
  tkId: string | null;
  slug: string | null;
  subtitle: string | null;
  responsible: string | null;
  isVisibleOnWeb: boolean;
  isBookable: boolean;
  isConsolidadorVuelosActive: boolean;
  tripTypeId: number | null;
  tourStatusId: number | null;
  productStyleId: number | null;
  minPrice: number | null;
}

// Alias para compatibilidad con código existente
export type Tour = ITourResponse;

@Injectable({
  providedIn: 'root',
})
export class TourService {
  private readonly API_URL = `${environment.toursApiUrl}/Tour`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene tours con filtros opcionales.
   * @param filters Criterios de filtro opcionales.
   * @returns Observable de array de tours.
   */
  getAll(filters?: TourFilters): Observable<ITourResponse[]> {
    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(
            key.charAt(0).toUpperCase() + key.slice(1),
            value.toString()
          );
        }
      });
    }

    return this.http.get<ITourResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene un tour específico por su ID.
   * @param id ID del tour.
   * @param filterByVisible Si es true, solo devuelve tours visibles en web.
   * @returns Observable de tour.
   */
  getById(id: number, filterByVisible: boolean = true): Observable<ITourResponse> {
    let params = new HttpParams().set('FilterByVisible', filterByVisible.toString());

    return this.http.get<ITourResponse>(`${this.API_URL}/${id}`, { params }).pipe(
      catchError((error) => {
        console.error(`Error al obtener tour con ID ${id}:`, error);
        // Retornar tour por defecto en caso de error
        return of({
          id: id,
          code: 'unknown',
          name: `Tour ${id}`,
          description: '',
          tkId: null,
          slug: null,
          subtitle: null,
          responsible: null,
          isVisibleOnWeb: false,
          isBookable: false,
          isConsolidadorVuelosActive: false,
          tripTypeId: null,
          tourStatusId: null,
          productStyleId: null,
          minPrice: null,
        });
      })
    );
  }

  /**
   * Crea un nuevo tour.
   * @param data Datos del tour a crear.
   * @returns Tour creado.
   */
  create(data: TourCreate): Observable<ITourResponse> {
    return this.http.post<ITourResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    }).pipe(
      catchError((error) => {
        console.error('Error al crear tour:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza un tour existente.
   * @param id ID del tour a actualizar.
   * @param data Datos actualizados.
   * @returns `true` si la operación fue exitosa.
   */
  update(id: number, data: TourUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    }).pipe(
      catchError((error) => {
        console.error(`Error al actualizar tour con ID ${id}:`, error);
        return of(false);
      })
    );
  }

  /**
   * Elimina un tour por su ID.
   * @param id ID del tour a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`).pipe(
      catchError((error) => {
        console.error(`Error al eliminar tour con ID ${id}:`, error);
        return of(false);
      })
    );
  }

  /**
   * Obtiene el ID de un tour a partir de su TK ID.
   * @param tkId Identificador TK del tour.
   * @returns Observable con el ID del tour o 0 si no se encuentra.
   */
  getTourIdByTKId(tkId: string): Observable<number> {
    return this.getAll({ tkId }).pipe(
      map((tours) => {
        if (tours.length > 0 && tours[0].id) {
          return tours[0].id;
        }
        console.warn(`No se encontró ningún tour con tkId: ${tkId}`);
        return 0;
      }),
      catchError((error) => {
        console.error('Error al buscar tour por tkId:', error);
        return of(0);
      })
    );
  }

  /**
   * Obtiene tours por TK ID o External ID.
   * @param value Valor del identificador.
   * @param tipo Tipo de identificador: 'tkId' o 'externalId'.
   * @returns Observable de array de tours.
   */
  getTourByTkIdOrExternalId(
    value: string,
    tipo: 'tkId' | 'externalId'
  ): Observable<ITourResponse[]> {
    const filters: TourFilters = {};
    
    if (tipo === 'tkId') {
      filters.tkId = value;
    } else if (tipo === 'externalId') {
      // El externalId no está en el swagger actual, pero mantenemos compatibilidad
      (filters as any).externalId = value;
    }
    
    return this.getAll(filters);
  }

  /**
   * Obtiene tours visibles en la web.
   * @returns Observable de array de tours visibles.
   */
  getVisibleTours(): Observable<ITourResponse[]> {
    return this.getAll({ isVisibleOnWeb: true });
  }

  /**
   * Obtiene tours reservables.
   * @returns Observable de array de tours reservables.
   */
  getBookableTours(): Observable<ITourResponse[]> {
    return this.getAll({ isBookable: true });
  }

  /**
   * Obtiene tours por slug.
   * @param slug Slug del tour.
   * @param filterByVisible Si es true, solo devuelve tours visibles.
   * @returns Observable de array de tours con el slug especificado.
   */
  getBySlug(slug: string, filterByVisible: boolean = true): Observable<ITourResponse[]> {
    return this.getAll({ slug, filterByVisible });
  }

  /**
   * Obtiene tours por tipo de viaje.
   * @param tripTypeId ID del tipo de viaje.
   * @param filterByVisible Si es true, solo devuelve tours visibles.
   * @returns Observable de array de tours del tipo especificado.
   */
  getByTripType(tripTypeId: number, filterByVisible: boolean = true): Observable<ITourResponse[]> {
    return this.getAll({ tripTypeId, filterByVisible });
  }

  /**
   * Obtiene tours por estado.
   * @param tourStatusId ID del estado del tour.
   * @param filterByVisible Si es true, solo devuelve tours visibles.
   * @returns Observable de array de tours con el estado especificado.
   */
  getByStatus(tourStatusId: number, filterByVisible: boolean = true): Observable<ITourResponse[]> {
    return this.getAll({ tourStatusId, filterByVisible });
  }

  /**
   * Obtiene tours por estilo de producto.
   * @param productStyleId ID del estilo de producto.
   * @param filterByVisible Si es true, solo devuelve tours visibles.
   * @returns Observable de array de tours con el estilo especificado.
   */
  getByProductStyle(productStyleId: number, filterByVisible: boolean = true): Observable<ITourResponse[]> {
    return this.getAll({ productStyleId, filterByVisible });
  }

  /**
   * Obtiene tours con consolidador de vuelos activo.
   * @param filterByVisible Si es true, solo devuelve tours visibles.
   * @returns Observable de array de tours con consolidador activo.
   */
  getWithActiveFlightConsolidator(filterByVisible: boolean = true): Observable<ITourResponse[]> {
    return this.getAll({ isConsolidadorVuelosActive: true, filterByVisible });
  }

  // ====== MÉTODOS DE COMPATIBILIDAD CON CÓDIGO EXISTENTE ======
  // Estos métodos mantienen compatibilidad con el código que usa las versiones antiguas

  /**
   * @deprecated Usar getAll() en su lugar
   */
  getTours(filters?: TourFilters): Observable<ITourResponse[]> {
    return this.getAll(filters);
  }

  /**
   * @deprecated Usar getById() en su lugar
   */
  getTourById(id: number, filterByVisible: boolean = true): Observable<ITourResponse> {
    return this.getById(id, filterByVisible);
  }

  /**
   * @deprecated Usar create() en su lugar
   */
  createTour(tour: TourCreate): Observable<ITourResponse> {
    return this.create(tour);
  }

  /**
   * @deprecated Usar update() en su lugar
   */
  updateTour(id: number, tour: TourUpdate): Observable<boolean> {
    return this.update(id, tour);
  }

  /**
   * @deprecated Usar delete() en su lugar
   */
  deleteTour(id: number): Observable<boolean> {
    return this.delete(id);
  }
}

