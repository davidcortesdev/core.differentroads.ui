import { Component, Input, OnInit } from '@angular/core';
import { UsersService } from '../../../../core/services/users.service';

export interface PersonalInfo {
  id?: string;
  nombre?: string;
  apellido?: string;
  avatarUrl?: string;
  email?: string;
  telefono?: string;
  dni?: string;
  nacionalidad?: string;
  pasaporte?: string;
  fechaExpedicionPasaporte?: string;
  fechaVencimientoPasaporte?: string;
  sexo?: string;
  fechaNacimiento?: string;
  ciudad?: string;
  codigoPostal?: string;
  fechaExpedicionDni?: string;
  fechaCaducidadDni?: string;
  paisExpedicion?: string;
}

@Component({
  selector: 'app-update-profile-section',
  standalone: false,
  templateUrl: './update-profile-section.component.html',
  styleUrls: ['./update-profile-section.component.scss'],
})
export class UpdateProfileSectionComponent implements OnInit {
  @Input() personalInfo!: Partial<PersonalInfo>;
  @Input() toggleEdit!: () => void;

  uploadedFiles: any[] = [];
  previewImageUrl: string | null = null;
  maxFileSize: number = 5000000; // 5MB

  sexoOptions = [
    { label: 'Hombre', value: 'Hombre' },
    { label: 'Mujer', value: 'Mujer' },
  ];

  filteredSexoOptions: any[] = [];

  constructor(private usersService: UsersService) {}

  ngOnInit() {
    console.log('Personal info:', this.personalInfo);

    if (!this.personalInfo) {
      this.personalInfo = {
        nombre: '',
        apellido: '',
        avatarUrl: 'https://picsum.photos/200',
        email: '',
        telefono: '',
        dni: '',
        nacionalidad: '',
        pasaporte: '',
        fechaExpedicionPasaporte: '',
        fechaVencimientoPasaporte: '',
        sexo: '',
        fechaNacimiento: '',
        ciudad: '',
        codigoPostal: '',
        fechaExpedicionDni: '',
        fechaCaducidadDni: '',
        paisExpedicion: '',
      };
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return ''; 
    const [day, month, year] = dateString.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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
      // Validar tamaño del archivo (5MB máximo)
      if (file.size > this.maxFileSize) {
        console.error('El archivo excede el tamaño máximo permitido de 5MB');
        return;
      }

      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        console.error('Solo se permiten archivos JPG, JPEG, PNG o WEBP');
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
    input.value = input.value.replace(/\D/g, '').slice(0, 10);
    this.personalInfo.telefono = input.value;
  }

  onDniInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase().slice(0, 9);
    this.personalInfo.dni = input.value;
  }

  onNacionalidadInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.slice(0, 50);
    this.personalInfo.nacionalidad = input.value;
  }

  onPasaporteInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase().slice(0, 10);
    this.personalInfo.pasaporte = input.value;
  }

  onCiudadInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.slice(0, 50);
    this.personalInfo.ciudad = input.value;
  }

  onCodigoPostalInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 5);
    this.personalInfo.codigoPostal = input.value;
  }

  onPaisExpedicionInput(event: any) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.slice(0, 50);
    this.personalInfo.paisExpedicion = input.value;
  }

  onSubmit() {
    const transformedPersonalInfo = {
      id: this.personalInfo.id,
      email: this.personalInfo.email,
      names: this.personalInfo.nombre,
      lastname: this.personalInfo.apellido,
      phone: this.personalInfo.telefono
        ? parseInt(this.personalInfo.telefono, 10)
        : undefined,
      sex: this.personalInfo.sexo,
      birthdate: this.formatDate(this.personalInfo.fechaNacimiento),
      dni: this.personalInfo.dni,
      dniIssueDate: this.formatDate(this.personalInfo.fechaExpedicionDni),
      dniExpirationDate: this.formatDate(this.personalInfo.fechaCaducidadDni),
      nationality: this.personalInfo.nacionalidad,
      city: this.personalInfo.ciudad,
      postalCode: this.personalInfo.codigoPostal,
      passportID: this.personalInfo.pasaporte,
      passportIssuingCountry: this.personalInfo.paisExpedicion,
      passportIssueDate: this.formatDate(this.personalInfo.fechaExpedicionPasaporte),
      passportExpirationDate: this.formatDate(this.personalInfo.fechaVencimientoPasaporte),
      profileImage:
        this.uploadedFiles?.length > 0
          ? this.uploadedFiles[0]
          : this.personalInfo.avatarUrl,
    };

    this.usersService
      .updateUser(this.personalInfo.id!, transformedPersonalInfo)
      .subscribe({
        next: (updatedUser) => {
          console.log('Información actualizada:', updatedUser);
          this.toggleEdit();
        },
        error: (error) => {
          console.error('Error al actualizar la información:', error);
        },
      });
  }

  clearFiles() {
    this.uploadedFiles = [];
    this.previewImageUrl = null;
    this.personalInfo.avatarUrl = 'https://picsum.photos/200';
  }

  onCancel() {
    this.uploadedFiles = [];
    this.previewImageUrl = null;
    this.toggleEdit();
  }
}
