import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, BehaviorSubject, from } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TokenManagerService } from '../services/auth/token-manager.service';
import { AuthenticateService } from '../services/auth/auth-service.service';

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private isGeneratingToken = false;
  private refreshTokenSubject: BehaviorSubject<string | null> =
    new BehaviorSubject<string | null>(null);
  private generateTokenSubject: BehaviorSubject<string | null> =
    new BehaviorSubject<string | null>(null);

  constructor(
    private tokenManagerService: TokenManagerService,
    private authService: AuthenticateService,
    private router: Router
  ) {}

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Excluir la petición de generación de token para evitar bucles infinitos
    if (request.url.includes('/generate-token')) {
      return next.handle(request);
    }

    let token = this.tokenManagerService.getInternalToken();

    // Si no hay token pero el usuario está autenticado con Cognito, generar uno
    if (!token && this.authService.isUserLoggedIn()) {
      // Si ya se está generando un token, esperar a que termine
      if (this.isGeneratingToken) {
        return this.generateTokenSubject.pipe(
          filter((newToken) => newToken !== null),
          take(1),
          switchMap((newToken) => {
            request = this.addTokenHeader(request, newToken as string);
            return next.handle(request).pipe(
              catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                  return this.handle401Error(request, next);
                }
                return throwError(() => error);
              })
            );
          })
        );
      }

      // Generar token antes de continuar con la petición
      this.isGeneratingToken = true;
      this.generateTokenSubject.next(null);

      return from(this.authService.refreshInternalToken()).pipe(
        switchMap((newToken: string) => {
          this.isGeneratingToken = false;
          this.generateTokenSubject.next(newToken);
          token = newToken;
          request = this.addTokenHeader(request, token);
          return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
              if (error.status === 401 && token) {
                return this.handle401Error(request, next);
              }
              return throwError(() => error);
            })
          );
        }),
        catchError((error: unknown) => {
          this.isGeneratingToken = false;
          this.generateTokenSubject.next(null);
          // Si falla la generación del token, continuar sin token
          // (puede ser una ruta pública o el backend manejará el error)
          console.warn('Error generating internal token in interceptor:', error);
          return next.handle(request).pipe(
            catchError((httpError: HttpErrorResponse) => {
              if (httpError.status === 401) {
                return this.handle401Error(request, next);
              }
              return throwError(() => httpError);
            })
          );
        })
      );
    }

    // Añadir token a todas las peticiones si existe (incluso rutas públicas)
    if (token) {
      request = this.addTokenHeader(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && token) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addTokenHeader(
    request: HttpRequest<unknown>,
    token: string
  ): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return from(this.authService.refreshInternalToken()).pipe(
        switchMap((newToken: string) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(newToken);
          return next.handle(this.addTokenHeader(request, newToken));
        }),
        catchError((error: unknown) => {
          this.isRefreshing = false;
          this.tokenManagerService.clearInternalToken();
          // En UI, permitir acceso a rutas públicas si falla la renovación
          // Solo redirigir a login si estamos en una ruta protegida
          const currentUrl = this.router.url;
          const protectedRoutes = ['/profile', '/reservation', '/reservation-view', '/bookings'];
          const isProtectedRoute = protectedRoutes.some(route => currentUrl.startsWith(route));
          
          if (isProtectedRoute) {
            this.router.navigate(['/login'], { queryParams: { returnUrl: currentUrl } });
          }
          return throwError(() => error);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) =>
          next.handle(this.addTokenHeader(request, token as string))
        )
      );
    }
  }
}
