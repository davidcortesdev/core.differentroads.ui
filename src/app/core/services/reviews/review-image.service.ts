import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Interfaz para los filtros disponibles en el método getAll.
 */
export interface ReviewImageFilters {
  id?: number;
  imageUrl?: string;
  reviewId?: number;
}

/**
 * Modelo para crear una imagen de review.
 */
export interface ReviewImageCreate {
  imageUrl: string;
  reviewId: number;
}

/**
 * Modelo para actualizar una imagen de review existente.
 */
export interface ReviewImageUpdate {
  imageUrl?: string;
  reviewId?: number;
}

/**
 * Respuesta del backend para una imagen de review.
 */
export interface IReviewImageResponse {
  id: number;
  imageUrl: string;
  reviewId: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewImageService {
  private readonly API_URL = `${environment.reviewsApiUrl}/ReviewImage`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las imágenes de review disponibles.
   * @param filters Filtros para aplicar en la búsqueda.
   * @returns Lista de imágenes de review.
   */
  getAll(filter?: ReviewImageFilters): Observable<IReviewImageResponse[]> {
    let params = new HttpParams();

    // Add filter parameters if provided
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

    return this.http.get<IReviewImageResponse[]>(this.API_URL, { params });
  }

  /**
   * Obtiene una imagen de review específica por su ID.
   * @param id ID de la imagen de review.
   * @returns Imagen de review correspondiente.
   */
  getById(id: number): Observable<IReviewImageResponse> {
    return this.http.get<IReviewImageResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea una nueva imagen de review.
   * @param data Datos de la imagen de review a crear.
   * @returns Imagen de review creada.
   */
  create(data: ReviewImageCreate): Observable<IReviewImageResponse> {
    return this.http.post<IReviewImageResponse>(this.API_URL, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Actualiza una imagen de review existente.
   * @param id ID de la imagen de review a actualizar.
   * @param data Datos actualizados.
   * @returns Imagen de review actualizada.
   */
  update(id: number, data: ReviewImageUpdate): Observable<IReviewImageResponse> {
    return this.http.put<IReviewImageResponse>(`${this.API_URL}/${id}`, data, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
    });
  }

  /**
   * Elimina una imagen de review por su ID.
   * @param id ID de la imagen de review a eliminar.
   * @returns `true` si la eliminación fue exitosa.
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene todas las imágenes de una review específica.
   * @param reviewId ID de la review.
   * @returns Lista de imágenes de la review.
   */
  getByReviewId(reviewId: number): Observable<IReviewImageResponse[]> {
    return this.getAll({ reviewId });
  }

  /**
   * Crea múltiples imágenes para una review.
   * @param reviewId ID de la review.
   * @param imageUrls Array de URLs de imágenes.
   * @returns Array de imágenes creadas.
   */
  createMultiple(reviewId: number, imageUrls: string[]): Observable<IReviewImageResponse[]> {
    const requests = imageUrls.map(imageUrl => 
      this.create({ imageUrl, reviewId })
    );
    
    // Nota: Esta implementación crea las imágenes secuencialmente.
    // Si necesitas crearlas en paralelo, puedes usar forkJoin de RxJS:
    // return forkJoin(requests);
    return new Observable(observer => {
      const results: IReviewImageResponse[] = [];
      let completed = 0;
      
      if (requests.length === 0) {
        observer.next([]);
        observer.complete();
        return;
      }
      
      requests.forEach((request, index) => {
        request.subscribe({
          next: (result) => {
            results[index] = result;
            completed++;
            if (completed === requests.length) {
              observer.next(results);
              observer.complete();
            }
          },
          error: (error) => {
            observer.error(error);
          }
        });
      });
    });
  }

  /**
   * Elimina todas las imágenes de una review específica.
   * @param reviewId ID de la review.
   * @returns Observable que se completa cuando todas las imágenes son eliminadas.
   */
  deleteByReviewId(reviewId: number): Observable<boolean> {
    return new Observable(observer => {
      this.getByReviewId(reviewId).subscribe({
        next: (images) => {
          if (images.length === 0) {
            observer.next(true);
            observer.complete();
            return;
          }
          
          let deleted = 0;
          let hasError = false;
          
          images.forEach(image => {
            this.delete(image.id).subscribe({
              next: () => {
                deleted++;
                if (deleted === images.length && !hasError) {
                  observer.next(true);
                  observer.complete();
                }
              },
              error: (error) => {
                if (!hasError) {
                  hasError = true;
                  observer.error(error);
                }
              }
            });
          });
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Actualiza todas las imágenes de una review.
   * Elimina las existentes y crea las nuevas.
   * @param reviewId ID de la review.
   * @param newImageUrls Array de nuevas URLs de imágenes.
   * @returns Array de nuevas imágenes creadas.
   */
  updateReviewImages(reviewId: number, newImageUrls: string[]): Observable<IReviewImageResponse[]> {
    return new Observable(observer => {
      // Primero eliminar las imágenes existentes
      this.deleteByReviewId(reviewId).subscribe({
        next: () => {
          // Luego crear las nuevas imágenes
          if (newImageUrls.length === 0) {
            observer.next([]);
            observer.complete();
            return;
          }
          
          this.createMultiple(reviewId, newImageUrls).subscribe({
            next: (newImages) => {
              observer.next(newImages);
              observer.complete();
            },
            error: (error) => {
              observer.error(error);
            }
          });
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Verifica si una review tiene imágenes asociadas.
   * @param reviewId ID de la review.
   * @returns `true` si la review tiene imágenes.
   */
  hasImages(reviewId: number): Observable<boolean> {
    return new Observable(observer => {
      this.getByReviewId(reviewId).subscribe({
        next: (images) => {
          observer.next(images.length > 0);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }
}