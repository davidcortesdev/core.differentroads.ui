import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import {
  DepartureReservationFieldService,
  IDepartureReservationFieldResponse,
} from '../../../../../../core/services/departure/departure-reservation-field.service';
import {
  MandatoryTypeService,
  IMandatoryTypeResponse,
} from '../../../../../../core/services/reservation/mandatory-type.service';
import {
  ReservationFieldService,
  IReservationFieldResponse,
} from '../../../../../../core/services/reservation/reservation-field.service';
import {
  ReservationTravelerService,
  IReservationTravelerResponse,
} from '../../../../../../core/services/reservation/reservation-traveler.service';
import {
  AgeGroupService,
  IAgeGroupResponse,
} from '../../../../../../core/services/agegroup/age-group.service';
import {
  ReservationTravelerFieldService,
  ReservationTravelerFieldCreate,
  ReservationTravelerFieldUpdate,
  IReservationTravelerFieldResponse,
} from '../../../../../../core/services/reservation/reservation-traveler-field.service';
import {
  FormGroup,
  FormBuilder,
  FormControl,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { IBookingRequirements } from '../../../../../../core/services/flight/flight-search.service';
import { PersonalInfo } from '../../../../../../core/models/v2/profile-v2.model';
import { CheckoutUserDataService } from '../../../../../../core/services/v2/checkout-user-data.service';

@Component({
  selector: 'app-info-traveler-form',
  standalone: false,
  templateUrl: './info-traveler-form.component.html',
  styleUrls: ['./info-traveler-form.component.scss'],
})
export class InfoTravelerFormComponent implements OnInit, OnDestroy, OnChanges {
  @Input() departureId: number | null = null;
  @Input() reservationId: number | null = null;
  @Input() travelerId: number | null = null;
  @Input() itineraryId: number | null = null;
  @Input() amadeusBookingRequirements: IBookingRequirements | null = null;
  @Input() hasFlightSelected: boolean = false;

  @Output() dataUpdated = new EventEmitter<void>();

  // Formulario reactivo
  travelerForm: FormGroup;

  // Datos del viajero
  traveler: IReservationTravelerResponse | null = null;
  ageGroup: IAgeGroupResponse | null = null;

  // Configuración de campos
  departureReservationFields: IDepartureReservationFieldResponse[] = [];
  mandatoryTypes: IMandatoryTypeResponse[] = [];
  reservationFields: IReservationFieldResponse[] = [];
  ageGroups: IAgeGroupResponse[] = [];

  // Datos existentes del viajero
  existingTravelerFields: IReservationTravelerFieldResponse[] = [];

  // Estados de carga
  loading: boolean = false;
  error: string | null = null;
  showMoreFields: boolean = false;
  loadingUserData: boolean = false;
  savingData: boolean = false;
  autoSaving: boolean = false;
  isInitializing: boolean = false; // Nuevo: controlar estado de inicialización

  // Información personal del usuario autenticado
  currentPersonalInfo: PersonalInfo | null = null;

  // Subject para guardado automático con debounce
  private autoSave$ = new Subject<void>();
  
  // Flag para evitar múltiples guardados simultáneos
  private isAutoSavingInProgress: boolean = false;

  // Fechas calculadas para cada campo
  travelerFieldDates: {
    [fieldCode: string]: {
      minDate: Date;
      maxDate: Date;
    };
  } = {};

  sexOptions = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' }
  ];

  countryOptions = [
    { name: 'España', code: 'ES', value: 'ES' },
    { name: 'Colombia', code: 'CO', value: 'CO' },
  ];

  // Mensajes de error personalizados
  errorMessages: { [key: string]: { [key: string]: (params?: Record<string, unknown>) => string } } = {
    email: {
      required: () => 'El correo electrónico es requerido.',
      email: () => 'Ingresa un correo electrónico válido.',
    },
    phone: {
      required: () => 'El teléfono es requerido.',
      pattern: () => 'Ingresa un número de teléfono válido. Puede incluir código de país.',
    },
    text: {
      required: () => 'Este campo es obligatorio.',
      minlength: (params) => `Debe tener al menos ${params?.['minLength']} caracteres.`,
      maxlength: (params) => `No puede tener más de ${params?.['maxLength']} caracteres.`,
      pattern: () => 'Ingresa un número de teléfono válido. Puede incluir código de país.',
    },
    number: {
      required: () => 'Este campo es obligatorio.',
      min: (params) => `El valor mínimo es ${params?.['min']}.`,
      max: (params) => `El valor máximo es ${params?.['max']}.`,
    },
    date: {
      required: () => 'Esta fecha es obligatoria.',
      invalidDate: () => 'Fecha inválida.',
      pastDate: () => 'La fecha debe ser anterior a hoy.',
      futureDate: () => 'La fecha debe ser posterior a hoy.',
      birthdateTooRecent: () => 'La fecha de nacimiento no puede ser posterior a la fecha máxima permitida. La edad mínima para este grupo no corresponde.',
      birthdateFuture: () => 'La fecha de nacimiento no puede ser futura.',
      expirationDatePast: () => 'La fecha de expiración no puede ser anterior a hoy.'
    },
    sex: {
      required: () => 'Debe seleccionar un sexo.',
      pattern: () => 'Debe seleccionar una opción válida.',
    },
    country: {
      required: () => 'Debe seleccionar un país.',
    },
    required: {
      required: () => 'Este campo es obligatorio.',
    },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private departureReservationFieldService: DepartureReservationFieldService,
    private mandatoryTypeService: MandatoryTypeService,
    private reservationFieldService: ReservationFieldService,
    private reservationTravelerService: ReservationTravelerService,
    private ageGroupService: AgeGroupService,
    private reservationTravelerFieldService: ReservationTravelerFieldService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private checkoutUserDataService: CheckoutUserDataService
  ) {
    this.travelerForm = this.fb.group({});
  }

  ngOnInit(): void {
    if (this.departureId && this.reservationId && this.travelerId) {
      this.loadAllData();
    } else {
      this.error = 'No se proporcionaron todos los IDs necesarios';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['departureId'] && changes['departureId'].currentValue) ||
      (changes['reservationId'] && changes['reservationId'].currentValue) ||
      (changes['travelerId'] && changes['travelerId'].currentValue)
    ) {
      if (this.departureId && this.reservationId && this.travelerId) {
        this.loading = false;
        this.error = null;
        this.loadAllData();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.autoSave$.complete();
    this.isAutoSavingInProgress = false;
    this.isInitializing = false;
  }

  /**
   * Cargar todos los datos necesarios
   */
  private loadAllData(): void {
    if (!this.departureId || !this.reservationId || !this.travelerId) {
      return;
    }

    this.loading = true;
    this.error = null;

    // Cargar datos del usuario autenticado si está disponible
    const userDataObservable = this.isUserAuthenticated() 
      ? this.checkoutUserDataService.getCurrentUserData().pipe(
          catchError((error) => {
            console.warn('No se pudieron cargar los datos del usuario:', error);
            return of(null);
          })
        )
      : of(null);

    userDataObservable.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (userData) => {
        console.log('=== DATOS DEL USUARIO CARGADOS ===');
        console.log('userData:', userData);
        console.log('userData.sexo:', userData?.sexo);
        console.log('userData.nombre:', userData?.nombre);
        console.log('userData.email:', userData?.email);
        console.log('===================================');
        
        this.currentPersonalInfo = userData;
        
        // Cargar datos del viajero y configuración
        forkJoin({
          traveler: this.reservationTravelerService.getById(this.travelerId!),
          departureFields: this.departureReservationFieldService.getByDeparture(this.departureId!),
          mandatoryTypes: this.mandatoryTypeService.getAll(),
          reservationFields: this.reservationFieldService.getAllOrdered(),
          ageGroups: this.ageGroupService.getAllOrdered(),
        }).pipe(takeUntil(this.destroy$))
          .subscribe({
            next: ({
              traveler,
              departureFields,
              mandatoryTypes,
              reservationFields,
              ageGroups,
            }) => {
              this.traveler = traveler;
              this.departureReservationFields = departureFields;
              this.mandatoryTypes = mandatoryTypes;
              this.reservationFields = reservationFields;
              this.ageGroups = ageGroups;
              
              // Buscar el age group del viajero
              this.ageGroup = this.ageGroups.find(ag => ag.id === this.traveler?.ageGroupId) || null;

              // Ordenar los campos por displayOrder
              this.sortDepartureFieldsByDisplayOrder();

              // Cargar campos existentes del viajero
              this.loadExistingTravelerFields();
            },
            error: (error) => {
              this.error = 'Error al cargar los datos de configuración';
              this.loading = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar los datos del viajero',
                life: 5000,
              });
            },
          });
      },
      error: (error) => {
        console.error('Error al cargar datos del usuario:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Ordenar los campos de departure por displayOrder
   */
  private sortDepartureFieldsByDisplayOrder(): void {
    this.departureReservationFields.sort((a, b) => {
      const fieldA = this.getReservationFieldDetails(a.reservationFieldId);
      const fieldB = this.getReservationFieldDetails(b.reservationFieldId);

      if (!fieldA || !fieldB) {
        return 0;
      }

      return fieldA.displayOrder - fieldB.displayOrder;
    });
  }

  /**
   * Cargar datos existentes de campos del viajero
   */
  private loadExistingTravelerFields(): void {
    if (!this.travelerId) {
      return;
    }

    this.reservationTravelerFieldService
      .getByReservationTraveler(this.travelerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fields) => {
          this.existingTravelerFields = fields;

          // Inicializar formulario con los valores existentes
          this.initializeTravelerForm();
        },
        error: (error) => {
          console.error('Error al cargar campos del viajero:', error);
          this.loading = false;
        },
      });
  }

  /**
   * Inicializa el formulario del viajero
   */
  private initializeTravelerForm(): void {
    console.log('=== initializeTravelerForm() INICIADO ===');
    console.log('this.traveler:', this.traveler);
    console.log('this.traveler.isLeadTraveler:', this.traveler?.isLeadTraveler);
    console.log('this.currentPersonalInfo:', this.currentPersonalInfo);
    
    if (!this.traveler) {
      console.log('[ERROR] No hay traveler, saliendo');
      return;
    }

    // Marcar que estamos inicializando para evitar autoguardado prematuro
    this.isInitializing = true;

    // Limpiar formulario existente
    this.travelerForm = this.fb.group({});

    // Agregar controles para todos los campos posibles
    this.departureReservationFields.forEach((field) => {
      const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
      if (fieldDetails) {
        let controlValue: string | Date | null = null;
        
        // 1️⃣ PRIMERO: Intentar cargar datos existentes de la BD
        const existingValue = this.getExistingFieldValue(this.traveler!.id, fieldDetails.id);
        
        if (existingValue) {
          // Si hay datos en BD, usarlos (tienen prioridad)
          controlValue = existingValue;
          console.log(`[BD] Campo: ${fieldDetails.code} → Valor de BD: "${controlValue}"`);
        } else if (this.traveler!.isLeadTraveler && this.currentPersonalInfo) {
          // 2️⃣ SEGUNDO: Si NO hay datos en BD Y es lead traveler, prellenar del perfil
          const userValue = this.getUserDataForField(fieldDetails);
          if (userValue) {
            controlValue = userValue;
            console.log(`[PERFIL] Campo: ${fieldDetails.code} → Pre-llenado desde perfil: "${controlValue}"`);
          } else {
            console.log(`[VACÍO] Campo: ${fieldDetails.code} → Sin datos en BD ni en perfil`);
          }
        } else {
          // 3️⃣ TERCERO: No hay datos en BD y no es lead traveler (o no hay perfil)
          console.log(`[VACÍO] Campo: ${fieldDetails.code} → Sin datos`);
        }

        // Para campos de fecha, convertir string a Date si es necesario
        if (fieldDetails.fieldType === 'date' && controlValue) {
          let parsedDate: Date | null = null;
          
          if (typeof controlValue === 'string' && controlValue.includes('-')) {
            parsedDate = this.parseDateFromISO(controlValue);
          } else if (typeof controlValue === 'string' && controlValue.includes('/')) {
            parsedDate = this.parseDateFromDDMMYYYY(controlValue);
          }
          
          if (parsedDate) {
            controlValue = parsedDate;
          }
        }

        // Aplicar validaciones según el tipo de campo
        const validators = this.getValidatorsForField(
          fieldDetails,
          field,
          this.traveler!.isLeadTraveler
        );

        const controlName = `${fieldDetails.code}_${this.traveler!.id}`;
        const control = this.fb.control(controlValue, validators);

        // ⭐ NUEVO: Si el valor viene del perfil del usuario (no de BD), marcarlo como dirty
        if (this.traveler!.isLeadTraveler && this.currentPersonalInfo && !existingValue && controlValue) {
          control.markAsDirty();
          control.markAsTouched();
          console.log(`[PRE-LLENADO] ${fieldDetails.code} marcado como dirty desde perfil del usuario`);
        }

        this.travelerForm.addControl(controlName, control);
        
        console.log(`[CONTROL CREADO] ${controlName} con valor: "${controlValue}"`);
      }
    });

    console.log('=== FORMULARIO COMPLETO CREADO ===');
    console.log('Valores del formulario:', this.travelerForm.value);
    
    // Log individual de cada control creado
    Object.keys(this.travelerForm.controls).forEach((controlName) => {
      const control = this.travelerForm.get(controlName);
      const value = control?.value;
      const isValid = control?.valid;
      console.log(`  ${controlName}: "${value}" [válido: ${isValid}]`);
    });
    console.log('===================================');

    // Calcular fechas para los campos de fecha
    this.calculateTravelerFieldDates();

    this.loading = false;

    // Finalizar inicialización
    this.isInitializing = false;

    // Inicializar guardado automático
    this.initializeAutoSave();

    // Validación inicial
    setTimeout(() => {
      this.validateFormInRealTime();
      
      // ⭐ CORREGIDO: Solo disparar autoguardado si hay datos pre-llenados Y no estamos inicializando
      if (this.traveler!.isLeadTraveler && this.currentPersonalInfo && !this.isInitializing) {
        console.log('[initializeTravelerForm] Verificando si hay datos pre-llenados del usuario para guardar...');
        
        // Verificar si hay cambios pendientes después de la inicialización
        setTimeout(() => {
          if (this.hasPendingChanges()) {
            console.log('[initializeTravelerForm] Hay datos pre-llenados del usuario, disparando guardado automático...');
            this.autoSave$.next();
          }
        }, 500); // Aumentar delay para asegurar que la inicialización termine
      }
    }, 100); // Aumentar delay inicial
  }

  /**
   * Obtiene las validaciones para un campo específico
   */
  private getValidatorsForField(
    fieldDetails: IReservationFieldResponse,
    field: IDepartureReservationFieldResponse,
    isLeadTraveler: boolean
  ): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    // Verificar si el campo es obligatorio
    if (this.isFieldMandatory(field, isLeadTraveler)) {
      validators.push(Validators.required);
    }

    // Validaciones específicas según el tipo de campo
    switch (fieldDetails.fieldType) {
      case 'email':
        validators.push(Validators.email);
        break;
      case 'phone':
        validators.push(this.phoneValidator());
        break;
      case 'text':
        if (fieldDetails.code === 'phone') {
          validators.push(this.phoneValidator());
        } else {
          validators.push(Validators.minLength(2));
          validators.push(Validators.maxLength(50));
        }
        break;
      case 'number':
        validators.push(Validators.min(0));
        validators.push(Validators.max(999999));
        break;
      case 'date':
        validators.push(this.dateValidator());
        
        const isBirthDate = fieldDetails.code.toLowerCase().includes('birth') || 
                           fieldDetails.code.toLowerCase().includes('nacimiento') ||
                           fieldDetails.name.toLowerCase().includes('nacimiento') ||
                           fieldDetails.name.toLowerCase().includes('birth') ||
                           fieldDetails.code.toLowerCase().includes('fecha_nacimiento') ||
                           fieldDetails.code.toLowerCase().includes('birth_date');
        
        const isExpirationDate = fieldDetails.code.toLowerCase().includes('expir') || 
                                fieldDetails.code.toLowerCase().includes('venc') ||
                                fieldDetails.name.toLowerCase().includes('expiración') ||
                                fieldDetails.name.toLowerCase().includes('vencimiento') ||
                                fieldDetails.code.toLowerCase().includes('expiration') ||
                                fieldDetails.code.toLowerCase().includes('expiry');
        
        if (isBirthDate && this.traveler) {
          validators.push(this.birthdateValidator(this.traveler.ageGroupId));
        } else if (isExpirationDate) {
          validators.push(this.expirationDateValidator());
        }
        break;
      case 'sex':
        validators.push(Validators.pattern(/^(M|F)$/));
        break;
      case 'country':
        validators.push(Validators.pattern(/^[A-Z]{2}$/));
        break;
    }

    return validators;
  }

  /**
   * Validador personalizado para teléfono
   * Permite números internacionales con código de país y espacios
   */
  private phoneValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Si está vacío, required validator se encarga
      }

      const phoneValue = control.value.toString().trim();
      if (!phoneValue) {
        return null;
      }

      // Normalizar el teléfono eliminando espacios y guiones
      const normalizedPhone = phoneValue.replace(/[\s-]/g, '');
      
      // Patrón que acepta: +código_país (1-3 dígitos) + número (6-14 dígitos)
      // También acepta solo el número sin código de país
      const phoneRegex = /^(\+\d{1,3})?\d{6,14}$/;
      
      if (!phoneRegex.test(normalizedPhone)) {
        return { pattern: true };
      }

      return null;
    };
  }

  private dateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      let date: Date;

      if (control.value instanceof Date) {
        date = control.value;
      } else if (typeof control.value === 'string') {
        if (control.value.includes('/')) {
          const parts = control.value.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            date = new Date(year, month, day);
          } else {
            return { invalidDate: true };
          }
        } else {
          date = new Date(control.value);
        }
      } else {
        return { invalidDate: true };
      }

      if (isNaN(date.getTime())) {
        return { invalidDate: true };
      }

      return null;
    };
  }

  /**
   * Validador para fecha de nacimiento con edad mínima por AgeGroup
   */
  private birthdateValidator(ageGroupId: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const ageGroup = this.ageGroups.find(group => group.id === ageGroupId);
      if (!ageGroup || !ageGroup.lowerLimitAge) {
        return null;
      }

      let date: Date;
      if (control.value instanceof Date) {
        date = control.value;
      } else if (typeof control.value === 'string') {
        if (control.value.includes('/')) {
          const parts = control.value.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            date = new Date(year, month, day);
          } else {
            return { invalidDate: true };
          }
        } else {
          date = new Date(control.value);
        }
      } else {
        return { invalidDate: true };
      }

      if (isNaN(date.getTime())) {
        return { invalidDate: true };
      }

      const today = new Date();
      const maxDate = new Date(today.getFullYear() - ageGroup.lowerLimitAge, today.getMonth(), today.getDate());
      
      if (date > maxDate) {
        return { 
          birthdateTooRecent: true, 
          minAge: ageGroup.lowerLimitAge,
          maxAllowedDate: this.formatDateToDDMMYYYY(maxDate)
        };
      }

      if (date > today) {
        return { birthdateFuture: true };
      }

      return null;
    };
  }

  /**
   * Validador para fechas de expiración
   */
  private expirationDateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      let date: Date;
      if (control.value instanceof Date) {
        date = control.value;
      } else if (typeof control.value === 'string') {
        if (control.value.includes('/')) {
          const parts = control.value.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            date = new Date(year, month, day);
          } else {
            return { invalidDate: true };
          }
        } else {
          date = new Date(control.value);
        }
      } else {
        return { invalidDate: true };
      }

      if (isNaN(date.getTime())) {
        return { invalidDate: true };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      if (date < today) {
        return { expirationDatePast: true };
      }

      return null;
    };
  }

  /**
   * Calcular y almacenar fechas para los campos de fecha
   */
  private calculateTravelerFieldDates(): void {
    if (!this.traveler) {
      return;
    }

    this.travelerFieldDates = {};
    
    const dateFields = ['birthdate', 'expirationdate'];
    
    dateFields.forEach(fieldCode => {
      const minDate = this.getMinDateForField(fieldCode);
      const maxDate = this.getMaxDateForField(fieldCode);
      
      this.travelerFieldDates[fieldCode] = {
        minDate: minDate,
        maxDate: maxDate
      };
    });
  }

  /**
   * Obtener fecha mínima para el campo de fecha
   */
  private getMinDateForField(fieldCode: string): Date {
    if (!this.traveler) {
      return new Date(1924, 0, 1);
    }

    if (fieldCode === 'birthdate') {
      const today = new Date();
      
      if (this.ageGroup && this.ageGroup.upperLimitAge) {
        const minDate = new Date(today.getFullYear() - this.ageGroup.upperLimitAge, today.getMonth(), today.getDate());
        return minDate;
      } else {
        const minDate = new Date(today.getFullYear() - 100, 0, 1);
        return minDate;
      }
    } else if (fieldCode === 'expirationdate') {
      const today = new Date();
      return today;
    }
    
    const today = new Date();
    return new Date(today.getFullYear() - 100, 0, 1);
  }

  /**
   * Obtener fecha máxima para el campo de fecha
   */
  private getMaxDateForField(fieldCode: string): Date {
    if (!this.traveler) {
      return new Date();
    }

    if (fieldCode === 'birthdate') {
      const today = new Date();
      
      if (this.ageGroup && this.ageGroup.lowerLimitAge) {
        const maxDate = new Date(today.getFullYear() - this.ageGroup.lowerLimitAge, today.getMonth(), today.getDate());
        return maxDate;
      } else {
        return today;
      }
    } else if (fieldCode === 'expirationdate') {
      const today = new Date();
      return new Date(today.getFullYear() + 30, 11, 31);
    }
    
    return new Date();
  }

  /**
   * Obtener fecha mínima almacenada para un campo específico
   */
  getStoredMinDate(fieldCode: string): Date {
    return this.travelerFieldDates[fieldCode]?.minDate || new Date(1924, 0, 1);
  }

  /**
   * Obtener fecha máxima almacenada para un campo específico
   */
  getStoredMaxDate(fieldCode: string): Date {
    return this.travelerFieldDates[fieldCode]?.maxDate || new Date();
  }

  /**
   * Formatear fecha a dd/mm/yyyy
   */
  private formatDateToDDMMYYYY(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Parsear string dd/mm/yyyy a Date
   */
  private parseDateFromDDMMYYYY(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }

    const parts = dateString.split('/');
    if (parts.length !== 3) {
      return null;
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }

    const date = new Date(year, month, day);

    if (
      date.getDate() !== day ||
      date.getMonth() !== month ||
      date.getFullYear() !== year
    ) {
      return null;
    }

    return date;
  }

  /**
   * Parsear string ISO (YYYY-MM-DD) a Date
   */
  private parseDateFromISO(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }

    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  /**
   * Obtener el valor existente de un campo específico
   */
  private getExistingFieldValue(travelerId: number, fieldId: number): string {
    const existingField = this.existingTravelerFields.find(
      (field) =>
        field.reservationTravelerId === travelerId &&
        field.reservationFieldId === fieldId
    );

    return existingField ? existingField.value : '';
  }

  /**
   * Obtener datos del usuario autenticado para un campo específico
   */
  private getUserDataForField(fieldDetails: IReservationFieldResponse): string | null {
    const userData = this.currentPersonalInfo;
    if (!userData) {
      console.log(`[getUserDataForField] No hay userData disponible para ${fieldDetails.code}`);
      return null;
    }

    console.log(`[getUserDataForField] Buscando datos para campo: ${fieldDetails.code}`, userData);
    const fieldCode = fieldDetails.code;
    
    let returnValue: string | null = null;
    
    switch (fieldCode) {
      case 'email':
        returnValue = userData.email || null;
        break;
      case 'phone':
      case 'telefono':
        returnValue = userData.telefono || null;
        break;
      case 'firstname':
      case 'first_name':
      case 'name':
      case 'nombre':
        returnValue = userData.nombre || null;
        break;
      case 'lastname':
      case 'last_name':
      case 'surname':
      case 'apellido':
      case 'apellidos':
        returnValue = userData.apellido || null;
        break;
      case 'birthdate':
      case 'fecha_nacimiento':
        returnValue = userData.fechaNacimiento || null;
        break;
      case 'dni':
      case 'national_id':
        returnValue = userData.dni || null;
        break;
      case 'nationality':
      case 'country':
      case 'pais':
        returnValue = userData.pais || null;
        break;
      case 'city':
      case 'ciudad':
        returnValue = userData.ciudad || null;
        break;
      case 'postal_code':
      case 'codigo_postal':
        returnValue = userData.codigoPostal || null;
        break;
      case 'address':
      case 'direccion':
        returnValue = userData.direccion || null;
        break;
      case 'sex':
      case 'sexo':
        returnValue = this.normalizeSexValue(userData.sexo);
        break;
      default:
        const codeLower = (fieldCode || '').toLowerCase();
        switch (codeLower) {
          case 'sex':
          case 'gender':
          case 'sexo':
            returnValue = this.normalizeSexValue(userData.sexo);
            break;
          default:
            returnValue = null;
        }
    }
    
    console.log(`[getUserDataForField] Campo: ${fieldCode} → Valor retornado: "${returnValue}"`);
    return returnValue;
  }

  /**
   * Normaliza el valor del sexo a formato corto (M, F)
   */
  private normalizeSexValue(sexValue: string | null | undefined): string | null {
    console.log(`[normalizeSexValue] Entrada: "${sexValue}"`);
    
    if (!sexValue) {
      console.log(`[normalizeSexValue] Valor vacío, retornando null`);
      return null;
    }

    const sexUpper = sexValue.toUpperCase().trim();
    console.log(`[normalizeSexValue] Valor en mayúsculas: "${sexUpper}"`);
    
    // Si ya está en formato corto, retornar tal cual
    if (sexUpper === 'M' || sexUpper === 'F') {
      console.log(`[normalizeSexValue] Ya está en formato corto: "${sexUpper}"`);
      return sexUpper;
    }

    // Convertir valores completos a formato corto
    if (sexUpper === 'MASCULINO' || sexUpper === 'MALE' || sexUpper === 'HOMBRE') {
      console.log(`[normalizeSexValue] Convertido a M`);
      return 'M';
    }
    if (sexUpper === 'FEMENINO' || sexUpper === 'FEMALE' || sexUpper === 'MUJER') {
      console.log(`[normalizeSexValue] Convertido a F`);
      return 'F';
    }

    // Si no coincide con ninguno, retornar null
    console.log(`[normalizeSexValue] No coincide con ningún valor conocido, retornando null`);
    return null;
  }

  /**
   * Obtener detalles del campo de reservación
   */
  getReservationFieldDetails(
    reservationFieldId: number
  ): IReservationFieldResponse | null {
    return (
      this.reservationFields.find((field) => field.id === reservationFieldId) ||
      null
    );
  }

  /**
   * Verifica si un campo es obligatorio
   */
  isFieldMandatory(
    field: IDepartureReservationFieldResponse,
    isLeadTraveler: boolean = false
  ): boolean {
    // Verificar si es obligatorio según la configuración estándar
    let isStandardMandatory = false;
    
    if (field.mandatoryTypeId === 1) {
      isStandardMandatory = false;
    } else if (field.mandatoryTypeId === 2) {
      isStandardMandatory = true;
    } else if (field.mandatoryTypeId === 3 && isLeadTraveler) {
      isStandardMandatory = true;
    }

    // Verificar si es obligatorio según los requisitos de Amadeus
    const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
    const isAmadeusMandatory = fieldDetails ? this.isFieldAmadeusMandatory(fieldDetails, isLeadTraveler) : false;

    return isStandardMandatory || isAmadeusMandatory;
  }

  /**
   * Verifica si un campo es obligatorio según los requisitos de Amadeus
   */
  private isFieldAmadeusMandatory(
    fieldDetails: IReservationFieldResponse,
    isLeadTraveler: boolean
  ): boolean {
    if (!this.amadeusBookingRequirements || !this.hasFlightSelected) {
      return false;
    }

    const fieldCode = fieldDetails.code.toLowerCase();

    // Requisitos generales (solo para el líder)
    if (isLeadTraveler) {
      if (this.amadeusBookingRequirements.mailingAddressRequired && 
          (fieldCode === 'address' || fieldCode === 'mailing_address')) {
        return true;
      }

      if (this.amadeusBookingRequirements.mobilePhoneNumberRequired && 
          fieldCode === 'phone') {
        return true;
      }

      if (this.amadeusBookingRequirements.phoneNumberRequired && 
          fieldCode === 'phone') {
        return true;
      }

      if (this.amadeusBookingRequirements.emailAddressRequired && 
          fieldCode === 'email') {
        return true;
      }

      if (this.amadeusBookingRequirements.postalCodeRequired && 
          fieldCode === 'postal_code') {
        return true;
      }

      if (this.amadeusBookingRequirements.invoiceAddressRequired && 
          (fieldCode === 'invoice_address' || fieldCode === 'billing_address')) {
        return true;
      }

      if (this.amadeusBookingRequirements.phoneCountryCodeRequired && 
          fieldCode === 'phone_country_code') {
        return true;
      }
    }

    // Requisitos específicos por viajero
    if (this.amadeusBookingRequirements.travelerRequirements && 
        this.amadeusBookingRequirements.travelerRequirements.length > 0 &&
        this.traveler) {
      
      const travelerRequirements = this.amadeusBookingRequirements.travelerRequirements.find(
        req => String(req.travelerId) === String(this.traveler!.id)
      );

      if (travelerRequirements) {
        if (travelerRequirements.genderRequired && fieldCode === 'sex') {
          return true;
        }

        if (travelerRequirements.documentRequired && fieldCode === 'national_id') {
          return true;
        }

        if (travelerRequirements.dateOfBirthRequired && fieldCode === 'birthdate') {
          return true;
        }

        if (travelerRequirements.documentIssuanceCityRequired && 
            fieldCode === 'document_issuance_city') {
          return true;
        }

        if (travelerRequirements.redressRequiredIfAny && fieldCode === 'redress_number') {
          return true;
        }

        if (travelerRequirements.airFranceDiscountRequired && 
            fieldCode === 'air_france_discount') {
          return true;
        }

        if (travelerRequirements.spanishResidentDiscountRequired && 
            fieldCode === 'spanish_resident_discount') {
          return true;
        }

        if (travelerRequirements.residenceRequired && fieldCode === 'country') {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Alternar mostrar campos adicionales
   */
  toggleMoreFields(): void {
    this.showMoreFields = !this.showMoreFields;
  }

  /**
   * Obtener nombre del grupo de edad
   */
  getAgeGroupName(): string {
    return this.ageGroup ? this.ageGroup.name : 'Adulto';
  }

  /**
   * Manejar cambio en campo de fecha
   */
  onDateFieldChange(fieldCode: string, value: Date): void {
    if (!this.traveler) {
      return;
    }

    const controlName = `${fieldCode}_${this.traveler.id}`;
    const control = this.travelerForm.get(controlName);

    if (control) {
      control.setValue(value);
      control.markAsDirty();
      control.markAsTouched();
      control.updateValueAndValidity();
      
      this.validateFormInRealTime();
    }
  }

  /**
   * Manejar pérdida de foco en campo de fecha
   */
  onDateFieldBlur(fieldCode: string): void {
    if (!this.traveler) {
      return;
    }

    const controlName = `${fieldCode}_${this.traveler.id}`;
    const control = this.travelerForm.get(controlName);

    if (control) {
      control.markAsTouched();
      control.updateValueAndValidity();
      
      this.validateFormInRealTime();
    }
  }

  /**
   * Manejar cambio en cualquier campo del formulario
   */
  onFieldChange(fieldCode: string): void {
    if (!this.traveler) {
      return;
    }

    const controlName = `${fieldCode}_${this.traveler.id}`;
    const control = this.travelerForm.get(controlName);

    if (control) {
      control.markAsDirty();
      control.markAsTouched();
      
      this.validateFormInRealTime();
    }
  }

  /**
   * Maneja el cambio en campos de teléfono
   */
  onPhoneFieldChange(fieldCode: string, event: Event): void {
    if (!this.traveler) {
      return;
    }

    const input = event.target as HTMLInputElement;
    // Permitir números, +, espacios y guiones
    let filtered = input.value.replace(/[^\d+\s-]/g, '');
    
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
    filtered = filtered.slice(0, 20);
    
    input.value = filtered;

    const controlName = `${fieldCode}_${this.traveler.id}`;
    const control = this.travelerForm.get(controlName);

    if (control) {
      control.setValue(filtered);
      control.markAsDirty();
      control.markAsTouched();
      
      this.validateFormInRealTime();
    }
  }

  /**
   * Verifica si un campo específico tiene errores
   */
  hasFieldError(fieldCode: string): boolean {
    if (!this.traveler) {
      return false;
    }

    const controlName = `${fieldCode}_${this.traveler.id}`;
    const control = this.travelerForm.get(controlName);

    return control
      ? control.invalid && (control.dirty || control.touched)
      : false;
  }

  /**
   * Obtiene los errores de un campo específico
   */
  getFieldErrors(fieldCode: string): Record<string, unknown> | null {
    if (!this.traveler) {
      return null;
    }

    const controlName = `${fieldCode}_${this.traveler.id}`;
    const control = this.travelerForm.get(controlName);

    return control ? control.errors : null;
  }

  /**
   * Obtiene el valor de un campo específico
   */
  getFieldValue(fieldCode: string): string | Date | null {
    if (!this.traveler) {
      return null;
    }

    const controlName = `${fieldCode}_${this.traveler.id}`;
    const control = this.travelerForm.get(controlName);

    return control ? control.value : null;
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getErrorMessage(fieldCode: string, errors: Record<string, unknown> | null): string {
    if (!errors) return '';

    const fieldType = this.getFieldTypeByCode(fieldCode);
    const errorMessages = this.errorMessages[fieldType] || this.errorMessages['required'];

    for (const errorKey in errors) {
      const messageFunction = errorMessages[errorKey];
      if (messageFunction) {
        const params = errors[errorKey] as Record<string, unknown>;
        const message = messageFunction(params);
        return message;
      }
    }

    return 'Campo inválido';
  }

  /**
   * Obtiene el tipo de campo por su código
   */
  private getFieldTypeByCode(fieldCode: string): string {
    const field = this.reservationFields.find((f) => f.code === fieldCode);

    if (fieldCode === 'phone') {
      return 'phone';
    }

    return field?.fieldType || 'required';
  }

  /**
   * Obtiene el estado de validación de un campo específico
   */
  getFieldValidationState(fieldCode: string): 'valid' | 'invalid' | 'empty' | 'untouched' {
    if (!this.traveler) {
      return 'untouched';
    }

    const controlName = `${fieldCode}_${this.traveler.id}`;
    const control = this.travelerForm.get(controlName);

    if (!control) {
      return 'untouched';
    }

    if (!control.touched && !control.dirty) {
      return 'untouched';
    }

    if (!control.value || control.value === '') {
      return 'empty';
    }

    return control.valid ? 'valid' : 'invalid';
  }

  /**
   * Valida el formulario completo
   */
  isFormValid(): boolean {
    return this.travelerForm.valid;
  }

  /**
   * Validación en tiempo real del formulario
   */
  private validateFormInRealTime(): void {
    this.dataUpdated.emit();
  }

  /**
   * Inicializa el guardado automático del formulario
   */
  private initializeAutoSave(): void {
    console.log('=== Guardado automático inicializado ===');
    
    // Subscribirse a cambios del formulario con debounce de 2 segundos
    this.travelerForm.valueChanges
      .pipe(
        debounceTime(2000),  // Esperar 2 segundos después del último cambio
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        console.log('[AutoSave] Cambios detectados, iniciando guardado automático...');
        this.performAutoSave();
      });

    // También subscribirse al Subject de autoguardado manual
    this.autoSave$
      .pipe(
        debounceTime(2000),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.performAutoSave();
      });
  }

  /**
   * Ejecuta el guardado automático
   */
  private async performAutoSave(): Promise<void> {
    // No auto-guardar si ya está guardando manualmente, cargando, inicializando o ya hay un autoguardado en progreso
    if (this.savingData || this.loading || this.isInitializing || this.isAutoSavingInProgress) {
      console.log('[AutoSave] Ya hay un guardado en curso, cargando, inicializando o autoguardado en progreso, saltando...');
      return;
    }

    // Verificar si hay cambios pendientes
    if (!this.hasPendingChanges()) {
      console.log('[AutoSave] No hay cambios pendientes');
      return;
    }

    console.log('[AutoSave] Ejecutando guardado automático...');
    this.autoSaving = true;
    this.isAutoSavingInProgress = true;

    try {
      await this.saveData();
      console.log('[AutoSave] ✅ Guardado automático completado');
      
      // Toast sutil para no molestar al usuario
      this.messageService.add({
        severity: 'success',
        summary: 'Guardado automático',
        detail: 'Tus cambios han sido guardados',
        life: 2000,
      });
    } catch (error) {
      console.error('[AutoSave] Error en guardado automático:', error);
      
      this.messageService.add({
        severity: 'error',
        summary: 'Error al guardar',
        detail: 'No se pudieron guardar los cambios automáticamente',
        life: 4000,
      });
    } finally {
      this.autoSaving = false;
      this.isAutoSavingInProgress = false;
    }
  }

  /**
   * Verifica si todos los campos obligatorios están completados
   */
  private areAllMandatoryFieldsCompleted(): boolean {
    if (!this.traveler) {
      return false;
    }

    for (const field of this.departureReservationFields) {
      if (this.isFieldMandatory(field, this.traveler.isLeadTraveler)) {
        const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
        if (fieldDetails) {
          const controlName = `${fieldDetails.code}_${this.traveler.id}`;
          const control = this.travelerForm.get(controlName);

          if (!control || !control.value || control.invalid) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Marca todos los campos como touched
   */
  markAllFieldsAsTouched(): void {
    Object.keys(this.travelerForm.controls).forEach((controlName) => {
      const control = this.travelerForm.get(controlName);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  /**
   * Recopila los datos del formulario para guardar
   */
  collectFormData(): ReservationTravelerFieldCreate[] {
    if (!this.traveler) {
      return [];
    }

    console.log('=== collectFormData() INICIADO ===');
    console.log('Total de controles en formulario:', Object.keys(this.travelerForm.controls).length);
    console.log('Campos existentes en BD:', this.existingTravelerFields.length);

    const formData: ReservationTravelerFieldCreate[] = [];

    Object.keys(this.travelerForm.controls).forEach((controlName) => {
      const control = this.travelerForm.get(controlName);

      if (control) {
        const { fieldCode } = this.parseFieldName(controlName);

        if (fieldCode) {
          const field = this.reservationFields.find((f) => f.code === fieldCode);
          if (field) {
            const fieldDetails = this.getReservationFieldDetails(field.id);
            
            // Obtener valor actual del control
            let currentValue = control.value?.toString() || '';
            if (fieldDetails?.fieldType === 'date' && control.value) {
              if (control.value instanceof Date) {
                currentValue = this.formatDateToDDMMYYYY(control.value);
              } else if (typeof control.value === 'string') {
                if (control.value.includes('/')) {
                  currentValue = control.value;
                } else {
                  const date = new Date(control.value);
                  if (!isNaN(date.getTime())) {
                    currentValue = this.formatDateToDDMMYYYY(date);
                  }
                }
              }
            }

            // Obtener valor guardado en BD
            const existingField = this.existingTravelerFields.find(
              (ef) =>
                ef.reservationTravelerId === this.traveler!.id &&
                ef.reservationFieldId === field.id
            );
            const existingValue = existingField ? existingField.value : '';

            // Guardar si:
            // 1. El control está dirty (modificado por el usuario)
            // 2. Tiene un valor Y es diferente al guardado en BD
            // 3. El control es VÁLIDO
            // 4. ⭐ NUEVO: No estamos inicializando
            const hasValue = currentValue !== '' && currentValue !== null && currentValue !== undefined;
            const isDifferent = currentValue !== existingValue;
            const isValid = control.valid;
            const isUserModified = control.dirty || control.touched;

            if (isUserModified && hasValue && isDifferent && isValid && !this.isInitializing) {
              console.log(`[INCLUIR] ${fieldCode}: actual="${currentValue}" vs BD="${existingValue}" (dirty: ${control.dirty}, touched: ${control.touched}, hasValue: ${hasValue}, isDifferent: ${isDifferent}, valid: ${isValid})`);
              
              const fieldData: ReservationTravelerFieldCreate = {
                id: 0,
                reservationTravelerId: this.traveler!.id,
                reservationFieldId: field.id,
                value: currentValue,
              };

              formData.push(fieldData);
            } else if (!isValid && isUserModified && hasValue && isDifferent) {
              console.log(`[SKIP-INVALID] ${fieldCode}: actual="${currentValue}" (campo inválido, no se guardará)`);
            } else if (this.isInitializing) {
              console.log(`[SKIP-INITIALIZING] ${fieldCode}: actual="${currentValue}" (inicializando, no se guardará)`);
            } else {
              console.log(`[SKIP] ${fieldCode}: actual="${currentValue}" vs BD="${existingValue}" (sin cambios del usuario)`);
            }
          }
        }
      }
    });

    console.log(`=== Total de campos a guardar: ${formData.length} ===`);
    return formData;
  }

  /**
   * Parsear el nombre del campo para extraer el código
   */
  private parseFieldName(name: string): {
    fieldCode: string | null;
  } {
    const nameParts = name.split('_');
    if (nameParts.length < 2) return { fieldCode: null };

    const fieldCode = nameParts.slice(0, -1).join('_');

    return { fieldCode };
  }

  /**
   * Guarda los datos del viajero manualmente (desde el botón)
   */
  async saveDataManually(): Promise<void> {
    console.log('=== saveDataManually() INICIADO ===');
    console.log('hasPendingChanges():', this.hasPendingChanges());
    console.log('travelerForm.dirty:', this.travelerForm.dirty);
    
    if (!this.hasPendingChanges()) {
      console.log('No hay cambios pendientes, saltando guardado');
      this.messageService.add({
        severity: 'info',
        summary: 'Sin cambios',
        detail: 'No hay cambios pendientes para guardar',
        life: 3000,
      });
      return;
    }

    this.savingData = true;

    try {
      await this.saveData();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Datos guardados',
        detail: 'Los datos del viajero han sido guardados correctamente',
        life: 3000,
      });
      
      console.log('=== Datos guardados exitosamente ===');
    } catch (error) {
      console.error('Error al guardar datos del viajero:', error);
      
      this.messageService.add({
        severity: 'error',
        summary: 'Error al guardar',
        detail: 'No se pudieron guardar los datos del viajero. Por favor, intenta nuevamente.',
        life: 5000,
      });
    } finally {
      this.savingData = false;
    }
  }

  /**
   * Guarda los datos del viajero (método interno)
   */
  async saveData(): Promise<void> {
    const formData = this.collectFormData();

    console.log('=== saveData() INICIADO ===');
    console.log('Datos a guardar:', formData);

    if (formData.length === 0) {
      console.log('No hay datos dirty para guardar');
      return;
    }

    try {
      const savePromises = formData.map((fieldData) => {
        const existingField = this.existingTravelerFields.find(
          (field) =>
            field.reservationTravelerId === fieldData.reservationTravelerId &&
            field.reservationFieldId === fieldData.reservationFieldId
        );

        if (existingField) {
          console.log(`[UPDATE] Campo ID ${fieldData.reservationFieldId} con valor: "${fieldData.value}"`);
          
          const updateData: ReservationTravelerFieldUpdate = {
            id: existingField.id,
            reservationTravelerId: fieldData.reservationTravelerId,
            reservationFieldId: fieldData.reservationFieldId,
            value: fieldData.value,
          };

          return this.reservationTravelerFieldService
            .update(existingField.id, updateData)
            .toPromise();
        } else {
          console.log(`[CREATE] Campo ID ${fieldData.reservationFieldId} con valor: "${fieldData.value}"`);
          
          return this.reservationTravelerFieldService
            .create(fieldData)
            .toPromise();
        }
      });

      console.log(`Total de campos a guardar: ${savePromises.length}`);
      await Promise.all(savePromises);
      console.log('✅ Todos los campos guardados exitosamente');

      // Recargar datos existentes después de guardar
      if (this.travelerId) {
        this.reservationTravelerFieldService
          .getByReservationTraveler(this.travelerId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (fields) => {
              this.existingTravelerFields = fields;
              console.log('Campos existentes recargados:', fields.length);
              
              // Marcar controles como pristine después de guardar
              Object.keys(this.travelerForm.controls).forEach((controlName) => {
                const control = this.travelerForm.get(controlName);
                if (control) {
                  control.markAsPristine();
                }
              });
              
              console.log('Formulario marcado como pristine');
            },
            error: (error) => {
              console.error('Error al recargar campos del viajero:', error);
            },
          });
      }

      this.dataUpdated.emit();
      console.log('=== saveData() COMPLETADO ===');
    } catch (error) {
      console.error('Error al guardar datos del viajero:', error);
      throw error;
    }
  }

  /**
   * Verifica si el usuario está autenticado
   */
  private isUserAuthenticated(): boolean {
    return this.checkoutUserDataService.isUserAuthenticated();
  }

  /**
   * Obtiene información de depuración del formulario
   */
  getDebugInfo(): Record<string, unknown> {
    return {
      traveler: this.traveler,
      formValid: this.isFormValid(),
      formValue: this.travelerForm.value,
      formDirty: this.travelerForm.dirty,
      existingFields: this.existingTravelerFields.length
    };
  }

  /**
   * TrackBy function para optimizar el renderizado de campos
   */
  trackByFieldId(index: number, field: IDepartureReservationFieldResponse): number {
    return field.reservationFieldId;
  }

  /**
   * Verifica si se pueden cargar datos del usuario
   */
  canLoadUserData(): boolean {
    return this.isUserAuthenticated();
  }

  /**
   * Verifica si hay cambios pendientes de guardar
   * Compara valores del formulario con los datos guardados en BD
   * Solo considera campos VÁLIDOS y que han sido modificados por el usuario
   */
  hasPendingChanges(): boolean {
    if (!this.traveler || this.isInitializing) {
      return false;
    }

    // Verificar si hay valores VÁLIDOS en el formulario diferentes a los guardados en BD
    let hasDifferences = false;
    const differences: string[] = [];
    const invalidFields: string[] = [];

    Object.keys(this.travelerForm.controls).forEach((controlName) => {
      const control = this.travelerForm.get(controlName);

      if (control && control.value) {
        const { fieldCode } = this.parseFieldName(controlName);

        if (fieldCode) {
          const field = this.reservationFields.find((f) => f.code === fieldCode);
          
          if (field) {
            const fieldDetails = this.getReservationFieldDetails(field.id);
            
            // Obtener valor actual
            let currentValue = control.value?.toString() || '';
            if (fieldDetails?.fieldType === 'date' && control.value instanceof Date) {
              currentValue = this.formatDateToDDMMYYYY(control.value);
            }

            // Obtener valor guardado
            const existingField = this.existingTravelerFields.find(
              (ef) =>
                ef.reservationTravelerId === this.traveler!.id &&
                ef.reservationFieldId === field.id
            );
            const existingValue = existingField ? existingField.value : '';

            // Si hay valor y es diferente al guardado
            if (currentValue && currentValue !== existingValue) {
              // ⭐ MEJORADO: Solo considerar si el campo es VÁLIDO Y ha sido modificado por el usuario
              if (control.valid && (control.dirty || control.touched)) {
                hasDifferences = true;
                differences.push(`${fieldCode}: "${currentValue}" !== "${existingValue}"`);
              } else if (!control.valid) {
                invalidFields.push(`${fieldCode}: inválido`);
              }
            }
          }
        }
      }
    });

    if (hasDifferences) {
      console.log('[hasPendingChanges] Diferencias válidas encontradas:', differences);
    }
    
    if (invalidFields.length > 0) {
      console.log('[hasPendingChanges] Campos inválidos (no se guardarán):', invalidFields);
    }

    return hasDifferences;
  }

  /**
   * Verifica si el viajero está listo para continuar al siguiente paso del checkout
   * 
   * @returns true si todos los campos obligatorios son válidos y no hay cambios pendientes
   * 
   * Este método es usado por el componente padre (checkout) para determinar si
   * puede habilitar el botón de "Continuar"
   * 
   * Condiciones:
   * 1. ✅ Todos los campos obligatorios deben estar completos y ser válidos
   * 2. ✅ No debe haber cambios pendientes (todo debe estar guardado en BD)
   */
  isReadyToContinue(): boolean {
    if (!this.traveler) {
      console.log('[isReadyToContinue] ❌ No hay viajero cargado');
      return false;
    }

    // 1. Verificar que no haya cambios pendientes (todo está guardado)
    if (this.hasPendingChanges()) {
      console.log('[isReadyToContinue] ❌ Hay cambios pendientes sin guardar');
      return false;
    }

    // 2. Verificar que todos los campos OBLIGATORIOS sean válidos
    const mandatoryFieldsInvalid: string[] = [];
    const mandatoryFieldsMissing: string[] = [];

    this.departureReservationFields.forEach((depField) => {
      if (this.isFieldMandatory(depField, this.traveler!.isLeadTraveler)) {
        const fieldDetails = this.getReservationFieldDetails(depField.reservationFieldId);
        
        if (fieldDetails) {
          const controlName = `${fieldDetails.code}_${this.traveler!.id}`;
          const control = this.travelerForm.get(controlName);

          if (!control) {
            mandatoryFieldsMissing.push(`${fieldDetails.code} (control no encontrado)`);
          } else if (control.invalid) {
            mandatoryFieldsInvalid.push(`${fieldDetails.code} (${this.getControlErrorMessage(control, fieldDetails.code)})`);
          } else if (!control.value || control.value === '') {
            mandatoryFieldsMissing.push(`${fieldDetails.code} (vacío)`);
          }
        }
      }
    });

    // Log de campos obligatorios con problemas
    if (mandatoryFieldsInvalid.length > 0) {
      console.log('[isReadyToContinue] ❌ Campos obligatorios inválidos:', mandatoryFieldsInvalid);
    }
    
    if (mandatoryFieldsMissing.length > 0) {
      console.log('[isReadyToContinue] ❌ Campos obligatorios faltantes:', mandatoryFieldsMissing);
    }

    // 3. Si hay algún campo obligatorio inválido o faltante, NO está listo
    if (mandatoryFieldsInvalid.length > 0 || mandatoryFieldsMissing.length > 0) {
      return false;
    }

    // ✅ Todo está OK: campos obligatorios completos, válidos y guardados
    console.log('[isReadyToContinue] ✅ Viajero listo para continuar');
    return true;
  }

  /**
   * Obtiene el mensaje de error de un control para el log
   */
  private getControlErrorMessage(control: AbstractControl, fieldCode: string): string {
    if (control.hasError('required')) {
      return 'requerido';
    }
    if (control.hasError('email')) {
      return 'email inválido';
    }
    if (control.hasError('pattern')) {
      return 'patrón inválido';
    }
    if (control.hasError('minlength')) {
      return 'muy corto';
    }
    if (control.hasError('maxlength')) {
      return 'muy largo';
    }
    if (control.hasError('min')) {
      return 'valor mínimo no alcanzado';
    }
    if (control.hasError('max')) {
      return 'valor máximo excedido';
    }
    return 'inválido';
  }

  /**
   * Carga y rellena los datos del usuario autenticado en el formulario
   */
  loadAndFillUserData(): void {
    console.log('=== loadAndFillUserData() INICIADO ===');
    
    if (!this.isUserAuthenticated()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Debes estar autenticado para cargar tus datos',
        life: 3000,
      });
      return;
    }

    this.loadingUserData = true;

    this.checkoutUserDataService.getCurrentUserData().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (userData) => {
        console.log('Datos del usuario obtenidos para rellenar:', userData);
        
        if (!userData) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Advertencia',
            detail: 'No se encontraron datos del usuario',
            life: 3000,
          });
          this.loadingUserData = false;
          return;
        }

        // Sobrescribir los valores del formulario con los datos del usuario
        this.fillFormWithUserData(userData);
        
        this.loadingUserData = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Datos cargados',
          detail: 'Los datos de tu perfil han sido cargados correctamente',
          life: 3000,
        });
      },
      error: (error) => {
        console.error('Error al cargar datos del usuario:', error);
        this.loadingUserData = false;
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los datos de tu perfil',
          life: 5000,
        });
      }
    });
  }

  /**
   * Rellena el formulario con los datos del usuario
   */
  private fillFormWithUserData(userData: PersonalInfo): void {
    console.log('=== fillFormWithUserData() INICIADO ===');
    
    if (!this.traveler) {
      return;
    }

    let fieldsUpdated = 0;

    // Iterar sobre todos los campos del departure
    this.departureReservationFields.forEach((field) => {
      const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
      
      if (fieldDetails) {
        const controlName = `${fieldDetails.code}_${this.traveler!.id}`;
        const control = this.travelerForm.get(controlName);
        
        if (control) {
          // Obtener el valor del usuario para este campo
          const userValue = this.getUserDataForFieldFromData(fieldDetails, userData);
          
          if (userValue !== null && userValue !== '') {
            // Para campos de fecha, convertir string a Date
            if (fieldDetails.fieldType === 'date' && typeof userValue === 'string') {
              let parsedDate: Date | null = null;
              
              if (userValue.includes('-')) {
                parsedDate = this.parseDateFromISO(userValue);
              } else if (userValue.includes('/')) {
                parsedDate = this.parseDateFromDDMMYYYY(userValue);
              }
              
              if (parsedDate) {
                control.setValue(parsedDate);
                control.markAsDirty();
                control.markAsTouched();
                fieldsUpdated++;
                console.log(`[RELLENADO] ${controlName} = ${parsedDate} (fecha)`);
              }
            } else {
              // Para otros tipos de campos
              control.setValue(userValue);
              control.markAsDirty();
              control.markAsTouched();
              fieldsUpdated++;
              console.log(`[RELLENADO] ${controlName} = "${userValue}"`);
            }
          }
        }
      }
    });

    console.log(`=== Total de campos actualizados: ${fieldsUpdated} ===`);
    
    // Actualizar validaciones
    this.travelerForm.updateValueAndValidity();
    this.validateFormInRealTime();
    
    // Log del estado final del formulario
    console.log('=== ESTADO FINAL DEL FORMULARIO DESPUÉS DE CARGAR ===');
    console.log('Valores del formulario completo:', this.travelerForm.value);
    
    // Log individual de cada input
    Object.keys(this.travelerForm.controls).forEach((controlName) => {
      const control = this.travelerForm.get(controlName);
      const value = control?.value;
      const isValid = control?.valid;
      const isDirty = control?.dirty;
      console.log(`  ${controlName}: "${value}" [válido: ${isValid}, dirty: ${isDirty}]`);
    });
    console.log('=====================================================');

    // ⭐ CORREGIDO: Solo disparar autoguardado si no estamos inicializando y hay cambios
    if (fieldsUpdated > 0 && !this.isInitializing) {
      console.log('[fillFormWithUserData] Disparando guardado automático después de rellenar datos del usuario...');
      
      // Usar setTimeout para asegurar que el formulario se haya actualizado completamente
      setTimeout(() => {
        // Solo disparar si aún hay cambios pendientes y no estamos inicializando
        if (this.hasPendingChanges() && !this.isInitializing) {
          this.autoSave$.next();
          console.log('[fillFormWithUserData] Guardado automático disparado correctamente');
        } else {
          console.log('[fillFormWithUserData] No se dispara autoguardado - sin cambios pendientes o inicializando');
        }
      }, 200); // Aumentar delay para evitar condiciones de carrera
    }
  }

  /**
   * Obtiene el valor de un campo desde los datos del usuario (versión con userData como parámetro)
   */
  private getUserDataForFieldFromData(fieldDetails: IReservationFieldResponse, userData: PersonalInfo): string | null {
    if (!userData) {
      return null;
    }

    const fieldCode = fieldDetails.code;
    
    console.log(`[getUserDataForFieldFromData] Procesando campo: ${fieldCode}`, userData);
    
    let returnValue: string | null = null;
    
    switch (fieldCode) {
      case 'email':
        returnValue = userData.email || null;
        break;
      case 'phone':
      case 'telefono':
        returnValue = userData.telefono || null;
        break;
      case 'firstname':
      case 'first_name':
      case 'name':
      case 'nombre':
        returnValue = userData.nombre || null;
        break;
      case 'lastname':
      case 'last_name':
      case 'surname':
      case 'apellido':
      case 'apellidos':
        returnValue = userData.apellido || null;
        break;
      case 'birthdate':
      case 'fecha_nacimiento':
        returnValue = userData.fechaNacimiento || null;
        break;
      case 'dni':
      case 'national_id':
        returnValue = userData.dni || null;
        break;
      case 'nationality':
      case 'country':
      case 'pais':
        returnValue = userData.pais || null;
        break;
      case 'city':
      case 'ciudad':
        returnValue = userData.ciudad || null;
        break;
      case 'postal_code':
      case 'codigo_postal':
        returnValue = userData.codigoPostal || null;
        break;
      case 'address':
      case 'direccion':
        returnValue = userData.direccion || null;
        break;
      case 'sex':
      case 'sexo':
        returnValue = this.normalizeSexValue(userData.sexo);
        break;
      default:
        const codeLower = (fieldCode || '').toLowerCase();
        switch (codeLower) {
          case 'sex':
          case 'gender':
          case 'sexo':
            returnValue = this.normalizeSexValue(userData.sexo);
            break;
          default:
            returnValue = null;
        }
    }
    
    console.log(`[getUserDataForFieldFromData] Campo: ${fieldCode} → Valor: "${returnValue}"`);
    return returnValue;
  }
}

