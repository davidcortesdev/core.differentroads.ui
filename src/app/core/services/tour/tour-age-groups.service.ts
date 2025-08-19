import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TourAgeGroupFilters {
  ageGroupId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourAgeGroupsService {
  private readonly API_URL = `${environment.toursApiUrl}/Tour`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los IDs de grupos de edad de un tour específico.
   * @param tourId ID del tour.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de IDs de grupos de edad del tour.
   */
  getAll(tourId: number, filters?: TourAgeGroupFilters, tourVisibility?: boolean): Observable<number[]> {
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

    return this.http.get<number[]>(`${this.API_URL}/${tourId}/agegroups`, { params });
  }

  /**
   * Asigna un grupo de edad a un tour.
   * @param tourId ID del tour.
   * @param ageGroupId ID del grupo de edad a asignar.
   * @returns Resultado de la operación.
   */
  assign(tourId: number, ageGroupId: number): Observable<boolean> {
    return this.http.post<boolean>(`${this.API_URL}/${tourId}/agegroups/${ageGroupId}`, {}, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Desasigna un grupo de edad de un tour.
   * @param tourId ID del tour.
   * @param ageGroupId ID del grupo de edad a desasignar.
   * @returns Resultado de la operación.
   */
  unassign(tourId: number, ageGroupId: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${tourId}/agegroups/${ageGroupId}`);
  }

  /**
   * Reemplaza todos los grupos de edad de un tour con una nueva lista.
   * @param tourId ID del tour.
   * @param ageGroupIds Array de IDs de grupos de edad.
   * @returns Lista actualizada de IDs de grupos de edad.
   */
  replaceAll(tourId: number, ageGroupIds: number[]): Observable<number[]> {
    return this.http.put<number[]>(`${this.API_URL}/${tourId}/agegroups`, ageGroupIds, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Verifica si un grupo de edad específico está asignado a un tour.
   * @param tourId ID del tour.
   * @param ageGroupId ID del grupo de edad a verificar.
   * @returns True si el grupo de edad está asignado, false si no.
   */
  isAssigned(tourId: number, ageGroupId: number): Observable<boolean> {
    return new Observable(observer => {
      this.getAll(tourId).subscribe({
        next: (ageGroupIds) => {
          observer.next(ageGroupIds.includes(ageGroupId));
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Obtiene el conteo total de grupos de edad asignados a un tour.
   * @param tourId ID del tour.
   * @returns Número total de grupos de edad asignados.
   */
  getCount(tourId: number): Observable<number> {
    return new Observable(observer => {
      this.getAll(tourId).subscribe({
        next: (ageGroupIds) => {
          observer.next(ageGroupIds.length);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Asigna múltiples grupos de edad a un tour.
   * @param tourId ID del tour.
   * @param ageGroupIds Array de IDs de grupos de edad a asignar.
   * @returns Array de resultados de las operaciones de asignación.
   */
  assignMultiple(tourId: number, ageGroupIds: number[]): Observable<boolean[]> {
    const assignPromises = ageGroupIds.map(ageGroupId => 
      this.assign(tourId, ageGroupId).toPromise()
    );
    
    return new Observable(observer => {
      Promise.all(assignPromises)
        .then(results => {
          observer.next(results.filter(result => result !== undefined) as boolean[]);
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Desasigna múltiples grupos de edad de un tour.
   * @param tourId ID del tour.
   * @param ageGroupIds Array de IDs de grupos de edad a desasignar.
   * @returns Array de resultados de las operaciones de desasignación.
   */
  unassignMultiple(tourId: number, ageGroupIds: number[]): Observable<boolean[]> {
    const unassignPromises = ageGroupIds.map(ageGroupId => 
      this.unassign(tourId, ageGroupId).toPromise()
    );
    
    return new Observable(observer => {
      Promise.all(unassignPromises)
        .then(results => {
          observer.next(results.filter(result => result !== undefined) as boolean[]);
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Añade nuevos grupos de edad a un tour sin afectar los existentes.
   * @param tourId ID del tour.
   * @param newAgeGroupIds Array de IDs de grupos de edad a añadir.
   * @returns Lista actualizada de IDs de grupos de edad.
   */
  addAgeGroups(tourId: number, newAgeGroupIds: number[]): Observable<number[]> {
    return new Observable(observer => {
      this.getAll(tourId).subscribe({
        next: (currentAgeGroupIds) => {
          // Filtrar IDs que no estén ya asignados
          const ageGroupsToAdd = newAgeGroupIds.filter(id => !currentAgeGroupIds.includes(id));
          
          if (ageGroupsToAdd.length === 0) {
            observer.next(currentAgeGroupIds);
            observer.complete();
            return;
          }

          this.assignMultiple(tourId, ageGroupsToAdd).subscribe({
            next: () => {
              // Retornar la lista actualizada
              this.getAll(tourId).subscribe({
                next: (updatedAgeGroupIds) => {
                  observer.next(updatedAgeGroupIds);
                  observer.complete();
                },
                error: (error) => observer.error(error)
              });
            },
            error: (error) => observer.error(error)
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Elimina grupos de edad específicos de un tour.
   * @param tourId ID del tour.
   * @param ageGroupIdsToRemove Array de IDs de grupos de edad a eliminar.
   * @returns Lista actualizada de IDs de grupos de edad.
   */
  removeAgeGroups(tourId: number, ageGroupIdsToRemove: number[]): Observable<number[]> {
    return new Observable(observer => {
      this.getAll(tourId).subscribe({
        next: (currentAgeGroupIds) => {
          // Filtrar solo los IDs que están actualmente asignados
          const ageGroupsToRemove = ageGroupIdsToRemove.filter(id => currentAgeGroupIds.includes(id));
          
          if (ageGroupsToRemove.length === 0) {
            observer.next(currentAgeGroupIds);
            observer.complete();
            return;
          }

          this.unassignMultiple(tourId, ageGroupsToRemove).subscribe({
            next: () => {
              // Retornar la lista actualizada
              this.getAll(tourId).subscribe({
                next: (updatedAgeGroupIds) => {
                  observer.next(updatedAgeGroupIds);
                  observer.complete();
                },
                error: (error) => observer.error(error)
              });
            },
            error: (error) => observer.error(error)
          });
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Verifica si un tour tiene grupos de edad asignados.
   * @param tourId ID del tour.
   * @returns True si tiene grupos de edad asignados, false si no.
   */
  hasAgeGroups(tourId: number): Observable<boolean> {
    return new Observable(observer => {
      this.getCount(tourId).subscribe({
        next: (count) => {
          observer.next(count > 0);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }
}