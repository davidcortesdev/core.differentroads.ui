import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PersonalInfo } from '../../models/v2/profile-v2.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UpdateProfileV2Service {
  private readonly API_URL = `${environment.usersApiUrl}/User`;
  private readonly USER_FIELD_VALUE_API_URL = `${environment.usersApiUrl}/UserFieldValue`;
  
  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient) { }

  /**
   * Actualiza el perfil completo del usuario
   * @param userId - ID del usuario
   * @param personalInfo - Datos personales del usuario
   * @returns Observable con el resultado de la actualización
   */
  updateUserProfile(userId: string, personalInfo: PersonalInfo): Observable<PersonalInfo> {
    const userData = this.prepareUserDataForAPI(personalInfo);
    
    // Actualizar los datos básicos del usuario
    return this.updateUser(userId, userData).pipe(
      switchMap(response => {
        // Si la actualización del usuario es exitosa, devolver los datos actualizados
        if (response === true || response === null || response === undefined) {
          return of(personalInfo);
        }
        
        // Si la API devuelve los datos actualizados, usarlos
        return of(response as PersonalInfo);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza los datos básicos del usuario
   * @param userId - ID del usuario
   * @param userData - Datos del usuario en formato API
   * @returns Observable con la respuesta de la API
   */
  private updateUser(userId: string, userData: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${userId}`, userData, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza los valores de campos adicionales del usuario
   * @param userId - ID del usuario
   * @param personalInfo - Datos personales del usuario
   * @returns Observable con el resultado
   */
  private updateUserFieldValues(userId: string, personalInfo: PersonalInfo): Observable<any[]> {
    const fieldValues = this.prepareFieldValuesForAPI(userId, personalInfo);
    
    console.log('=== UPDATING FIELD VALUES ===');
    console.log('Field Values:', fieldValues);
    
    if (fieldValues.length === 0) {
      console.log('No field values to update');
      return of([]);
    }
    
    // Enviar cada campo individualmente usando forkJoin
    const updateObservables = fieldValues.map(fieldValue => {
      console.log('Updating field:', fieldValue);
      return this.http.post(this.USER_FIELD_VALUE_API_URL, fieldValue, this.httpOptions);
    });
    
    return forkJoin(updateObservables);
  }

  /**
   * Prepara los valores de campos adicionales para la API
   * @param userId - ID del usuario
   * @param personalInfo - Datos personales del usuario
   * @returns Array de valores de campos
   */
  private prepareFieldValuesForAPI(userId: string, personalInfo: PersonalInfo): any[] {
    const fieldValues: any[] = [];
    
    // Mapear campos de PersonalInfo a UserFieldValue
    const fieldMappings = [
      { fieldName: 'dni', value: personalInfo.dni },
      { fieldName: 'nacionalidad', value: personalInfo.nacionalidad },
      { fieldName: 'pasaporte', value: personalInfo.pasaporte },
      { fieldName: 'ciudad', value: personalInfo.ciudad },
      { fieldName: 'codigoPostal', value: personalInfo.codigoPostal },
      { fieldName: 'sexo', value: personalInfo.sexo },
      { fieldName: 'fechaNacimiento', value: personalInfo.fechaNacimiento },
      { fieldName: 'fechaExpedicionDni', value: personalInfo.fechaExpedicionDni },
      { fieldName: 'fechaCaducidadDni', value: personalInfo.fechaCaducidadDni },
      { fieldName: 'fechaExpedicionPasaporte', value: personalInfo.fechaExpedicionPasaporte },
      { fieldName: 'fechaVencimientoPasaporte', value: personalInfo.fechaVencimientoPasaporte },
      { fieldName: 'paisExpedicion', value: personalInfo.paisExpedicion }
    ];

    fieldMappings.forEach(mapping => {
      if (mapping.value && mapping.value.trim()) {
        fieldValues.push({
          userId: parseInt(userId),
          userFieldId: this.getFieldIdByName(mapping.fieldName),
          value: mapping.value
        });
      }
    });

    return fieldValues;
  }

  /**
   * Obtiene el ID del campo por nombre (esto debería venir de la API de UserField)
   * @param fieldName - Nombre del campo
   * @returns ID del campo
   */
  private getFieldIdByName(fieldName: string): number {
    // Mapeo de nombres de campos a IDs (esto debería obtenerse de la API)
    const fieldIdMap: { [key: string]: number } = {
      'dni': 1,
      'nacionalidad': 2,
      'pasaporte': 3,
      'ciudad': 4,
      'codigoPostal': 5,
      'sexo': 6,
      'fechaNacimiento': 7,
      'fechaExpedicionDni': 8,
      'fechaCaducidadDni': 9,
      'fechaExpedicionPasaporte': 10,
      'fechaVencimientoPasaporte': 11,
      'paisExpedicion': 12
    };
    
    return fieldIdMap[fieldName] || 0;
  }

  /**
   * Prepara los datos del usuario para la API
   * @param personalInfo - Datos personales del usuario
   * @returns Datos formateados para la API
   */
  private prepareUserDataForAPI(personalInfo: PersonalInfo): any {
    return {
      cognitoId: personalInfo.id?.toString() || '',
      name: personalInfo.nombre || '',
      email: personalInfo.email || '',
      lastName: personalInfo.apellido || '',
      phone: personalInfo.telefono || '',
      hasWebAccess: true,
      hasMiddleAccess: false,
      hasMiddleAtcAccess: false,
      hasTourOperationAccess: false,
      retailerId: 7
    };
  }


  /**
   * Formatea una fecha a formato YYYY-MM-DD
   * @param dateInput - Fecha en cualquier formato
   * @returns Fecha formateada o string vacío
   */
  formatDate(dateInput: string | Date | undefined): string {
    if (!dateInput) return '';
    
    if (dateInput instanceof Date) {
      const year = dateInput.getFullYear();
      const month = String(dateInput.getMonth() + 1).padStart(2, '0');
      const day = String(dateInput.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    if (typeof dateInput === 'string' && dateInput.includes('/')) {
      const [day, month, year] = dateInput.split('/');
      if (!day || !month || !year) return '';
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    if (typeof dateInput === 'string') {
      try {
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (e) {
        return '';
      }
    }
    
    return '';
  }

  /**
   * Maneja errores de las llamadas HTTP
   * @param error - Error de la petición HTTP
   * @returns Observable con error manejado
   */
  private handleError(error: any): Observable<never> {
    return throwError(() => error);
  }

  /**
   * Valida el formulario completo de perfil
   * @param personalInfo - Datos personales a validar
   * @returns Objeto con errores de validación
   */
  validateForm(personalInfo: PersonalInfo): { errors: { [key: string]: string }, isValid: boolean } {
    const errors: { [key: string]: string } = {};
    let isValid = true;

    // Validación de nombre
    if (!personalInfo.nombre?.trim()) {
      errors['nombre'] = 'El nombre es requerido';
      isValid = false;
    } else if (personalInfo.nombre.trim().length < 2) {
      errors['nombre'] = 'El nombre debe tener al menos 2 caracteres';
      isValid = false;
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(personalInfo.nombre.trim())) {
      errors['nombre'] = 'El nombre solo puede contener letras y espacios';
      isValid = false;
    }

    // Validación de apellido
    if (!personalInfo.apellido?.trim()) {
      errors['apellido'] = 'El apellido es requerido';
      isValid = false;
    } else if (personalInfo.apellido.trim().length < 2) {
      errors['apellido'] = 'El apellido debe tener al menos 2 caracteres';
      isValid = false;
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(personalInfo.apellido.trim())) {
      errors['apellido'] = 'El apellido solo puede contener letras y espacios';
      isValid = false;
    }

    // Validación de email
    if (!personalInfo.email?.trim()) {
      errors['email'] = 'El email es requerido';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(personalInfo.email)) {
        errors['email'] = 'El formato del email no es válido';
        isValid = false;
      }
    }

    // Validación de teléfono
    if (personalInfo.telefono?.trim()) {
      const phoneRegex = /^[0-9]{9}$/;
      if (!phoneRegex.test(personalInfo.telefono)) {
        errors['telefono'] = 'El teléfono debe tener 9 dígitos';
        isValid = false;
      }
    }

    // Validación de DNI
    if (personalInfo.dni?.trim()) {
      const dniRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
      if (!dniRegex.test(personalInfo.dni)) {
        errors['dni'] = 'El DNI debe tener 8 números seguidos de una letra válida';
        isValid = false;
      }
    }

    // Validación de pasaporte
    if (personalInfo.pasaporte?.trim()) {
      const passportRegex = /^[A-Z0-9]{6,10}$/;
      if (!passportRegex.test(personalInfo.pasaporte)) {
        errors['pasaporte'] = 'El pasaporte debe tener entre 6 y 10 caracteres alfanuméricos';
        isValid = false;
      }
    }

    // Validación de código postal
    if (personalInfo.codigoPostal?.trim()) {
      const postalCodeRegex = /^[0-9]{5}$/;
      if (!postalCodeRegex.test(personalInfo.codigoPostal)) {
        errors['codigoPostal'] = 'El código postal debe tener 5 dígitos';
        isValid = false;
      }
    }

    return { errors, isValid };
  }

  /**
   * Valida un archivo de imagen
   * @param file - Archivo a validar
   * @param maxSize - Tamaño máximo en bytes
   * @returns Objeto con resultado de validación
   */
  validateImageFile(file: File, maxSize: number = 5000000): { isValid: boolean, error?: string } {
    if (file.size > maxSize) {
      return { isValid: false, error: 'El archivo excede el tamaño máximo permitido' };
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { isValid: false, error: 'Solo se permiten archivos JPG, JPEG, PNG o WEBP' };
    }

    return { isValid: true };
  }

  /**
   * Valida y filtra el input de teléfono
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateTelefonoInput(value: string): string {
    return value.replace(/\D/g, '').slice(0, 10);
  }

  /**
   * Valida y filtra el input de DNI
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateDniInput(value: string): string {
    return value.toUpperCase().slice(0, 9);
  }

  /**
   * Valida y filtra el input de nacionalidad
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateNacionalidadInput(value: string): string {
    return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').slice(0, 50);
  }

  /**
   * Valida y filtra el input de pasaporte
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validatePasaporteInput(value: string): string {
    return value.toUpperCase().slice(0, 10);
  }

  /**
   * Valida y filtra el input de ciudad
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateCiudadInput(value: string): string {
    return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').slice(0, 50);
  }

  /**
   * Valida y filtra el input de código postal
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateCodigoPostalInput(value: string): string {
    return value.replace(/\D/g, '').slice(0, 5);
  }

  /**
   * Valida y filtra el input de país de expedición
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validatePaisExpedicionInput(value: string): string {
    return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').slice(0, 50);
  }

  /**
   * Valida y filtra el input de nombre
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateNombreInput(value: string): string {
    return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').slice(0, 50);
  }

  /**
   * Valida y filtra el input de apellido
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateApellidoInput(value: string): string {
    return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').slice(0, 50);
  }
}