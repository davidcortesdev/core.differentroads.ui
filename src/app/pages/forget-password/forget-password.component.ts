import { Component, OnInit } from '@angular/core';
import { PasswordRecoveryFormComponent } from './components/forget-password-form/forget-password-form.component';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-forget-password',
  imports: [CommonModule, PasswordRecoveryFormComponent],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss',
})

export class ForgetPasswordComponent implements OnInit {
  constructor(
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('Recuperar Contraseña - Different Roads');
    // La lógica de ocultar el chat widget ahora está en StandaloneComponent
  }
}
