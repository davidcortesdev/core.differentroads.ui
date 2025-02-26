import { Component, OnInit } from '@angular/core';
import { UsersService } from '../../core/services/users.service';
import { AuthenticateService } from '../../core/services/auth-service.service'; // Import AuthenticateService

export interface PersonalInfo {
  id?: string;
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
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  personalInfo!: PersonalInfo;
  isEditing: boolean = false;
  avatarUrl: string = 'https://picsum.photos/200';
  userEmail: string = '';

  constructor(
    private usersService: UsersService,
    private authService: AuthenticateService // Inject AuthenticateService
  ) {}

  ngOnInit() {
    this.authService.getUserAttributes().subscribe((userAttributes) => {
      this.userEmail = userAttributes.email;
      this.fetchUserData(this.userEmail);
    });
  }

  fetchUserData(email: string) {
    this.usersService.getUserByEmail(email).subscribe((user) => {
      this.personalInfo = {
        id: user._id,
        nombre: user.names || '',
        telefono: user.phone?.toString() || '',
        email: user.email,
        dni: user.dni || '',
        pasaporte: user.passportID || '',
        fechaExpedicionPasaporte: user.passportIssueDate
          ? this.formatDate(new Date(user.passportIssueDate))
          : '',
        fechaVencimientoPasaporte: user.passportExpirationDate
          ? this.formatDate(new Date(user.passportExpirationDate))
          : '',
        nacionalidad: user?.nationality || '',
        sexo: user.sex || '',
        fechaNacimiento: user.birthdate
          ? this.formatDate(new Date(user.birthdate))
          : '',
        avatarUrl: user?.profileImage || this.avatarUrl,
      };
    });
  }

  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.saveUserData();
    }
  }

  saveUserData() {
    console.log('Información guardada:', this.personalInfo);
    // Aquí puedes agregar la lógica para guardar los datos actualizados
  }
}
