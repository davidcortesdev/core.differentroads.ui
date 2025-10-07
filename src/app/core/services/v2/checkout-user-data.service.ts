import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthenticateService } from '../auth-service.service';
import { UsersService } from '../users.service';
import { UsersNetService } from '../usersNet.service';
import { PersonalInfo } from '../../models/v2/profile-v2.model';

@Injectable({
  providedIn: 'root'
})
export class CheckoutUserDataService {

  constructor(
    private authenticateService: AuthenticateService,
    private usersService: UsersService,
    private usersNetService: UsersNetService
  ) { }

  /**
   * Obtiene los datos del usuario autenticado para precargar en el checkout
   * @returns Observable con los datos del usuario formateados para el checkout
   */
  getCurrentUserData(): Observable<PersonalInfo> {
    return this.authenticateService.getUserAttributes().pipe(
      switchMap((attributes) => {
        console.log('🔍 Atributos de Cognito obtenidos:', attributes);
        if (!attributes?.email) {
          return throwError(() => new Error('No se pudo obtener el email del usuario autenticado'));
        }

        console.log('📧 Email obtenido de Cognito:', attributes.email);
        return this.usersNetService.getUsersByEmail(attributes.email);
      }),
      switchMap((users) => {
        console.log('👤 Usuarios obtenidos de la base de datos:', users);
        
        if (!users || users.length === 0) {
          return throwError(() => new Error('No se encontró el usuario en la base de datos'));
        }
        
        const user = users[0]; // Tomar el primer usuario del array
        // Mapear los datos del usuario a la estructura PersonalInfo
        const personalInfo: PersonalInfo = {
          id: user.id?.toString() || '',
          nombre: user.name || '',
          apellido: user.lastName || '',
          email: user.email || '',
          telefono: user.phone || '',
          dni: '', // No disponible en IUserResponse
          fechaNacimiento: '', // No disponible en IUserResponse
          ciudad: '', // No disponible en IUserResponse
          codigoPostal: '', // No disponible en IUserResponse
          pais: '', // No disponible en IUserResponse
          avatarUrl: '' // No disponible en IUserResponse
        };

        console.log('✅ Datos del usuario mapeados:', personalInfo);
        return of(personalInfo);
      }),
      catchError((error) => {
        console.error('Error al obtener datos del usuario para checkout:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Formatea una fecha a formato DD/MM/YYYY para mostrar
   * @param dateInput - Fecha en cualquier formato
   * @returns Fecha formateada o string vacío
   */
  private formatDateForDisplay(dateInput: Date | string): string {
    if (!dateInput || dateInput === '' || dateInput === 'null' || dateInput === 'undefined') {
      return '';
    }
    
    if (typeof dateInput === 'string' && dateInput.includes('/')) {
      return dateInput;
    }
    
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    
    // Verificar si los valores son válidos
    if (day === 'NaN' || month === 'NaN' || isNaN(year)) {
      return '';
    }
    
    return `${day}/${month}/${year}`;
  }

  /**
   * Verifica si el usuario está autenticado
   * @returns true si el usuario está autenticado, false en caso contrario
   */
  isUserAuthenticated(): boolean {
    return this.authenticateService.getCurrentUser();
  }
}
