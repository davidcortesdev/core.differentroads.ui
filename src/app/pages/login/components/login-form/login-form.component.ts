import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { UsersNetService } from '../../../../core/services/users/usersNet.service';
import { AnalyticsService } from '../../../../core/services/analytics/analytics.service';
import { ConfirmationCodeComponent } from '../../../../shared/components/confirmation-code/confirmation-code.component';
import {
  UserCreate,
  IUserResponse,
} from '../../../../core/models/users/user.model';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IftaLabelModule,
    ConfirmationCodeComponent,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    DividerModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss'],
})
export class LoginFormComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  isConfirming: boolean = false;
  isRedirecting: boolean = false;
  showPassword: boolean = false;
  userPassword: string = '';

  // Mensajes de error personalizados
  errorMessages: { [key: string]: { [key: string]: string } } = {
    username: {
      required: 'El correo electrónico es requerido.',
    },
    password: {
      required: 'La contraseña es requerida.',
    },
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService,
    private analyticsService: AnalyticsService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {}

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { username, password } = this.loginForm.value;
    this.userPassword = password; // Guardar contraseña para uso posterior

    this.authService.login(username, password).subscribe({
      next: (cognitoUser) => {
        // Login exitoso, ahora verificar si el usuario existe en nuestro API
        this.checkAndCreateUserIfNeeded(cognitoUser);
      },
      error: (err) => {
        this.isLoading = false;

        // Comprobar si el error es de usuario no confirmado
        if (err.message && err.message.includes('no ha sido confirmado')) {
          this.errorMessage = '';
          this.handleUnconfirmedUser(username);
        } else {
          this.errorMessage = err.message || 'Error al iniciar sesión';
        }
      },
    });
  }

  /**
   * Verifica si el usuario existe en el API y lo crea si no existe
   */
  private checkAndCreateUserIfNeeded(
    cognitoUser: any,
    method: string = 'manual'
  ): void {
    const email = this.loginForm.value.username;

    // Obtener el Cognito ID (sub) desde los atributos del usuario
    this.authService.getUserAttributes().subscribe({
      next: (attributes) => {
        const cognitoId = attributes?.sub;

        if (!cognitoId) {
          console.error('No se pudo obtener el Cognito ID del usuario');
          this.isLoading = false;
          return;
        }

        this.verifyAndCreateUser(cognitoId, email, method);
      },
      error: (error) => {
        console.error('Error obteniendo atributos del usuario:', error);
        this.isLoading = false;
        this.errorMessage = 'Error al obtener información del usuario';
      },
    });
  }

  /**
   * Verifica y crea el usuario si es necesario
   */
  private verifyAndCreateUser(
    cognitoId: string,
    email: string,
    method: string = 'manual'
  ): void {
    // Primero buscar por Cognito ID
    this.usersNetService.getUsersByCognitoId(cognitoId).subscribe({
      next: (users) => {

        if (users && users.length > 0) {
          // Usuario encontrado por Cognito ID

          // Verificar si debe redirigir a Tour Operation
          if (this.shouldRedirectToTourOperation(users[0])) {

            // Disparar evento login antes de redirigir
            this.trackLogin(method, users[0]);
            this.redirectToTourOperation();
            return;
          }

          // Verificar si tiene acceso a la web
          if (!users[0].hasWebAccess) {
            this.isLoading = false;
            this.errorMessage =
              'No tienes permisos para acceder a esta plataforma.';
            // Cerrar sesión de Cognito
            this.authService.logOut();
            return;
          }

          // Disparar evento login
          this.trackLogin(method, users[0]);

          this.isLoading = false;

          // Navegar después de encontrar el usuario
          this.authService.navigateAfterUserVerification();
        } else {
          // No encontrado por Cognito ID, buscar por email

          this.usersNetService.getUsersByEmail(email).subscribe({
            next: (usersByEmail) => {

              if (usersByEmail && usersByEmail.length > 0) {
                // Usuario encontrado por email, actualizar con Cognito ID

                // Disparar evento login
                this.trackLogin(method, usersByEmail[0]);

                this.updateUserWithCognitoId(
                  usersByEmail[0],
                  cognitoId,
                  method
                );
              } else {
                // Usuario no existe, crearlo

                this.createNewUser(cognitoId, email, method);
              }
            },
            error: (error) => {
              console.error('❌ Error buscando usuario por email:', error);
              // En caso de error, intentar crear el usuario
              this.createNewUser(cognitoId, email);
            },
          });
        }
      },
      error: (error) => {
        console.error('❌ Error buscando usuario por Cognito ID:', error);
        // En caso de error, buscar por email

        this.usersNetService.getUsersByEmail(email).subscribe({
          next: (usersByEmail) => {

            if (usersByEmail && usersByEmail.length > 0) {

              // Disparar evento login
              this.trackLogin(method, usersByEmail[0]);

              this.updateUserWithCognitoId(usersByEmail[0], cognitoId, method);
            } else {

              this.createNewUser(cognitoId, email, method);
            }
          },
          error: (emailError) => {
            console.error('❌ Error buscando usuario por email:', emailError);
            this.createNewUser(cognitoId, email, method);
          },
        });
      },
    });
  }

  /**
   * Actualiza un usuario existente con el Cognito ID
   */
  private updateUserWithCognitoId(
    currentUser: IUserResponse,
    cognitoId: string,
    method: string = 'manual'
  ): void {

    // Preparar datos de actualización preservando todos los campos importantes
    const updateData = {
      cognitoId: cognitoId,
      name: currentUser.name || currentUser.email || 'Usuario',
      email: currentUser.email || '',
      lastName: currentUser.lastName,
      phone: currentUser.phone,
      // Preservar los valores de acceso existentes
      hasWebAccess: currentUser.hasWebAccess ?? true,
      hasMiddleAccess: currentUser.hasMiddleAccess ?? false,
      hasMiddleAtcAccess: currentUser.hasMiddleAtcAccess ?? false,
      hasTourOperationAccess: currentUser.hasTourOperationAccess ?? false,
      retailerId: currentUser.retailerId,
    };

    this.usersNetService.updateUser(currentUser.id, updateData).subscribe({
      next: (success) => {
        if (success) {

        }

        // Obtener el usuario actualizado para verificar permisos
        this.usersNetService.getUserById(currentUser.id).subscribe({
          next: (user) => {
            // Verificar si debe redirigir a Tour Operation
            if (this.shouldRedirectToTourOperation(user)) {

              this.redirectToTourOperation();
              return;
            }

            // Verificar si tiene acceso a la web
            if (!user.hasWebAccess) {
              this.isLoading = false;
              this.errorMessage =
                'No tienes permisos para acceder a esta plataforma.';
              // Cerrar sesión de Cognito
              this.authService.logOut();
              return;
            }

            this.isLoading = false;

            // Navegar después de actualizar el usuario
            this.authService.navigateAfterUserVerification();

          },
          error: (error) => {
            console.error('❌ Error obteniendo usuario actualizado:', error);
            this.isLoading = false;
            this.authService.navigateAfterUserVerification();
          },
        });
      },
      error: (error) => {
        console.error('❌ Error actualizando usuario con Cognito ID:', error);

        this.isLoading = false;

        // Navegar incluso si hay error en la actualización
        this.authService.navigateAfterUserVerification();

      },
    });
  }

  /**
   * Crea un nuevo usuario en el API
   */
  private createNewUser(
    cognitoId: string,
    email: string,
    method: string = 'manual'
  ): void {

    const newUser: UserCreate = {
      cognitoId: cognitoId,
      name: email, // Nombre por defecto
      lastName: undefined, // Apellido por defecto
      email: email,
      phone: undefined, // Teléfono por defecto
      hasWebAccess: true,
      hasMiddleAccess: false,
      politicasAceptadas: false,
      detalleDeLaFuenteDeRegistro1: 'INTEGRATION',
    };

    this.usersNetService.createUser(newUser).subscribe({
      next: (user) => {

        // Verificar si debe redirigir a Tour Operation
        if (this.shouldRedirectToTourOperation(user)) {

          // Disparar evento login antes de redirigir
          this.trackLogin(method, user);
          this.redirectToTourOperation();
          return;
        }

        // Verificar si tiene acceso a la web
        if (!user.hasWebAccess) {
          this.isLoading = false;
          this.errorMessage =
            'No tienes permisos para acceder a esta plataforma.';
          // Cerrar sesión de Cognito
          this.authService.logOut();
          return;
        }

        // Disparar evento login
        this.trackLogin(method, user);

        this.isLoading = false;

        // Navegar después de crear el usuario
        this.authService.navigateAfterUserVerification();

      },
      error: (error) => {
        console.error('❌ Error creando nuevo usuario:', error);

        this.isLoading = false;

        // Navegar incluso si hay error en la creación
        this.authService.navigateAfterUserVerification();

      },
    });
  }

  handleUnconfirmedUser(username: string): void {
    this.isConfirming = true;
  }

  onConfirmSuccess(): void {
    // El usuario ha confirmado exitosamente, ahora intentamos iniciar sesión
    this.loginAfterConfirmation();
  }

  loginAfterConfirmation(): void {
    this.isLoading = true;

    const username = this.loginForm.value.username;
    const password = this.userPassword;

    this.authService.login(username, password).subscribe({
      next: (cognitoUser) => {
        // Login exitoso después de confirmación, verificar si el usuario existe en nuestro API
        this.checkAndCreateUserIfNeeded(cognitoUser);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err.message || 'Error al iniciar sesión después de la confirmación';
        this.isConfirming = false; // Volver al formulario de login en caso de error
      },
    });
  }

  getErrorMessage(controlName: string, errors: any): string {
    if (errors) {
      const errorKey = Object.keys(errors)[0];
      return this.errorMessages[controlName][errorKey] || 'Error desconocido.';
    }
    return '';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  signInWithGoogle(): void {
    this.isLoading = true;

    this.authService
      .handleGoogleSignIn()
      .then((cognitoUser) => {})
      .catch((error) => {
        this.isLoading = false;
        this.errorMessage = 'Error al iniciar sesión con Google';
        console.error(error);
      });
  }

  redirectToSignUp(): void {
    this.router.navigate(['/sign-up']);
  }

  redirectToForgetPassword(): void {
    this.router.navigate(['/forget-password']);
  }

  get errors() {
    return {
      username: this.loginForm.get('username')?.errors,
      password: this.loginForm.get('password')?.errors,
    };
  }

  /**
   * Disparar evento login cuando el usuario inicia sesión exitosamente
   */
  private trackLogin(method: string, user: IUserResponse): void {
    this.analyticsService.login(
      method,
      this.analyticsService.getUserData(user.email, user.phone, user.cognitoId)
    );
  }

  /**
   * Verifica si el usuario debe ser redirigido a la plataforma de tour operation
   */
  private shouldRedirectToTourOperation(user: IUserResponse): boolean {
    return !user.hasWebAccess && user.hasTourOperationAccess;
  }

  /**
   * Redirige al usuario a la plataforma de tour operation
   */
  private redirectToTourOperation(): void {
    this.isLoading = false;

    window.location.href = environment.tourOperationUrl;
  }
}
