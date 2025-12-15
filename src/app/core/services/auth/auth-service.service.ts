import { Injectable } from '@angular/core';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession,
  CognitoAccessToken,
  CognitoIdToken,
  CognitoRefreshToken,
} from 'amazon-cognito-identity-js';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { HubspotService } from '../integrations/hubspot.service';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import {
  signInWithRedirect,
  getCurrentUser,
  fetchUserAttributes,
} from 'aws-amplify/auth';
import { AnalyticsService } from '../analytics/analytics.service'; // new import
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

@Injectable({
  providedIn: 'root',
})
export class AuthenticateService {
  private userPool: CognitoUserPool;
  private cognitoUser!: CognitoUser;
  private cognitoClient: CognitoIdentityProviderClient;

  // Nuevo BehaviorSubject para mantener el estado actual de autenticación
  private isAuthenticated = new BehaviorSubject<boolean>(false);

  // Nuevo BehaviorSubject para mantener el email del usuario actual
  private currentUserEmail = new BehaviorSubject<string>('');

  // Nuevo BehaviorSubject para mantener el Cognito ID del usuario actual
  private currentUserCognitoId = new BehaviorSubject<string>('');

  // ✅ NUEVO: Promise que se resuelve cuando termina la verificación inicial de autenticación
  private authCheckPromise: Promise<void>;
  private authCheckResolve!: () => void;

  userAttributesChanged: Subject<void> = new Subject<void>();

