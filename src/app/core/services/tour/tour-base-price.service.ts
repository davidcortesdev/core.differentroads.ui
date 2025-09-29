import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TourBasePriceFilter {
  id?: number;
  tkId?: string;
  tourId?: number;
  ageGroupId?: number;
  campaignId?: number;
  priceCategoryId?: number;
  priceRateId?: number;
  currencyId?: number;
  retailerId?: number;
}

export interface TourBasePrice {
  tkId: string;
  id: number;
  tourId: number;
  ageGroupId: number;
  campaignId: number;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  basePrice: number;
  campaignPrice: number;
}

export interface TourBasePriceCreate {
  tkId: string;
  tourId: number;
  ageGroupId: number;
  campaignId: number;
  priceCategoryId: number;
  priceRateId: number;
  currencyId: number;
  retailerId: number;
  basePrice: number;
  campaignPrice: number;
}

export interface TourBasePriceUpdate extends Partial<TourBasePriceCreate> {
  id: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourBasePriceService {
  private readonly API_URL = `${environment.toursApiUrl}/TourBasePrice`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los precios base de tours con filtros opcionales
   * @param filter Filtros para aplicar en la búsqueda
   * @returns Observable de array de TourBasePrice
   */
  getAll(filter?: TourBasePriceFilter): Observable<TourBasePrice[]> {
    let params = new HttpParams();

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

    return this.http.get<TourBasePrice[]>(this.API_URL, { params }).pipe(
      catchError((error) => {
        console.error('Error obteniendo precios base de tours:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene un precio base específico por su ID
   * @param id ID del precio base
   * @returns Observable de TourBasePrice
   */
  getById(id: number): Observable<TourBasePrice | null> {
    return this.http.get<TourBasePrice>(`${this.API_URL}/${id}`).pipe(
      catchError((error) => {
        console.error(`Error obteniendo precio base con ID ${id}:`, error);
        return of(null);
      })
    );
  }

  /**
   * Crea un nuevo precio base de tour
   * @param tourBasePrice Datos del precio base a crear
   * @returns Observable del resultado de la operación
   */
  create(tourBasePrice: TourBasePriceCreate): Observable<TourBasePrice | null> {
    return this.http.post<TourBasePrice>(this.API_URL, tourBasePrice).pipe(
      catchError((error) => {
        console.error('Error creando precio base de tour:', error);
        return of(null);
      })
    );
  }

  /**
   * Actualiza un precio base existente
   * @param id ID del precio base a actualizar
   * @param tourBasePrice Datos actualizados del precio base
   * @returns Observable del resultado de la operación
   */
  update(
    id: number,
    tourBasePrice: TourBasePriceUpdate
  ): Observable<TourBasePrice | null> {
    return this.http
      .put<TourBasePrice>(`${this.API_URL}/${id}`, tourBasePrice)
      .pipe(
        catchError((error) => {
          console.error(`Error actualizando precio base con ID ${id}:`, error);
          return of(null);
        })
      );
  }

  /**
   * Elimina un precio base por su ID
   * @param id ID del precio base a eliminar
   * @returns Observable del resultado de la operación
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete(`${this.API_URL}/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error(`Error eliminando precio base con ID ${id}:`, error);
        return of(false);
      })
    );
  }

  /**
   * Obtiene precios base por tour ID
   * @param tourId ID del tour
   * @returns Observable de array de TourBasePrice
   */
  getByTourId(tourId: number): Observable<TourBasePrice[]> {
    return this.getAll({ tourId }).pipe(
      map((prices) => {
        console.log(
          `Precios base encontrados para tour ${tourId}:`,
          prices.length
        );
        return prices;
      })
    );
  }

  /**
   * Obtiene precios base por tour ID y grupo de edad
   * @param tourId ID del tour
   * @param ageGroupId ID del grupo de edad
   * @returns Observable de array de TourBasePrice
   */
  getByTourIdAndAgeGroup(
    tourId: number,
    ageGroupId: number
  ): Observable<TourBasePrice[]> {
    return this.getAll({ tourId, ageGroupId }).pipe(
      map((prices) => {
        console.log(
          `Precios base encontrados para tour ${tourId} y ageGroup ${ageGroupId}:`,
          prices.length
        );
        return prices;
      })
    );
  }

  /**
   * Obtiene el precio base más bajo para un tour específico
   * @param tourId ID del tour
   * @returns Observable del precio base más bajo
   */
  getLowestPriceByTourId(tourId: number): Observable<number> {
    return this.getByTourId(tourId).pipe(
      map((prices) => {
        if (prices.length === 0) return 0;

        const lowestPrice = Math.min(
          ...prices.map((price) =>
            Math.min(price.basePrice, price.campaignPrice)
          )
        );

        console.log(`Precio base más bajo para tour ${tourId}:`, lowestPrice);
        return lowestPrice;
      })
    );
  }
}

