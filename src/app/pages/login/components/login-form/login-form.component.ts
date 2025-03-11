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

@Component({
  selector: 'app-login-form',
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
  ], // Import CommonModule and ReactiveFormsModule
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.scss'],
})
export class LoginFormComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;

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
  
    this.authService.login(username, password).subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Error al iniciar sesión';
      },
    });
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
