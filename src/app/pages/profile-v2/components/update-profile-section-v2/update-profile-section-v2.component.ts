import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PersonalInfo } from '../../../../core/models/v2/profile-v2.model';
import { UpdateProfileV2Service } from '../../../../core/services/v2/update-profile-v2.service';
import { CloudinaryService } from '../../../../core/services/media/cloudinary.service';

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
  isUploadingImage: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Opciones para el dropdown de sexo
  sexoOptions = [
    { label: 'Masculino', value: 'Masculino' },
    { label: 'Femenino', value: 'Femenino' },
    { label: 'Otro', value: 'Otro' }
  ];

  constructor(
    private updateProfileService: UpdateProfileV2Service,
    private cloudinaryService: CloudinaryService
  ) { }


  formatDate(dateInput: string | Date | undefined): string {
    return this.updateProfileService.formatDate(dateInput);
  }


  onUpload(event: any) {
    for (let file of event.files) {
      const validation = this.updateProfileService.validateImageFile(file, this.maxFileSize);
      if (!validation.isValid) {
        this.errorMessage = validation.error || 'Error al validar el archivo';
        return;
      }

      this.uploadedFiles = [file];
      this.isUploadingImage = true;
      this.errorMessage = '';
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewImageUrl = e.target.result;
        
        // Subir la imagen a Cloudinary
        this.cloudinaryService.uploadImage(e.target.result).subscribe({
          next: (uploadedImage) => {
            // Guardar la URL de Cloudinary en lugar del DataURL
            this.personalInfo.avatarUrl = uploadedImage.url;
            this.isUploadingImage = false;
            this.successMessage = 'Imagen cargada correctamente';
            setTimeout(() => this.successMessage = '', 3000);
          },
          error: (error) => {
            console.error('Error uploading image:', error);
            this.errorMessage = 'Error al subir la imagen. Por favor, intenta de nuevo.';
            this.isUploadingImage = false;
            this.uploadedFiles = [];
            this.previewImageUrl = null;
          }
        });
      };
      reader.readAsDataURL(file);
    }
  }

  onRemoveImage() {
    this.uploadedFiles = [];
    this.previewImageUrl = null;
    // Limpiar la URL de la imagen del personalInfo
    this.personalInfo.avatarUrl = '';
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
    this.clearFieldError('nombre');
    // Aplicar validación al modelo, no al DOM
    if (this.personalInfo.nombre) {
      this.personalInfo.nombre = this.updateProfileService.validateNombreInput(this.personalInfo.nombre);
    }
  }

  onApellidoInput(event: any) {
    this.clearFieldError('apellido');
    // Aplicar validación al modelo, no al DOM
    if (this.personalInfo.apellido) {
      this.personalInfo.apellido = this.updateProfileService.validateApellidoInput(this.personalInfo.apellido);
    }
  }

  onEmailInput(event: any) {
    this.clearFieldError('email');
  }

  onFechaNacimientoChange(event: any) {
    this.clearFieldError('fechaNacimiento');
  }

  onSexoChange(event: any) {
    this.clearFieldError('sexo');
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