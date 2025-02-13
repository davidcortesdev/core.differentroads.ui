import { Component } from '@angular/core';
import { ForgetPasswordFormComponent } from './components/forget-password-form/forget-password-form.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forget-password',
  imports: [CommonModule, ForgetPasswordFormComponent],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss',
})
export class ForgetPasswordComponent {}
