// src/app/sign-up/sign-up.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignUpFormComponent } from './components/sign-up-form/sign-up-form.component';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
  imports: [CommonModule, SignUpFormComponent],
})
export class SignUpComponent {}
