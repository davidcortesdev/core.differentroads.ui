import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PersonalInfo } from '../../models/v2/profile-v2.model';
import { environment } from '../../../../environments/environment';
import { DataMappingV2Service } from './data-mapping-v2.service';

@Injectable({
  providedIn: 'root'
})
export class PersonalInfoV2Service {
  private readonly API_URL = `${environment.usersApiUrl}/User`;
  private readonly USER_FIELD_API_URL = `${environment.usersApiUrl}/UserField`;
  private readonly USER_FIELD_VALUE_API_URL = `${environment.usersApiUrl}/UserFieldValue`;
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(
    private http: HttpClient,
    private dataMappingService: DataMappingV2Service
  ) { }

  /**
   * Formatea una fecha a formato DD/MM/YYYY para mostrar
   * @param dateInput - Fecha en cualquier formato
   * @returns Fecha formateada o string vacío
   */
  formatDateForDisplay(dateInput: Date | string): string {
    if (!dateInput || dateInput === '' || dateInput === 'null' || dateInput === 'undefined') {
      return 'Pendiente';
    }
    
    if (typeof dateInput === 'string' && dateInput.includes('/')) {
      return dateInput;
    }
    
    // Si es un string ISO (YYYY-MM-DD), convertir directamente sin problemas de zona horaria
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-');
      return `${day}/${month}/${year}`;
    }
    
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return 'Pendiente';
    }
    
    // Usar métodos locales en lugar de UTC para evitar desfases de zona horaria
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    // Verificar si los valores son válidos
    if (day === 'NaN' || month === 'NaN' || isNaN(year)) {
      return 'Pendiente';
    }
    
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
   * Obtiene los datos completos de un usuario por ID desde múltiples APIs
   * @param userId - ID del usuario
   * @returns Observable con los datos combinados del usuario
   */
  getUserData(userId: string): Observable<PersonalInfo> {
    if (!userId) {
      return throwError(() => new Error('ID de usuario requerido'));
    }

    // Hacer llamadas paralelas a las tres APIs
    return forkJoin({
      user: this.getUserById(userId),
      userFields: this.getUserFields(),
      userFieldValues: this.getUserFieldValues(userId)
    }).pipe(
      map(({ user, userFields, userFieldValues }) => {
        // Combinar los datos del usuario con los campos adicionales
        return this.dataMappingService.combineUserData(user, userFields, userFieldValues);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene los campos de usuario disponibles
   * @returns Observable con la lista de campos de usuario
   */
  private getUserFields(): Observable<any[]> {
    return this.http.get<any[]>(this.USER_FIELD_API_URL, this.httpOptions).pipe(
      catchError((error) => {
        console.warn('Error al obtener campos de usuario:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene los valores de campos de usuario para un usuario específico
   * @param userId - ID del usuario
   * @returns Observable con los valores de campos del usuario
   */
  private getUserFieldValues(userId: string): Observable<any[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<any[]>(this.USER_FIELD_VALUE_API_URL, { 
      params, 
      ...this.httpOptions 
    }).pipe(
      catchError((error) => {
        console.warn('Error al obtener valores de campos de usuario:', error);
        return of([]);
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
      // Actualizar solo el usuario básico por ahora
      return this.updateUser(userData.id, userData);
    } else {
      // Crear usuario
      return this.createUser(userData);
    }
  }

  /**
   * Guarda los valores de campos de usuario
   * @param userId - ID del usuario
   * @param userData - Datos del usuario
   * @returns Observable con el resultado de la operación
   */
  private saveUserFieldValues(userId: string, userData: PersonalInfo): Observable<any> {
    // Obtener campos disponibles primero
    return this.getUserFields().pipe(
      switchMap((userFields) => {
        // Crear array de valores de campos a guardar
        const fieldValues = this.dataMappingService.prepareFieldValues(userId, userData, userFields);
        
        if (fieldValues.length === 0) {
          return of([]);
        }

        // Hacer llamadas paralelas para guardar cada campo
        const saveObservables = fieldValues.map(fieldValue => 
          this.saveUserFieldValue(fieldValue)
        );

        return forkJoin(saveObservables);
      }),
      catchError((error) => {
        console.warn('Error al guardar campos de usuario:', error);
        return of([]);
      })
    );
  }


  /**
   * Guarda un valor de campo de usuario individual
   * @param fieldValue - Valor del campo a guardar
   * @returns Observable con el resultado de la operación
   */
  private saveUserFieldValue(fieldValue: any): Observable<any> {
    return this.http.post<any>(this.USER_FIELD_VALUE_API_URL, fieldValue, this.httpOptions).pipe(
      catchError((error) => {
        console.warn(`Error al guardar campo ${fieldValue.fieldId}:`, error);
        return of(null);
      })
    );
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