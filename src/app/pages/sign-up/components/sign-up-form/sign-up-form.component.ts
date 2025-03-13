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
import { HubspotService } from '../../../../core/services/hubspot.service'; // Importar el servicio de Hubspot

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
  errors: { [key: string]: any } = {};
  confirmErrors: { [key: string]: any } = {};
  errorMessage: string = '';
  successMessage: string = '';
  registeredUsername: string = '';
  userPassword: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthenticateService,
    private usersService: UsersService,
    private hubspotService: HubspotService // Inyectar el servicio de Hubspot
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
    setTimeout(() => {
      this.isLoading = false;
      console.log('Inicio de sesión con Google simulado.');
    }, 2000);
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.signUpForm.invalid) {
      this.errors = this.getFormErrors(this.signUpForm);
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
        },
        error: (hubspotError) => {
          this.isLoading = false;
          this.errorMessage = 'Error al crear el contacto en Hubspot';
          console.error('Error al crear contacto en Hubspot:', hubspotError);
        }
      });
  }

  onConfirm() {
    if (this.confirmForm.invalid) {
      this.confirmErrors = this.getFormErrors(this.confirmForm);
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

  getFormErrors(form: FormGroup): { [key: string]: any } {
    const errors: { [key: string]: any } = {};
    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      if (control?.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  redirectToLogin(): void {
    this.router.navigate(['/login']);
  }
}