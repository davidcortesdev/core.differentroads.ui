import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface AgeGroupCreate {
  id?: number;
  code: string;
  name: string;
  description?: string;
  lowerLimitAge?: number;
  upperLimitAge?: number;
  displayOrder?: number;
  tkId?: string;
}

export interface AgeGroupUpdate {
  id?: number;
  code: string;
  name: string;
  description?: string;
  lowerLimitAge?: number;
  upperLimitAge?: number;
  displayOrder?: number;
  tkId?: string;
}

export interface IAgeGroupResponse {
  id: number;
  code: string;
  name: string;
  description?: string;
  lowerLimitAge?: number;
  upperLimitAge?: number;
  displayOrder: number;
  tkId?: string;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface AgeGroupFilters {
  id?: number;
  code?: string;
  name?: string;
  description?: string;
  lowerLimitAge?: number;
  upperLimitAge?: number;
  displayOrder?: number;
  tkId?: string;
  useExactMatchForStrings?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AgeGroupService {
  private readonly API_URL = `${environment.masterdataApiUrl}/AgeGroup`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los grupos de edad según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de grupos de edad.
   */
  getAll(filters?: AgeGroupFilters): Observable<IAgeGroupResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Special handling for useExactMatchForStrings parameter
          if (key === 'useExactMatchForStrings') {
            params = params.set('useExactMatchForStrings', value.toString());
          } else {
            // Capitalize first letter for other parameters
            params = params.set(
              key.charAt(0).toUpperCase() + key.slice(1),
              value.toString()
            );
          }
        }
      });
    }

    return this.http.get<IAgeGroupResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea un nuevo grupo de edad.
   * @param data Datos para crear el grupo de edad.
   * @returns El grupo de edad creado.
   */
  create(data: AgeGroupCreate): Observable<IAgeGroupResponse> {
    return this.http.post<IAgeGroupResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Obtiene un grupo de edad específico por su ID.
   * @param id ID del grupo de edad.
   * @returns El grupo de edad encontrado.
   */
  getById(id: number): Observable<IAgeGroupResponse> {
    return this.http.get<IAgeGroupResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Actualiza un grupo de edad existente.
   * @param id ID del grupo de edad a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: AgeGroupUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina un grupo de edad existente.
   * @param id ID del grupo de edad a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene grupos de edad por código.
   * @param code Código del grupo de edad.
   * @returns Lista de grupos de edad con el código especificado.
   */
  getByCode(
    code: string,
    useExactMatch: boolean = false
  ): Observable<IAgeGroupResponse[]> {
    const params = new HttpParams()
      .set('Code', code)
      .set('useExactMatchForStrings', useExactMatch.toString());

    return this.http.get<IAgeGroupResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene grupos de edad por nombre.
   * @param name Nombre del grupo de edad.
   * @returns Lista de grupos de edad con el nombre especificado.
   */
  getByName(
    name: string,
    useExactMatch: boolean = false
  ): Observable<IAgeGroupResponse[]> {
    const params = new HttpParams()
      .set('Name', name)
      .set('useExactMatchForStrings', useExactMatch.toString());

    return this.http.get<IAgeGroupResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene grupos de edad ordenados por displayOrder.
   * @returns Lista de grupos de edad ordenada por orden de visualización.
   */
  getAllOrdered(): Observable<IAgeGroupResponse[]> {
    return this.getAll().pipe(
      map((ageGroups) =>
        ageGroups.sort((a, b) => a.displayOrder - b.displayOrder)
      )
    );
  }

  /**
   * Obtiene el grupo de edad apropiado para una edad específica.
   * @param age Edad a evaluar.
   * @returns El grupo de edad que corresponde a la edad especificada, o null si no se encuentra.
   */
  getByAge(age: number): Observable<IAgeGroupResponse | null> {
    return this.getAll().pipe(
      map((ageGroups) => {
        const matchingGroup = ageGroups.find(
          (group) =>
            group.lowerLimitAge !== undefined &&
            group.upperLimitAge !== undefined &&
            age >= group.lowerLimitAge &&
            age <= group.upperLimitAge
        );
        return matchingGroup || null;
      })
    );
  }

  /**
   * Obtiene grupos de edad que incluyen un rango de edad específico.
   * @param minAge Edad mínima del rango.
   * @param maxAge Edad máxima del rango.
   * @returns Lista de grupos de edad que incluyen el rango especificado.
   */
  getByAgeRange(
    minAge: number,
    maxAge: number
  ): Observable<IAgeGroupResponse[]> {
    return this.getAll().pipe(
      map((ageGroups) =>
        ageGroups.filter(
          (group) =>
            group.lowerLimitAge !== undefined &&
            group.upperLimitAge !== undefined &&
            group.lowerLimitAge <= maxAge &&
            group.upperLimitAge >= minAge
        )
      )
    );
  }

  /**
   * Obtiene grupos de edad para adultos (típicamente mayores de 18 años).
   * @returns Lista de grupos de edad para adultos.
   */
  getAdultGroups(): Observable<IAgeGroupResponse[]> {
    return this.getAll().pipe(
      map((ageGroups) =>
        ageGroups.filter(
          (group) =>
            group.lowerLimitAge !== undefined && group.lowerLimitAge >= 18
        )
      )
    );
  }

  /**
   * Obtiene grupos de edad para menores (típicamente menores de 18 años).
   * @returns Lista de grupos de edad para menores.
   */
  getChildGroups(): Observable<IAgeGroupResponse[]> {
    return this.getAll().pipe(
      map((ageGroups) =>
        ageGroups.filter(
          (group) =>
            group.upperLimitAge !== undefined && group.upperLimitAge < 18
        )
      )
    );
  }

  /**
   * Valida si una edad está dentro de los límites de un grupo de edad.
   * @param ageGroupId ID del grupo de edad.
   * @param age Edad a validar.
   * @returns True si la edad está dentro del rango, false si no.
   */
  validateAgeInGroup(ageGroupId: number, age: number): Observable<boolean> {
    return this.getById(ageGroupId).pipe(
      map(
        (ageGroup) =>
          ageGroup.lowerLimitAge !== undefined &&
          ageGroup.upperLimitAge !== undefined &&
          age >= ageGroup.lowerLimitAge &&
          age <= ageGroup.upperLimitAge
      )
    );
  }

  /**
   * Obtiene el siguiente orden de visualización disponible.
   * @returns El siguiente número de orden de visualización disponible.
   */
  getNextDisplayOrder(): Observable<number> {
    return this.getAll().pipe(
      map((ageGroups) => {
        if (ageGroups.length === 0) {
          return 1;
        }
        const maxOrder = Math.max(
          ...ageGroups.map((group) => group.displayOrder)
        );
        return maxOrder + 1;
      })
    );
  }

  /**
   * Verifica si existe solapamiento de rangos de edad entre grupos.
   * @param lowerLimit Límite inferior del nuevo grupo.
   * @param upperLimit Límite superior del nuevo grupo.
   * @param excludeId ID del grupo a excluir de la validación (para actualizaciones).
   * @returns True si hay solapamiento, false si no.
   */
  checkAgeRangeOverlap(
    lowerLimit: number,
    upperLimit: number,
    excludeId?: number
  ): Observable<boolean> {
    return this.getAll().pipe(
      map((ageGroups) => {
        const filteredGroups = excludeId
          ? ageGroups.filter((group) => group.id !== excludeId)
          : ageGroups;

        return filteredGroups.some(
          (group) =>
            group.lowerLimitAge !== undefined &&
            group.upperLimitAge !== undefined &&
            lowerLimit <= group.upperLimitAge &&
            upperLimit >= group.lowerLimitAge
        );
      })
    );
  }

  /**
   * Formatear el texto del rango de edad para mostrar en la UI.
   * @param ageGroup Grupo de edad a formatear.
   * @returns Texto formateado del rango de edad.
   */
  getAgeRangeText(ageGroup: IAgeGroupResponse): string {
    const lowerAge = ageGroup.lowerLimitAge;
    const upperAge = ageGroup.upperLimitAge;

    // Si ambos límites están vacíos o son 0
    if ((!lowerAge || lowerAge === 0) && (!upperAge || upperAge === 0)) {
      return '(Sin límite de edad)';
    }

    // Si solo tiene límite inferior (upperAge está vacío o es 0)
    if ((!upperAge || upperAge === 0) && lowerAge && lowerAge > 0) {
      return `(Desde ${lowerAge} años)`;
    }

    // Si solo tiene límite superior (lowerAge está vacío o es 0)
    if ((!lowerAge || lowerAge === 0) && upperAge && upperAge > 0) {
      return `(Hasta ${upperAge} años)`;
    }

    // Si ambos límites son iguales
    if (lowerAge === upperAge) {
      return `(${lowerAge} años)`;
    }

    // Si tiene ambos límites
    return `(${lowerAge} a ${upperAge} años)`;
  }
}
