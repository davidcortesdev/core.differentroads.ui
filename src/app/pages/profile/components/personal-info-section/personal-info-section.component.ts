import { Component, Input } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UsersService } from '../../../../core/services/users.service';

interface PersonalInfo {
  nombre: string;
  telefono: string;
  email: string;
  dni: string;
  pasaporte: string;
  fechaExpedicionPasaporte: string;
  fechaVencimientoPasaporte: string;
  nacionalidad: string;
  sexo: string;
  fechaNacimiento: string;
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
