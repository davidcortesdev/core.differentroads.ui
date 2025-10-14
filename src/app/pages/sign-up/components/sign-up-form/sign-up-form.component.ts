import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { UsersNetService } from '../../../../core/services/users/usersNet.service';
import { HubspotService } from '../../../../core/services/integrations/hubspot.service';
import { AnalyticsService } from '../../../../core/services/analytics/analytics.service';
import { ConfirmationCodeComponent } from '../../../../shared/components/confirmation-code/confirmation-code.component';

@Component({
  selector: 'app-sign-up-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmationCodeComponent,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    DividerModule,
    ProgressSpinnerModule
  ],
  templateUrl: './sign-up-form.component.html',
  styleUrls: ['./sign-up-form.component.scss'],
})
export class SignUpFormComponent {
  signUpForm: FormGroup;
  isLoading: boolean = false;
  isConfirming: boolean = false;
  isRedirecting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  registeredUsername: string = '';
  userPassword: string = '';

  // Mensajes de error personalizados
  errorMessages: { [key: string]: { [key: string]: string } } = {
    firstName: {
      required: 'El nombre es requerido.',
    },
    lastName: {
      required: 'El apellido es requerido.',
    },
    email: {
      required: 'El correo electrónico es requerido.',
      email: 'Ingresa un correo electrónico válido.',
    },
    phone: {
      required: 'El teléfono es requerido.',
      pattern: 'Ingresa un número de teléfono válido. Puede incluir código de país.',
    },
    password: {
      required: 'La contraseña es requerida.',
      minlength: 'La contraseña debe tener al menos 8 caracteres.',
    },
    confirmPassword: {
      required: 'Confirma tu contraseña.',
      mismatch: 'Las contraseñas no coinciden.',
    }
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService,
    private hubspotService: HubspotService,
    private analyticsService: AnalyticsService
  ) {
    this.signUpForm = this.fb.group(
      {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, Validators.pattern(/^(\+\d{1,3})?\s?\d{6,14}$/)]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
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

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.signUpForm.invalid) {
      this.errorMessage = 'Por favor, corrige los errores en el formulario.';
      return;
    }

    this.isLoading = true;
    console.log('Formulario enviado:', this.signUpForm.value);

    // Crear el contacto en Hubspot primero
    const contactData = {
      email: this.signUpForm.value.email,
      firstname: this.signUpForm.value.firstName,
      lastname: this.signUpForm.value.lastName,
      phone: this.signUpForm.value.phone,
    };

    this.hubspotService.createContact(contactData)
      .subscribe({
        next: (hubspotResponse) => {
          console.log('Contacto creado en Hubspot exitosamente:', hubspotResponse);

          // Si Hubspot responde correctamente, proceder con el registro del usuario
          this.authService
            .signUp(this.signUpForm.value.email, this.signUpForm.value.password)
            .then((cognitoUserId) => {
              console.log('Usuario creado en Cognito con ID:', cognitoUserId);
              this.usersNetService
                .createUser({
                  cognitoId: cognitoUserId,
                  name: this.signUpForm.value.firstName,
                  lastName: this.signUpForm.value.lastName,
                  email: this.signUpForm.value.email,
                  phone: this.signUpForm.value.phone,
                  hasWebAccess: true,
                  hasMiddleAccess: false
                })
                .subscribe({
                  next: (user) => {
                    console.log('Usuario creado exitosamente:', user);
                    
                    this.isLoading = false;
                    this.isConfirming = true;
                    this.registeredUsername = this.signUpForm.value.email;
                    this.userPassword = this.signUpForm.value.password;
                    console.log('Registro completado. Esperando confirmación.');
                  },
                  error: (error: any) => {
                    this.isLoading = false;
                    this.errorMessage = error.message || 'Registro fallido';
                  }
                });
            })
            .catch((error) => {
              this.isLoading = false;
              this.errorMessage = error.message || 'Registro fallido';
            });
        },
        error: (hubspotError) => {
          this.isLoading = false;
          this.errorMessage = 'Error al crear el contacto en Hubspot';
          console.error('Error al crear contacto en Hubspot:', hubspotError);
        }
      });
  }

  onConfirmSuccess(): void {
    this.isLoading = false;
    this.isRedirecting = true;
    this.successMessage = 'Verificación exitosa. Redirigiendo al inicio de sesión...';
    
    // Disparar evento sign_up para confirmación exitosa con datos completos
    this.trackSignUpWithCompleteData('manual');
    
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 2000);
  }

  getErrorMessage(controlName: string, errors: any): string {
    if (errors) {
      const errorKey = Object.keys(errors)[0];
      return this.errorMessages[controlName][errorKey] || 'Error desconocido.';
    }
    return '';
  }

  redirectToLogin(): void {
    this.router.navigate(['/login']);
  }
  
  // Métodos para manejar los eventos del componente ConfirmationCodeComponent
  onLoadingChange(loading: boolean): void {
    this.isLoading = loading;
  }

  onErrorMessageChange(message: string): void {
    this.errorMessage = message;
  }

  onSuccessMessageChange(message: string): void {
    this.successMessage = message;
  }

  /**
   * Disparar evento sign_up cuando el usuario se registra exitosamente
   */
  private trackSignUp(method: string): void {
    this.analyticsService.signUp(
      method,
      this.analyticsService.getUserData(
        this.signUpForm.value.email,
        this.signUpForm.value.phone,
        undefined // No tenemos Cognito ID aún en este punto
      )
    );
  }

  /**
   * Disparar evento sign_up con datos completos después de verificación exitosa
   */
  private trackSignUpWithCompleteData(method: string): void {
    // Obtener datos completos del usuario después de la verificación
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        this.analyticsService.signUp(method, userData);
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        // Fallback con datos del formulario
        this.analyticsService.signUp(
          method,
          this.analyticsService.getUserData(
            this.signUpForm.value.email,
            this.signUpForm.value.phone,
            undefined
          )
        );
      }
    });
  }
}