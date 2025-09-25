import { Component, Input, OnInit } from '@angular/core';
import { PersonalInfo } from '../../../../core/models/v2/profile-v2.model';
import { PersonalInfoV2Service } from '../../../../core/services/v2/personal-info-v2.service';



@Component({
  selector: 'app-personal-info-section-v2',
  standalone: false,
  templateUrl: './personal-info-section-v2.component.html',
  styleUrl: './personal-info-section-v2.component.scss',
})
export class PersonalInfoSectionV2Component implements OnInit {
  @Input() userId: string = '';
  personalInfo!: PersonalInfo;
  isEditing: boolean = false;
  private originalPersonalInfo!: PersonalInfo; // Para almacenar datos originales

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
    // Generar datos mock basados en userId
    this.generateMockData();
  }
  
  private generateMockData() {
    this.personalInfo = this.personalInfoService.generateMockData(this.userId);
    
    // Formatear fecha de nacimiento para mostrar
    if (this.personalInfo.fechaNacimiento) {
      this.personalInfo.fechaNacimiento = this.personalInfoService.formatDateForDisplay(this.personalInfo.fechaNacimiento);
    }

    // Guardar datos originales para poder restaurarlos
    this.originalPersonalInfo = { ...this.personalInfo };
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
}