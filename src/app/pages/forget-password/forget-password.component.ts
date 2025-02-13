import { Component } from '@angular/core';
import { PasswordRecoveryFormComponent } from './components/forget-password-form/forget-password-form.component';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-forget-password',
  imports: [CommonModule, PasswordRecoveryFormComponent],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss',
})
export class ForgetPasswordComponent {}
