import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forget-password-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './forget-password-form.component.html',
  styleUrl: './forget-password-form.component.scss',
})
export class ForgetPasswordFormComponent {
  forgetPasswordForm: FormGroup; // Form group for the forget password form
  isLoading: boolean = false; // Loading state
  errorMessage: string | null = null; // General error message
  errors: { [key: string]: { message: string } } = {}; // Validation errors

  constructor(private fb: FormBuilder, private router: Router) {
    // Initialize the form
    this.forgetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]], // Email field with validation
    });
  }

  // Handle form submission
  onSubmit() {
    // Reset errors
    this.errors = {};
    this.errorMessage = null;

    // Mark all fields as touched to trigger validation messages
    this.forgetPasswordForm.markAllAsTouched();

    // If the form is invalid, return
    if (this.forgetPasswordForm.invalid) {
      this.setValidationErrors();
      return;
    }

    // Simulate form submission (replace with actual API call)
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;

      // Simulate success or error response
      const email = this.forgetPasswordForm.value.email;
      if (email === 'test@example.com') {
        // Simulate success
        alert('Password reset link sent to your email!');
        this.redirectToLogin(); // Redirect to login after success
      } else {
        // Simulate error
        this.errorMessage = 'Email not found. Please try again.';
      }
    }, 2000);
  }

  // Set validation errors
  setValidationErrors() {
    Object.keys(this.forgetPasswordForm.controls).forEach((key) => {
      const control = this.forgetPasswordForm.get(key);
      if (control?.errors) {
        if (control.errors['required']) {
          this.errors[key] = { message: 'This field is required.' };
        } else if (control.errors['email']) {
          this.errors[key] = { message: 'Please enter a valid email address.' };
        }
      }
    });
  }

  // Redirect to the login page
  redirectToLogin() {
    this.router.navigate(['/login']);
  }
}
