import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PersonalInfo } from '../../models/v2/profile-v2.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PersonalInfoV2Service {
  private readonly API_URL = `${environment.usersApiUrl}/User`;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) { }

  /**
   * Formatea una fecha a formato DD/MM/YYYY para mostrar
   * @param dateInput - Fecha en cualquier formato
   * @returns Fecha formateada o string vacío
   */
  formatDateForDisplay(dateInput: Date | string): string {
    if (!dateInput) return '';
    
    if (typeof dateInput === 'string' && dateInput.includes('/')) {
      return dateInput;
    }
    
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }


  /**
   * Obtiene usuarios basados en criterios de filtro
   * @param filters - Criterios de filtro opcionales
   * @returns Observable con la lista de usuarios
   */
  getUsers(filters?: any): Observable<PersonalInfo[]> {
    let params = new HttpParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PersonalInfo[]>(this.API_URL, { 
      params, 
      ...this.httpOptions 
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene un usuario específico por su ID
   * @param id - ID del usuario
   * @returns Observable con los datos del usuario
   */
  getUserById(id: string): Observable<PersonalInfo> {
    return this.http.get<PersonalInfo>(`${this.API_URL}/${id}`, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo usuario
   * @param userData - Datos del usuario a crear
   * @returns Observable con el usuario creado
   */
  createUser(userData: PersonalInfo): Observable<PersonalInfo> {
    return this.http.post<PersonalInfo>(this.API_URL, userData, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza un usuario existente
   * @param id - ID del usuario a actualizar
   * @param userData - Datos actualizados del usuario
   * @returns Observable con el usuario actualizado
   */
  updateUser(id: string, userData: Partial<PersonalInfo>): Observable<PersonalInfo> {
    return this.http.put<PersonalInfo>(`${this.API_URL}/${id}`, userData, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un usuario
   * @param id - ID del usuario a eliminar
   * @returns Observable con el resultado de la operación
   */
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene los datos de un usuario por ID, con fallback a datos mock si falla la API
   * @param userId - ID del usuario
   * @returns Observable con los datos del usuario
   */
  getUserData(userId: string): Observable<PersonalInfo> {
    if (!userId) {
      return throwError(() => new Error('ID de usuario requerido'));
    }

    return this.getUserById(userId).pipe(
      catchError((error) => {
        console.warn('Error al obtener datos del usuario desde la API, usando datos mock:', error);
        return of(this.generateMockData(userId));
      })
    );
  }

  /**
   * Guarda los datos de un usuario (crear o actualizar según si existe ID)
   * @param userData - Datos del usuario
   * @returns Observable con el resultado de la operación
   */
  saveUserData(userData: PersonalInfo): Observable<PersonalInfo> {
    if (userData.id) {
      return this.updateUser(userData.id, userData);
    } else {
      return this.createUser(userData);
    }
  }

  /**
   * Genera datos mock para desarrollo (método de respaldo)
   * @param userId - ID del usuario
   * @returns Datos mock de PersonalInfo
   */
  private generateMockData(userId: string): PersonalInfo {
    const userSuffix = userId.slice(-3);
    
    return {
      id: `user-${userSuffix}`,
      nombre: `Nombre`,
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

  /**
   * Maneja errores de las llamadas HTTP
   * @param error - Error de la petición HTTP
   * @returns Observable con error manejado
   */
  private handleError(error: any): Observable<never> {
    console.error('Error en PersonalInfoV2Service:', error);
    return throwError(() => error);
  }

  /**
   * Valida el código de verificación
   * @param code - Código a validar
   * @returns Objeto con resultado de validación
   */
  validateVerificationCode(code: string): { isValid: boolean, error?: string } {
    if (!code?.trim()) {
      return { isValid: false, error: 'El código de verificación es requerido' };
    }
    
    if (code.length !== 6) {
      return { isValid: false, error: 'El código debe tener 6 dígitos' };
    }
    
    if (!/^\d{6}$/.test(code)) {
      return { isValid: false, error: 'El código debe contener solo números' };
    }
    
    return { isValid: true };
  }

  /**
   * Valida la nueva contraseña
   * @param password - Contraseña a validar
   * @returns Objeto con resultado de validación
   */
  validateNewPassword(password: string): { isValid: boolean, error?: string } {
    if (!password?.trim()) {
      return { isValid: false, error: 'La nueva contraseña es requerida' };
    }
    
    if (password.length < 7) {
      return { isValid: false, error: 'La contraseña debe tener al menos 7 caracteres' };
    }
    
    if (password.length > 14) {
      return { isValid: false, error: 'La contraseña debe tener máximo 14 caracteres' };
    }
    
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
      return { isValid: false, error: 'La contraseña debe contener al menos una mayúscula, un número y un carácter especial' };
    }
    
    return { isValid: true };
  }

  /**
   * Valida la confirmación de contraseña
   * @param password - Contraseña original
   * @param confirmPassword - Contraseña de confirmación
   * @returns Objeto con resultado de validación
   */
  validateConfirmPassword(password: string, confirmPassword: string): { isValid: boolean, error?: string } {
    if (!confirmPassword?.trim()) {
      return { isValid: false, error: 'Debe confirmar la nueva contraseña' };
    }
    
    if (password !== confirmPassword) {
      return { isValid: false, error: 'Las contraseñas no coinciden' };
    }
    
    return { isValid: true };
  }

  /**
   * Valida el formulario completo de cambio de contraseña
   * @param code - Código de verificación
   * @param newPassword - Nueva contraseña
   * @param confirmPassword - Confirmación de contraseña
   * @returns Objeto con errores de validación
   */
  validatePasswordForm(code: string, newPassword: string, confirmPassword: string): { errors: { [key: string]: string }, isValid: boolean } {
    const errors: { [key: string]: string } = {};
    let isValid = true;

    // Validar código
    const codeValidation = this.validateVerificationCode(code);
    if (!codeValidation.isValid) {
      errors['code'] = codeValidation.error!;
      isValid = false;
    }

    // Validar nueva contraseña
    const passwordValidation = this.validateNewPassword(newPassword);
    if (!passwordValidation.isValid) {
      errors['newPassword'] = passwordValidation.error!;
      isValid = false;
    }

    // Validar confirmación de contraseña
    const confirmValidation = this.validateConfirmPassword(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
      errors['confirmPassword'] = confirmValidation.error!;
      isValid = false;
    }

    return { errors, isValid };
  }

  /**
   * Filtra el input del código de verificación (solo números, máximo 6)
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  filterVerificationCodeInput(value: string): string {
    return value.replace(/\D/g, '').slice(0, 6);
  }
}