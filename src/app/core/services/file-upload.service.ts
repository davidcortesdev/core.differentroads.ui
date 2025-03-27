import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  asset_id: string;
  url: string;
  format: string;
  resource_type: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private cloudinaryUrl = 'https://api.cloudinary.com/v1_1/';

  constructor(private http: HttpClient) {
    // Check if Cloudinary settings are available
    try {
      if (!environment.cloudinary) {
        console.error(
          'FileUploadService: Missing Cloudinary configuration in environment'
        );
      } else {
        console.log('FileUploadService: Cloudinary configuration found:', {
          cloudName: environment.cloudinary.cloudName || 'MISSING',
          uploadPreset: environment.cloudinary.uploadPreset || 'MISSING',
          hasApiKey: !!environment.cloudinary.apiKey,
          hasApiSecret: !!environment.cloudinary.apiSecret,
        });
      }
    } catch (err) {
      console.error(
        'FileUploadService: Error checking Cloudinary configuration:',
        err
      );
    }
  }

  uploadFile(
    file: File,
    folder: string = 'uploads'
  ): Observable<CloudinaryResponse> {
    try {
      if (
        !environment.cloudinary?.cloudName ||
        !environment.cloudinary?.uploadPreset
      ) {
        return throwError(() => new Error('Missing Cloudinary configuration'));
      }
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', environment.cloudinary.uploadPreset);
      formData.append('folder', folder);
      const uploadUrl = `${this.cloudinaryUrl}${environment.cloudinary.cloudName}/upload`;

      return this.http.post<CloudinaryResponse>(uploadUrl, formData).pipe(
        tap(() => {}),
        catchError((error: HttpErrorResponse) => throwError(() => error))
      );
    } catch (err) {
      return throwError(() => new Error('Upload setup failed'));
    }
  }

  deleteFile(publicId: string): Observable<any> {
    const headers = new HttpHeaders().set(
      'Authorization',
      `Basic ${btoa(
        `${environment.cloudinary.apiKey}:${environment.cloudinary.apiSecret}`
      )}`
    );

    return this.http
      .post(
        `${this.cloudinaryUrl}${environment.cloudinary.cloudName}/resources/image/upload`,
        { public_ids: [publicId] },
        { headers }
      )
      .pipe(tap(() => {}));
  }
}
