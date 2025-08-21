import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TourDepartureCityCreate {
  name: string;
  activityId: number;
  activityPackId: number;
}

export interface TourDepartureCityUpdate {
  name: string;
  activityId: number;
  activityPackId: number;
}

export interface ITourDepartureCityResponse {
  name: string;
  activityId: number;
  activityPackId: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TourDepartureCityFilters {
  name?: string;
  activityId?: number;
  activityPackId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourDepartureCitiesService {
  private readonly API_URL = `${environment.toursApiUrl}/Tour`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las ciudades de departure de un tour específico.
   * @param tourId ID del tour.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de ciudades de departure del tour.
   */
  getAll(
    tourId: number,
    filters?: TourDepartureCityFilters,
    tourVisibility?: boolean
  ): Observable<ITourDepartureCityResponse[]> {
    let params = new HttpParams();
    if (tourVisibility !== undefined) {
      params = params.set('tourVisibility', tourVisibility.toString());
    }

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

    return this.http.get<ITourDepartureCityResponse[]>(
      `${this.API_URL}/${tourId}/departure-cities`,
      { params }
    );
  }

  /**
   * Crea una nueva ciudad de departure para un tour.
   * @param tourId ID del tour.
   * @param data Datos para crear la ciudad de departure.
   * @returns La ciudad de departure creada.
   */
  create(
    tourId: number,
    data: TourDepartureCityCreate
  ): Observable<ITourDepartureCityResponse> {
    return this.http.post<ITourDepartureCityResponse>(
      `${this.API_URL}/${tourId}/departure-cities`,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Actualiza una ciudad de departure existente de un tour.
   * @param tourId ID del tour.
   * @param cityName Nombre de la ciudad a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(
    tourId: number,
    cityName: string,
    data: TourDepartureCityUpdate
  ): Observable<boolean> {
    return this.http.put<boolean>(
      `${this.API_URL}/${tourId}/departure-cities/${encodeURIComponent(
        cityName
      )}`,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Elimina una ciudad de departure de un tour.
   * @param tourId ID del tour.
   * @param cityName Nombre de la ciudad a eliminar.
   * @returns Resultado de la operación.
   */
  delete(tourId: number, cityName: string): Observable<boolean> {
    return this.http.delete<boolean>(
      `${this.API_URL}/${tourId}/departure-cities/${encodeURIComponent(
        cityName
      )}`
    );
  }

  /**
   * Obtiene una ciudad de departure específica de un tour por su nombre.
   * @param tourId ID del tour.
   * @param cityName Nombre de la ciudad.
   * @returns La ciudad de departure encontrada.
   */
  getByName(
    tourId: number,
    cityName: string
  ): Observable<ITourDepartureCityResponse> {
    return this.http.get<ITourDepartureCityResponse>(
      `${this.API_URL}/${tourId}/departure-cities/${encodeURIComponent(
        cityName
      )}`
    );
  }

  /**
   * Obtiene ciudades de departure de un tour filtradas por nombre.
   * @param tourId ID del tour.
   * @param namePattern Patrón de búsqueda para el nombre.
   * @returns Lista de ciudades que coinciden con el patrón.
   */
  searchByName(
    tourId: number,
    namePattern: string
  ): Observable<ITourDepartureCityResponse[]> {
    const filters: TourDepartureCityFilters = {
      name: namePattern,
    };
    return this.getAll(tourId, filters);
  }

  /**
   * Obtiene ciudades de departure de un tour filtradas por activity ID.
   * @param tourId ID del tour.
   * @param activityId ID de la actividad.
   * @returns Lista de ciudades asociadas a la actividad especificada.
   */
  getByActivity(
    tourId: number,
    activityId: number
  ): Observable<ITourDepartureCityResponse[]> {
    const filters: TourDepartureCityFilters = {
      activityId: activityId,
    };
    return this.getAll(tourId, filters);
  }

  /**
   * Obtiene ciudades de departure de un tour filtradas por activity pack ID.
   * @param tourId ID del tour.
   * @param activityPackId ID del paquete de actividad.
   * @returns Lista de ciudades asociadas al paquete de actividad especificado.
   */
  getByActivityPack(
    tourId: number,
    activityPackId: number
  ): Observable<ITourDepartureCityResponse[]> {
    const filters: TourDepartureCityFilters = {
      activityPackId: activityPackId,
    };
    return this.getAll(tourId, filters);
  }

  /**
   * Verifica si existe una ciudad de departure específica en un tour.
   * @param tourId ID del tour.
   * @param cityName Nombre de la ciudad a verificar.
   * @returns True si la ciudad existe, false si no.
   */
  exists(tourId: number, cityName: string): Observable<boolean> {
    return new Observable((observer) => {
      this.getByName(tourId, cityName).subscribe({
        next: (city) => {
          observer.next(true);
          observer.complete();
        },
        error: (error) => {
          if (error.status === 404) {
            observer.next(false);
            observer.complete();
          } else {
            observer.error(error);
          }
        },
      });
    });
  }

  /**
   * Obtiene el conteo total de ciudades de departure de un tour.
   * @param tourId ID del tour.
   * @returns Número total de ciudades de departure.
   */
  getCount(tourId: number): Observable<number> {
    return new Observable((observer) => {
      this.getAll(tourId).subscribe({
        next: (cities) => {
          observer.next(cities.length);
          observer.complete();
        },
        error: (error) => observer.error(error),
      });
    });
  }

  /**
   * Crea múltiples ciudades de departure para un tour.
   * @param tourId ID del tour.
   * @param cities Array de ciudades a crear.
   * @returns Array de ciudades creadas.
   */
  createMultiple(
    tourId: number,
    cities: TourDepartureCityCreate[]
  ): Observable<ITourDepartureCityResponse[]> {
    const createPromises = cities.map((city) =>
      this.create(tourId, city).toPromise()
    );

    return new Observable((observer) => {
      Promise.all(createPromises)
        .then((results) => {
          observer.next(
            results.filter(
              (result) => result !== undefined
            ) as ITourDepartureCityResponse[]
          );
          observer.complete();
        })
        .catch((error) => observer.error(error));
    });
  }

  /**
   * Elimina múltiples ciudades de departure de un tour.
   * @param tourId ID del tour.
   * @param cityNames Array de nombres de ciudades a eliminar.
   * @returns Resultado de las operaciones de eliminación.
   */
  deleteMultiple(tourId: number, cityNames: string[]): Observable<boolean[]> {
    const deletePromises = cityNames.map((cityName) =>
      this.delete(tourId, cityName).toPromise()
    );

    return new Observable((observer) => {
      Promise.all(deletePromises)
        .then((results) => {
          observer.next(
            results.filter((result) => result !== undefined) as boolean[]
          );
          observer.complete();
        })
        .catch((error) => observer.error(error));
    });
  }
}
