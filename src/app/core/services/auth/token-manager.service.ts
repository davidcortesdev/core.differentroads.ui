import { Injectable } from '@angular/core';

const TOKEN_STORAGE_KEY = 'internalAuthToken';

interface JwtPayload {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class TokenManagerService {
  /**
   * Obtiene el token interno almacenado
   * @returns El token o null si no existe
   */
  getInternalToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Error reading token from localStorage:', error);
      return null;
    }
  }

  /**
   * Guarda el token interno en localStorage
   * @param token El token JWT a guardar
   */
  setInternalToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (error) {
      console.error('Error saving token to localStorage:', error);
    }
  }

  /**
   * Elimina el token interno de localStorage
   */
  clearInternalToken(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Error removing token from localStorage:', error);
    }
  }

  /**
   * Verifica si existe un token interno almacenado
   * @returns true si existe un token
   */
  hasInternalToken(): boolean {
    const token = this.getInternalToken();
    return token !== null && token !== '';
  }

  /**
   * Verifica si el token está expirado
   * @returns true si el token está expirado o no existe
   */
  isTokenExpired(): boolean {
    const token = this.getInternalToken();
    if (!token) {
      return true;
    }

    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) {
        return true;
      }

      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      return currentTime >= expirationTime;
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  }

  /**
   * Verifica si el token está próximo a expirar
   * @param minutesBeforeExpiration Minutos antes de la expiración (default: 5)
   * @returns true si el token expira pronto o ya expiró
   */
  isTokenExpiringSoon(minutesBeforeExpiration: number = 5): boolean {
    const token = this.getInternalToken();
    if (!token) {
      return true;
    }

    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) {
        return true;
      }

      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const millisecondsBeforeExpiration = minutesBeforeExpiration * 60 * 1000;

      return currentTime >= expirationTime - millisecondsBeforeExpiration;
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  }

  /**
   * Decodifica el payload de un token JWT
   * @param token El token JWT
   * @returns El payload decodificado o null si hay error
   */
  private decodeToken(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = parts[1];
      // Reemplazar caracteres de Base64URL a Base64 estándar
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      // Agregar padding si es necesario
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      // Decodificar
      const decoded = atob(padded);
      return JSON.parse(decoded) as JwtPayload;
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }
}
