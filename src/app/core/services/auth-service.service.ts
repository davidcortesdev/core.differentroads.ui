import { Injectable } from '@angular/core';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from 'amazon-cognito-identity-js';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Subject, Observable } from 'rxjs';
import { HubspotService } from './hubspot.service';

@Injectable({
  providedIn: 'root',
})
export class AuthenticateService {
  private userPool: CognitoUserPool;
  private cognitoUser!: CognitoUser;
  userAttributesChanged: Subject<void> = new Subject<void>();

  constructor(
    private router: Router,
    private hubspotService: HubspotService // Inyectar el servicio de Hubspot
  ) {
    this.userPool = new CognitoUserPool({
      UserPoolId: environment.cognitoUserPoolId,
      ClientId: environment.cognitoAppClientId,
    });
  }



  private getUserData(username: string): CognitoUser {
    return new CognitoUser({ Username: username, Pool: this.userPool });
  }

  // Login
// Login
login(emailaddress: string, password: string) {
  const authenticationDetails = new AuthenticationDetails({
    Username: emailaddress,
    Password: password,
  });

  this.cognitoUser = this.getUserData(emailaddress);

  this.cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: (result: any) => {
      console.log('Success Results : ', result);

      const contactData = {
        email: emailaddress,
      };

      this.hubspotService.createContact(contactData).subscribe({
        next: (hubspotResponse) => {
          console.log('Contacto creado en Hubspot exitosamente:', hubspotResponse);
          window.location.href = '/home';
        },
        error: (hubspotError) => {
          console.error('Error al crear contacto en Hubspot:', hubspotError);
          window.location.href = '/home';
        }
      });
    },
    newPasswordRequired: () => {
      // this.router.navigate(['/newPasswordRequire']);
    },
    onFailure: (error: any) => {
      console.log('error', error);
      // Update the error message and loading state in the login form component
      const loginFormComponent = this.router.routerState.root.firstChild
        ?.component as any;
      if (loginFormComponent) {
        loginFormComponent.isLoading = false;
        loginFormComponent.errorMessage = error.message || 'Login failed';
      }
    },
  });
}

  // Logout
  logOut() {
    const currentUser = this.userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
      window.location.href = '/home';
    }
  }

  // Signup
  signUp(email: string, password: string): Promise<void> {
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
          console.log('user name is ' + this.cognitoUser.getUsername());
          resolve();
        }
      );
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
      this.cognitoUser.getUserAttributes((err: any, result: any) => {
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
        this.userAttributesChanged.next();
        observer.next(formattedResult);
        observer.complete();
      });
    });
  }

  getCurrentUsername(): string {
    const currentUser = this.userPool.getCurrentUser();
    console.log('______Current user: ', currentUser);

    return currentUser ? currentUser.getUsername() : '';
  }

  // Navegar al perfil del usuario
  navigateToProfile() {
    this.router.navigate(['/profile']);
  }

  // Navegar a la página de login
  navigateToLogin() {
    this.router.navigate(['/login']); // Ajusta la ruta según tu configuración
  }
}
