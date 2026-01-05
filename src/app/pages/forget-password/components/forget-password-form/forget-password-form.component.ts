import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms'; // Import ReactiveFormsModule
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { PasswordModule } from 'primeng/password';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';

@Component({
  selector: 'app-forget-password-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    InputNumberModule,
  ],
  templateUrl: './forget-password-form.component.html',
  styleUrls: ['./forget-password-form.component.scss'],
})
export class PasswordRecoveryFormComponent implements OnInit {
  step: 'email' | 'reset' = 'email';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  userEmail: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isRedirecting: boolean = false;
  isStandalone: boolean = false;

  emailForm: FormGroup;
  resetForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthenticateService
  ) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.resetForm = this.fb.group(
      {
        confirmationCode: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[0-9]+$/),
            Validators.maxLength(10),
          ],
        ],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(7),
            Validators.maxLength(14),
            Validators.pattern(
              /^(?=.*[A-Z])(?=.*[!@#$%^&*.-])(?=.*[0-9])(?=.*[a-z]).{7,14}$/
            ),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    // Detectar si estamos en una ruta standalone
    this.isStandalone = this.router.url.includes('/standalone/');
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  async onEmailSubmit(event: Event) {
    event.preventDefault(); // Prevenir el comportamiento predeterminado del formulario

    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const email = this.emailForm.value.email;
      await this.authService.forgotPassword(email);
      this.userEmail = email;
      this.successMessage = 'Código de verificación enviado a su correo.';
      this.step = 'reset';
    } catch (error: any) {
      this.errorMessage = error.message || 'Error al procesar la solicitud.';
    } finally {
      this.isLoading = false;
    }
  }

  async onResetSubmit(event: Event) {
    event.preventDefault(); // Prevenir el comportamiento predeterminado del formulario

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const result = await this.authService.confirmForgotPassword(
        this.userEmail,
        this.resetForm.value.confirmationCode,
        this.resetForm.value.password
      );

      if (result) {
        this.successMessage = 'Contraseña actualizada exitosamente.';
        this.isRedirecting = true;

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        this.errorMessage = 'Código inválido o contraseña débil.';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Error al actualizar la contraseña.';
    } finally {
      this.isLoading = false;
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
