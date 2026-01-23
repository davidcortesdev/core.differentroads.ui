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

  // Lista de dominios excluidos del manejo de tokens
  private readonly excludedDomains: string[] = [
    'api.cloudinary.com',
    // Agregar más dominios aquí según sea necesario
  ];

  constructor(
    private tokenManagerService: TokenManagerService,
    private authService: AuthenticateService,
    private router: Router
  ) {}

  /**
   * Verifica si una petición debe ser excluida del manejo de tokens
   * @param request La petición HTTP a verificar
   * @returns true si la petición debe ser excluida, false en caso contrario
   */
  private shouldExcludeRequest(request: HttpRequest<unknown>): boolean {
    return this.excludedDomains.some((domain) => request.url.includes(domain));
  }

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Excluir peticiones a Cloudinary y generación de token para evitar bucles infinitos
    if (request.url.includes('/generate-token') || request.url.includes('api.cloudinary.com')) {
      return next.handle(request);
    }

    // Verificar si la petición debe ser excluida del manejo de tokens
    if (this.shouldExcludeRequest(request)) {
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
            // Solo añadir token si la petición no está excluida
            if (!this.shouldExcludeRequest(request)) {
              request = this.addTokenHeader(request, newToken as string);
            }
            return next.handle(request).pipe(
              catchError((error: HttpErrorResponse) => {
                // Solo manejar 401 si hay token y la petición no está excluida
                if (
                  error.status === 401 &&
                  newToken &&
                  !this.shouldExcludeRequest(request)
                ) {
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
          // Solo añadir token si la petición no está excluida
          if (!this.shouldExcludeRequest(request)) {
            request = this.addTokenHeader(request, token);
          }
          return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
              // Solo manejar 401 si hay token y la petición no está excluida
              if (
                error.status === 401 &&
                token &&
                !this.shouldExcludeRequest(request)
              ) {
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
              // Solo manejar 401 si la petición no está excluida
              if (
                httpError.status === 401 &&
                !this.shouldExcludeRequest(request)
              ) {
                return this.handle401Error(request, next);
              }
              return throwError(() => httpError);
            })
          );
        })
      );
    }

    // Añadir token a todas las peticiones si existe y no está excluida
    if (token && !this.shouldExcludeRequest(request)) {
      request = this.addTokenHeader(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Solo manejar 401 si hay token y la petición no está excluida
        if (
          error.status === 401 &&
          token &&
          !this.shouldExcludeRequest(request)
        ) {
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
    // Si la petición debe ser excluida, no intentar refrescar el token
    if (this.shouldExcludeRequest(request)) {
      return throwError(() => new Error('Request to excluded domain failed'));
    }

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
