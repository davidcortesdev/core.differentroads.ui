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
import { ConfirmationCodeComponent } from '../../../../shared/components/confirmation-code/confirmation-code.component';
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
    private authService: AuthenticateService
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
      next: () => {
        this.isLoading = false;
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
      next: () => {
        this.isLoading = false;
        // La redirección la manejará el servicio de autenticación
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
    this.authService.handleGoogleSignIn().then(() => {
      this.isLoading = false;
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