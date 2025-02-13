import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-update-profile-section',
  standalone: false,
  templateUrl: './update-profile-section.component.html',
  styleUrls: ['./update-profile-section.component.scss'],
})
export class UpdateProfileSectionComponent implements OnInit {
  personalInfo = {
    nombre: '',
    telefono: '',
    email: '',
    dni: '',
    pasaporte: '',
    fechaExpedicionPasaporte: '',
    fechaVencimientoPasaporte: '',
    nacionalidad: '',
    sexo: '',
    fechaNacimiento: '',
    avatarUrl: '',
  };

  uploadedFiles: any[] = [];
  previewImageUrl: string | null = null;
  maxFileSize: number = 5000000; // 5MB

  sexoOptions = [
    { label: 'Hombre', value: 'Hombre' },
    { label: 'Mujer', value: 'Mujer' },
  ];

  filteredSexoOptions: any[] = [];

  constructor(private router: Router, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.personalInfo = {
      nombre: 'Orlando Granados',
      telefono: '9638524242',
      email: 'himiyok566@pixdd.com',
      dni: '951753654F',
      pasaporte: 'AB142537',
      fechaExpedicionPasaporte: '04/10/2024',
      fechaVencimientoPasaporte: '13/02/2025',
      nacionalidad: 'Español',
      sexo: 'Hombre',
      fechaNacimiento: '07/06/2024',
      avatarUrl: 'https://picsum.photos/200',
    };
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

  onSubmit() {
    console.log('Información actualizada:', this.personalInfo);
    console.log('Archivos subidos:', this.uploadedFiles);
    this.router.navigate(['/profile']);
  }

  clearFiles() {
    this.uploadedFiles = [];
    this.previewImageUrl = null;
    this.personalInfo.avatarUrl = 'https://picsum.photos/200';
  }

  onCancel() {
    this.uploadedFiles = [];
    this.previewImageUrl = null;
    this.router.navigate(['/profile']);
  }
}
