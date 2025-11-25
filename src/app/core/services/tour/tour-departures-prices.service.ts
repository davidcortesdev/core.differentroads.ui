import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface ITourDeparturesPriceResponse {
  departureId: number;
  ageGroupId: number;
  total: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TourDeparturesPriceFilters {
  departureId?: number;
  ageGroupId?: number;
  total?: number;
  minTotal?: number;
  maxTotal?: number;
  tourVisibility?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TourDeparturesPricesService {
  private readonly API_URL = `${environment.toursApiUrl}/Tour`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los precios de departures de una o múltiples actividades.
   * @param activityIds Array de IDs de actividades. Si se pasa un solo ID, se puede pasar como número o array con un elemento.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de precios de departures de las actividades.
   */
  getAll(activityIds: number[] | number, filters?: TourDeparturesPriceFilters): Observable<ITourDeparturesPriceResponse[]> {
    // Normalizar activityIds a array
    const activityIdsArray = Array.isArray(activityIds) ? activityIds : [activityIds];
    
    if (activityIdsArray.length === 0) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    let params = new HttpParams();


      // Si hay múltiples IDs, usar el endpoint con query params
      // Agregar cada activityId como parámetro de query
      activityIdsArray.forEach(id => {
        params = params.append('activityIds', id.toString());
      });

      // Add filter parameters if provided
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

      // Usar el endpoint base sin activityId en la URL cuando hay múltiples IDs
      return this.http.get<ITourDeparturesPriceResponse[]>(`${this.API_URL}/departures-prices`, { params });
    
  }

  /**
   * Obtiene precios filtrados por departure ID.
   * @param activityId ID de la actividad.
   * @param departureId ID del departure.
   * @returns Lista de precios para el departure especificado.
   */
  getByDeparture(activityId: number, departureId: number): Observable<ITourDeparturesPriceResponse[]> {
    const filters: TourDeparturesPriceFilters = {
      departureId: departureId
    };
    return this.getAll(activityId, filters);
  }

  /**
   * Obtiene precios filtrados por age group ID.
   * @param activityId ID de la actividad.
   * @param ageGroupId ID del grupo de edad.
   * @returns Lista de precios para el grupo de edad especificado.
   */
  getByAgeGroup(activityId: number, ageGroupId: number): Observable<ITourDeparturesPriceResponse[]> {
    const filters: TourDeparturesPriceFilters = {
      ageGroupId: ageGroupId
    };
    return this.getAll(activityId, filters);
  }

  /**
   * Obtiene precio específico para un departure y grupo de edad.
   * @param activityId ID de la actividad.
   * @param departureId ID del departure.
   * @param ageGroupId ID del grupo de edad.
   * @returns Precio específico para la combinación departure/age group, o null si no existe.
   */
  getByDepartureAndAgeGroup(
    activityId: number, 
    departureId: number, 
    ageGroupId: number
  ): Observable<ITourDeparturesPriceResponse | null> {
    return this.getAll(activityId).pipe(
      map(prices => {
        const price = prices.find(p => 
          p.departureId === departureId && p.ageGroupId === ageGroupId
        );
        return price || null;
      })
    );
  }

  /**
   * Obtiene precios dentro de un rango de totales.
   * @param activityId ID de la actividad.
   * @param minTotal Precio mínimo.
   * @param maxTotal Precio máximo.
   * @returns Lista de precios dentro del rango especificado.
   */
  getByPriceRange(
    activityId: number, 
    minTotal: number, 
    maxTotal: number
  ): Observable<ITourDeparturesPriceResponse[]> {
    const filters: TourDeparturesPriceFilters = {
      minTotal: minTotal,
      maxTotal: maxTotal
    };
    return this.getAll(activityId, filters);
  }

  /**
   * Obtiene el precio más bajo de todos los departures y grupos de edad.
   * @param activityId ID de la actividad.
   * @returns El precio más bajo encontrado, o null si no hay precios.
   */
  getMinPrice(activityId: number): Observable<ITourDeparturesPriceResponse | null> {
    return this.getAll(activityId).pipe(
      map(prices => {
        if (prices.length === 0) return null;
        return prices.reduce((min, current) => 
          current.total < min.total ? current : min
        );
      })
    );
  }

  /**
   * Obtiene el precio más alto de todos los departures y grupos de edad.
   * @param activityId ID de la actividad.
   * @returns El precio más alto encontrado, o null si no hay precios.
   */
  getMaxPrice(activityId: number): Observable<ITourDeparturesPriceResponse | null> {
    return this.getAll(activityId).pipe(
      map(prices => {
        if (prices.length === 0) return null;
        return prices.reduce((max, current) => 
          current.total > max.total ? current : max
        );
      })
    );
  }

  /**
   * Obtiene el precio promedio de todos los departures y grupos de edad.
   * @param activityId ID de la actividad.
   * @returns El precio promedio, o 0 si no hay precios.
   */
  getAveragePrice(activityId: number): Observable<number> {
    return this.getAll(activityId).pipe(
      map(prices => {
        if (prices.length === 0) return 0;
        const sum = prices.reduce((total, price) => total + price.total, 0);
        return sum / prices.length;
      })
    );
  }

  /**
   * Obtiene todos los departure IDs únicos de la actividad.
   * @param activityId ID de la actividad.
   * @returns Lista de departure IDs únicos.
   */
  getUniqueDepartureIds(activityId: number): Observable<number[]> {
    return this.getAll(activityId).pipe(
      map(prices => {
        const departureIds = prices.map(p => p.departureId);
        return [...new Set(departureIds)].sort((a, b) => a - b);
      })
    );
  }

  /**
   * Obtiene todos los age group IDs únicos de la actividad.
   * @param activityId ID de la actividad.
   * @returns Lista de age group IDs únicos.
   */
  getUniqueAgeGroupIds(activityId: number): Observable<number[]> {
    return this.getAll(activityId).pipe(
      map(prices => {
        const ageGroupIds = prices.map(p => p.ageGroupId);
        return [...new Set(ageGroupIds)].sort((a, b) => a - b);
      })
    );
  }

  /**
   * Obtiene precios agrupados por departure ID.
   * @param activityId ID de la actividad.
   * @returns Objeto con departure IDs como claves y arrays de precios como valores.
   */
  getGroupedByDeparture(activityId: number): Observable<{[departureId: number]: ITourDeparturesPriceResponse[]}> {
    return this.getAll(activityId).pipe(
      map(prices => {
        return prices.reduce((grouped, price) => {
          if (!grouped[price.departureId]) {
            grouped[price.departureId] = [];
          }
          grouped[price.departureId].push(price);
          return grouped;
        }, {} as {[departureId: number]: ITourDeparturesPriceResponse[]});
      })
    );
  }

  /**
   * Obtiene precios agrupados por age group ID.
   * @param activityId ID de la actividad.
   * @returns Objeto con age group IDs como claves y arrays de precios como valores.
   */
  getGroupedByAgeGroup(activityId: number): Observable<{[ageGroupId: number]: ITourDeparturesPriceResponse[]}> {
    return this.getAll(activityId).pipe(
      map(prices => {
        return prices.reduce((grouped, price) => {
          if (!grouped[price.ageGroupId]) {
            grouped[price.ageGroupId] = [];
          }
          grouped[price.ageGroupId].push(price);
          return grouped;
        }, {} as {[ageGroupId: number]: ITourDeparturesPriceResponse[]});
      })
    );
  }

  /**
   * Obtiene el conteo total de combinaciones de precios.
   * @param activityId ID de la actividad.
   * @returns Número total de combinaciones de precios.
   */
  getCount(activityId: number): Observable<number> {
    return this.getAll(activityId).pipe(
      map(prices => prices.length)
    );
  }

  /**
   * Verifica si existe un precio para una combinación específica.
   * @param activityId ID de la actividad.
   * @param departureId ID del departure.
   * @param ageGroupId ID del grupo de edad.
   * @returns True si existe el precio, false si no.
   */
  hasPriceFor(
    activityId: number, 
    departureId: number, 
    ageGroupId: number
  ): Observable<boolean> {
    return this.getByDepartureAndAgeGroup(activityId, departureId, ageGroupId).pipe(
      map(price => price !== null)
    );
  }

  /**
   * Obtiene precios ordenados por total (ascendente o descendente).
   * @param activityId ID de la actividad.
   * @param ascending Si es true ordena ascendente, si es false descendente.
   * @returns Lista de precios ordenados por total.
   */
  getSortedByPrice(activityId: number, ascending: boolean = true): Observable<ITourDeparturesPriceResponse[]> {
    return this.getAll(activityId).pipe(
      map(prices => {
        return prices.sort((a, b) => 
          ascending ? a.total - b.total : b.total - a.total
        );
      })
    );
  }
}