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
    console.log('onSubmit called');
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    console.log('Form values:', this.loginForm.value);

    const { username, password } = this.loginForm.value;
    this.authService.login(username, password);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  signInWithGoogle(): void {
    // Simulación de inicio de sesión con Google
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
      console.log('Inicio de sesión con Google simulado.');
    }, 2000);
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
