import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TagCreate {
  code: string;
  name: string;
  description?: string;
  tkId?: string;
  tagCategoryId?: number | null;
  languageId?: number | null;
  isActive?: boolean;
}

export interface TagUpdate {
  code: string;
  name: string;
  description?: string;
  tkId?: string;
  tagCategoryId?: number | null;
  languageId?: number | null;
  isActive?: boolean;
}

export interface ITagResponse {
  code: string;
  name: string;
  description: string;
  id: number;
  tkId: string;
  tagCategoryId: number | null;
  languageId: number | null;
  isActive: boolean;
}

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface TagFilters {
  code?: string;
  name?: string;
  description?: string;
  id?: number;
  tkId?: string;
  tagCategoryId?: number;
  languageId?: number;
  isActive?: boolean;
  useExactMatchForStrings?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TagService {
  private readonly API_URL = `${environment.masterdataApiUrl}/Tag`;
  
  // Cache para etiquetas individuales
  private tagCache = new Map<number, ITagResponse>();
  // Cache para observables en curso para evitar múltiples llamadas simultáneas
  private tagObservableCache = new Map<number, Observable<ITagResponse>>();

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las etiquetas según los criterios de filtrado.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de etiquetas.
   */
  getAll(filters?: TagFilters): Observable<ITagResponse[]> {
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

    return this.http.get<ITagResponse[]>(this.API_URL, { params });
  }

  /**
   * Crea una nueva etiqueta.
   * @param data Datos para crear la etiqueta.
   * @returns La etiqueta creada.
   */
  create(data: TagCreate): Observable<ITagResponse> {
    return this.http.post<ITagResponse>(`${this.API_URL}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    }).pipe(
      tap(createdTag => {
        // Agregar la nueva etiqueta al cache
        if (createdTag && createdTag.id) {
          this.tagCache.set(createdTag.id, createdTag);
        }
      }),
      catchError(error => {
        throw error;
      })
    );
  }

  /**
   * Obtiene una etiqueta específica por su ID.
   * @param id ID de la etiqueta.
   * @returns La etiqueta encontrada.
   */
  getById(id: number): Observable<ITagResponse> {
    // Verificar si la etiqueta ya está en cache
    if (this.tagCache.has(id)) {
      return of(this.tagCache.get(id)!);
    }

    // Verificar si ya hay una llamada en curso para este ID
    if (this.tagObservableCache.has(id)) {
      return this.tagObservableCache.get(id)!;
    }

    // Crear nueva llamada HTTP y configurar cache
    const tagObservable = this.http.get<ITagResponse>(`${this.API_URL}/${id}`)
      .pipe(
        tap(tag => {
          // Guardar en cache solo si la respuesta es válida
          if (tag && tag.id) {
            this.tagCache.set(id, tag);
          }
          // Limpiar el observable cache una vez completado
          this.tagObservableCache.delete(id);
        }),
        catchError(error => {
          // Limpiar el observable cache en caso de error
          this.tagObservableCache.delete(id);
          throw error;
        }),
        shareReplay(1)
      );

    // Guardar el observable en cache para evitar múltiples llamadas simultáneas
    this.tagObservableCache.set(id, tagObservable);
    
    return tagObservable;
  }

  /**
   * Actualiza una etiqueta existente.
   * @param id ID de la etiqueta a actualizar.
   * @param data Datos actualizados.
   * @returns Resultado de la operación.
   */
  update(id: number, data: TagUpdate): Observable<boolean> {
    return this.http.put<boolean>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    }).pipe(
      tap(success => {
        // Invalidar cache cuando se actualiza exitosamente
        if (success) {
          this.invalidateTagCache(id);
        }
      }),
      catchError(error => {
        throw error;
      })
    );
  }

  /**
   * Elimina una etiqueta existente.
   * @param id ID de la etiqueta a eliminar.
   * @returns Resultado de la operación.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`).pipe(
      tap(success => {
        // Invalidar cache cuando se elimina exitosamente
        if (success) {
          this.invalidateTagCache(id);
        }
      }),
      catchError(error => {
        throw error;
      })
    );
  }

  // Métodos de gestión de cache para etiquetas
  
  /**
   * Limpia completamente el cache de etiquetas
   */
  clearTagCache(): void {
    this.tagCache.clear();
    this.tagObservableCache.clear();
  }

  /**
   * Invalida una etiqueta específica del cache
   * Útil cuando se actualiza o elimina una etiqueta
   */
  invalidateTagCache(id: number): void {
    this.tagCache.delete(id);
    this.tagObservableCache.delete(id);
  }

  /**
   * Obtiene información del estado actual del cache
   * Útil para debugging o monitoreo
   */
  getTagCacheInfo(): { cachedTags: number, pendingRequests: number } {
    return {
      cachedTags: this.tagCache.size,
      pendingRequests: this.tagObservableCache.size
    };
  }
}