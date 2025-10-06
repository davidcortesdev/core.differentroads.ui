import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { PersonalInfo } from '../../../../core/models/v2/profile-v2.model';
import { UpdateProfileV2Service } from '../../../../core/services/v2/update-profile-v2.service';

@Component({
  selector: 'app-update-profile-section-v2',
  standalone: false,
  templateUrl: './update-profile-section-v2.component.html',
  styleUrls: ['./update-profile-section-v2.component.scss'],
})
export class UpdateProfileSectionV2Component{
  @Input() userId: string = '';
  @Input() personalInfo: PersonalInfo = {};
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() profileUpdated = new EventEmitter<void>();

  uploadedFiles: any[] = [];
  previewImageUrl: string | null = null;
  maxFileSize: number = 5000000; // 5MB
  formErrors: { [key: string]: string } = {};
  isFormSubmitted: boolean = false;
  
  // Estados de carga y errores
  isSaving: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';



  constructor(private updateProfileService: UpdateProfileV2Service) { }


  formatDate(dateInput: string | Date | undefined): string {
    return this.updateProfileService.formatDate(dateInput);
  }


  onUpload(event: any) {
    for (let file of event.files) {
      const validation = this.updateProfileService.validateImageFile(file, this.maxFileSize);
      if (!validation.isValid) {
        return;
      }

      this.uploadedFiles = [file];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewImageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Validaciones de campos
  onTelefonoInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateTelefonoInput(input.value);
    this.clearFieldError('telefono');
  }

  onDniInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateDniInput(input.value);
    this.clearFieldError('dni');
  }


  onCiudadInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateCiudadInput(input.value);
  }

  onCodigoPostalInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateCodigoPostalInput(input.value);
    this.clearFieldError('codigoPostal');
  }

  onDireccionInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateDireccionInput(input.value);
  }

  onPaisInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validatePaisInput(input.value);
  }

  onNotasInput(event: any) {
    this.clearFieldError('notas');
  }

  // Métodos para limpiar errores en otros campos
  onNombreInput(event: any) {
    const input = event.target as HTMLInputElement;
    const filteredValue = this.updateProfileService.validateNombreInput(input.value);
    input.value = filteredValue;
    this.clearFieldError('nombre');
  }

  onApellidoInput(event: any) {
    const input = event.target as HTMLInputElement;
    const filteredValue = this.updateProfileService.validateApellidoInput(input.value);
    input.value = filteredValue;
    this.clearFieldError('apellido');
  }

  onEmailInput(event: any) {
    this.clearFieldError('email');
  }

  onFechaNacimientoChange(event: any) {
    this.clearFieldError('fechaNacimiento');
  }


  onSubmit() {
    this.isFormSubmitted = true;
    
    // Validar formulario antes de enviar
    if (this.validateForm(this.personalInfo)) {
      // Los datos ya están sincronizados con [(ngModel)], no necesitamos getFormData()
      
      // Actualizar perfil del usuario usando el servicio limpio
      this.isSaving = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      this.updateProfileService.updateUserProfile(this.userId, this.personalInfo).subscribe({
        next: (response) => {
          this.isSaving = false;
          this.successMessage = 'Perfil actualizado correctamente';
          this.isFormSubmitted = false;
          
          // Emitir evento para notificar al componente padre
          this.profileUpdated.emit();
        },
        error: (error) => {
          this.isSaving = false;
          this.errorMessage = 'Error al actualizar el perfil. Por favor, inténtalo de nuevo.';
        }
      });
      
    } else {
      this.errorMessage = 'Por favor, corrige los errores en el formulario antes de continuar.';
    }
  }


  // Método para obtener el mensaje de error de un campo
  getFieldError(fieldName: string): string {
    return this.formErrors[fieldName] || '';
  }

  // Método para verificar si un campo tiene error
  hasFieldError(fieldName: string): boolean {
    return this.isFormSubmitted && !!this.formErrors[fieldName];
  }

  // Método para limpiar errores de un campo específico
  clearFieldError(fieldName: string) {
    if (this.formErrors[fieldName]) {
      delete this.formErrors[fieldName];
    }
  }

  private validateForm(formData: Partial<PersonalInfo>): boolean {
    const validation = this.updateProfileService.validateForm(formData as PersonalInfo);
    this.formErrors = validation.errors;
    return validation.isValid;
  }

  clearFiles() {
    this.uploadedFiles = [];
    this.previewImageUrl = null;
    this.personalInfo.avatarUrl = 'https://picsum.photos/200';
  }

  onCancel() {
    this.uploadedFiles = [];
    this.previewImageUrl = null;
    // Emitir evento para volver al modo de visualización
    this.cancelEdit.emit();
  }


}