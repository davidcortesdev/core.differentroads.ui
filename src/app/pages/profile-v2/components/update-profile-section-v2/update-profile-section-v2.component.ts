import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { PersonalInfo } from '../../../../core/models/v2/profile-v2.model';
import { UpdateProfileV2Service } from '../../../../core/services/v2/update-profile-v2.service';

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


  sexoOptions = [
    { label: 'Hombre', value: 'Hombre' },
    { label: 'Mujer', value: 'Mujer' },
  ];

  filteredSexoOptions: any[] = [];

  constructor(private updateProfileService: UpdateProfileV2Service) {}

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
        this.personalInfo.avatarUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Validaciones de campos
  onTelefonoInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateTelefonoInput(input.value);
    this.personalInfo.telefono = input.value;
    this.clearFieldError('telefono');
  }

  onDniInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateDniInput(input.value);
    this.personalInfo.dni = input.value;
    this.clearFieldError('dni');
  }

  onNacionalidadInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateNacionalidadInput(input.value);
    this.personalInfo.nacionalidad = input.value;
  }

  onPasaporteInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validatePasaporteInput(input.value);
    this.personalInfo.pasaporte = input.value;
    this.clearFieldError('pasaporte');
  }

  onCiudadInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateCiudadInput(input.value);
    this.personalInfo.ciudad = input.value;
  }

  onCodigoPostalInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateCodigoPostalInput(input.value);
    this.personalInfo.codigoPostal = input.value;
    this.clearFieldError('codigoPostal');
  }

  onPaisExpedicionInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validatePaisExpedicionInput(input.value);
    this.personalInfo.paisExpedicion = input.value;
  }

  // Métodos para limpiar errores en otros campos
  onNombreInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateNombreInput(input.value);
    // NO actualizar personalInfo.nombre aquí - solo se actualiza al guardar
    this.clearFieldError('nombre');
  }

  onApellidoInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = this.updateProfileService.validateApellidoInput(input.value);
    this.clearFieldError('apellido');
  }

  onEmailInput(event: any) {
    this.personalInfo.email = event.target.value;
    this.clearFieldError('email');
  }

  onFechaNacimientoChange(event: any) {
    this.personalInfo.fechaNacimiento = event;
    this.clearFieldError('fechaNacimiento');
  }

  onFechaExpedicionDniChange(event: any) {
    this.personalInfo.fechaExpedicionDni = event;
    this.clearFieldError('fechaExpedicionDni');
    this.clearFieldError('fechaCaducidadDni'); // Limpiar también el error de caducidad
  }

  onFechaCaducidadDniChange(event: any) {
    this.personalInfo.fechaCaducidadDni = event;
    this.clearFieldError('fechaCaducidadDni');
    this.clearFieldError('fechaExpedicionDni'); // Limpiar también el error de expedición
  }

  onFechaExpedicionPasaporteChange(event: any) {
    this.personalInfo.fechaExpedicionPasaporte = event;
    this.clearFieldError('fechaExpedicionPasaporte');
    this.clearFieldError('fechaVencimientoPasaporte'); // Limpiar también el error de vencimiento
  }

  onFechaVencimientoPasaporteChange(event: any) {
    this.personalInfo.fechaVencimientoPasaporte = event;
    this.clearFieldError('fechaVencimientoPasaporte');
    this.clearFieldError('fechaExpedicionPasaporte'); // Limpiar también el error de expedición
  }

  onSubmit() {
    this.isFormSubmitted = true;
    
    // Validar formulario antes de enviar
    if (this.validateForm()) {
      // Capturar valores actuales de los inputs y actualizar personalInfo
      const nombreInput = document.querySelector('input[name="nombre"]') as HTMLInputElement;
      const apellidoInput = document.querySelector('input[name="apellido"]') as HTMLInputElement;
      
      if (nombreInput) {
        this.personalInfo.nombre = nombreInput.value.trim();
      }
      if (apellidoInput) {
        this.personalInfo.apellido = apellidoInput.value.trim();
      }
      
      const userData = this.updateProfileService.prepareDataForAPI(this.personalInfo, this.uploadedFiles);
      
      // Actualizar perfil del usuario
      // this.usersServiceV2.updateUser(this.userId, userData).subscribe({
      //   next: (response) => {
      //     // Mostrar mensaje de éxito
      //     // this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Perfil actualizado correctamente' });
      //   },
      //   error: (error) => {
      //     // Mostrar mensaje de error
      //     // this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el perfil' });
      //   }
      // });
      
    } else {
      // TODO: Mostrar mensaje de error de validación
      // this.messageService.add({ severity: 'warn', summary: 'Validación', detail: 'Por favor, revisa los campos marcados en rojo' });
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

  private validateForm(): boolean {
    const validation = this.updateProfileService.validateForm(this.personalInfo);
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