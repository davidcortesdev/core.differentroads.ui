import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { PersonalInfo } from '../../../../core/models/v2/profile-v2.model';
import { UpdateProfileV2Service } from '../../../../core/services/v2/update-profile-v2.service';
import { PersonalInfoV2Service } from '../../../../core/services/v2/personal-info-v2.service';

@Component({
  selector: 'app-update-profile-section-v2',
  standalone: false,
  templateUrl: './update-profile-section-v2.component.html',
  styleUrls: ['./update-profile-section-v2.component.scss'],
})
export class UpdateProfileSectionV2Component implements OnInit {
  @Input() userId: string = '';
  @Input() personalInfo: PersonalInfo = {};
  @Output() cancelEdit = new EventEmitter<void>();

  uploadedFiles: any[] = [];
  previewImageUrl: string | null = null;
  maxFileSize: number = 5000000; // 5MB
  formErrors: { [key: string]: string } = {};
  isFormSubmitted: boolean = false;
  
  // Estados de carga y errores
  isSaving: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';


  sexoOptions = [
    { label: 'Hombre', value: 'Hombre' },
    { label: 'Mujer', value: 'Mujer' },
  ];

  filteredSexoOptions: any[] = [];

  constructor(
    private updateProfileService: UpdateProfileV2Service,
    private personalInfoService: PersonalInfoV2Service
  ) {}

  ngOnInit() {
    // Generar datos mock si no se proporcionan
    if (!this.personalInfo || Object.keys(this.personalInfo).length === 0) {
      this.generateMockData();
    }
  }

  private generateMockData(): void {
    const userSuffix = this.userId.slice(-3);
    
    this.personalInfo = {
      id: `user-${userSuffix}`,
      nombre: `Usuario ${userSuffix}`,
      apellido: 'Apellido',
      avatarUrl: 'https://picsum.photos/200',
      email: `usuario${userSuffix}@example.com`,
      telefono: '600123456',
      dni: '12345678A',
      nacionalidad: 'Española',
      pasaporte: 'AB1234567',
      fechaExpedicionPasaporte: '2020-01-15',
      fechaVencimientoPasaporte: '2030-01-15',
      sexo: 'Hombre',
      fechaNacimiento: '1990-05-15',
      ciudad: 'Madrid',
      codigoPostal: '28001',
      fechaExpedicionDni: '2018-03-10',
      fechaCaducidadDni: '2028-03-10',
      paisExpedicion: 'España',
    };
  }

  formatDate(dateInput: string | Date | undefined): string {
    return this.updateProfileService.formatDate(dateInput);
  }

  filterSexo(event: any) {
    let filtered: any[] = [];
    let query = event.query;

    for (let i = 0; i < this.sexoOptions.length; i++) {
      let sexo = this.sexoOptions[i];
      if (sexo.label.toLowerCase().indexOf(query.toLowerCase()) == 0) {
        filtered.push(sexo);
      }
    }

    this.filteredSexoOptions = filtered;
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

  onNacionalidadInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateNacionalidadInput(input.value);
  }

  onPasaporteInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validatePasaporteInput(input.value);
    this.clearFieldError('pasaporte');
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

  onPaisExpedicionInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validatePaisExpedicionInput(input.value);
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

  onFechaExpedicionDniChange(event: any) {
    this.clearFieldError('fechaExpedicionDni');
    this.clearFieldError('fechaCaducidadDni'); // Limpiar también el error de caducidad
  }

  onFechaCaducidadDniChange(event: any) {
    this.clearFieldError('fechaCaducidadDni');
    this.clearFieldError('fechaExpedicionDni'); // Limpiar también el error de expedición
  }

  onFechaExpedicionPasaporteChange(event: any) {
    this.clearFieldError('fechaExpedicionPasaporte');
    this.clearFieldError('fechaVencimientoPasaporte'); // Limpiar también el error de vencimiento
  }

  onFechaVencimientoPasaporteChange(event: any) {
    this.clearFieldError('fechaVencimientoPasaporte');
    this.clearFieldError('fechaExpedicionPasaporte'); // Limpiar también el error de expedición
  }

  onSubmit() {
    this.isFormSubmitted = true;
    
    // Capturar todos los valores del formulario
    const formData = this.captureFormData();
    
    // Validar formulario antes de enviar
    if (this.validateForm(formData)) {
      // Actualizar el modelo principal con los datos capturados
      this.personalInfo = { ...this.personalInfo, ...formData };
      
      // Asegurar que el userData tenga el ID del usuario
      const userData = { 
        ...this.personalInfo,
        id: this.personalInfo.id || this.userId
      };
      
      // Actualizar perfil del usuario usando la API real
      this.isSaving = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      this.personalInfoService.saveUserData(userData).subscribe({
        next: (response) => {
          this.isSaving = false;
          this.successMessage = 'Perfil actualizado correctamente';
          this.isFormSubmitted = false;
          
          // Emitir evento para notificar al componente padre
          this.cancelEdit.emit();
        },
        error: (error) => {
          this.isSaving = false;
          this.errorMessage = 'Error al actualizar el perfil. Por favor, inténtalo de nuevo.';
          console.error('Error al actualizar perfil:', error);
        }
      });
      
    } else {
      // TODO: Mostrar mensaje de error de validación
      // this.messageService.add({ severity: 'warn', summary: 'Validación', detail: 'Por favor, revisa los campos marcados en rojo' });
    }
  }

  /**
   * Captura todos los valores actuales del formulario
   * @returns Objeto con los datos del formulario
   */
  private captureFormData(): Partial<PersonalInfo> {
    const formData: Partial<PersonalInfo> = {};

    // Función auxiliar para obtener valor de input de texto
    const getInputValue = (name: string): string => {
      const input = document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
      return input ? input.value.trim() : '';
    };

    // Función auxiliar para obtener valor de dropdown
    const getDropdownValue = (name: string): string => {
      const dropdown = document.querySelector(`p-dropdown[name="${name}"]`) as any;
      if (dropdown) {
        if (dropdown.selectedOption) {
          return dropdown.selectedOption.value || '';
        } else if (dropdown.value) {
          return dropdown.value || '';
        }
      }
      return '';
    };

    // Función auxiliar para obtener valor de calendar
    const getCalendarValue = (name: string): string => {
      const calendar = document.querySelector(`p-calendar[name="${name}"]`) as any;
      if (calendar && calendar.value) {
        return this.updateProfileService.formatDate(calendar.value);
      }
      return '';
    };

    // Capturar valores de inputs de texto
    formData.nombre = getInputValue('nombre');
    formData.apellido = getInputValue('apellido');
    formData.email = getInputValue('email');
    formData.telefono = getInputValue('telefono');
    formData.dni = getInputValue('dni');
    formData.nacionalidad = getInputValue('nacionalidad');
    formData.pasaporte = getInputValue('pasaporte');
    formData.ciudad = getInputValue('ciudad');
    formData.codigoPostal = getInputValue('codigoPostal');
    formData.paisExpedicion = getInputValue('paisExpedicion');

    // Capturar valores de selects
    formData.sexo = getDropdownValue('sexo');

    // Capturar valores de fechas
    formData.fechaNacimiento = getCalendarValue('fechaNacimiento');
    formData.fechaExpedicionDni = getCalendarValue('fechaExpedicionDni');
    formData.fechaCaducidadDni = getCalendarValue('fechaCaducidadDni');
    formData.fechaExpedicionPasaporte = getCalendarValue('fechaExpedicion');
    formData.fechaVencimientoPasaporte = getCalendarValue('fechaVencimiento');

    return formData;
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