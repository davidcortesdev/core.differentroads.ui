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
import { AuthenticateService } from '../../../../core/services/auth-service.service';
import { UsersService } from '../../../../core/services/users.service';
import { HubspotService } from '../../../../core/services/hubspot.service';
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
      pattern: 'El teléfono debe tener 10 dígitos.',
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
    private usersService: UsersService,
    private hubspotService: HubspotService
  ) {
    this.signUpForm = this.fb.group(
      {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
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
            .then(() => {
              this.usersService
                .createUser({
                  email: this.signUpForm.value.email,
                  names: this.signUpForm.value.firstName,
                  lastname: this.signUpForm.value.lastName,
                  phone: this.signUpForm.value.phone,
                })
                .subscribe(
                  () => {
                    this.isLoading = false;
                    this.isConfirming = true;
                    this.registeredUsername = this.signUpForm.value.email;
                    this.userPassword = this.signUpForm.value.password;
                    console.log('Registro completado. Esperando confirmación.');
                  },
                  (error) => {
                    this.isLoading = false;
                    this.errorMessage = error.message || 'Registro fallido';
                  }
                );
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
}