import { Component, OnInit } from '@angular/core';
import { UsersService } from '../../core/services/users.service';
import { AuthenticateService } from '../../core/services/auth-service.service';
import { BookingListConfig } from './components/booking-list-section/booking-list-section.component';

export interface PersonalInfo {
  id?: string;
  nombre: string;
  apellido: string;
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
  ciudad: string;
  codigoPostal: string;
  fechaExpedicionDni: string;
  fechaCaducidadDni: string;
  paisExpedicion: string;
  rol: string;
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
  avatarUrl: string = '';
  userEmail: string = '';
  
  // Configuration for each booking list type
  activeBookingsConfig: BookingListConfig = {
    type: 'active-bookings',
    title: 'Reservas activas',
    emptyMessage: 'No hay reservas activas disponibles',
    status: 'Booked,RQ',
    actions: {
      download: true,
      send: true,
      view: true
    },
    buttonLabels: {
      download: 'Descargar',
      send: 'Enviar',
      view: 'Ver reserva'
    }
  };
  
  travelHistoryConfig: BookingListConfig = {
    type: 'travel-history',
    title: 'Historial de viajes',
    emptyMessage: 'No se han realizado viajes aún',
    status: 'Pending,Canceled',
    actions: {
      download: true,
      send: true,
      view: true
    },
    buttonLabels: {
      download: 'Descargar',
      send: 'Enviar',
      view: 'Ver viaje'
    }
  };
  
  recentBudgetsConfig: BookingListConfig = {
    type: 'recent-budgets',
    title: 'Presupuestos recientes',
    emptyMessage: 'No hay presupuestos recientes',
    status: 'Budget',
    actions: {
      download: true,
      send: true,
      view: false,
      reserve: true
    },
    buttonLabels: {
      download: 'Descargar',
      send: 'Enviar',
      reserve: 'Reservar'
    }
  };

  constructor(
    private usersService: UsersService,
    private authService: AuthenticateService
  ) {}

  ngOnInit() {
    this.authService.getUserAttributes().subscribe((userAttributes) => {
      this.userEmail = userAttributes.email;
      this.fetchUserData(this.userEmail);
    });
  }

  fetchUserData(email: string) {
    this.usersService.getUserByEmail(email).subscribe((user) => {
      console.log('User data from service:', user);
      this.personalInfo = {
        id: user._id,
        nombre: user.names || '',
        apellido: user.lastname || '',
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
        ciudad: user?.city || '',
        codigoPostal: user?.postalCode || '',
        fechaExpedicionDni: user.dniIssueDate
          ? this.formatDate(new Date(user.dniIssueDate))
          : '',
        fechaCaducidadDni: user.dniExpirationDate 
          ? this.formatDate(new Date(user.dniExpirationDate))
          : '',
        paisExpedicion: user.passportCountry || '',
        rol: user.rol || ''
      };
      console.log('Formatted user data:', this.personalInfo);
    });
  }

  formatDate(dateInput: Date | string): string {
    if (!dateInput) return '';
    
    // Si ya es una cadena formateada (como dd/mm/yyyy), devuélvela
    if (typeof dateInput === 'string' && dateInput.includes('/')) {
      return dateInput;
    }
    
    // Convertir a objeto Date si es una cadena
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Usar UTC methods para evitar problemas de zona horaria
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      // Si se cancela la edición, recargar los datos del usuario
      this.fetchUserData(this.userEmail);
    }
  }
}