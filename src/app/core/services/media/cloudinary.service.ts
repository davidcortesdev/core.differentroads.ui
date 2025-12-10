import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { CldImage } from '../../models/commons/cld-image.model';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private readonly CLOUD_NAME = 'dxp2hxees';
  private readonly UPLOAD_PRESET = 'dr_uploads'; //si ponemos reviews, van a la carpeta reviews. Si es dr_uploads, van a la carpeta dev.
  private readonly UPLOAD_URL = `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`;

  constructor(private http: HttpClient) { }

  /**
   * Uploads an image to Cloudinary
   * @param file The file to upload (can be a File object or base64 string)
   * @returns Observable with the Cloudinary image data
   */
  uploadImage(file: File | string | CldImage): Observable<CldImage> {
    const formData = new FormData();
    let base64String: string | null = null;

    // Verifica si es un objeto con propiedad 'url' que parece base64
    if (typeof file === 'object' && 'url' in file && typeof file.url === 'string') {
      base64String = file.url;
    } else if (typeof file === 'string') {
      base64String = file;
    }

    if (base64String && this.isValidBase64Image(base64String)) {
      const blob = this.dataURLtoBlob(base64String);
      formData.append('file', blob, 'image.png');
    } else if (file instanceof File) {
      formData.append('file', file);
    } else {
      return throwError(() => new Error('Formato de imagen no válido.'));
    }

    formData.append('upload_preset', this.UPLOAD_PRESET);

    return this.http.post<any>(this.UPLOAD_URL, formData).pipe(
      map(response => ({
        origin: 'cloudinary',
        url: response.secure_url || response.url,
        publicID: response.public_id,
        format: response.format,
        type: response.resource_type,
        alt: ''
      } as CldImage)),
      catchError(error => {
        console.error('Error uploading to Cloudinary:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Valida si una cadena es una imagen base64 válida
   * @param str Cadena base64
   * @returns true si es válida, false si no
   */
  private isValidBase64Image(str: string): boolean {
    const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/;
    return base64Regex.test(str);
  }

  /**
   * Converts a data URL to a Blob object
   * @param dataURL The data URL string
   * @returns A Blob object
   */
  private dataURLtoBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  }
}