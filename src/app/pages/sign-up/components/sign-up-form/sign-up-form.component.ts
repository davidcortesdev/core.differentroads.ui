import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthenticateService } from '../../../../core/services/auth/auth-service.service';
import { UsersNetService } from '../../../../core/services/users/usersNet.service';
import { HubspotService } from '../../../../core/services/integrations/hubspot.service';
import { AnalyticsService } from '../../../../core/services/analytics/analytics.service';
import { ConfirmationCodeComponent } from '../../../../shared/components/confirmation-code/confirmation-code.component';
import { IUserResponse } from '../../../../core/models/users/user.model';
import { environment } from '../../../../../environments/environment';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-sign-up-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmationCodeComponent,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    DividerModule,
    ProgressSpinnerModule
  ],
  templateUrl: './sign-up-form.component.html',
  styleUrls: ['./sign-up-form.component.scss'],
})
export class SignUpFormComponent {
  signUpForm: FormGroup;
  isLoading: boolean = false;
  isConfirming: boolean = false;
  isRedirecting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  registeredUsername: string = '';
  userPassword: string = '';
  registeredUser: IUserResponse | null = null;

  // Mensajes de error personalizados
  errorMessages: { [key: string]: { [key: string]: string } } = {
    firstName: {
      required: 'El nombre es requerido.',
    },
    lastName: {
      required: 'El apellido es requerido.',
    },
    email: {
      required: 'El correo electrónico es requerido.',
      email: 'Ingresa un correo electrónico válido.',
    },
    phone: {
      required: 'El teléfono es requerido.',
      pattern: 'Ingresa un número de teléfono válido.',
    },
    password: {
      required: 'La contraseña es requerida.',
      minlength: 'La contraseña debe tener al menos 8 caracteres.',
    },
    confirmPassword: {
      required: 'Confirma tu contraseña.',
      mismatch: 'Las contraseñas no coinciden.',
    }
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthenticateService,
    private usersNetService: UsersNetService,
    private hubspotService: HubspotService,
    private analyticsService: AnalyticsService,
    private messageService: MessageService // <--- INYECTAR!
  ) {
    this.signUpForm = this.fb.group(
      {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, Validators.pattern(/^\d{6,14}$/)]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  showToastError(msg: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
  }

  signInWithGoogle(): void {
    this.isLoading = true;
    this.authService.handleGoogleSignIn().then(() => {
      this.isLoading = false;
    }).catch((error) => {
      this.isLoading = false;
      this.showToastError('Error al iniciar sesión con Google');
      console.error(error);
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.signUpForm.invalid) {
      this.showToastError('Por favor, corrige los errores en el formulario.');
      return;
    }

    this.isLoading = true;
    console.log('Formulario enviado:', this.signUpForm.value);

    // Crear el contacto en Hubspot primero
    const contactData = {
      email: this.signUpForm.value.email,
      firstname: this.signUpForm.value.firstName,
      lastname: this.signUpForm.value.lastName,
      phone: this.signUpForm.value.phone,
    };

    this.hubspotService.createContact(contactData)
      .subscribe({
        next: (hubspotResponse) => {
          console.log('Contacto creado en Hubspot exitosamente:', hubspotResponse);

          // Si Hubspot responde correctamente, proceder con el registro del usuario
          this.authService
            .signUp(this.signUpForm.value.email, this.signUpForm.value.password)
            .then((cognitoUserId) => {
              console.log('Usuario creado en Cognito con ID:', cognitoUserId);
              
              // Primero buscar si el usuario ya existe en UsersNet por email
              this.usersNetService
                .getUsersByEmail(this.signUpForm.value.email)
                .subscribe({
                  next: (existingUsers) => {
                    // Datos completos para crear usuario (todos los campos requeridos)
                    const userData = {
                      cognitoId: cognitoUserId,
                      name: this.signUpForm.value.firstName,
                      email: this.signUpForm.value.email,
                      lastName: this.signUpForm.value.lastName,
                      phone: this.signUpForm.value.phone,
                      hasWebAccess: true,
                      hasMiddleAccess: false,
                      retailerId: environment.retaileriddefault
                    };

                    if (existingUsers && existingUsers.length > 0) {
                      // Usuario existe, actualizar solo name, lastName, phone y cognitoId
                      const existingUser = existingUsers[0];
                      console.log('Usuario ya existe en UsersNet, actualizando datos:', existingUser);
                      
                      // Datos de actualización (campos requeridos + los que queremos actualizar)
                      const updateData = {
                        cognitoId: cognitoUserId,
                        name: this.signUpForm.value.firstName,
                        email: this.signUpForm.value.email,
                        lastName: this.signUpForm.value.lastName,
                        phone: this.signUpForm.value.phone
                      };
                      
                      this.usersNetService
                        .updateUser(existingUser.id, updateData)
                        .subscribe({
                          next: (updated) => {
                            console.log('Usuario actualizado exitosamente:', updated);
                            
                            // Guardar el usuario para verificar después de la confirmación
                            this.registeredUser = existingUser;
                            
                            // NO disparar evento sign_up aquí - solo se disparará cuando se confirme la cuenta
                            
                            this.isLoading = false;
                            this.isConfirming = true;
                            this.registeredUsername = this.signUpForm.value.email;
                            this.userPassword = this.signUpForm.value.password;
                            console.log('Registro completado. Esperando confirmación.');
                          },
                          error: (error: unknown) => {
                            this.isLoading = false;
                            this.showToastError(error instanceof Error ? error.message : 'Error al actualizar usuario');
                          }
                        });
                    } else {
                      // Usuario no existe, crear nuevo
                      console.log('Usuario no existe en UsersNet, creando nuevo usuario');
                      
                      this.usersNetService
                        .createUser(userData)
                        .subscribe({
                          next: (user) => {
                            console.log('Usuario creado exitosamente:', user);
                            
                            // Guardar el usuario para verificar después de la confirmación
                            this.registeredUser = user;
                            
                            // NO disparar evento sign_up aquí - solo se disparará cuando se confirme la cuenta
                            
                            this.isLoading = false;
                            this.isConfirming = true;
                            this.registeredUsername = this.signUpForm.value.email;
                            this.userPassword = this.signUpForm.value.password;
                            console.log('Registro completado. Esperando confirmación.');
                          },
                          error: (error: unknown) => {
                            this.isLoading = false;
                            this.showToastError(error instanceof Error ? error.message : 'Registro fallido');
                          }
                        });
                    }
                  },
                  error: (error: unknown) => {
                    this.isLoading = false;
                    this.showToastError(error instanceof Error ? error.message : 'Error al verificar usuario existente');
                  }
                });
            })
            .catch((error) => {
              this.isLoading = false;
              this.showToastError(error instanceof Error ? error.message : 'Registro fallido');
            });
        },
        error: (hubspotError) => {
          this.isLoading = false;
          this.showToastError('Error al crear el contacto en Hubspot');
          console.error('Error al crear contacto en Hubspot:', hubspotError);
        }
      });
  }

  onConfirmSuccess(): void {
    this.isLoading = false;
    this.isRedirecting = true;
    
    // Disparar evento sign_up para confirmación exitosa con datos completos
    this.trackSignUpWithCompleteData('manual');
    
    // Verificar si debe redirigir a tour operation después de confirmar la cuenta
    if (this.registeredUser && this.shouldRedirectToTourOperation(this.registeredUser)) {
      this.successMessage = 'Verificación exitosa. Redirigiendo a Tour Operation...';
      setTimeout(() => {
        this.redirectToTourOperation();
      }, 2000);
    } else {
      this.successMessage = 'Verificación exitosa. Redirigiendo al inicio de sesión...';
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }

  getErrorMessage(controlName: string, errors: any): string {
    if (errors) {
      const errorKey = Object.keys(errors)[0];
      return this.errorMessages[controlName][errorKey] || 'Error desconocido.';
    }
    return '';
  }

  redirectToLogin(): void {
    this.router.navigate(['/login']);
  }
  
  // Métodos para manejar los eventos del componente ConfirmationCodeComponent
  onLoadingChange(loading: boolean): void {
    this.isLoading = loading;
  }

  onErrorMessageChange(message: string): void {
    // Mostrar error de confirmación solo en Toast si no estamos en el paso intermedio
    if (!this.isConfirming) {
      this.showToastError(message);
    }
    this.errorMessage = message;
  }

  onSuccessMessageChange(message: string): void {
    this.successMessage = message;
  }

  /**
   * Disparar evento sign_up cuando el usuario se registra exitosamente
   */
  private trackSignUp(method: string): void {
    this.analyticsService.signUp(
      method,
      this.analyticsService.getUserData(
        this.signUpForm.value.email,
        this.signUpForm.value.phone,
        undefined // No tenemos Cognito ID aún en este punto
      )
    );
  }

  /**
   * Disparar evento sign_up con datos completos después de verificación exitosa
   * Solo se dispara UNA VEZ cuando se confirma la cuenta exitosamente
   */
  private trackSignUpWithCompleteData(method: string): void {
    // Si tenemos el usuario registrado, usar sus datos directamente
    if (this.registeredUser) {
      const phone = this.registeredUser.phone || this.signUpForm.value.phone || '';
      const formattedPhone = phone ? this.analyticsService.formatPhoneNumber(phone) : '';
      const userData = {
        email_address: this.registeredUser.email || this.signUpForm.value.email || '',
        phone_number: formattedPhone,
        user_id: this.registeredUser.cognitoId || ''
      };
      this.analyticsService.signUp(method, userData);
      return;
    }

    // Si no tenemos el usuario registrado, intentar obtenerlo con getCurrentUserData
    // Solo disparar UNA VEZ, no hacer múltiples fallbacks
    this.analyticsService.getCurrentUserData().subscribe({
      next: (userData) => {
        // Si getCurrentUserData ya tiene phone_number formateado, usarlo; si no, formatear desde formulario
        const phone = userData?.phone_number || this.signUpForm.value.phone || '';
        // Solo formatear si viene del formulario y no tiene el formato +
        const formattedPhone = userData?.phone_number 
          ? phone 
          : (phone ? this.analyticsService.formatPhoneNumber(phone) : '');
        const completeUserData = {
          email_address: userData?.email_address || this.signUpForm.value.email || '',
          phone_number: formattedPhone,
          user_id: userData?.user_id || ''
        };
        this.analyticsService.signUp(method, completeUserData);
      },
      error: (error) => {
        console.error('Error obteniendo datos de usuario para analytics:', error);
        // Fallback con datos del formulario - solo UNA VEZ
        const phone = this.signUpForm.value.phone || '';
        const formattedPhone = phone ? this.analyticsService.formatPhoneNumber(phone) : '';
        const fallbackUserData = {
          email_address: this.signUpForm.value.email || '',
          phone_number: formattedPhone,
          user_id: ''
        };
        this.analyticsService.signUp(method, fallbackUserData);
      }
    });
  }

  /**
   * Verifica si el usuario debe ser redirigido a la plataforma de tour operation
   */
  private shouldRedirectToTourOperation(user: IUserResponse): boolean {
    return !user.hasWebAccess && user.hasTourOperationAccess;
  }

  /**
   * Redirige al usuario a la plataforma de tour operation
   */
  private redirectToTourOperation(): void {
    this.isLoading = false;
    console.log('🔀 Redirigiendo a Tour Operation...');
    window.location.href = environment.tourOperationUrl;
  }
}