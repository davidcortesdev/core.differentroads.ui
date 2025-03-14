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

@Component({
  selector: 'app-sign-up-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    DividerModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './sign-up-form.component.html',
  styleUrls: ['./sign-up-form.component.scss'],
})
export class SignUpFormComponent {
  signUpForm: FormGroup;
  confirmForm: FormGroup;
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
    },
    confirmationCode: {
      required: 'El código de confirmación es requerido.',
      pattern: 'El código debe contener solo números.',
    },
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthenticateService,
    private usersService: UsersService
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

    this.confirmForm = this.fb.group({
      username: ['', [Validators.required]],
      confirmationCode: [
        '',
        [Validators.required, Validators.pattern(/^[0-9]+$/)],
      ],
    });
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
              this.confirmForm.patchValue({
                username: this.registeredUsername,
              });
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
  }

  onConfirm() {
    if (this.confirmForm.invalid) {
      this.errorMessage = 'Por favor, corrige los errores en el formulario.';
      return;
    }

    this.isLoading = true;
    console.log('Código de confirmación enviado:', this.confirmForm.value);

    this.authService
      .confirmSignUp(
        this.confirmForm.value.username,
        `${this.confirmForm.value.confirmationCode}`
      )
      .then(() => {
        this.isLoading = false;
        this.isRedirecting = true;
        this.successMessage = 'Verificación exitosa. Iniciando sesión...';
        console.log('Código de confirmación verificado.');

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      })
      .catch((error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Confirmación fallida';
      });
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
}