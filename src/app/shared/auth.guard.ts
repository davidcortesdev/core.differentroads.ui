import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { Observable, of, from } from 'rxjs';
import { map, catchError, switchMap, take } from 'rxjs/operators';
import { AuthenticateService } from '../core/services/auth/auth-service.service';
import { TokenManagerService } from '../core/services/auth/token-manager.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthenticateService,
    private tokenManagerService: TokenManagerService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    // 1. Verificar si hay token interno almacenado
    if (this.tokenManagerService.hasInternalToken()) {
      // 2. Verificar expiración local del token
      if (this.tokenManagerService.isTokenExpired()) {
        // Token expirado, intentar renovar
        return this.handleTokenRefresh(state.url);
      } else {
        // Token válido localmente, permitir acceso
        return true;
      }
    }

    // 3. No hay token interno, verificar autenticación con Cognito (fallback)
    if (!this.authService.isUserLoggedIn()) {
      // Guardar URL de destino para redirigir después del login
      sessionStorage.setItem('redirectUrl', state.url);
      this.router.navigate(['/login']);
      return false;
    }

    // Usuario autenticado con Cognito pero sin token interno
    // Intentar generar token interno si hay sesión de Cognito
    return this.generateTokenIfCognitoAuthenticated(state.url);
  }

  /**
   * Maneja la renovación del token cuando está expirado
   */
  private handleTokenRefresh(returnUrl: string): Observable<boolean> {
    return from(this.authService.refreshInternalToken()).pipe(
      switchMap(() => {
        // Token renovado exitosamente, permitir acceso
        return of(true);
      }),
      catchError((error) => {
        console.warn('Error al renovar token interno:', error);
        // Si falla la renovación, verificar si hay sesión de Cognito
        if (this.authService.isUserLoggedIn()) {
          // Hay sesión de Cognito, permitir acceso (fallback)
          return of(true);
        }
        // No hay sesión válida, redirigir a login
        sessionStorage.setItem('redirectUrl', returnUrl);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }

  /**
   * Genera token interno si el usuario está autenticado con Cognito
   */
  private generateTokenIfCognitoAuthenticated(returnUrl: string): Observable<boolean> {
    // Si hay sesión de Cognito pero no token interno, intentar generarlo
    // Esto puede pasar si el usuario se autenticó antes de implementar el sistema de tokens
    return from(this.authService.refreshInternalToken()).pipe(
      map(() => {
        // Token generado exitosamente, permitir acceso
        return true;
      }),
      catchError((error) => {
        console.warn('Error al generar token interno desde Cognito:', error);
        // Aunque falle la generación del token, si hay sesión de Cognito, permitir acceso
        // El interceptor manejará las peticiones HTTP sin token
        return of(true);
      })
    );
  }
}
