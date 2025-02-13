import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common'; // Importa CommonModule
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-sign-up-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IftaLabelModule,
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
  isLoading: boolean = false;
  errors: { [key: string]: any } = {};
  errorMessage: string = '';

  constructor(private fb: FormBuilder, private router: Router) {
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
    // Simulación de inicio de sesión con Google
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
      console.log('Inicio de sesión con Google simulado.');
    }, 2000);
  }

  // Validador personalizado para confirmar contraseña
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

    // Simula una operación asíncrona (por ejemplo, una llamada a una API)
    setTimeout(() => {
      this.isLoading = false;
      console.log('Registro completado.');
    }, 2000);
  }

  // Obtiene los errores del formulario
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
