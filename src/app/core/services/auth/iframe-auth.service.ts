import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { TokenManagerService } from './token-manager.service';

interface IframeAuthMessage {
  type: string;
  token?: string;
  timestamp?: number;
}

@Injectable({ providedIn: 'root' })
export class IframeAuthService implements OnDestroy {
  private token: string | null = null;
  private tokenReceived$ = new BehaviorSubject<boolean>(false);
  private isInIframeMode = false;
  private tokenValidated = false;

  private messageListener = (event: MessageEvent) => {
    this.handleParentMessage(event);
  };

  constructor(
    private authApiService: AuthApiService,
    private tokenManagerService: TokenManagerService
  ) {
    this.isInIframeMode = this.detectIframe();
    if (this.isInIframeMode) {
      this.initializeListener();
      this.notifyParentReady();
    }
  }

  /**
   * Detecta si la aplicacion esta corriendo dentro de un iframe
   */
  private detectIframe(): boolean {
    try {
      return window.parent !== window;
    } catch {
      // Si hay error de cross-origin, estamos en un iframe
      return true;
    }
  }

  /**
   * Inicializa el listener para mensajes del padre
   */
  private initializeListener(): void {
    window.addEventListener('message', this.messageListener);
  }

  /**
   * Notifica al padre que el iframe esta listo para recibir el token
   */
  private notifyParentReady(): void {
    if (this.isInIframeMode) {
      window.parent.postMessage(
        {
          type: 'iframe_ready',
          timestamp: Date.now(),
        },
        '*'
      );
    }
  }

  /**
   * Maneja los mensajes recibidos del padre
   */
  private handleParentMessage(event: MessageEvent): void {
    const data = event.data as IframeAuthMessage;

    if (data?.type === 'auth_token' && data?.token) {
      // Validar que el token sea un JWT valido (formato basico)
      if (!this.isValidJwt(data.token)) {
        console.warn('[IframeAuthService] Token recibido no es un JWT valido');
        window.parent.postMessage(
          {
            type: 'auth_received',
            success: false,
            error: 'Invalid JWT token',
            timestamp: Date.now(),
          },
          event.origin
        );
        return;
      }

      // Validar el token contra la API de auth
      this.validateTokenWithApi(data.token, event.origin);
    }
  }

  /**
   * Valida el token contra la API de auth
   */
  private async validateTokenWithApi(token: string, origin: string): Promise<void> {
    try {
      const isValid = await firstValueFrom(
        this.authApiService.validateInternalToken(token)
      );

      if (isValid) {
        this.token = token;
        this.tokenValidated = true;
        
        // Guardar como internal token para que AuthTokenInterceptor lo use
        this.tokenManagerService.setInternalToken(token);
        
        this.tokenReceived$.next(true);

        // Confirmar recepcion al padre
        window.parent.postMessage(
          {
            type: 'auth_received',
            success: true,
            timestamp: Date.now(),
          },
          origin
        );
      } else {
        console.warn('[IframeAuthService] Token no es valido segun la API');
        window.parent.postMessage(
          {
            type: 'auth_received',
            success: false,
            error: 'Token validation failed',
            timestamp: Date.now(),
          },
          origin
        );
      }
    } catch (error) {
      console.error('[IframeAuthService] Error validando token con API:', error);
      window.parent.postMessage(
        {
          type: 'auth_received',
          success: false,
          error: 'Token validation error',
          timestamp: Date.now(),
        },
        origin
      );
    }
  }

  /**
   * Valida que el token tenga formato JWT valido (3 partes separadas por punto)
   */
  private isValidJwt(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Intentar decodificar el payload para verificar que es JSON valido
    try {
      const payload = this.decodeToken(token);
      return payload !== null;
    } catch {
      return false;
    }
  }

  /**
   * Decodifica el payload de un token JWT (usado para validar formato)
   */
  private decodeToken(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      // Reemplazar caracteres de Base64URL a Base64 estandar
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      // Agregar padding si es necesario
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      // Decodificar
      const decoded = atob(padded);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene el token recibido via postMessage
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Verifica si hay un token disponible y validado por la API
   */
  hasToken(): boolean {
    return this.token !== null && this.tokenValidated;
  }

  /**
   * Verifica si la aplicacion esta en modo iframe
   */
  isInIframe(): boolean {
    return this.isInIframeMode;
  }

  /**
   * Observable que indica si se ha recibido el token
   */
  isTokenReceived$(): Observable<boolean> {
    return this.tokenReceived$.asObservable();
  }

  /**
   * Limpia el token (por ejemplo, al cerrar sesion)
   */
  clearToken(): void {
    this.token = null;
    this.tokenValidated = false;
    this.tokenReceived$.next(false);
    // Tambien limpiar el internal token
    this.tokenManagerService.clearInternalToken();
  }

  /**
   * Verifica si el token ha sido validado contra la API
   */
  isTokenValidated(): boolean {
    return this.tokenValidated;
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.messageListener);
  }
}
