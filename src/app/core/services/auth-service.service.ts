import { Injectable } from '@angular/core';
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from 'amazon-cognito-identity-js';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthenticateService {
  private userPool: CognitoUserPool;
  private cognitoUser!: CognitoUser;

  constructor(private router: Router) {
    this.userPool = new CognitoUserPool({
      UserPoolId: environment.cognitoUserPoolId,
      ClientId: environment.cognitoAppClientId,
    });
  }

  private getUserData(username: string): CognitoUser {
    return new CognitoUser({ Username: username, Pool: this.userPool });
  }

  // Login
  login(emailaddress: string, password: string) {
    const authenticationDetails = new AuthenticationDetails({
      Username: emailaddress,
      Password: password,
    });

    this.cognitoUser = this.getUserData(emailaddress);

    this.cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result: any) => {
        this.router.navigate(['/home']);
        console.log('Success Results : ', result);
      },
      newPasswordRequired: () => {
        this.router.navigate(['/newPasswordRequire']);
      },
      onFailure: (error: any) => {
        console.log('error', error);
      },
    });
  }

  // Logout
  logOut() {
    const currentUser = this.userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
      this.router.navigate(['home']);
    }
  }

  // Signup
  signUp(email: string, password: string) {
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
          return;
        }
        this.cognitoUser = result.user;
        console.log('user name is ' + this.cognitoUser.getUsername());
      }
    );
  }

  // Confirm Signup
  confirmSignUp(username: string, code: string) {
    this.cognitoUser = this.getUserData(username);
    this.cognitoUser.confirmRegistration(
      code,
      true,
      (err: any, result: string) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log('call result: ' + result);
      }
    );
  }

  // Forgot Password
  forgotPassword(username: string) {
    this.cognitoUser = this.getUserData(username);
    this.cognitoUser.forgotPassword({
      onSuccess: (result: any) => {
        console.log('call result: ' + result);
        return result;
      },
      onFailure: (err: any) => {
        console.log(err);
      },
    });
  }

  // Confirm Forgot Password
  confirmForgotPassword(username: string, code: string, newPassword: string) {
    this.cognitoUser = this.getUserData(username);
    this.cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => {
        console.log('Password confirmed');
        return true;
      },
      onFailure: (err: any) => {
        console.log(err);
        return false;
      },
    });
  }

  // Get Current User
  getCurrentUser() {
    const currentUser = this.userPool.getCurrentUser();
    if (currentUser != null) {
      this.cognitoUser = currentUser;
      this.cognitoUser.getSession((err: any, session: any) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log('session validity: ', session);
        return session;
      });
    }
  }

  // Get Current User Attributes
  getUserAttributes() {
    this.cognitoUser.getUserAttributes((err: any, result) => {
      if (err) {
        console.log(err);
        return;
      }
      console.log('User attributes: ', result);
      return result;
    });
  }
}
