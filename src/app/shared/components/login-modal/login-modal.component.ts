import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-login-modal',
  standalone: false,
  templateUrl: './login-modal.component.html',
  styleUrl: './login-modal.component.scss',
})
export class LoginModalComponent {
  @Input() visible: boolean = false;
  @Input() modalType: 'flights' | 'budget' = 'flights'; // Default to flights
  @Output() close = new EventEmitter<void>();
  @Output() login = new EventEmitter<void>();
  @Output() register = new EventEmitter<void>();

  get modalTitle(): string {
    return 'Inicia sesión para continuar';
  }

  get modalMessage(): string {
    if (this.modalType === 'budget') {
      return 'Para guardar tu presupuesto, necesitas iniciar sesión.';
    } else {
      return 'Para ver más opciones de vuelos o continuar con tu reserva, necesitas iniciar sesión.';
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onLogin(): void {
    this.login.emit();
  }

  onRegister(): void {
    this.register.emit();
  }
}
