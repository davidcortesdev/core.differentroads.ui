import { Component, Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

interface PersonalInfo {
  nombre: string;
  telefono: string;
  email: string;
  sexo: string;
  fechaNacimiento: string;
  ciudad: string;
  codigoPostal: string;
  dni: string;
  fechaExpedicionDni: string;
  fechaCaducidadDni: string;
  pasaporte: string;
  paisExpedicion: string;
  fechaExpedicionPasaporte: string;
  fechaVencimientoPasaporte: string;
  nacionalidad: string;
  avatarUrl: string;
}

@Component({
  selector: 'app-personal-info-section',
  standalone: false,
  templateUrl: './personal-info-section.component.html',
  styleUrl: './personal-info-section.component.scss',
})
export class PersonalInfoSectionComponent {
  @Input() personalInfo!: PersonalInfo;
  @Input() toggleEdit!: () => void;

  constructor(private router: Router, private route: ActivatedRoute) {}

  onEdit() {
    this.toggleEdit();
  }
}
