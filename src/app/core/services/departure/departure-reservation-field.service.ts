import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface DepartureReservationFieldCreate {
  id: number;
  departureId: number;
  reservationFieldId: number;
  mandatoryTypeId: number;
  ageGroupId: number;
}

export interface DepartureReservationFieldUpdate {
  id: number;
  departureId: number;
  reservationFieldId: number;
  mandatoryTypeId: number;
  ageGroupId: number;
}

export interface IDepartureReservationFieldResponse {
  id: number;
  departureId: number;
  reservationFieldId: number;
  mandatoryTypeId: number;
  ageGroupId: number;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface DepartureReservationFieldFilters {
  id?: number;
  departureId?: number;
  reservationFieldId?: number;
  mandatoryTypeId?: number;
  ageGroupId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class DepartureReservationFieldService {
  private readonly API_URL = `${environment.toursApiUrl}/DepartureReservationField`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los campos de reservación de departure según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de campos de reservación de departure.
   */
  getAll(
    filters?: DepartureReservationFieldFilters
  ): Observable<IDepartureReservationFieldResponse[]> {
    let params = new HttpParams();

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

    return this.http.get<IDepartureReservationFieldResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Crea un nuevo campo de reservación de departure.
   * @param data Datos para crear el campo de reservación de departure.
   * @returns El campo de reservación de departure creado.
   */
  create(
    data: DepartureReservationFieldCreate
  ): Observable<IDepartureReservationFieldResponse> {
    return this.http.post<IDepartureReservationFieldResponse>(
      `${this.API_URL}`,
      data,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Obtiene un campo de reservación de departure específico por su ID.
   * @param id ID del campo de reservación de departure.
   * @returns El campo de reservación de departure encontrado.
   */
  getById(id: number): Observable<IDepartureReservationFieldResponse> {
    return this.http.get<IDepartureReservationFieldResponse>(
      `${this.API_URL}/${id}`
    );
  }

  /**
   * Actualiza un campo de reservación de departure existente.
   * @param id ID del campo de reservación de departure a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(
    id: number,
    data: DepartureReservationFieldUpdate
  ): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un campo de reservación de departure existente.
   * @param id ID del campo de reservación de departure a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene campos de reservación por ID de departure.
   * @param departureId ID de la departure.
   * @returns Lista de campos de reservación de la departure.
   */
  getByDeparture(
    departureId: number
  ): Observable<IDepartureReservationFieldResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IDepartureReservationFieldResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene campos de reservación por ID de campo de reservación.
   * @param reservationFieldId ID del campo de reservación.
   * @returns Lista de campos de reservación con el ID especificado.
   */
  getByReservationField(
    reservationFieldId: number
  ): Observable<IDepartureReservationFieldResponse[]> {
    const params = new HttpParams()
      .set('ReservationFieldId', reservationFieldId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IDepartureReservationFieldResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene campos de reservación por ID de grupo de edad.
   * @param ageGroupId ID del grupo de edad.
   * @returns Lista de campos de reservación para el grupo de edad especificado.
   */
  getByAgeGroup(
    ageGroupId: number
  ): Observable<IDepartureReservationFieldResponse[]> {
    const params = new HttpParams()
      .set('AgeGroupId', ageGroupId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IDepartureReservationFieldResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene campos de reservación por tipo de mandatorio.
   * @param mandatoryTypeId ID del tipo de mandatorio.
   * @returns Lista de campos de reservación con el tipo de mandatorio especificado.
   */
  getByMandatoryType(
    mandatoryTypeId: number
  ): Observable<IDepartureReservationFieldResponse[]> {
    const params = new HttpParams()
      .set('MandatoryTypeId', mandatoryTypeId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IDepartureReservationFieldResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene campos de reservación por departure y grupo de edad.
   * @param departureId ID de la departure.
   * @param ageGroupId ID del grupo de edad.
   * @returns Lista de campos de reservación para la departure y grupo de edad especificados.
   */
  getByDepartureAndAgeGroup(
    departureId: number,
    ageGroupId: number
  ): Observable<IDepartureReservationFieldResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('AgeGroupId', ageGroupId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IDepartureReservationFieldResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene campos de reservación por departure y tipo de mandatorio.
   * @param departureId ID de la departure.
   * @param mandatoryTypeId ID del tipo de mandatorio.
   * @returns Lista de campos de reservación para la departure y tipo de mandatorio especificados.
   */
  getByDepartureAndMandatoryType(
    departureId: number,
    mandatoryTypeId: number
  ): Observable<IDepartureReservationFieldResponse[]> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('MandatoryTypeId', mandatoryTypeId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IDepartureReservationFieldResponse[]>(this.API_URL, {
      params,
    });
  }

  /**
   * Obtiene campos obligatorios para una departure específica.
   * @param departureId ID de la departure.
   * @returns Lista de campos obligatorios de la departure.
   */
  getMandatoryByDeparture(
    departureId: number
  ): Observable<IDepartureReservationFieldResponse[]> {
    return this.getByDeparture(departureId).pipe(
      map((fields) => fields.filter((field) => field.mandatoryTypeId === 1))
    );
  }

  /**
   * Obtiene campos opcionales para una departure específica.
   * @param departureId ID de la departure.
   * @returns Lista de campos opcionales de la departure.
   */
  getOptionalByDeparture(
    departureId: number
  ): Observable<IDepartureReservationFieldResponse[]> {
    return this.getByDeparture(departureId).pipe(
      map((fields) => fields.filter((field) => field.mandatoryTypeId !== 1))
    );
  }

  /**
   * Verifica si un campo específico es obligatorio para una departure y grupo de edad.
   * @param departureId ID de la departure.
   * @param reservationFieldId ID del campo de reservación.
   * @param ageGroupId ID del grupo de edad.
   * @returns True si el campo es obligatorio, false si no.
   */
  isFieldMandatory(
    departureId: number,
    reservationFieldId: number,
    ageGroupId: number
  ): Observable<boolean> {
    const params = new HttpParams()
      .set('DepartureId', departureId.toString())
      .set('ReservationFieldId', reservationFieldId.toString())
      .set('AgeGroupId', ageGroupId.toString())
      .set('useExactMatchForStrings', 'false');

    return this.http
      .get<IDepartureReservationFieldResponse[]>(this.API_URL, { params })
      .pipe(
        map((fields) => {
          const field = fields.find((f) => f.mandatoryTypeId === 1);
          return !!field;
        })
      );
  }

  /**
   * Obtiene todos los campos de reservación agrupados por departure.
   * @returns Objeto con los campos agrupados por ID de departure.
   */
  getAllGroupedByDeparture(): Observable<{
    [departureId: number]: IDepartureReservationFieldResponse[];
  }> {
    return this.getAll().pipe(
      map((fields) => {
        const grouped: {
          [departureId: number]: IDepartureReservationFieldResponse[];
        } = {};

        fields.forEach((field) => {
          if (!grouped[field.departureId]) {
            grouped[field.departureId] = [];
          }
          grouped[field.departureId].push(field);
        });

        return grouped;
      })
    );
  }

  /**
   * Obtiene el conteo de campos por departure.
   * @param departureId ID de la departure.
   * @returns Número total de campos de reservación para la departure.
   */
  getFieldCountByDeparture(departureId: number): Observable<number> {
    return this.getByDeparture(departureId).pipe(
      map((fields) => fields.length)
    );
  }

  /**
   * Crea múltiples campos de reservación de departure.
   * @param fieldsData Array de datos para crear múltiples campos.
   * @returns Array de campos de reservación creados.
   */
  createMultiple(
    fieldsData: DepartureReservationFieldCreate[]
  ): Observable<IDepartureReservationFieldResponse[]> {
    return this.http.post<IDepartureReservationFieldResponse[]>(
      `${this.API_URL}/batch`,
      fieldsData,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Elimina todos los campos de reservación de una departure específica.
   * @param departureId ID de la departure.
   * @returns Resultado de la operación.
   */
  deleteAllByDeparture(departureId: number): Observable<boolean> {
    return this.http.delete<boolean>(
      `${this.API_URL}/departure/${departureId}`
    );
  }
}
