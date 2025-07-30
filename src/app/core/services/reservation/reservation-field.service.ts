import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface ReservationFieldCreate {
  id: number;
  code: string;
  name: string;
  description: string;
  fieldType: string;
  displayOrder: number;
  tkId: string;
}

export interface ReservationFieldUpdate {
  id: number;
  code: string;
  name: string;
  description: string;
  fieldType: string;
  displayOrder: number;
  tkId: string;
}

export interface IReservationFieldResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  fieldType: string;
  displayOrder: number;
  tkId: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReservationFieldFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  fieldType?: string;
  displayOrder?: number;
  tkId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationFieldService {
  private readonly API_URL = `${environment.masterdataApiUrl}/ReservationField`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los campos de reservación según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de campos de reservación.
   */
  getAll(
    filters?: ReservationFieldFilters
  ): Observable<IReservationFieldResponse[]> {
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

    return this.http.get<IReservationFieldResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo campo de reservación.
   * @param data Datos para crear el campo de reservación.
   * @returns El campo de reservación creado.
   */
  create(data: ReservationFieldCreate): Observable<IReservationFieldResponse> {
    return this.http.post<IReservationFieldResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un campo de reservación específico por su ID.
   * @param id ID del campo de reservación.
   * @returns El campo de reservación encontrado.
   */
  getById(id: number): Observable<IReservationFieldResponse> {
    return this.http.get<IReservationFieldResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un campo de reservación existente.
   * @param id ID del campo de reservación a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: ReservationFieldUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un campo de reservación existente.
   * @param id ID del campo de reservación a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene campos de reservación por código.
   * @param code Código del campo de reservación.
   * @returns Lista de campos de reservación con el código especificado.
   */
  getByCode(code: string): Observable<IReservationFieldResponse[]> {
    const params = new HttpParams()
      .set('Code', code)
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationFieldResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene campos de reservación por nombre.
   * @param name Nombre del campo de reservación.
   * @returns Lista de campos de reservación con el nombre especificado.
   */
  getByName(name: string): Observable<IReservationFieldResponse[]> {
    const params = new HttpParams()
      .set('Name', name)
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationFieldResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene campos de reservación por tipo de campo.
   * @param fieldType Tipo de campo.
   * @returns Lista de campos de reservación del tipo especificado.
   */
  getByFieldType(fieldType: string): Observable<IReservationFieldResponse[]> {
    const params = new HttpParams()
      .set('FieldType', fieldType)
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationFieldResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene campos de reservación por tkId.
   * @param tkId Token ID del campo.
   * @returns Lista de campos de reservación con el tkId especificado.
   */
  getByTkId(tkId: string): Observable<IReservationFieldResponse[]> {
    const params = new HttpParams()
      .set('TkId', tkId)
      .set('useExactMatchForStrings', 'false');

    return this.http.get<IReservationFieldResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene campos de reservación ordenados por displayOrder.
   * @returns Lista de campos de reservación ordenada por orden de visualización.
   */
  getAllOrdered(): Observable<IReservationFieldResponse[]> {
    return this.getAll().pipe(
      map((fields) => fields.sort((a, b) => a.displayOrder - b.displayOrder))
    );
  }

  /**
   * Obtiene campos de reservación por tipo de campo ordenados.
   * @param fieldType Tipo de campo.
   * @returns Lista de campos de reservación del tipo especificado ordenada por displayOrder.
   */
  getByFieldTypeOrdered(
    fieldType: string
  ): Observable<IReservationFieldResponse[]> {
    return this.getByFieldType(fieldType).pipe(
      map((fields) => fields.sort((a, b) => a.displayOrder - b.displayOrder))
    );
  }

  /**
   * Obtiene el siguiente orden de visualización disponible.
   * @returns El siguiente número de orden de visualización disponible.
   */
  getNextDisplayOrder(): Observable<number> {
    return this.getAll().pipe(
      map((fields) => {
        if (fields.length === 0) {
          return 1;
        }
        const maxOrder = Math.max(...fields.map((field) => field.displayOrder));
        return maxOrder + 1;
      })
    );
  }

  /**
   * Verifica si existe un código específico (para evitar duplicados).
   * @param code Código a verificar.
   * @param excludeId ID a excluir de la verificación (para actualizaciones).
   * @returns True si el código existe, false si no.
   */
  codeExists(code: string, excludeId?: number): Observable<boolean> {
    return this.getByCode(code).pipe(
      map((fields) => {
        const filteredFields = excludeId
          ? fields.filter((field) => field.id !== excludeId)
          : fields;
        return filteredFields.length > 0;
      })
    );
  }

  /**
   * Obtiene campos de reservación agrupados por tipo de campo.
   * @returns Objeto con los campos agrupados por fieldType.
   */
  getAllGroupedByFieldType(): Observable<{
    [fieldType: string]: IReservationFieldResponse[];
  }> {
    return this.getAll().pipe(
      map((fields) => {
        const grouped: { [fieldType: string]: IReservationFieldResponse[] } =
          {};

        fields.forEach((field) => {
          if (!grouped[field.fieldType]) {
            grouped[field.fieldType] = [];
          }
          grouped[field.fieldType].push(field);
        });

        // Ordenar cada grupo por displayOrder
        Object.keys(grouped).forEach((fieldType) => {
          grouped[fieldType].sort((a, b) => a.displayOrder - b.displayOrder);
        });

        return grouped;
      })
    );
  }

  /**
   * Obtiene campos de texto (input, textarea, etc.).
   * @returns Lista de campos de tipo texto.
   */
  getTextFields(): Observable<IReservationFieldResponse[]> {
    return this.getAll().pipe(
      map((fields) =>
        fields.filter((field) =>
          ['text', 'textarea', 'email', 'password', 'tel'].includes(
            field.fieldType.toLowerCase()
          )
        )
      )
    );
  }

  /**
   * Obtiene campos de selección (select, radio, checkbox).
   * @returns Lista de campos de tipo selección.
   */
  getSelectionFields(): Observable<IReservationFieldResponse[]> {
    return this.getAll().pipe(
      map((fields) =>
        fields.filter((field) =>
          ['select', 'radio', 'checkbox'].includes(
            field.fieldType.toLowerCase()
          )
        )
      )
    );
  }

  /**
   * Obtiene campos de fecha.
   * @returns Lista de campos de tipo fecha.
   */
  getDateFields(): Observable<IReservationFieldResponse[]> {
    return this.getAll().pipe(
      map((fields) =>
        fields.filter((field) =>
          ['date', 'datetime', 'time'].includes(field.fieldType.toLowerCase())
        )
      )
    );
  }

  /**
   * Obtiene el conteo total de campos por tipo.
   * @returns Objeto con el conteo de campos por tipo.
   */
  getFieldCountByType(): Observable<{ [fieldType: string]: number }> {
    return this.getAll().pipe(
      map((fields) => {
        const counts: { [fieldType: string]: number } = {};

        fields.forEach((field) => {
          counts[field.fieldType] = (counts[field.fieldType] || 0) + 1;
        });

        return counts;
      })
    );
  }

  /**
   * Busca campos por descripción (búsqueda parcial).
   * @param searchTerm Término de búsqueda.
   * @returns Lista de campos que contienen el término en su descripción.
   */
  searchByDescription(
    searchTerm: string
  ): Observable<IReservationFieldResponse[]> {
    return this.getAll().pipe(
      map((fields) =>
        fields.filter((field) =>
          field.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
  }

  /**
   * Obtiene un campo específico por su código.
   * @param code Código del campo.
   * @returns El campo encontrado o null si no existe.
   */
  getByCodeSingle(code: string): Observable<IReservationFieldResponse | null> {
    return this.getByCode(code).pipe(
      map((fields) => (fields.length > 0 ? fields[0] : null))
    );
  }

  /**
   * Crea múltiples campos de reservación.
   * @param fieldsData Array de datos para crear múltiples campos.
   * @returns Array de campos de reservación creados.
   */
  createMultiple(
    fieldsData: ReservationFieldCreate[]
  ): Observable<IReservationFieldResponse[]> {
    return this.http.post<IReservationFieldResponse[]>(
      `${this.API_URL}/batch`,
      fieldsData,
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      }
    );
  }

  /**
   * Reordena los campos de reservación.
   * @param fieldOrders Array de objetos con id y nuevo displayOrder.
   * @returns Resultado de la operación.
   */
  reorderFields(
    fieldOrders: { id: number; displayOrder: number }[]
  ): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/reorder`, fieldOrders, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }
}
