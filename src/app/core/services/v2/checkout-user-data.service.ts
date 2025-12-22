import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { PersonalInfo } from '../../models/v2/profile-v2.model';
import { PersonalInfoV2Service } from './personal-info-v2.service';
import { AuthenticateService } from '../auth/auth-service.service';
import { UsersNetService } from '../users/usersNet.service';

@Injectable({
  providedIn: 'root'
})
export class CheckoutUserDataService {

  constructor(
    private authenticateService: AuthenticateService,
    private usersNetService: UsersNetService,
    private personalInfoService: PersonalInfoV2Service
  ) { }

  /**
   * Obtiene los datos del usuario autenticado para precargar en el checkout
   * @returns Observable con los datos del usuario formateados para el checkout
   */
  getCurrentUserData(): Observable<PersonalInfo> {
    return this.authenticateService.getUserAttributes().pipe(
      switchMap((attributes) => {
        if (!attributes?.email) {
          return throwError(() => new Error('No se pudo obtener el email del usuario autenticado'));
        }

        return this.usersNetService.getUsersByEmail(attributes.email);
      }),
      switchMap((users) => {
        
        if (!users || users.length === 0) {
          return throwError(() => new Error('No se encontró el usuario en la base de datos'));
        }
        
        const user = users[0]; // Tomar el primer usuario del array
        const userId = user.id?.toString();
        
        if (!userId) {
          return throwError(() => new Error('ID de usuario no disponible'));
        }

        // Usar el servicio PersonalInfoV2Service para obtener datos completos
        return this.personalInfoService.getUserData(userId);
      }),
      catchError((error) => {
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
