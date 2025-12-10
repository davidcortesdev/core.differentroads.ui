import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { PersonalInfo } from '../../models/v2/profile-v2.model';
import { environment } from '../../../../environments/environment';
import { UsersNetService } from '../users/usersNet.service';

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

  constructor(private http: HttpClient,
    private usersNetService: UsersNetService
  ) { }

  /**
   * Actualiza el perfil completo del usuario
   * @param userId - ID del usuario
   * @param personalInfo - Datos personales del usuario
   * @param cognitoId - Datos del usuario en formato API
   * @returns Observable con el resultado de la actualización
   */
  updateUserProfile(userId: string, personalInfo: PersonalInfo, cognitoId?: string): Observable<PersonalInfo> {
    // Primero obtener los datos actuales del usuario por cognitoId
    if (!cognitoId) {
      const basicUserData = this.mapToBasicUserData(personalInfo, cognitoId);
      return this.updateBasicUserData(userId, basicUserData).pipe(
        switchMap(() => this.updateAdditionalFields(userId, personalInfo)),
        switchMap(() => of(personalInfo)),
        catchError(this.handleError)
      );
    }

    return this.usersNetService.getUsersByCognitoId(cognitoId).pipe(
      switchMap((response) => {
        const currentUser = Array.isArray(response) && response.length > 0 ? response[0] : null;
        
        const basicUserData = this.mapToBasicUserData(personalInfo, cognitoId, currentUser);
        return this.updateBasicUserData(userId, basicUserData);
      }),
      switchMap(() => this.updateAdditionalFields(userId, personalInfo)),
      switchMap(() => of(personalInfo)),
      catchError((error) => {
        console.warn('No se pudo obtener usuario por cognitoId, usando valores predeterminados', error);
        const basicUserData = this.mapToBasicUserData(personalInfo, cognitoId);
        return this.updateBasicUserData(userId, basicUserData).pipe(
          switchMap(() => this.updateAdditionalFields(userId, personalInfo)),
          switchMap(() => of(personalInfo))
        );
      })
    );
  }

  /**
   * Actualiza los datos básicos del usuario (nombre, apellido, email, teléfono, avatar)
   * @param userId - ID del usuario
   * @param userData - Datos del usuario en formato API
   * @returns Observable con la respuesta de la API
   */
  private updateBasicUserData(userId: string, userData: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${userId}`, userData, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene los valores de campos adicionales existentes del usuario
   * @param userId - ID del usuario
   * @returns Observable con los valores de campos existentes
   */
  private getExistingFieldValues(userId: string): Observable<any[]> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<any[]>(this.USER_FIELD_VALUE_API_URL, { 
      params, 
      ...this.httpOptions 
    }).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Actualiza los campos adicionales del usuario (DNI, dirección, ciudad, etc.)
   * @param userId - ID del usuario
   * @param personalInfo - Datos personales del usuario
   * @returns Observable con el resultado
   */
  private updateAdditionalFields(userId: string, personalInfo: PersonalInfo): Observable<any[]> {
    return this.getExistingFieldValues(userId).pipe(
      switchMap(existingFieldValues => {
        const fieldValues = this.mapToFieldValues(userId, personalInfo);
        
        // Crear un mapa de los userFieldIds que se están enviando
        const newFieldIds = new Set(fieldValues.map(fv => fv.userFieldId));
        
        // Agregar campos que existían antes pero ahora están vacíos (para eliminarlos)
        existingFieldValues.forEach(existing => {
          // Si el campo existía antes pero no está en los nuevos valores, agregarlo con valor vacío
          if (!newFieldIds.has(existing.userFieldId)) {
            fieldValues.push({
              userId: parseInt(userId),
              userFieldId: existing.userFieldId,
              value: '' // Valor vacío para eliminar el campo
            });
          }
        });
        
        if (fieldValues.length === 0) {
          return of([]);
        }
        
        return this.processFieldUpdates(fieldValues, existingFieldValues);
      }),
      catchError(() => {
        // Si no se pueden obtener los valores existentes, intentar crear nuevos
        const fieldValues = this.mapToFieldValues(userId, personalInfo);
        return this.processFieldUpdates(fieldValues, []);
      })
    );
  }

  /**
   * Procesa las actualizaciones de campos (actualizar existentes o crear nuevos)
   * @param fieldValues - Valores de campos a procesar
   * @param existingFieldValues - Valores existentes
   * @returns Observable con el resultado
   */
  private processFieldUpdates(fieldValues: any[], existingFieldValues: any[]): Observable<any[]> {
    const existingMap = new Map();
    existingFieldValues.forEach(existing => {
      existingMap.set(existing.userFieldId, existing);
    });
    
    // Filtrar duplicados por userFieldId antes de procesar
    const uniqueFieldValues = new Map();
    fieldValues.forEach(fieldValue => {
      const key = `${fieldValue.userId}-${fieldValue.userFieldId}`;
      if (!uniqueFieldValues.has(key)) {
        uniqueFieldValues.set(key, fieldValue);
      }
    });
    
    const updateObservables = Array.from(uniqueFieldValues.values()).map(fieldValue => {
      const existing = existingMap.get(fieldValue.userFieldId);
      
      if (existing) {
        // Actualizar campo existente
        const updateData = {
          userId: fieldValue.userId,
          userFieldId: fieldValue.userFieldId,
          value: fieldValue.value
        };
        return this.http.put(`${this.USER_FIELD_VALUE_API_URL}/${existing.id}`, updateData, this.httpOptions);
      } else {
        // Crear nuevo campo
        return this.http.post(this.USER_FIELD_VALUE_API_URL, fieldValue, this.httpOptions);
      }
    });
    
    return forkJoin(updateObservables);
  }

  /**
   * Mapea los datos personales a valores de campos para la API
   * @param userId - ID del usuario
   * @param personalInfo - Datos personales del usuario
   * @returns Array de valores de campos
   */
  private mapToFieldValues(userId: string, personalInfo: PersonalInfo): any[] {
    const fieldValues: any[] = [];
    
    const fieldMappings = [
      { fieldCode: 'image', value: personalInfo.avatarUrl },
      { fieldCode: 'phone', value: personalInfo.telefono },
      { fieldCode: 'phonePrefix', value: personalInfo.phonePrefix },
      { fieldCode: 'birth_date', value: this.formatDate(personalInfo.fechaNacimiento) },
      { fieldCode: 'national_id', value: personalInfo.dni },
      { fieldCode: 'dniexpiration', value: this.formatDate(personalInfo.fechaExpiracionDni) },
      { fieldCode: 'address', value: personalInfo.direccion },
      { fieldCode: 'city', value: personalInfo.ciudad },
      { fieldCode: 'postal_code', value: personalInfo.codigoPostal },
      { fieldCode: 'country', value: personalInfo.pais },
      { fieldCode: 'sexo', value: personalInfo.sexo },
      { fieldCode: 'notes', value: personalInfo.notas }
    ];

    fieldMappings.forEach(mapping => {
      if (mapping.value && mapping.value.toString().trim()) {
        const userFieldId = this.getFieldIdByCode(mapping.fieldCode);
        
        // Solo agregar si el userFieldId es válido (no 0)
        if (userFieldId > 0) {
          const fieldValue = {
            userId: parseInt(userId),
            userFieldId: userFieldId,
            value: mapping.value.toString().trim()
          };
          
          fieldValues.push(fieldValue);
        }
      }
    });
    return fieldValues;
  }

  /**
   * Obtiene el ID del campo por código según la API de UserField
   * @param fieldCode - Código del campo
   * @returns ID del campo
   */
  private getFieldIdByCode(fieldCode: string): number {
    const fieldIdMap: { [key: string]: number } = {
      'first_name': 1,
      'last_name': 2,
      'phone': 3,
      'birth_date': 4,
      'national_id': 5,
      'address': 6,
      'city': 7,
      'postal_code': 8,
      'country': 9,
      'notes': 10,
      'image': 12,
      'sexo': 14,
      'phonePrefix': 15,
      'dniexpiration': 16
    };
    
    return fieldIdMap[fieldCode] || 0;
  }

  /**
   * Mapea los datos personales a formato de datos básicos para la API
   * @param personalInfo - Datos personales del usuario
   * @param cognitoId -id de cognito del usuario
   * @param currentUser -datos actuales del usuario
   * @returns Datos formateados para la API
   */
  private mapToBasicUserData(personalInfo: PersonalInfo, cognitoId?: string, currentUser?: any): any {
    return {
      cognitoId: cognitoId || '',
      name: personalInfo.nombre || '',
      email: personalInfo.email || '',
      lastName: personalInfo.apellido || '',
      phone: personalInfo.telefono || '',
      hasWebAccess: currentUser?.hasWebAccess ?? true,
      hasMiddleAccess: currentUser?.hasMiddleAccess ?? false,
      hasMiddleAtcAccess: currentUser?.hasMiddleAtcAccess ?? false,
      hasTourOperationAccess: currentUser?.hasTourOperationAccess ?? false,
      retailerId: currentUser?.retailerId ?? 7
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
      // Usar métodos locales directamente para evitar problemas de zona horaria
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
        // Si es un string ISO (YYYY-MM-DD), devolverlo directamente
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
          return dateInput;
        }
        
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
          // Usar métodos locales directamente
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
      // Normalizar el teléfono eliminando espacios y guiones para la validación
      const normalizedPhone = personalInfo.telefono.trim().replace(/[\s-]/g, '');
      // Patrón que solo acepta dígitos (6-14 dígitos)
      // No acepta prefijo + ya que el prefijo va por separado
      const phoneRegex = /^\d{6,14}$/;
      if (!phoneRegex.test(normalizedPhone)) {
        errors['telefono'] = 'Ingresa un número de teléfono válido.';
        isValid = false;
      }
    }

    // Validación de DNI/NIE (documentos de identidad internacionales)
    if (personalInfo.dni?.trim()) {
      const dniValue = personalInfo.dni.trim();
      // Validación internacional: acepta documentos de identidad de diferentes países
      // Permite: DNI español (8 dígitos + letra), NIE español (X/Y/Z + 7 dígitos + letra),
      // DNI colombiano, DNI argentino, DNI francés, pasaportes y otros documentos internacionales
      // Longitud mínima: 4 caracteres, máxima: 20 caracteres
      // Permite letras, números, guiones, puntos y espacios (formato flexible)
      const internationalIdRegex = /^[A-Z0-9\-\s\.]{4,20}$/i;
      if (!internationalIdRegex.test(dniValue)) {
        errors['dni'] = 'Ingresa un documento de identidad válido (DNI, NIE, pasaporte, etc.)';
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
   * Permite números, +, espacios y guiones
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateTelefonoInput(value: string): string {
    // Permitir números, +, espacios y guiones
    // El + solo puede estar al inicio
    let filtered = value.replace(/[^\d+\s-]/g, '');
    
    // Si hay un +, asegurarse de que esté solo al inicio
    const plusIndex = filtered.indexOf('+');
    if (plusIndex > 0) {
      // Si hay un + que no está al inicio, eliminarlo
      filtered = filtered.replace(/\+/g, '');
    } else if (plusIndex === 0 && filtered.indexOf('+', 1) > 0) {
      // Si hay múltiples +, mantener solo el primero
      filtered = filtered.substring(0, 1) + filtered.substring(1).replace(/\+/g, '');
    }
    
    // Limitar la longitud total (considerando +, espacios y guiones)
    return filtered.slice(0, 20);
  }

  /**
   * Valida y filtra el input de DNI/NIE (documentos de identidad internacionales)
   * Permite letras, números, guiones, puntos y espacios para aceptar diferentes formatos internacionales
   * Soporta: DNI español, NIE español, DNI colombiano, DNI argentino, DNI francés, pasaportes, etc.
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateDniInput(value: string): string {
    // Permitir letras, números, guiones, puntos y espacios
    // Convertir a mayúsculas para consistencia
    const filtered = value.replace(/[^A-Za-z0-9\-\s\.]/g, '').toUpperCase();
    // Limitar a 20 caracteres para documentos internacionales
    return filtered.slice(0, 20);
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
   * Valida y filtra el input de nombre
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateNombreInput(value: string): string {
    return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜñÑçÇ\s]/g, '').slice(0, 50);
  }

  /**
   * Valida y filtra el input de apellido
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateApellidoInput(value: string): string {
    return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜñÑçÇ\s]/g, '').slice(0, 50);
  }

  /**
   * Valida y filtra el input de dirección
   * Permite letras, números, acentos y espacios (necesario para direcciones con números de casa, apartamento, etc.)
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validateDireccionInput(value: string): string {
    return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜñÑçÇ0-9\s]/g, '').slice(0, 100);
  }

  /**
   * Valida y filtra el input de país
   * @param value - Valor del input
   * @returns Valor filtrado
   */
  validatePaisInput(value: string): string {
    return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜñÑçÇ\s]/g, '').slice(0, 50);
  }
}