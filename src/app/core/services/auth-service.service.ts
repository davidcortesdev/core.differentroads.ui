import { Injectable } from '@angular/core';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from 'amazon-cognito-identity-js';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { HubspotService } from './hubspot.service';
import { Subject, Observable, BehaviorSubject, from, of } from 'rxjs';
import {
  signInWithRedirect,
  getCurrentUser,
  fetchUserAttributes,
} from 'aws-amplify/auth';
import { UsersService } from './users.service';
import { PointsService } from './points.service'; // new import
import { firstValueFrom, catchError, tap, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthenticateService {
  private userPool: CognitoUserPool;
  private cognitoUser!: CognitoUser;

  // Nuevo BehaviorSubject para mantener el estado actual de autenticación
  private isAuthenticated = new BehaviorSubject<boolean>(false);

  // Nuevo BehaviorSubject para mantener el email del usuario actual
  private currentUserEmail = new BehaviorSubject<string>('');

  // Nuevo BehaviorSubject para mantener el Cognito ID del usuario actual
  private currentUserCognitoId = new BehaviorSubject<string>('');

  userAttributesChanged: Subject<void> = new Subject<void>();

  constructor(
    private router: Router,
    private usersService: UsersService,
    private hubspotService: HubspotService,
    private pointsService: PointsService // new injection
  ) {
    this.userPool = new CognitoUserPool({
      UserPoolId: environment.cognitoUserPoolId,
      ClientId: environment.cognitoAppClientId,
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
            
            // Obtener el Cognito ID del usuario actual
            const user = await getCurrentUser();
            if (user) {
              this.currentUserCognitoId.next(user.userId);
            }
            
            // Intentar crear el usuario en la base de datos si aún no existe
            this.createUserIfNotExists(attributes.email).then(() => {
              this.userAttributesChanged.next();
            });
          }
        } catch (error) {
          console.error('Error fetching user attributes:', error);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.isAuthenticated.next(false);
    }
  }

  // Obtener el estado de autenticación como Observable
  isLoggedIn(): Observable<boolean> {
    return this.isAuthenticated.asObservable();
  }

  // Obtener el email del usuario actual como Observable
  getUserEmail(): Observable<string> {
    return this.currentUserEmail.asObservable();
  }

  // Obtener el Cognito ID del usuario actual como Observable
  getCognitoId(): Observable<string> {
    return this.currentUserCognitoId.asObservable();
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

  // Login
  login(emailaddress: string, password: string): Observable<any> {
    return new Observable((observer) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: emailaddress,
        Password: password,
      });

      this.cognitoUser = this.getUserData(emailaddress);

      this.cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result: any) => {
          this.isAuthenticated.next(true);
          this.currentUserEmail.next(emailaddress);
          this.currentUserCognitoId.next(this.cognitoUser.getUsername());
          this.userAttributesChanged.next();

          // Agregar la integración con Hubspot
          const contactData = {
            email: emailaddress,
          };

          this.hubspotService.createContact(contactData).subscribe({
            next: (hubspotResponse) => {
              console.log(
                'Contacto creado en Hubspot exitosamente:',
                hubspotResponse
              );

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
        },
        newPasswordRequired: () => {
          observer.error('Se requiere una nueva contraseña');
        },
        onFailure: (error: any) => {
          let errorMessage = 'Error al iniciar sesión';
          if (error.code === 'UserNotFoundException') {
            errorMessage = 'El usuario no existe';
          } else if (error.code === 'NotAuthorizedException') {
            errorMessage = 'La contraseña es incorrecta';
          } else if (error.code === 'UserNotConfirmedException') {
            errorMessage =
              'El usuario no ha sido confirmado. Por favor, verifica tu correo electrónico';
              this.resendConfirmationCode(emailaddress);
          } else if (error.code === 'TooManyFailedAttemptsException') {
            errorMessage =
              'Demasiados intentos fallidos. Intenta de nuevo más tarde';
          }
          observer.error({ message: errorMessage });
        },
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
      window.location.href = '/home';
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
            console.log(err);
            reject(err);
            return;
          }
          this.cognitoUser = result.user;
          const cognitoUserId = result.userSub; // ID único de Cognito
          console.log('user name is ' + this.cognitoUser.getUsername());
          console.log('cognito user id is ' + cognitoUserId);
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
        console.log('Código reenviado con éxito:', result);
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
            console.log(err);
            reject(err);
            return;
          }
          console.log('call result: ' + result);
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
          console.log('call result: ' + result);
          resolve(result);
        },
        onFailure: (err: any) => {
          console.log(err);
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
          console.log('Password confirmed');
          resolve(true);
        },
        onFailure: (err: any) => {
          console.log(err);
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
          console.log(err);
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
          console.log(err);
          observer.error(err);
          return;
        }

        currentUser.getUserAttributes((err: any, result: any) => {
          if (err) {
            console.log(err);
            observer.error(err);
            return;
          }
          let formattedResult = result.map((item: any) => ({
            [item.Name]: item.Value,
          }));
          formattedResult = Object.assign({}, ...formattedResult);
          console.log('User attributes: ', formattedResult);

          if (formattedResult.email) {
            this.currentUserEmail.next(formattedResult.email);
          }

          // Obtener el Cognito ID del usuario actual
          const currentUser = this.userPool.getCurrentUser();
          if (currentUser) {
            this.currentUserCognitoId.next(currentUser.getUsername());
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
    console.log('______Current user: ', currentUser);

    return currentUser ? currentUser.getUsername() : '';
  }

  // Navegar al perfil del usuario
  navigateToProfile(userId: string) {
    this.router.navigate(['/profile-v2', userId]);
  }

  // Navegar a la página de login
  navigateToLogin() {
    this.router.navigate(['/login']); // Ajusta la ruta según tu configuración
  }

  // Método para navegar después de completar la verificación del usuario
  navigateAfterUserVerification(): void {
    console.log('🧭 navigateAfterUserVerification() ejecutándose...');
    
    // Check if redirectUrl exists in sessionStorage
    const redirectUrl = sessionStorage.getItem('redirectUrl');
    console.log('🧭 redirectUrl en sessionStorage:', redirectUrl);
    
    if (redirectUrl) {
      // Parse the URL to separate path and query parameters
      const urlParts = redirectUrl.split('?');
      const path = urlParts[0];
      const queryParams = urlParts[1] ? this.parseQueryString(urlParts[1]) : {};
      
      console.log('🧭 Path:', path);
      console.log('🧭 Query params:', queryParams);
      
      // Navigate to the path with query parameters
      this.router.navigate([path], { queryParams });
      // Clear the redirectUrl from sessionStorage
      sessionStorage.removeItem('redirectUrl');
    } else {
      // Default navigation to home
      console.log('🧭 Navegando a /home por defecto');
      this.router.navigate(['/home']);
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
          this.isAuthenticated.next(true);
          this.currentUserEmail.next(attributes.email);
          this.currentUserCognitoId.next(user.userId);
          await this.createUserIfNotExists(attributes.email);
          this.userAttributesChanged.next();
        }
      }
    } catch (error) {
      console.error('Error al manejar la redirección de autenticación:', error);
    }
  }

  async createUserIfNotExists(email: string): Promise<void> {
    if (!email) return;

    try {
      // Primero intentamos obtener el usuario
      const user = await firstValueFrom(
        this.usersService.getUserByEmail(email).pipe(
          catchError((error) => {
            // Si el usuario no existe (404), creamos uno nuevo
            if (error.status === 404) {
              return from(
                firstValueFrom(
                  this.usersService.createUser({
                    email: email,
                    names: 'pendiente',
                    lastname: 'pendiente',
                    phone: 0,
                  })
                )
              ).pipe(
                tap(() => {
                  console.log('Usuario creado en la base de datos.');
                  this.assignNewTravelerPoints(email);
                }),
                catchError((createError) => {
                  console.error('Error al crear el usuario:', createError);
                  return of(null);
                })
              );
            } else {
              console.error('Error al obtener el usuario:', error);
              return of(null);
            }
          })
        )
      );

      if (user) {
        // console.log('Usuario existente:', user);
      }
    } catch (error) {
      console.error('Error en createUserIfNotExists:', error);
    }
  }

  // New method to assign 100 points to new travelers
  assignNewTravelerPoints(email: string): void {
    this.usersService.getUserByEmail(email).subscribe({
      next: (user) => {
        if (user && user._id) {
          const pointsObject = {
            travelerID: user._id,
            type: 'income',
            points: 100, 
            extraData: {
              bookingID: 'N/A',
              tourName: 'N/A',
            },
            category: 'Paquete de Binevenida',
            concept: 'Registro',
            origin: 'System',
            transactionEmail: email,
          };
          this.pointsService.createPoints(pointsObject).subscribe({
            next: (res) => {
              console.log(`100 puntos asignados al nuevo usuario ${email}:`, res);
            },
            error: (err) => {
              console.error(`Error asignando puntos al usuario ${email}:`, err);
            },
          });
        }
      },
      error: (err) => {
        console.error(`Error obteniendo usuario por email ${email}:`, err);
      },
    });
  }
}