  constructor(
    private router: Router,
    private hubspotService: HubspotService,
    private analyticsService: AnalyticsService // new injection
  ) {
    this.userPool = new CognitoUserPool({
      UserPoolId: environment.cognitoUserPoolId,
      ClientId: environment.cognitoAppClientId,
    });

    // Inicializar el cliente de Cognito para usar USER_PASSWORD_AUTH
    // Extraer la región del User Pool ID (formato: region_xxxxx)
    const region = environment.cognitoUserPoolId.split('_')[0];
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: region,
    });

    // ✅ NUEVO: Inicializar la Promise que se resolverá cuando termine checkAuthStatus
    this.authCheckPromise = new Promise((resolve) => {
      this.authCheckResolve = resolve;
    });

    // Comprobar el estado de autenticación al iniciar el servicio
    this.checkAuthStatus();
  }

  // Método para comprobar el estado de autenticación al iniciar
  private async checkAuthStatus(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (user) {
        this.isAuthenticated.next(true);
        try {
          const attributes = await fetchUserAttributes();
          if (attributes && attributes.email) {
            this.currentUserEmail.next(attributes.email);

            // ✅ CORREGIDO: Obtener el Cognito ID (sub) - priorizar sub de atributos, luego user.userId
            // El sub es el Cognito User ID real (UUID), mientras que user.userId puede ser el username
            const cognitoUserId = attributes.sub || user.userId;

            this.currentUserCognitoId.next(cognitoUserId);
          }
        } catch (error) {
          console.error('Error fetching user attributes:', error);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.isAuthenticated.next(false);
    } finally {
      // ✅ NUEVO: Resolver la Promise cuando termine la verificación (exitosa o fallida)
      this.authCheckResolve();
    }
  }

  // ✅ NUEVO: Método público para esperar a que termine la verificación inicial
  async waitForAuthCheck(): Promise<void> {
    return this.authCheckPromise;
  }

  /**
   * Extrae el Cognito User ID (sub) del ID token JWT
   * @param idToken El ID token JWT
   * @returns El Cognito User ID (sub) o null si no se puede extraer
   */
  private extractSubFromIdToken(idToken: string): string | null {
    try {
      // Decodificar el JWT (es Base64URL)
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        console.error('Token JWT inválido');
        return null;
      }

      // Decodificar el payload (segunda parte)
      const payload = parts[1];
      // Reemplazar caracteres de Base64URL a Base64 estándar
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      // Agregar padding si es necesario
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      // Decodificar
      const decoded = JSON.parse(atob(padded));

      return decoded.sub || null;
    } catch (error) {
      console.error('Error al extraer sub del ID token:', error);
      return null;
    }
  }

  // Obtener el estado de autenticación como Observable
  // ✅ MEJORADO: Ahora espera a que termine la verificación inicial
  isLoggedIn(): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      let subscription: any = null;

      // Esperar a que termine la verificación inicial
      this.authCheckPromise
        .then(() => {
          // Una vez completada, suscribirse al BehaviorSubject
          subscription = this.isAuthenticated.subscribe((value) => {
            observer.next(value);
          });
        })
        .catch((error) => {
          console.error('Error en verificación de autenticación:', error);
          observer.next(false);
          observer.complete();
        });

      // Devolver función de cleanup
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }
  async getCognitoSub(): Promise<string> {
    try {
      const attributes = await fetchUserAttributes();
      return attributes.sub || '';
    } catch (error) {
      console.error('Error obteniendo sub:', error);
      return '';
    }
  }
  // Obtener el email del usuario actual como Observable
  getUserEmail(): Observable<string> {
    return this.currentUserEmail.asObservable();
  }

  // Obtener el Cognito ID del usuario actual como Observable
  // ✅ MEJORADO: Ahora espera a que termine la verificación inicial
  getCognitoId(): Observable<string> {
    return new Observable<string>((observer) => {
      let subscription: any = null;

      // Esperar a que termine la verificación inicial
      this.authCheckPromise
        .then(() => {
          // Una vez completada, suscribirse al BehaviorSubject
          subscription = this.currentUserCognitoId.subscribe((value) => {
            observer.next(value);
          });
        })
        .catch((error) => {
          console.error('Error en verificación de autenticación:', error);
          observer.next('');
          observer.complete();
        });

      // Devolver función de cleanup
      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }

  // Obtener el valor actual del estado de autenticación
  isAuthenticatedValue(): boolean {
    return this.isAuthenticated.getValue();
  }

  // Obtener el valor actual del email del usuario
  getUserEmailValue(): string {
    return this.currentUserEmail.getValue();
  }

  // Obtener el valor actual del Cognito ID
  getCognitoIdValue(): string {
    return this.currentUserCognitoId.getValue();
  }

  private getUserData(username: string): CognitoUser {
    return new CognitoUser({ Username: username, Pool: this.userPool });
  }

  /**
   * Crea una CognitoUserSession a partir de los tokens de AWS SDK
   * Esto permite mantener compatibilidad con amazon-cognito-identity-js
   */
  private createCognitoSession(
    accessToken: string,
    idToken: string,
    refreshToken: string
  ): CognitoUserSession {
    const accessTokenObj = new CognitoAccessToken({
      AccessToken: accessToken,
    });
    const idTokenObj = new CognitoIdToken({ IdToken: idToken });
    const refreshTokenObj = new CognitoRefreshToken({
      RefreshToken: refreshToken,
    });

    return new CognitoUserSession({
      IdToken: idTokenObj,
      AccessToken: accessTokenObj,
      RefreshToken: refreshTokenObj,
    });
  }

  // Login usando USER_PASSWORD_AUTH para activar el lambda de migración
  login(emailaddress: string, password: string): Observable<any> {
    return new Observable((observer) => {
      // Usar AWS SDK con USER_PASSWORD_AUTH para activar el lambda de migración
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: environment.cognitoAppClientId,
        AuthParameters: {
          USERNAME: emailaddress,
          PASSWORD: password,
        },
      });

      this.cognitoClient
        .send(command)
        .then((response) => {
          if (
            response.AuthenticationResult &&
            response.AuthenticationResult.AccessToken &&
            response.AuthenticationResult.IdToken &&
            response.AuthenticationResult.RefreshToken
          ) {
            // Crear CognitoUser y establecer la sesión
            this.cognitoUser = this.getUserData(emailaddress);

            // Crear sesión de Cognito desde los tokens
            const session = this.createCognitoSession(
              response.AuthenticationResult.AccessToken,
              response.AuthenticationResult.IdToken,
              response.AuthenticationResult.RefreshToken
            );

            // Almacenar los tokens en localStorage para que CognitoUser pueda usarlos
            const keyPrefix = `CognitoIdentityServiceProvider.${environment.cognitoAppClientId}`;
            const usernameKey = `${keyPrefix}.LastAuthUser`;
            const accessTokenKey = `${keyPrefix}.${emailaddress}.accessToken`;
            const idTokenKey = `${keyPrefix}.${emailaddress}.idToken`;
            const refreshTokenKey = `${keyPrefix}.${emailaddress}.refreshToken`;

            localStorage.setItem(usernameKey, emailaddress);
            localStorage.setItem(
              accessTokenKey,
              session.getAccessToken().getJwtToken()
            );
            localStorage.setItem(
              idTokenKey,
              session.getIdToken().getJwtToken()
            );
            localStorage.setItem(
              refreshTokenKey,
              session.getRefreshToken().getToken()
            );

            // Establecer la sesión en el CognitoUser
            this.cognitoUser.setSignInUserSession(session);

            // ✅ CORREGIDO: Extraer el Cognito User ID (sub) del ID token en lugar del username
            const idTokenString = response.AuthenticationResult.IdToken;
            const cognitoUserId = this.extractSubFromIdToken(idTokenString) || this.cognitoUser.getUsername();

            this.isAuthenticated.next(true);
            this.currentUserEmail.next(emailaddress);
            this.currentUserCognitoId.next(cognitoUserId);
            this.userAttributesChanged.next();

            // Agregar la integración con Hubspot
            const contactData = {
              email: emailaddress,
            };

            this.hubspotService.createContact(contactData).subscribe({
              next: (hubspotResponse) => {

                // Retornar el usuario de Cognito para que el componente maneje la navegación
                observer.next(this.cognitoUser);
                observer.complete();
              },
              error: (hubspotError) => {
                console.error(
                  'Error al crear contacto en Hubspot:',
                  hubspotError
                );

                // Even if Hubspot fails, return the Cognito user for component to handle navigation
                observer.next(this.cognitoUser);
                observer.complete();
              },
            });
          } else if (response.ChallengeName) {
            // Manejar desafíos como NEW_PASSWORD_REQUIRED
            if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
              observer.error('Se requiere una nueva contraseña');
            } else {
              observer.error({
                message: `Desafío requerido: ${response.ChallengeName}`,
              });
            }
          } else {
            observer.error({ message: 'Respuesta de autenticación inválida' });
          }
        })
        .catch((error: any) => {
          let errorMessage = 'Error al iniciar sesión';
          if (error.name === 'UserNotFoundException') {
            errorMessage = 'Email o contraseña incorrectos'; //'El usuario no existe';
          } else if (error.name === 'NotAuthorizedException') {
            errorMessage = 'La contraseña es incorrecta';
          } else if (error.name === 'UserNotConfirmedException') {
            errorMessage =
              'El usuario no ha sido confirmado. Por favor, verifica tu correo electrónico';
            this.resendConfirmationCode(emailaddress);
          } else if (error.name === 'TooManyFailedAttemptsException') {
            errorMessage =
              'Demasiados intentos fallidos. Intenta de nuevo más tarde';
          } else if (error.name === 'InvalidParameterException') {
            errorMessage =
              'El flujo USER_PASSWORD_AUTH no está habilitado para este cliente';
            console.error(
              'Error: USER_PASSWORD_AUTH no está habilitado. Verifica la configuración del User Pool Client.'
            );
          }
          observer.error({ message: errorMessage, error });
        });
    });
  }

  // Logout
  logOut() {
    const currentUser = this.userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
      this.isAuthenticated.next(false);
      this.currentUserEmail.next('');
      this.currentUserCognitoId.next('');
      window.location.href = '/';
    }
  }

  // Signup
  signUp(email: string, password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let attributeList = [];

      attributeList.push({
        Name: 'email',
        Value: email,
      });

      this.userPool.signUp(
        email,
        password,
        attributeList as any,
        [],
        (err, result: any) => {
          if (err) {

            reject(err);
            return;
          }
          this.cognitoUser = result.user;
          const cognitoUserId = result.userSub; // ID único de Cognito

          resolve(cognitoUserId);
        }
      );
    });
  }

  resendConfirmationCode(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cognitoUser = this.getUserData(username);
      this.cognitoUser.resendConfirmationCode((err, result) => {
        if (err) {
          console.error('Error al reenviar código de confirmación:', err);
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  // Confirm Signup
  confirmSignUp(username: string, code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cognitoUser = this.getUserData(username);
      this.cognitoUser.confirmRegistration(
        code,
        true,
        (err: any, result: string) => {
          if (err) {

            reject(err);
            return;
          }

          resolve();
        }
      );
    });
  }

  // Forgot Password
  forgotPassword(username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cognitoUser = this.getUserData(username);
      this.cognitoUser.forgotPassword({
        onSuccess: (result: any) => {

          resolve(result);
        },
        onFailure: (err: any) => {

          reject(err);
        },
      });
    });
  }

  // Confirm Forgot Password
  confirmForgotPassword(
    username: string,
    code: string,
    newPassword: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.cognitoUser = this.getUserData(username);
      this.cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {

          resolve(true);
        },
        onFailure: (err: any) => {

          reject(err);
        },
      });
    });
  }

  // Get Current User
  getCurrentUser(): boolean {
    const currentUser = this.userPool.getCurrentUser();
    if (currentUser != null) {
      this.cognitoUser = currentUser;
      this.cognitoUser.getSession((err: any, session: any) => {
        if (err) {

          return false;
        }
        return true;
      });
      return true;
    }
    return false;
  }

  // Get Current User Attributes
  getUserAttributes(): Observable<any> {
    return new Observable((observer) => {
      const currentUser = this.userPool.getCurrentUser();
      if (!currentUser) {
        observer.error('No user is logged in');
        return;
      }

      currentUser.getSession((err: any, session: any) => {
        if (err) {

          observer.error(err);
          return;
        }

        currentUser.getUserAttributes((err: any, result: any) => {
          if (err) {

            observer.error(err);
            return;
          }
          let formattedResult = result.map((item: any) => ({
            [item.Name]: item.Value,
          }));
          formattedResult = Object.assign({}, ...formattedResult);

          if (formattedResult.email) {
            this.currentUserEmail.next(formattedResult.email);
          }

          // ✅ CORREGIDO: Obtener el Cognito ID (sub) desde los atributos del usuario o del token
          const cognitoUserId = formattedResult.sub || null;
          let finalCognitoUserId = cognitoUserId;
          
          if (cognitoUserId) {
            // Si tenemos el sub en los atributos, usarlo directamente
            this.currentUserCognitoId.next(cognitoUserId);
          } else {
            // Si no está en atributos, intentar extraerlo del ID token
            try {
              const idToken = session.getIdToken().getJwtToken();
              const subFromToken = this.extractSubFromIdToken(idToken);
              if (subFromToken) {
                finalCognitoUserId = subFromToken;
                this.currentUserCognitoId.next(subFromToken);
              } else {
                // Fallback: usar username (aunque sea el email)
                const currentUser = this.userPool.getCurrentUser();
                if (currentUser) {
                  finalCognitoUserId = currentUser.getUsername();
                  this.currentUserCognitoId.next(currentUser.getUsername());
                }
              }
            } catch (error) {
              console.error('Error al extraer Cognito ID del token:', error);
              // Fallback: usar username
              const currentUser = this.userPool.getCurrentUser();
              if (currentUser) {
                finalCognitoUserId = currentUser.getUsername();
                this.currentUserCognitoId.next(currentUser.getUsername());
              }
            }
          }

          this.userAttributesChanged.next();
          observer.next(formattedResult);
          observer.complete();
        });
      });
    });
  }

  getCurrentUsername(): string {
    const currentUser = this.userPool.getCurrentUser();

    return currentUser ? currentUser.getUsername() : '';
  }

  // Navegar al perfil del usuario
  navigateToProfile() {
    this.router
      .navigate(['/profile'])
      .then((success) => {
        if (!success) {
          // Si la navegación falla, intentar con la ruta absoluta
          window.location.href = `/profile`;
        }
      })
      .catch((error) => {
        // En caso de error, usar navegación directa
        window.location.href = `/profile`;
      });
  }

  // Navegar a la página de login
  navigateToLogin() {
    this.router.navigate(['/login']); // Ajusta la ruta según tu configuración
  }

  // Método para navegar después de completar la verificación del usuario
  navigateAfterUserVerification(): void {
    // Check if redirectUrl exists in sessionStorage
    const redirectUrl = sessionStorage.getItem('redirectUrl');

    if (redirectUrl) {
      // Parse the URL to separate path and query parameters
      const urlParts = redirectUrl.split('?');
      const path = urlParts[0];
      const queryParams = urlParts[1] ? this.parseQueryString(urlParts[1]) : {};

      // Navigate to the path with query parameters
      this.router.navigate([path], { queryParams });
      // Clear the redirectUrl from sessionStorage
      sessionStorage.removeItem('redirectUrl');
    } else {
      // Default navigation to home
      this.router.navigate(['/']);
    }
  }

  // Helper method to parse query string
  private parseQueryString(queryString: string): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    const pairs = queryString.split('&');

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }

    return params;
  }

  async handleGoogleSignIn() {
    try {
      await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
    }
  }

  // Método para manejar la autenticación después del redireccionamiento de OAuth
  async handleAuthRedirect(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (user) {
        const attributes = await fetchUserAttributes();
        if (attributes && attributes.email) {
          // ✅ CORREGIDO: Obtener el Cognito ID (sub) - priorizar sub de atributos, luego user.userId
          const cognitoUserId = attributes.sub || user.userId;

          this.isAuthenticated.next(true);
          this.currentUserEmail.next(attributes.email);
          this.currentUserCognitoId.next(cognitoUserId);

          this.userAttributesChanged.next();
        }
      }
    } catch (error) {
      console.error('Error al manejar la redirección de autenticación:', error);
    }
  }

  /**
   * Dispara evento sign_up para analytics
   */
  private trackSignUp(method: string): void {
    const userData = this.analyticsService.getUserData(
      this.getUserEmailValue(),
      undefined, // No tenemos phone en Google flow
      this.getCognitoIdValue()
    );
    this.analyticsService.signUp(method, userData);
  }
}
