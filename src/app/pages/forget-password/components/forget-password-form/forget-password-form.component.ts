import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms'; // Import ReactiveFormsModule
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-password-recovery-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule],
  templateUrl: './forget-password-form.component.html',
  styleUrls: ['./forget-password-form.component.scss'],
})
export class PasswordRecoveryFormComponent {
  step: 'email' | 'reset' = 'email';
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  userEmail: string = '';
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isRedirecting: boolean = false;

  emailForm: FormGroup;
  resetForm: FormGroup;

  constructor(private fb: FormBuilder, private router: Router) {
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

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  async onEmailSubmit(event: Event) {
    console.log('onEmailSubmit called'); // Depuración
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
      const userExists = await this.simulateCheckUserExists(email);
      if (!userExists) {
        this.errorMessage = 'El usuario no existe.';
        return;
      }

      await this.simulateSendVerificationCode(email);
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
    console.log('onResetSubmit called'); // Depuración
    event.preventDefault(); // Prevenir el comportamiento predeterminado del formulario

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const result = await this.simulateUpdatePassword(
        this.userEmail,
        this.resetForm.value.confirmationCode,
        this.resetForm.value.password
      );

      if (result.success) {
        this.successMessage = result.message;
        this.isRedirecting = true;

        setTimeout(() => {
          this.router.navigate(['/es/login']);
        }, 2000);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error: any) {
      console.error('Error al actualizar la contraseña:', error);
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

  private async simulateCheckUserExists(email: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(email === 'test@example.com');
      }, 1000);
    });
  }

  private async simulateSendVerificationCode(email: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  private async simulateUpdatePassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (code === '123456' && newPassword.length >= 7) {
          resolve({
            success: true,
            message: 'Contraseña actualizada exitosamente.',
          });
        } else {
          resolve({
            success: false,
            message: 'Código inválido o contraseña débil.',
          });
        }
      }, 1000);
    });
  }
}
