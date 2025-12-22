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

/**
 * DTO para ciudades de salida de vuelos.
 */
export interface DepartureCityDto {
  name: string | null;
  activityId: number;
  activityPackId: number;
}

/**
 * DTO para precios finales de tours.
 */
export interface FinalPriceDTO {
  departureId: number;
  ageGroupId: number;
  total: number;
}

/**
 * Coincidencia de búsqueda.
 */
export interface SearchMatch {
  type: string | null;
  score: number;
  description: string | null;
}

/**
 * Resultado simple de búsqueda de tours (solo IDs).
 */
export interface TourSearchSimpleResult {
  tourId: number;
}

/**
 * Resultado detallado de búsqueda de tours (con score y coincidencias).
 */
export interface TourSearchDetailedResult {
  tourId: number;
  score: number;
  matches: SearchMatch[] | null;
}

/**
 * Resultado de búsqueda unificada (tours, ubicaciones, tags).
 */
export interface UnifiedSearchResult {
  type: string | null;
  id: number;
  name: string | null;
  description: string | null;
  score: number;
  additionalData: { [key: string]: any } | null;
}

/**
 * Parámetros para búsqueda de tours.
 */
export interface TourSearchParams {
  searchText?: string;
  startDate?: string;
  endDate?: string;
  tripTypeId?: number;
  fuzzyThreshold?: number;
  tagScoreThreshold?: number;
  flexDays?: number;
}

/**
 * Parámetros para autocompletado de búsqueda.
 */
