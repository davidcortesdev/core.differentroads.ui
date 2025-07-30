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
import { AuthenticateService } from '../../../../core/services/auth-service.service';
import { UsersNetService } from '../../../../core/services/usersNet.service';
import { ConfirmationCodeComponent } from '../../../../shared/components/confirmation-code/confirmation-code.component';
import { UserCreate } from '../../../../core/models/users/user.model';
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
    ProgressSpinnerModule
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
    }
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService
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
  private checkAndCreateUserIfNeeded(cognitoUser: any): void {
    const cognitoId = cognitoUser?.username || cognitoUser?.sub;
    const email = this.loginForm.value.username;

    if (!cognitoId) {
      console.error('No se pudo obtener el Cognito ID del usuario');
      this.isLoading = false;
      return;
    }

    // Primero buscar por Cognito ID
    this.usersNetService.getUsersByCognitoId(cognitoId).subscribe({
      next: (users) => {
        if (users && users.length > 0) {
          // Usuario encontrado por Cognito ID
          console.log('Usuario encontrado por Cognito ID:', users[0]);
          this.isLoading = false;
        } else {
          // No encontrado por Cognito ID, buscar por email
          this.usersNetService.getUsersByEmail(email).subscribe({
            next: (usersByEmail) => {
              if (usersByEmail && usersByEmail.length > 0) {
                // Usuario encontrado por email, actualizar con Cognito ID
                console.log('Usuario encontrado por email, actualizando Cognito ID:', usersByEmail[0]);
                this.updateUserWithCognitoId(usersByEmail[0].id, cognitoId);
              } else {
                // Usuario no existe, crearlo
                console.log('Usuario no encontrado, creando nuevo usuario');
                this.createNewUser(cognitoId, email);
              }
            },
            error: (error) => {
              console.error('Error buscando usuario por email:', error);
              // En caso de error, intentar crear el usuario
              this.createNewUser(cognitoId, email);
            }
          });
        }
      },
      error: (error) => {
        console.error('Error buscando usuario por Cognito ID:', error);
        // En caso de error, buscar por email
        this.usersNetService.getUsersByEmail(email).subscribe({
          next: (usersByEmail) => {
            if (usersByEmail && usersByEmail.length > 0) {
              console.log('Usuario encontrado por email, actualizando Cognito ID:', usersByEmail[0]);
              this.updateUserWithCognitoId(usersByEmail[0].id, cognitoId);
            } else {
              console.log('Usuario no encontrado, creando nuevo usuario');
              this.createNewUser(cognitoId, email);
            }
          },
          error: (emailError) => {
            console.error('Error buscando usuario por email:', emailError);
            this.createNewUser(cognitoId, email);
          }
        });
      }
    });
  }

  /**
   * Actualiza un usuario existente con el Cognito ID
   */
  private updateUserWithCognitoId(userId: number, cognitoId: string): void {
    this.usersNetService.updateUser(userId, { cognitoId }).subscribe({
      next: (success) => {
        if (success) {
          console.log('Usuario actualizado con Cognito ID exitosamente');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error actualizando usuario con Cognito ID:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Crea un nuevo usuario en el API
   */
  private createNewUser(cognitoId: string, email: string): void {
    const newUser: UserCreate = {
      cognitoId: cognitoId,
      name: email, // Nombre por defecto
      lastName: undefined, // Apellido por defecto
      email: email,
      phone: undefined, // Teléfono por defecto
      hasWebAccess: true,
      hasMiddleAccess: false
    };

    this.usersNetService.createUser(newUser).subscribe({
      next: (user) => {
        console.log('Nuevo usuario creado exitosamente:', user);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error creando nuevo usuario:', error);
        this.isLoading = false;
      }
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
        this.errorMessage = err.message || 'Error al iniciar sesión después de la confirmación';
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
    this.authService.handleGoogleSignIn().then((cognitoUser) => {
      // Login exitoso con Google, verificar si el usuario existe en nuestro API
      this.checkAndCreateUserIfNeeded(cognitoUser);
    }).catch((error) => {
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
}