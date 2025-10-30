import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { PersonalInfo } from '../../../../core/models/v2/profile-v2.model';
import { PersonalInfoV2Service } from '../../../../core/services/v2/personal-info-v2.service';



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

  // Datos para cambio de contraseña con código de verificación
  verificationData = {
    code: '',
    newPassword: '',
    confirmPassword: ''
  };
  passwordErrors: { [key: string]: string } = {};
  isCodeSent: boolean = false;
  isSendingCode: boolean = false;
  isPasswordLoading: boolean = false;

  constructor(private personalInfoService: PersonalInfoV2Service) {}

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

  sendVerificationCode(): void {
    this.isSendingCode = true;
    
    // Enviar código de verificación al usuario
    // this.authService.sendPasswordResetCode(this.personalInfo.email).subscribe({
    //   next: (response) => {
    //     this.isCodeSent = true;
    //     this.isSendingCode = false;
    //   },
    //   error: (error) => {
    //     this.isSendingCode = false;
    //     // Mostrar mensaje de error
    //   }
    // });
    
    // Simular envío de código
    setTimeout(() => {
      this.isCodeSent = true;
      this.isSendingCode = false;
    }, 2000);
  }

  onVerificationCodeInput(event: any): void {
    const input = event.target as HTMLInputElement;
    input.value = this.personalInfoService.filterVerificationCodeInput(input.value);
    this.verificationData.code = input.value;
    this.clearPasswordError('code');
  }

  onNewPasswordChange(value: string): void {
    this.verificationData.newPassword = value;
    this.clearPasswordError('newPassword');
    // Si hay confirmación, validar que coincidan
    if (this.verificationData.confirmPassword) {
      this.clearPasswordError('confirmPassword');
    }
  }

  onConfirmPasswordChange(value: string): void {
    this.verificationData.confirmPassword = value;
    this.clearPasswordError('confirmPassword');
  }

  onPasswordSubmit(): void {
    this.isPasswordLoading = true;
    
    if (this.validatePasswordForm()) {
      // Cambiar contraseña con código de verificación
      // this.authService.changePasswordWithCode(
      //   this.verificationData.code, 
      //   this.verificationData.newPassword
      // ).subscribe({
      //   next: (response) => {
      //     this.cancelPasswordChange();
      //     // Mostrar mensaje de éxito
      //   },
      //   error: (error) => {
      //     this.isPasswordLoading = false;
      //     // Mostrar mensaje de error
      //   }
      // });
      
      // Simular cambio de contraseña
      setTimeout(() => {
        this.isPasswordLoading = false;
        this.cancelPasswordChange();
      }, 2000);
      
    } else {
      this.isPasswordLoading = false;
    }
  }

  private validatePasswordForm(): boolean {
    const validation = this.personalInfoService.validatePasswordForm(
      this.verificationData.code,
      this.verificationData.newPassword,
      this.verificationData.confirmPassword
    );
    
    this.passwordErrors = validation.errors;
    return validation.isValid;
  }

  getPasswordError(fieldName: string): string {
    return this.passwordErrors[fieldName] || '';
  }

  hasPasswordError(fieldName: string): boolean {
    return !!this.passwordErrors[fieldName];
  }

  clearPasswordError(fieldName: string): void {
    if (this.passwordErrors[fieldName]) {
      delete this.passwordErrors[fieldName];
    }
  }

  cancelPasswordChange(): void {
    this.verificationData = {
      code: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.passwordErrors = {};
    this.isCodeSent = false;
    this.isPasswordLoading = false;
    this.isSendingCode = false;
  }

  /**
   * Maneja el evento cuando el perfil se actualiza exitosamente
   */
  onProfileUpdated(): void {
    // Formatear la fecha de nacimiento para mostrar correctamente
    if (this.personalInfo.fechaNacimiento) {
      this.personalInfo.fechaNacimiento = this.personalInfoService.formatDateForDisplay(this.personalInfo.fechaNacimiento);
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