export interface TourAutocompleteParams {
  searchText?: string;
  minScoreThreshold?: number;
  maxResults?: number;
  includeTours?: boolean;
  includeLocations?: boolean;
  includeTags?: boolean;
}

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
        return 0;
      }),
      catchError((error) => {
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

  /**
   * Actualiza el precio mínimo (MinPrice) de un tour basándose en el BasePeriodPrice mínimo de todos sus períodos.
   * @param id ID del tour a actualizar.
   * @returns `true` si la actualización fue exitosa.
   */
  updateMinPrice(id: number): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}/update-min-price`, {}).pipe(
      catchError((error) => {
        return of(false);
      })
    );
  }

  /**
   * Obtiene la lista de ciudades de salida disponibles para el tour (de los vuelos).
   * @param id ID del tour.
   * @param tourVisibility Si es true, solo devuelve ciudades de tours visibles.
   * @returns Observable de array de ciudades de salida.
   */
  getDepartureCities(id: number, tourVisibility?: boolean): Observable<DepartureCityDto[]> {
    let params = new HttpParams();
    
    if (tourVisibility !== undefined) {
      params = params.set('tourVisibility', tourVisibility.toString());
    }

    return this.http.get<DepartureCityDto[]>(`${this.API_URL}/${id}/departure-cities`, { params }).pipe(
      catchError((error) => {
        return of([]);
      })
    );
  }

  /**
   * Obtiene la lista de IDs de grupos de edad (agegroups) disponibles para el tour.
   * @param id ID del tour.
   * @param tourVisibility Si es true, solo devuelve agegroups de tours visibles.
   * @returns Observable de array de IDs de agegroups.
   */
  getAgeGroups(id: number, tourVisibility?: boolean): Observable<number[]> {
    let params = new HttpParams();
    
    if (tourVisibility !== undefined) {
      params = params.set('tourVisibility', tourVisibility.toString());
    }

    return this.http.get<number[]>(`${this.API_URL}/${id}/agegroups`, { params }).pipe(
      catchError((error) => {
        return of([]);
      })
    );
  }

  /**
   * Obtiene la lista de tripTypeId únicos de todos los departures de un tour.
   * @param id ID del tour.
   * @param tourVisibility Si es true, solo devuelve tripTypeIds de tours visibles.
   * @returns Observable de array de IDs de trip types.
   */
  getTripTypeIds(id: number, tourVisibility?: boolean): Observable<number[]> {
    let params = new HttpParams();
    
    if (tourVisibility !== undefined) {
      params = params.set('tourVisibility', tourVisibility.toString());
    }

    return this.http.get<number[]>(`${this.API_URL}/${id}/triptype-ids`, { params }).pipe(
      catchError((error) => {
        return of([]);
      })
    );
  }

  /**
   * Obtiene la lista de números de mes (1-12) únicos en los que hay salidas para un tour.
   * @param id ID del tour.
   * @param tourVisibility Si es true, solo devuelve meses de tours visibles.
   * @returns Observable de array de números de mes (1-12).
   */
  getDepartureMonths(id: number, tourVisibility?: boolean): Observable<number[]> {
    let params = new HttpParams();
    
    if (tourVisibility !== undefined) {
      params = params.set('tourVisibility', tourVisibility.toString());
    }

    return this.http.get<number[]>(`${this.API_URL}/${id}/departure-months`, { params }).pipe(
      catchError((error) => {
        return of([]);
      })
    );
  }

  /**
   * Mapea números de mes (1-12) a nombres de mes en español en minúsculas.
   * Ignora valores fuera de rango.
   */
  mapDepartureMonthNumbersToNames(monthNumbers: number[]): string[] {
    if (!Array.isArray(monthNumbers) || monthNumbers.length === 0) {
      return [];
    }

    const monthNames = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];

    return monthNumbers
      .map((monthNumber) => {
        const monthIndex = monthNumber - 1;
        if (monthIndex >= 0 && monthIndex < monthNames.length) {
          return monthNames[monthIndex];
        }
        return null;
      })
      .filter((name): name is string => !!name);
  }

  /**
   * Obtiene los precios finales de un tour para una actividad específica.
   * @param activityId ID de la actividad.
   * @returns Observable de array de precios finales.
   */
  getDeparturesPrices(activityId: number): Observable<FinalPriceDTO[]> {
    return this.http.get<FinalPriceDTO[]>(`${this.API_URL}/${activityId}/departures-prices`).pipe(
      catchError((error) => {
        return of([]);
      })
    );
  }

  /**
   * Realiza una búsqueda avanzada de tours devolviendo solo IDs.
   * Incluye búsqueda fuzzy en títulos, slugs y subtítulos, y búsqueda en APIs externas.
   * @param params Parámetros de búsqueda.
   * @returns Observable de array de resultados simples de búsqueda (solo IDs de tours).
   */
  search(params: TourSearchParams): Observable<TourSearchSimpleResult[]> {
    let httpParams = new HttpParams();

    if (params.searchText) {
      httpParams = httpParams.set('searchText', params.searchText);
    }
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params.tripTypeId !== undefined) {
      httpParams = httpParams.set('tripTypeId', params.tripTypeId.toString());
    }
    if (params.fuzzyThreshold !== undefined) {
      httpParams = httpParams.set('fuzzyThreshold', params.fuzzyThreshold.toString());
    }
    if (params.tagScoreThreshold !== undefined) {
      httpParams = httpParams.set('tagScoreThreshold', params.tagScoreThreshold.toString());
    }
    if (params.flexDays !== undefined) {
      httpParams = httpParams.set('flexDays', params.flexDays.toString());
    }

    return this.http.get<TourSearchSimpleResult[]>(`${this.API_URL}/search`, { params: httpParams }).pipe(
      catchError((error) => {
        return of([]);
      })
    );
  }

  /**
   * Realiza una búsqueda avanzada de tours con score y detalle de coincidencias.
   * Incluye búsqueda fuzzy en títulos, slugs y subtítulos, y búsqueda en APIs externas.
   * @param params Parámetros de búsqueda.
   * @returns Observable de array de resultados detallados de búsqueda (con score y coincidencias).
   */
  searchWithScore(params: TourSearchParams): Observable<TourSearchDetailedResult[]> {
    let httpParams = new HttpParams();

    if (params.searchText) {
      httpParams = httpParams.set('searchText', params.searchText);
    }
    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    if (params.tripTypeId !== undefined) {
      httpParams = httpParams.set('tripTypeId', params.tripTypeId.toString());
    }
    if (params.fuzzyThreshold !== undefined) {
      httpParams = httpParams.set('fuzzyThreshold', params.fuzzyThreshold.toString());
    }
    if (params.tagScoreThreshold !== undefined) {
      httpParams = httpParams.set('tagScoreThreshold', params.tagScoreThreshold.toString());
    }
    if (params.flexDays !== undefined) {
      httpParams = httpParams.set('flexDays', params.flexDays.toString());
    }

    return this.http.get<TourSearchDetailedResult[]>(`${this.API_URL}/search-with-score`, { params: httpParams }).pipe(
      catchError((error) => {
        return of([]);
      })
    );
  }

  /**
   * Realiza una búsqueda unificada en tours, ubicaciones y tags ordenada por score.
   * Ideal para autocompletado y sugerencias en tiempo real.
   * @param params Parámetros de autocompletado.
   * @returns Observable de array de resultados unificados de búsqueda.
   */
  autocomplete(params: TourAutocompleteParams): Observable<UnifiedSearchResult[]> {
    let httpParams = new HttpParams();

    if (params.searchText) {
      httpParams = httpParams.set('searchText', params.searchText);
    }
    if (params.minScoreThreshold !== undefined) {
      httpParams = httpParams.set('minScoreThreshold', params.minScoreThreshold.toString());
    }
    if (params.maxResults !== undefined) {
      httpParams = httpParams.set('maxResults', params.maxResults.toString());
    }
    if (params.includeTours !== undefined) {
      httpParams = httpParams.set('includeTours', params.includeTours.toString());
    }
    if (params.includeLocations !== undefined) {
      httpParams = httpParams.set('includeLocations', params.includeLocations.toString());
    }
    if (params.includeTags !== undefined) {
      httpParams = httpParams.set('includeTags', params.includeTags.toString());
    }

    return this.http.get<UnifiedSearchResult[]>(`${this.API_URL}/autocomplete`, { params: httpParams }).pipe(
      catchError((error) => {
        return of([]);
      })
    );
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

