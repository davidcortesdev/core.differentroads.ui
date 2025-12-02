import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { PersonalInfo } from '../../../../core/models/v2/profile-v2.model';
import { PersonalInfoV2Service } from '../../../../core/services/v2/personal-info-v2.service';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';



@Component({
  selector: 'app-personal-info-section-v2',
  standalone: false,
  templateUrl: './personal-info-section-v2.component.html',
  styleUrl: './personal-info-section-v2.component.scss',
})
export class PersonalInfoSectionV2Component implements OnInit, OnChanges {
  @Input() userId: string = '';
  @Input() cognitoId: string = '';
  personalInfo!: PersonalInfo;
  private originalPersonalInfo!: PersonalInfo; // Para almacenar datos originales

  // Estados de carga y errores
  isLoading: boolean = false;
  isSaving: boolean = false;
  isEditing: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Estados para cambio de contraseña
  passwordStep: 'send' | 'reset' = 'send';
  isPasswordLoading: boolean = false;
  passwordErrorMessage: string = '';
  passwordSuccessMessage: string = '';
  userEmail: string = '';

  // Formulario de cambio de contraseña
  resetPasswordForm: FormGroup;

  constructor(
    private personalInfoService: PersonalInfoV2Service,
    private authService: AuthenticateService,
    private fb: FormBuilder
  ) {
    this.resetPasswordForm = this.fb.group(
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

  ngOnInit() {
    if (this.userId) {
      this.loadUserData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['userId'] && changes['userId'].currentValue) {
      this.loadUserData();
    }
  }
  
  loadUserData() {
    this.isLoading = true;
    this.errorMessage = '';
    this.personalInfoService.getUserData(this.userId).subscribe({
      next: (data) => {
        this.personalInfo = data;
        
        // Formatear fecha de nacimiento para mostrar
        if (this.personalInfo.fechaNacimiento) {
          this.personalInfo.fechaNacimiento = this.personalInfoService.formatDateForDisplay(this.personalInfo.fechaNacimiento);
        }

        // Formatear fecha de caducidad DNI para mostrar
        if (this.personalInfo.fechaExpiracionDni) {
          this.personalInfo.fechaExpiracionDni = this.personalInfoService.formatDateForDisplay(this.personalInfo.fechaExpiracionDni);
        }

        // Guardar datos originales para poder restaurarlos
        this.originalPersonalInfo = { ...this.personalInfo };
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del usuario:', error);
        this.errorMessage = 'Error al cargar los datos del usuario. Por favor, inténtalo de nuevo.';
        this.isLoading = false;
      }
    });
  }
  
  private formatDate(dateInput: Date | string): string {
    return this.personalInfoService.formatDateForDisplay(dateInput);
  }

  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
    
    // Si se cancela la edición, restaurar datos originales
    if (!this.isEditing) {
      this.restoreOriginalData();
    }
  }

  private restoreOriginalData(): void {
    // Restaurar datos originales desde originalPersonalInfo
    if (this.originalPersonalInfo) {
      this.personalInfo = { ...this.originalPersonalInfo };
    }
  }

  // ===== MÉTODOS PARA CAMBIO DE CONTRASEÑA CON CÓDIGO =====

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  async sendVerificationCode(): Promise<void> {
    if (!this.personalInfo?.email) {
      this.passwordErrorMessage = 'No se ha encontrado un correo electrónico asociado a tu cuenta.';
      return;
    }

    this.isPasswordLoading = true;
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    try {
      const email = this.personalInfo.email;
      await this.authService.forgotPassword(email);
      this.userEmail = email;
      this.passwordSuccessMessage = 'Código de verificación enviado a su correo.';
      this.passwordStep = 'reset';
    } catch (error: any) {
      this.passwordErrorMessage = this.translatePasswordError(error) || 'Error al enviar el código de verificación. Por favor, inténtalo de nuevo.';
    } finally {
      this.isPasswordLoading = false;
    }
  }

  async onPasswordSubmit(event: Event): Promise<void> {
    event.preventDefault();

    this.resetPasswordForm.markAllAsTouched();
    
    if (this.resetPasswordForm.invalid) {
      return;
    }

    this.isPasswordLoading = true;
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    try {
      const result = await this.authService.confirmForgotPassword(
        this.userEmail,
        this.resetPasswordForm.value.confirmationCode,
        this.resetPasswordForm.value.password
      );

      if (result) {
        this.passwordSuccessMessage = 'Contraseña actualizada exitosamente.';
        setTimeout(() => {
          this.cancelPasswordChange();
        }, 2000);
      } else {
        this.passwordErrorMessage = 'Código inválido o contraseña débil.';
      }
    } catch (error: any) {
      console.error('Error al actualizar la contraseña:', error);
      this.passwordErrorMessage = this.translatePasswordError(error) || 'Error al actualizar la contraseña.';
    } finally {
      this.isPasswordLoading = false;
    }
  }

  private translatePasswordError(error: any): string {
    if (!error) {
      return 'Error desconocido';
    }

    const errorMessage = error.message || error.toString() || '';
    const errorCode = error.code || error.name || '';

    if (
      errorCode === 'TooManyRequestsException' ||
      errorMessage.toLowerCase().includes('attempt limit exceeded') ||
      errorMessage.toLowerCase().includes('too many requests')
    ) {
      return 'Límite de intentos excedido. Por favor, intenta de nuevo más tarde.';
    }

    if (
      errorCode === 'LimitExceededException' ||
      errorMessage.toLowerCase().includes('limit exceeded')
    ) {
      return 'Límite de intentos excedido. Por favor, intenta de nuevo más tarde.';
    }

    if (
      errorCode === 'InvalidPasswordException' ||
      errorMessage.toLowerCase().includes('password')
    ) {
      return 'La contraseña no cumple con los requisitos.';
    }

    if (
      errorCode === 'CodeMismatchException' ||
      errorMessage.toLowerCase().includes('code mismatch') ||
      errorMessage.toLowerCase().includes('invalid verification code')
    ) {
      return 'Código de verificación incorrecto. Por favor, verifica el código e inténtalo de nuevo.';
    }

    if (
      errorCode === 'ExpiredCodeException' ||
      errorMessage.toLowerCase().includes('expired code')
    ) {
      return 'El código de verificación ha expirado. Por favor, solicita un nuevo código.';
    }

    if (errorCode === 'InvalidParameterException') {
      return 'Los datos proporcionados no son válidos.';
    }

    if (
      errorCode === 'UserNotFoundException' ||
      errorMessage.toLowerCase().includes('user not found')
    ) {
      return 'No se encontró una cuenta con este correo electrónico.';
    }

    if (errorMessage && !errorMessage.match(/[a-zA-Z]/)) {
      return errorMessage;
    }

    return errorMessage || 'Error al procesar la solicitud';
  }

  cancelPasswordChange(): void {
    this.resetPasswordForm.reset();
    this.passwordStep = 'send';
    this.isPasswordLoading = false;
    this.userEmail = '';
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';
  }

  /**
   * Maneja el evento cuando el perfil se actualiza exitosamente
   */
  onProfileUpdated(): void {
    // Formatear la fecha de nacimiento para mostrar correctamente
    if (this.personalInfo.fechaNacimiento) {
      this.personalInfo.fechaNacimiento = this.personalInfoService.formatDateForDisplay(this.personalInfo.fechaNacimiento);
    }
    
    // Formatear la fecha de caducidad DNI para mostrar correctamente
    if (this.personalInfo.fechaExpiracionDni) {
      this.personalInfo.fechaExpiracionDni = this.personalInfoService.formatDateForDisplay(this.personalInfo.fechaExpiracionDni);
    }
    
    // Actualizar los datos originales con los nuevos datos formateados
    this.originalPersonalInfo = { ...this.personalInfo };
    
    this.isEditing = false;
    this.successMessage = 'Perfil actualizado correctamente';
    
    // Limpiar mensaje de éxito después de 3 segundos
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }
}