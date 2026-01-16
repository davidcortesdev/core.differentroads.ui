import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

interface GenerateTokenRequest {
  cognitoToken: string;
}

interface GenerateTokenResponse {
  token: string;
}

interface ValidateTokenResponse {
  isValid: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly API_URL = `${environment.usersApiUrl}/Auth`;

  constructor(private http: HttpClient) {}

  /**
   * Genera un token JWT interno a partir del token de Cognito
   * @param cognitoToken El ID token de Cognito
   * @returns Observable con el token JWT interno
   */
  generateInternalToken(cognitoToken: string): Observable<string> {
    const requestBody: GenerateTokenRequest = {
      cognitoToken: cognitoToken,
    };

    return this.http
      .post<GenerateTokenResponse | string>(
        `${this.API_URL}/generate-token`,
        requestBody,
        {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
          }),
        }
      )
      .pipe(
        map((response) => {
          if (typeof response === 'string') {
            return response;
          }
          return response.token || '';
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Error generating internal token:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Valida un token JWT interno
   * @param token El token JWT interno a validar
   * @returns Observable con el estado de validación
   */
  validateInternalToken(token: string): Observable<boolean> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http
      .get<ValidateTokenResponse | boolean>(`${this.API_URL}/validate-token`, {
        headers,
      })
      .pipe(
        map((response) => {
          if (typeof response === 'boolean') {
            return response;
          }
          return response.isValid || false;
        }),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            return throwError(() => new Error('Token inválido o expirado'));
          }
          console.error('Error validating internal token:', error);
          return throwError(() => error);
        })
      );
  }
}
