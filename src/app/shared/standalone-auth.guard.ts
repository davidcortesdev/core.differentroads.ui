import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { Observable, of, from } from 'rxjs';
import { map, catchError, switchMap, take, filter, timeout } from 'rxjs/operators';
import { AuthenticateService } from '../core/services/auth/auth-service.service';
import { TokenManagerService } from '../core/services/auth/token-manager.service';
import { IframeAuthService } from '../core/services/auth/iframe-auth.service';

@Injectable({
  providedIn: 'root',
})
export class StandaloneAuthGuard implements CanActivate {
  constructor(
    private authService: AuthenticateService,
    private tokenManagerService: TokenManagerService,
    private iframeAuthService: IframeAuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    // Si estamos en un iframe, esperar token via postMessage
    if (this.iframeAuthService.isInIframe()) {
      return this.handleIframeAuth();
    }

    // Si no estamos en iframe, usar logica normal de autenticacion
    return this.handleNormalAuth(state.url);
  }

  /**
   * Maneja la autenticacion cuando estamos en un iframe
   * Espera el token via postMessage con timeout de 5 segundos
   */
  private handleIframeAuth(): Observable<boolean> {
    // Si ya tenemos el token, permitir acceso inmediatamente
    if (this.iframeAuthService.hasToken()) {
      return of(true);
    }

    // Esperar a que llegue el token via postMessage
    return this.iframeAuthService.isTokenReceived$().pipe(
      filter((received) => received === true),
      take(1),
      map(() => true),
      timeout(5000), // Timeout de 5 segundos
      catchError((error) => {
        console.warn('Timeout esperando token via postMessage:', error);
        // Si hay timeout, denegar acceso
        return of(false);
      })
    );
  }

  /**
   * Maneja la autenticacion normal (acceso directo, no iframe)
   * Replica la logica del AuthGuard original
   */
  private handleNormalAuth(returnUrl: string): Observable<boolean> | boolean {
    // 1. Verificar si hay token interno almacenado
    if (this.tokenManagerService.hasInternalToken()) {
      // 2. Verificar expiracion local del token
      if (this.tokenManagerService.isTokenExpired()) {
        // Token expirado, intentar renovar
        return this.handleTokenRefresh(returnUrl);
      } else {
        // Token valido localmente, permitir acceso
        return true;
      }
    }

    // 3. No hay token interno, verificar autenticacion con Cognito (fallback)
    if (!this.authService.isUserLoggedIn()) {
      // Guardar URL de destino para redirigir despues del login
      sessionStorage.setItem('redirectUrl', returnUrl);
      this.router.navigate(['/login']);
      return false;
    }

    // Usuario autenticado con Cognito pero sin token interno
    // Intentar generar token interno si hay sesion de Cognito
    return this.generateTokenIfCognitoAuthenticated(returnUrl);
  }

  /**
   * Maneja la renovacion del token cuando esta expirado
   */
  private handleTokenRefresh(returnUrl: string): Observable<boolean> {
    return from(this.authService.refreshInternalToken()).pipe(
      switchMap(() => {
        // Token renovado exitosamente, permitir acceso
        return of(true);
      }),
      catchError((error) => {
        console.warn('Error al renovar token interno:', error);
        // Si falla la renovacion, verificar si hay sesion de Cognito
        if (this.authService.isUserLoggedIn()) {
          // Hay sesion de Cognito, permitir acceso (fallback)
          return of(true);
        }
        // No hay sesion valida, redirigir a login
        sessionStorage.setItem('redirectUrl', returnUrl);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }

  /**
   * Genera token interno si el usuario esta autenticado con Cognito
   */
  private generateTokenIfCognitoAuthenticated(
    returnUrl: string
  ): Observable<boolean> {
    // Si hay sesion de Cognito pero no token interno, intentar generarlo
    return from(this.authService.refreshInternalToken()).pipe(
      map(() => {
        // Token generado exitosamente, permitir acceso
        return true;
      }),
      catchError((error) => {
        console.warn('Error al generar token interno desde Cognito:', error);
        // Aunque falle la generacion del token, si hay sesion de Cognito, permitir acceso
        return of(true);
      })
    );
  }
}
