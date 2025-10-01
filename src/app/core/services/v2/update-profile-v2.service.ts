import { Injectable } from '@angular/core';
import { PersonalInfo } from '../../models/v2/profile-v2.model';

@Injectable({
  providedIn: 'root'
})
export class UpdateProfileV2Service {

  constructor() { }

  /**
   * Formatea una fecha a formato YYYY-MM-DD
   * @param dateInput - Fecha en cualquier formato
   * @returns Fecha formateada o string vacío
   */
  formatDate(dateInput: string | Date | undefined): string {
    if (!dateInput) return '';
    
    // Handle Date objects
    if (dateInput instanceof Date) {
      const year = dateInput.getFullYear();
      const month = String(dateInput.getMonth() + 1).padStart(2, '0');
      const day = String(dateInput.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Handle strings in DD/MM/YYYY format
    if (typeof dateInput === 'string' && dateInput.includes('/')) {
      const [day, month, year] = dateInput.split('/');
      if (!day || !month || !year) return '';
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Para otras cadenas de texto (como objetos Date convertidos a string)
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
        // Error parsing date - return empty string
      }
    }
    
    // Return empty string for any other type
    return '';
  }

  /**
   * Prepara los datos del formulario para enviar a la API
   * @param personalInfo - Datos personales del usuario
   * @param uploadedFiles - Archivos subidos
   * @returns Objeto con los datos formateados para la API V2
   */
  prepareDataForAPI(personalInfo: PersonalInfo, uploadedFiles: any[]): any {
    return {
      // Datos personales
      personalInfo: {
        nombre: personalInfo.nombre,
        apellido: personalInfo.apellido,
        email: personalInfo.email,
        telefono: personalInfo.telefono,
        fechaNacimiento: personalInfo.fechaNacimiento,
        nacionalidad: personalInfo.nacionalidad,
        ciudad: personalInfo.ciudad,
        codigoPostal: personalInfo.codigoPostal,
        // Datos DNI
        dni: personalInfo.dni,
        fechaExpedicionDni: personalInfo.fechaExpedicionDni,
        fechaCaducidadDni: personalInfo.fechaCaducidadDni,
        // Datos Pasaporte
        pasaporte: personalInfo.pasaporte,
        fechaExpedicionPasaporte: personalInfo.fechaExpedicionPasaporte,
        fechaVencimientoPasaporte: personalInfo.fechaVencimientoPasaporte,
        paisExpedicion: personalInfo.paisExpedicion
      },
      // Archivos subidos
      uploadedFiles: uploadedFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        // TODO: Agregar URL del archivo subido cuando se implemente el servicio de archivos
        // url: file.url
      }))
    };
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
    } else if (personalInfo.nombre.trim().length > 50) {
      errors['nombre'] = 'El nombre no puede tener más de 50 caracteres';
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
    } else if (personalInfo.apellido.trim().length > 50) {
      errors['apellido'] = 'El apellido no puede tener más de 50 caracteres';
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
    if (!personalInfo.dni?.trim()) {
      errors['dni'] = 'El DNI es requerido';
      isValid = false;
    } else {
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

    // Validación de fecha de nacimiento
    if (personalInfo.fechaNacimiento?.trim()) {
      const birthDate = new Date(personalInfo.fechaNacimiento);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (isNaN(birthDate.getTime())) {
        errors['fechaNacimiento'] = 'La fecha de nacimiento no es válida';
        isValid = false;
      } else if (age < 0 || age > 120) {
        errors['fechaNacimiento'] = 'La edad debe estar entre 0 y 120 años';
        isValid = false;
      }
    }

    // Validación de fechas de DNI
    if (personalInfo.fechaExpedicionDni && personalInfo.fechaCaducidadDni) {
      const expedicionDni = new Date(personalInfo.fechaExpedicionDni);
      const caducidadDni = new Date(personalInfo.fechaCaducidadDni);
      
      if (!isNaN(expedicionDni.getTime()) && !isNaN(caducidadDni.getTime())) {
        if (expedicionDni >= caducidadDni) {
          errors['fechaExpedicionDni'] = 'La fecha de expedición debe ser anterior a la de caducidad';
          isValid = false;
        }
        
        // Validar que la caducidad no sea muy antigua (más de 10 años)
        const maxCaducidad = new Date();
        maxCaducidad.setFullYear(maxCaducidad.getFullYear() + 10);
        if (caducidadDni > maxCaducidad) {
          errors['fechaCaducidadDni'] = 'La fecha de caducidad no puede ser más de 10 años en el futuro';
          isValid = false;
        }
      }
    }

    // Validación de fechas de Pasaporte
    if (personalInfo.fechaExpedicionPasaporte && personalInfo.fechaVencimientoPasaporte) {
      const expedicionPasaporte = new Date(personalInfo.fechaExpedicionPasaporte);
      const vencimientoPasaporte = new Date(personalInfo.fechaVencimientoPasaporte);
      
      if (!isNaN(expedicionPasaporte.getTime()) && !isNaN(vencimientoPasaporte.getTime())) {
        if (expedicionPasaporte >= vencimientoPasaporte) {
          errors['fechaExpedicionPasaporte'] = 'La fecha de expedición debe ser anterior a la de vencimiento';
          isValid = false;
        }
        
        // Validar que el vencimiento no sea muy lejano (más de 10 años)
        const maxVencimiento = new Date();
        maxVencimiento.setFullYear(maxVencimiento.getFullYear() + 10);
        if (vencimientoPasaporte > maxVencimiento) {
          errors['fechaVencimientoPasaporte'] = 'La fecha de vencimiento no puede ser más de 10 años en el futuro';
          isValid = false;
        }
      }
    }

    return { errors, isValid };
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

  /**
   * Valida un archivo de imagen
   * @param file - Archivo a validar
   * @param maxSize - Tamaño máximo en bytes
   * @returns Objeto con resultado de validación
   */
  validateImageFile(file: File, maxSize: number = 5000000): { isValid: boolean, error?: string } {
    // Validar tamaño del archivo
    if (file.size > maxSize) {
      return { isValid: false, error: 'El archivo excede el tamaño máximo permitido' };
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { isValid: false, error: 'Solo se permiten archivos JPG, JPEG, PNG o WEBP' };
    }

    return { isValid: true };
  }
}