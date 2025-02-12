import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

// Definimos una interfaz para el objeto personalInfo
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
  personalInfo: PersonalInfo = {
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

  constructor(private router: Router, private route: ActivatedRoute) {}

  onEdit() {
    this.router.navigate(['update'], { relativeTo: this.route });
  }
}
