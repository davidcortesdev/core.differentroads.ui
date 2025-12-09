import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthenticateService } from '../../../core/services/auth/auth-service.service';

@Component({
  selector: 'app-confirmation-code',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './confirmation-code.component.html',
  styleUrls: ['./confirmation-code.component.scss']
})
export class ConfirmationCodeComponent implements OnInit {
  @Input() username: string = '';
  @Input() isLoading: boolean = false;
  @Input() isRedirecting: boolean = false;
  @Input() errorMessage: string = '';
  @Input() successMessage: string = '';

  @Output() confirmSuccess = new EventEmitter<void>();
  @Output() loadingChange = new EventEmitter<boolean>();
  @Output() errorMessageChange = new EventEmitter<string>();
  @Output() successMessageChange = new EventEmitter<string>();

  confirmForm: FormGroup;

  // Mensajes de error personalizados
  errorMessages: { [key: string]: { [key: string]: string } } = {
    username: {
      required: 'El correo electrónico es requerido.',
    },
    confirmationCode: {
      required: 'El código de confirmación es requerido.',
      pattern: 'El código debe contener solo números.',
    },
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticateService
  ) {
    this.confirmForm = this.fb.group({
      username: ['', [Validators.required]],
      confirmationCode: [
        '',
        [Validators.required, Validators.pattern(/^[0-9]+$/)],
      ],
    });
  }

  ngOnInit(): void {
    // Inicializa el formulario con el username recibido
    this.confirmForm.patchValue({
      username: this.username
    });
  }

  onConfirm(): void {
    if (this.confirmForm.invalid) {
      this.setErrorMessage('Por favor, corrige los errores en el formulario.');
      return;
    }

    this.setLoading(true);
    this.setErrorMessage('');
    const confirmationCode = this.confirmForm.value.confirmationCode.toString().trim();

    this.authService
      .confirmSignUp(
        this.confirmForm.value.username,
        confirmationCode
      )
      .then(() => {
        this.setLoading(false);
        this.setSuccessMessage('Verificación exitosa. Iniciando sesión...');

        // Emitir evento de éxito
        this.confirmSuccess.emit();
      })
      .catch((error) => {
        this.setLoading(false);
        this.setErrorMessage(error.message || 'Confirmación fallida');
      });
  }

  resendConfirmationCode(): void {
    if (!this.username) {
      this.setErrorMessage('No se ha proporcionado un correo electrónico.');
      return;
    }

    this.setLoading(true);
    this.setErrorMessage('');
    
    this.authService
      .resendConfirmationCode(this.username)
      .then(() => {
        this.setLoading(false);
        this.setSuccessMessage('Se ha enviado un nuevo código de verificación a tu correo electrónico.');
        setTimeout(() => {
          this.setSuccessMessage('');
        }, 5000);
      })
      .catch((error) => {
        this.setLoading(false);
        this.setErrorMessage(error.message || 'Error al reenviar el código');
      });
  }

  getErrorMessage(controlName: string, errors: any): string {
    if (errors) {
      const errorKey = Object.keys(errors)[0];
      return this.errorMessages[controlName][errorKey] || 'Error desconocido.';
    }
    return '';
  }

  private setLoading(value: boolean): void {
    this.isLoading = value;
    this.loadingChange.emit(value);
  }

  private setErrorMessage(message: string): void {
    this.errorMessage = message;
    this.errorMessageChange.emit(message);
  }

  private setSuccessMessage(message: string): void {
    this.successMessage = message;
    this.successMessageChange.emit(message);
  }
}