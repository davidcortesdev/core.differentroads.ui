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
import { PhonePrefixService, IPhonePrefixResponse } from '../../../../../../core/services/masterdata/phone-prefix.service';
import { CountriesService } from '../../../../../../core/services/locations/countries.service';

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
  @Input() hasTKFlightSelected: boolean = false;
  @Input() tkBookingRequirements: IBookingRequirements | null = null;

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
  phonePrefixes: IPhonePrefixResponse[] = [];

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

  countryOptions: Array<{ name: string; code: string }> = [];

  // Mensajes de error personalizados
  errorMessages: { [key: string]: { [key: string]: (params?: Record<string, unknown>) => string } } = {
    email: {
      required: () => 'El correo electrónico es requerido.',
      email: () => 'Ingresa un correo electrónico válido.',
    },
    phone: {
      required: () => 'El teléfono es requerido.',
      pattern: () => 'Ingresa un número de teléfono válido.',
    },
    text: {
      required: () => 'Este campo es obligatorio.',
      minlength: (params) => `Debe tener al menos ${params?.['minLength']} caracteres.`,
      maxlength: (params) => `No puede tener más de ${params?.['maxLength']} caracteres.`,
      pattern: () => 'Ingresa un número de teléfono válido.',
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
      expirationDatePast: () => 'La fecha de expiración debe ser una fecha futura.'
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
    private checkoutUserDataService: CheckoutUserDataService,
    private phonePrefixService: PhonePrefixService,
    private countriesService: CountriesService
  ) {
    this.travelerForm = this.fb.group({});
  }

  ngOnInit(): void {
    // Cargar países
    this.loadCountries();
    
    if (this.departureId && this.reservationId && this.travelerId) {
      this.loadAllData();
    } else {
      this.error = 'No se proporcionaron todos los IDs necesarios';
    }
  }

  /**
   * Carga la lista de países
   */
  private loadCountries(): void {
    this.countriesService.getCountries().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (countries) => {
        // Convertir el formato de Country a el formato esperado por el select
        this.countryOptions = countries.map(country => ({
          name: country.name,
          code: country.code
        }));
      },
      error: (error) => {
        // En caso de error, usar lista mínima
        this.countryOptions = [
          { name: 'España', code: 'ES' },
          { name: 'Colombia', code: 'CO' },
        ];
      }
    });
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

    // Reaccionar a cambios en los requisitos de Amadeus o TK
    if (changes['amadeusBookingRequirements'] || changes['hasFlightSelected'] || changes['hasTKFlightSelected']) {
      
      // Agregar/actualizar campos dinámicos de Amadeus
      if (this.traveler && this.departureId && this.reservationFields.length > 0) {
        this.addAmadeusVirtualFields();
      }
      // Si el formulario ya está inicializado, actualizar las validaciones y controles
      if (this.travelerForm && this.traveler && this.departureReservationFields.length > 0) {
        this.updateValidationsForAmadeusRequirements();
        this.addAmadeusFieldsToForm();
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
            return of(null);
          })
        )
      : of(null);

    userDataObservable.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (userData) => {

        this.currentPersonalInfo = userData;
        
        // Cargar datos del viajero y configuración
        forkJoin({
          traveler: this.reservationTravelerService.getById(this.travelerId!),
          departureFields: this.departureReservationFieldService.getByDeparture(this.departureId!),
          mandatoryTypes: this.mandatoryTypeService.getAll(),
          reservationFields: this.reservationFieldService.getAllOrdered(),
          ageGroups: this.ageGroupService.getAllOrdered(),
          phonePrefixes: this.phonePrefixService.getAllOrdered(),
        }).pipe(takeUntil(this.destroy$))
          .subscribe({
            next: ({
              traveler,
              departureFields,
              mandatoryTypes,
              reservationFields,
              ageGroups,
              phonePrefixes,
            }) => {
              this.traveler = traveler;
              this.departureReservationFields = departureFields;
              this.mandatoryTypes = mandatoryTypes;
              this.reservationFields = reservationFields;
              this.ageGroups = ageGroups;
              this.phonePrefixes = phonePrefixes;
              
              // Buscar el age group del viajero
              this.ageGroup = this.ageGroups.find(ag => ag.id === this.traveler?.ageGroupId) || null;

              // Ordenar los campos por displayOrder
              this.sortDepartureFieldsByDisplayOrder();

              // Agregar campos dinámicos de Amadeus o TK si hay requisitos
              this.addAmadeusVirtualFields();

              // Agregar controles al formulario para campos de Amadeus o TK
              this.addAmadeusFieldsToForm();

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
          this.loading = false;
        },
      });
  }

  /**
   * Inicializa el formulario del viajero
   */
  private initializeTravelerForm(): void {

    if (!this.traveler) {

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

        } else if (this.traveler!.isLeadTraveler && this.currentPersonalInfo) {
          // 2️⃣ SEGUNDO: Si NO hay datos en BD Y es lead traveler, prellenar del perfil
          const userValue = this.getUserDataForField(fieldDetails);
          if (userValue) {
            controlValue = userValue;

          } else {

          }
        } else {
          // 3️⃣ TERCERO: No hay datos en BD y no es lead traveler (o no hay perfil)

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

        // Si el valor viene del perfil del usuario, marcarlo como dirty
        if (this.traveler!.isLeadTraveler && this.currentPersonalInfo && !existingValue && controlValue) {
          control.markAsDirty();
          control.markAsTouched();

        }

        this.travelerForm.addControl(controlName, control);

      }
    });

    // Crear control para phonePrefix si no existe y hay un campo phone
    const hasPhoneField = this.departureReservationFields.some(field => {
      const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
      return fieldDetails?.code === 'phone';
    });
    
    const hasPhonePrefixField = this.departureReservationFields.some(field => {
      const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
      return fieldDetails?.code === 'phonePrefix';
    });

    if (hasPhoneField && !hasPhonePrefixField && this.traveler) {
      // Buscar el campo phone y phonePrefix en reservationFields
      const phoneField = this.departureReservationFields.find(field => {
        const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
        return fieldDetails?.code === 'phone';
      });
      
      const phonePrefixField = this.reservationFields.find(f => f.code === 'phonePrefix');
      
      if (phoneField && phonePrefixField) {
        const prefixControlName = `phonePrefix_${this.traveler.id}`;
        const existingControl = this.travelerForm.get(prefixControlName);
        
        if (!existingControl) {
          // Crear el control si no existe
          let prefixValue: string | null = null;
          
          // PRIMERO: Intentar cargar desde BD
          const existingPrefixValue = this.getExistingFieldValue(this.traveler.id, phonePrefixField.id);
          if (existingPrefixValue) {
            prefixValue = existingPrefixValue;

          } else if (this.traveler.isLeadTraveler && this.currentPersonalInfo) {
            // SEGUNDO: Si NO hay datos en BD Y es lead traveler, prellenar del perfil
            const userPrefixValue = this.currentPersonalInfo.phonePrefix;
            if (userPrefixValue) {
              prefixValue = userPrefixValue;

            } else {
              // TERCERO: Si no hay datos en BD ni en perfil, establecer +34 (España) por defecto
              prefixValue = '+34';

            }
          } else {
            // Si no es lead traveler o no hay perfil, establecer +34 (España) por defecto
            prefixValue = '+34';

          }
          
          // Aplicar las mismas validaciones que el teléfono
          const phoneFieldDetails = this.getReservationFieldDetails(phoneField.reservationFieldId);
          const prefixValidators = this.getValidatorsForField(
            phonePrefixField,
            phoneField, // Usar el mismo field de departure para heredar la obligatoriedad
            this.traveler.isLeadTraveler
          );
          
          const prefixControl = this.fb.control(prefixValue, prefixValidators);
          
          // Si el valor viene del perfil del usuario (no de BD), marcarlo como dirty
          if (this.traveler.isLeadTraveler && this.currentPersonalInfo && !existingPrefixValue && prefixValue) {
            prefixControl.markAsDirty();
            prefixControl.markAsTouched();

          }
          
          this.travelerForm.addControl(prefixControlName, prefixControl);

        } else {
          // Actualizar el valor del control existente con el valor de BD
          const existingPrefixValue = this.getExistingFieldValue(this.traveler.id, phonePrefixField.id);
          if (existingPrefixValue !== null && existingPrefixValue !== undefined) {
            existingControl.setValue(existingPrefixValue, { emitEvent: false });
            existingControl.markAsPristine();

          }
        }
      }
    }

    // Log individual de cada control creado
    Object.keys(this.travelerForm.controls).forEach((controlName) => {
      const control = this.travelerForm.get(controlName);
      const value = control?.value;
      const isValid = control?.valid;

    });

    // Calcular fechas para los campos de fecha
    this.calculateTravelerFieldDates();

    // Agregar campos de Amadeus o TK al formulario si existen
    if ((this.hasFlightSelected && this.amadeusBookingRequirements) || 
        (this.hasTKFlightSelected && this.tkBookingRequirements)) {
      this.addAmadeusFieldsToForm();
    }

    this.loading = false;

    // Finalizar inicialización
    this.isInitializing = false;

    // Inicializar guardado automático
    this.initializeAutoSave();

    // Validación inicial
    setTimeout(() => {
      this.validateFormInRealTime();
      
      // Solo disparar autoguardado si hay datos pre-llenados y no estamos inicializando
      if (this.traveler!.isLeadTraveler && this.currentPersonalInfo && !this.isInitializing) {

        // Verificar si hay cambios pendientes después de la inicialización
        setTimeout(() => {
          if (this.hasPendingChanges()) {

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
                                fieldDetails.code.toLowerCase().includes('expiry') ||
                                fieldDetails.code.toLowerCase() === 'dniexpiration';
        
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
   * Solo acepta dígitos (6-14 dígitos), sin prefijo ya que el prefijo va por separado
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
      
      // Patrón que solo acepta dígitos (6-14 dígitos)
      // No acepta prefijo + ya que el prefijo va por separado
      const phoneRegex = /^\d{6,14}$/;
      
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

      if (date <= today) {
        return { expirationDatePast: true };
      }

      return null;
    };
  }

  /**
   * Verifica si un campo es de fecha de expiración
   */
  private isExpirationDateField(fieldCode: string, fieldName?: string): boolean {
    const code = fieldCode.toLowerCase();
    const name = (fieldName || '').toLowerCase();
    
    return code.includes('expir') || 
           code.includes('venc') ||
           code === 'expirationdate' ||
           code === 'dniexpiration' ||
           code === 'minoridexpirationdate' ||
           code === 'documentexpirationdate' ||
           name.includes('expiración') ||
           name.includes('vencimiento') ||
           name.includes('caducidad');
  }

  /**
   * Calcular y almacenar fechas para los campos de fecha
   */
  private calculateTravelerFieldDates(): void {
    if (!this.traveler || !this.departureReservationFields) {
      return;
    }

    this.travelerFieldDates = {};
    
    // Procesar todos los campos de fecha dinámicamente
    this.departureReservationFields.forEach(field => {
      const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
      if (fieldDetails && fieldDetails.fieldType === 'date') {
        const fieldCode = fieldDetails.code;
        const minDate = this.getMinDateForField(fieldCode, fieldDetails.name);
        const maxDate = this.getMaxDateForField(fieldCode, fieldDetails.name);
        
        this.travelerFieldDates[fieldCode] = {
          minDate: minDate,
          maxDate: maxDate
        };
      }
    });
  }

  /**
   * Obtener fecha mínima para el campo de fecha
   */
  private getMinDateForField(fieldCode: string, fieldName?: string): Date {
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
    } else if (this.isExpirationDateField(fieldCode, fieldName)) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }
    
    const today = new Date();
    return new Date(today.getFullYear() - 100, 0, 1);
  }

  /**
   * Obtener fecha máxima para el campo de fecha
   */
  private getMaxDateForField(fieldCode: string, fieldName?: string): Date {
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
    } else if (this.isExpirationDateField(fieldCode, fieldName)) {
      const today = new Date();
      return new Date(today.getFullYear() + 30, 11, 31);
    }
    
    return new Date();
  }

  /**
   * Obtener fecha mínima almacenada para un campo específico
   */
  getStoredMinDate(fieldCode: string, fieldDetails?: IReservationFieldResponse): Date {
    // Si ya está calculado, devolverlo
    if (this.travelerFieldDates[fieldCode]?.minDate) {
      return this.travelerFieldDates[fieldCode].minDate;
    }
    
    // Si tenemos fieldDetails, usarlo directamente
    if (fieldDetails && fieldDetails.fieldType === 'date') {
      const minDate = this.getMinDateForField(fieldCode, fieldDetails.name);
      // Guardar en el mapa para futuras consultas
      if (!this.travelerFieldDates[fieldCode]) {
        this.travelerFieldDates[fieldCode] = { minDate, maxDate: new Date() };
      } else {
        this.travelerFieldDates[fieldCode].minDate = minDate;
      }
      return minDate;
    }
    
    // Si no está calculado, intentar calcularlo dinámicamente
    // Buscar el fieldDetails para obtener el nombre del campo
    if (this.departureReservationFields) {
      for (const field of this.departureReservationFields) {
        const details = this.getReservationFieldDetails(field.reservationFieldId);
        if (details && details.code === fieldCode && details.fieldType === 'date') {
          const minDate = this.getMinDateForField(fieldCode, details.name);
          // Guardar en el mapa para futuras consultas
          if (!this.travelerFieldDates[fieldCode]) {
            this.travelerFieldDates[fieldCode] = { minDate, maxDate: new Date() };
          } else {
            this.travelerFieldDates[fieldCode].minDate = minDate;
          }
          return minDate;
        }
      }
    }
    
    // Fallback: si es campo de expiración, devolver mañana
    if (this.isExpirationDateField(fieldCode)) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }
    
    return new Date(1924, 0, 1);
  }

  /**
   * Obtener fecha máxima almacenada para un campo específico
   */
  getStoredMaxDate(fieldCode: string, fieldDetails?: IReservationFieldResponse): Date {
    // Si ya está calculado, devolverlo
    if (this.travelerFieldDates[fieldCode]?.maxDate) {
      return this.travelerFieldDates[fieldCode].maxDate;
    }
    
    // Si tenemos fieldDetails, usarlo directamente
    if (fieldDetails && fieldDetails.fieldType === 'date') {
      const maxDate = this.getMaxDateForField(fieldCode, fieldDetails.name);
      // Guardar en el mapa para futuras consultas
      if (!this.travelerFieldDates[fieldCode]) {
        this.travelerFieldDates[fieldCode] = { minDate: new Date(1924, 0, 1), maxDate };
      } else {
        this.travelerFieldDates[fieldCode].maxDate = maxDate;
      }
      return maxDate;
    }
    
    // Si no está calculado, intentar calcularlo dinámicamente
    // Buscar el fieldDetails para obtener el nombre del campo
    if (this.departureReservationFields) {
      for (const field of this.departureReservationFields) {
        const details = this.getReservationFieldDetails(field.reservationFieldId);
        if (details && details.code === fieldCode && details.fieldType === 'date') {
          const maxDate = this.getMaxDateForField(fieldCode, details.name);
          // Guardar en el mapa para futuras consultas
          if (!this.travelerFieldDates[fieldCode]) {
            this.travelerFieldDates[fieldCode] = { minDate: new Date(1924, 0, 1), maxDate };
          } else {
            this.travelerFieldDates[fieldCode].maxDate = maxDate;
          }
          return maxDate;
        }
      }
    }
    
    return new Date();
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
   * Maneja correctamente fechas sin hora para evitar problemas de zona horaria
   */
  private parseDateFromISO(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }

    // Si es formato YYYY-MM-DD sin hora, parsear como fecha local para evitar problemas de zona horaria
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Verificar que la fecha es válida
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }
      return null;
    }

    // Para otros formatos ISO (con hora), usar el constructor estándar
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

      return null;
    }

    const fieldCode = fieldDetails.code;
    
    let returnValue: string | null = null;
    
    switch (fieldCode) {
      case 'email':
        returnValue = userData.email || null;
        break;
      case 'phone':
        returnValue = userData.telefono || null;
        break;
      case 'name':
        returnValue = userData.nombre || null;
        break;
      case 'surname':
        returnValue = userData.apellido || null;
        break;
      case 'birthdate':
        returnValue = userData.fechaNacimiento || null;
        break;
      case 'national_id':
        returnValue = userData.dni || null;
        break;
      case 'dniexpiration':
        returnValue = userData.fechaExpiracionDni || null;
        break;
      case 'nationality':
        returnValue = userData.pais || null;
        break;
      case 'postal_code':
        returnValue = userData.codigoPostal || null;
        break;
      case 'sex':
        returnValue = this.normalizeSexValue(userData.sexo);
        break;
      case 'phonePrefix':
        returnValue = userData.phonePrefix || null;
        break;
      default:
        returnValue = null;
    }

    return returnValue;
  }

  /**
   * Normaliza el valor del sexo a formato corto (M, F)
   */
  private normalizeSexValue(sexValue: string | null | undefined): string | null {

    if (!sexValue) {

      return null;
    }

    const sexUpper = sexValue.toUpperCase().trim();

    // Si ya está en formato corto, retornar tal cual
    if (sexUpper === 'M' || sexUpper === 'F') {

      return sexUpper;
    }

    // Convertir valores completos a formato corto
    if (sexUpper === 'MASCULINO' || sexUpper === 'MALE' || sexUpper === 'HOMBRE') {

      return 'M';
    }
    if (sexUpper === 'FEMENINO' || sexUpper === 'FEMALE' || sexUpper === 'MUJER') {

      return 'F';
    }

    // Si no coincide con ninguno, retornar null

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
   * SOLUCIÓN SIMPLIFICADA: Prioriza siempre los requisitos de Amadeus cuando hay vuelo de Amadeus
   * También maneja requisitos de TK cuando hay vuelo de TK
   */
  isFieldMandatory(
    field: IDepartureReservationFieldResponse,
    isLeadTraveler: boolean = false
  ): boolean {
    const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
    if (!fieldDetails) {
      return false;
    }

    // Verificar requisitos de Amadeus y TK (pueden coexistir)
    const isAmadeusMandatory = (this.hasFlightSelected && this.amadeusBookingRequirements) 
      ? this.isFieldAmadeusMandatory(fieldDetails, isLeadTraveler) 
      : false;
    
    const isTKMandatory = (this.hasTKFlightSelected && this.tkBookingRequirements) 
      ? this.isFieldTKMandatory(fieldDetails, isLeadTraveler) 
      : false;

    // Si es requerido por Amadeus O por TK, es obligatorio
    if (isAmadeusMandatory || isTKMandatory) {
      return true;
    }

    // Si no es requerido por Amadeus ni TK pero está en BD como obligatorio, verificar campos básicos
    if (field.mandatoryTypeId === 2 || (field.mandatoryTypeId === 3 && isLeadTraveler)) {
      const basicFields = ['name', 'surname', 'email', 'phone'];
      if (basicFields.includes(fieldDetails.code)) {
        return true; // Campos básicos siempre obligatorios
      }
    }

    // Si hay vuelo de Amadeus o TK pero el campo no es requerido por ninguno, no es obligatorio
    if ((this.hasFlightSelected && this.amadeusBookingRequirements) || 
        (this.hasTKFlightSelected && this.tkBookingRequirements)) {
      return false;
    }

    // TERCERO: Sin vuelo de Amadeus ni TK, usar lógica estándar de BD
    if (field.mandatoryTypeId === 2) {
      return true;
    }
    if (field.mandatoryTypeId === 3 && isLeadTraveler) {
      return true;
    }

    return false;
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
    // NOTA: Amadeus usa travelerNumber (1, 2, 3...) no el ID real del viajero
    if (this.amadeusBookingRequirements.travelerRequirements && 
        this.amadeusBookingRequirements.travelerRequirements.length > 0 &&
        this.traveler) {
      
      const travelerRequirements = this.amadeusBookingRequirements.travelerRequirements.find(
        (req: any) => String(req.travelerId) === String(this.traveler!.travelerNumber)
      );

      if (travelerRequirements) {
        if (travelerRequirements.genderRequired && fieldCode === 'sex') {
          return true;
        }

        if (travelerRequirements.documentRequired) {
          // Cuando se requiere documento, también se requieren fecha de expiración y país de emisión (obligatorios para Amadeus)
          if (fieldCode === 'national_id' || fieldCode === 'dniexpiration' || fieldCode === 'passportcountry') {
            return true;
          }
        }

        if (travelerRequirements.dateOfBirthRequired && fieldCode === 'birthdate') {
          return true;
        }

        if (travelerRequirements.documentIssuanceCityRequired && 
            fieldCode === 'document_issuance_city') {
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

    // La fecha de expiración (dniexpiration) y país de emisión (passportcountry) siempre deben estar cuando hay vuelo de Amadeus
    // Amadeus los requiere al hacer el booking, aunque el endpoint booking-requirements no los indique explícitamente
    if (fieldCode === 'dniexpiration' || fieldCode === 'passportcountry') {
      return true;
    }

    return false;
  }

  /**
   * Verifica si un campo es obligatorio según los requisitos de TK
   * TK requiere al menos el campo "sex" (sexo) para todos los viajeros
   */
  private isFieldTKMandatory(
    fieldDetails: IReservationFieldResponse,
    isLeadTraveler: boolean
  ): boolean {
    if (!this.hasTKFlightSelected) {
      return false;
    }

    const fieldCode = fieldDetails.code.toLowerCase();

    // TK requiere el campo "sex" (sexo) para todos los viajeros
    if (fieldCode === 'sex') {
      return true;
    }

    // TK también puede requerir otros campos según la configuración
    // Por ahora, solo "sex" es obligatorio según el error reportado
    return false;
  }

  /**
   * Actualiza las validaciones de todos los campos cuando cambian los requisitos de Amadeus
   */
  private updateValidationsForAmadeusRequirements(): void {
    if (!this.traveler || !this.departureReservationFields.length) {
      return;
    }

    const isLeadTraveler = this.traveler.isLeadTraveler;

    // Iterar sobre todos los campos y actualizar sus validaciones
    this.departureReservationFields.forEach((field) => {
      const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
      if (!fieldDetails) {
        return;
      }

      const controlName = `${fieldDetails.code}_${this.traveler!.id}`;
      const control = this.travelerForm.get(controlName);

      if (control) {
        // Recalcular las validaciones con los nuevos requisitos de Amadeus
        const validators = this.getValidatorsForField(
          fieldDetails,
          field,
          isLeadTraveler
        );

        // Actualizar los validators del control
        control.setValidators(validators);
        control.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  /**
   * Agrega campos dinámicos de Amadeus a departureReservationFields basándose en los requisitos de reserva
   * También agrega campos requeridos por TK si hay vuelo de TK
   * Solo agrega campos que existan en BD (reservationFields)
   * PRIORIDAD: Amadeus tiene prioridad sobre TK
   */
  private addAmadeusVirtualFields(): void {
    // PRIMERO: Agregar campos de Amadeus si hay vuelo de Amadeus (tiene prioridad)
    if (this.amadeusBookingRequirements && this.hasFlightSelected && this.traveler && this.departureId) {
      this.addAmadeusFields();
      // Si hay vuelo de Amadeus, NO agregar campos de TK
      return;
    }

    // SEGUNDO: Agregar campos de TK solo si NO hay vuelo de Amadeus
    if (this.hasTKFlightSelected && !this.hasFlightSelected && this.traveler && this.departureId) {
      this.addTKFields();
    }
  }

  /**
   * Agrega campos requeridos por Amadeus
   */
  private addAmadeusFields(): void {
    if (!this.amadeusBookingRequirements || !this.traveler || !this.departureId) {
      return;
    }

    // IDs negativos temporales para departureReservationFields dinámicos (empezando desde -1000 para evitar conflictos)
    let temporaryFieldId = -1000;
    const isLeadTraveler = this.traveler.isLeadTraveler;

    // Array para almacenar los códigos de campos que necesitamos
    const requiredFieldCodes = new Set<string>();

    // Requisitos por viajero
    // NOTA: Amadeus usa travelerNumber (1, 2, 3...) no el ID real del viajero
    if (this.amadeusBookingRequirements.travelerRequirements) {
      const travelerReq = this.amadeusBookingRequirements.travelerRequirements.find(
        (req: any) => String(req.travelerId) === String(this.traveler!.travelerNumber)
      );

      if (travelerReq) {
        if (travelerReq.genderRequired) requiredFieldCodes.add('sex');
        if (travelerReq.documentRequired) {
          requiredFieldCodes.add('national_id');
          // Cuando se requiere documento, también se requieren fecha de expiración y país de emisión (obligatorios para Amadeus)
          requiredFieldCodes.add('dniexpiration');
          requiredFieldCodes.add('passportcountry');
        }
        if (travelerReq.dateOfBirthRequired) requiredFieldCodes.add('birthdate');
        if (travelerReq.documentIssuanceCityRequired) requiredFieldCodes.add('document_issuance_city');
        if (travelerReq.residenceRequired) requiredFieldCodes.add('country');
      }
    }

    // La fecha de expiración (dniexpiration) y país de emisión (passportcountry) siempre deben estar cuando hay vuelo de Amadeus
    // Amadeus los requiere al hacer el booking, aunque el endpoint booking-requirements no los indique explícitamente
    if (this.hasFlightSelected && this.amadeusBookingRequirements) {
      requiredFieldCodes.add('dniexpiration');
      requiredFieldCodes.add('passportcountry');
    }

    // Requisitos generales (solo para lead traveler)
    if (isLeadTraveler) {
      if (this.amadeusBookingRequirements.emailAddressRequired) requiredFieldCodes.add('email');
      if (this.amadeusBookingRequirements.mobilePhoneNumberRequired || this.amadeusBookingRequirements.phoneNumberRequired) {
        requiredFieldCodes.add('phone');
      }
    }

    // Guardar referencia a traveler para TypeScript (ya verificamos que no es null arriba)
    const travelerForFields = this.traveler;
    
    // Para cada campo requerido por Amadeus, verificar si existe en BD y agregarlo dinámicamente
    requiredFieldCodes.forEach(fieldCode => {
      // Verificar si el campo ya existe en reservationFields (por código) - debe existir en BD
      const existingField = this.reservationFields.find(f => f.code === fieldCode);
      
      // Si el campo no existe en BD, no lo agregamos (no se puede guardar)
      if (!existingField) {
        return; // Saltar este campo - no existe en BD
      }
      
      // Verificar si ya existe en departureReservationFields (por código)
      const existingDepartureFieldIndex = this.departureReservationFields.findIndex(
        f => {
          const fieldDetails = this.getReservationFieldDetails(f.reservationFieldId);
          return fieldDetails?.code === fieldCode;
        }
      );

      // Si el campo no está en departureReservationFields, agregarlo
      if (existingDepartureFieldIndex === -1) {
        // Crear departureReservationField usando el campo real de BD
        const departureField: IDepartureReservationFieldResponse = {
          id: temporaryFieldId--,
          departureId: this.departureId!,
          reservationFieldId: existingField.id,
          mandatoryTypeId: 2, // Obligatorio
          ageGroupId: travelerForFields.ageGroupId
        };

        // Agregar a departureReservationFields
        this.departureReservationFields.push(departureField);
      } else {
        // Si el campo ya existe, actualizar su mandatoryTypeId a 2 (obligatorio) si es requerido por Amadeus
        const existingDepartureField = this.departureReservationFields[existingDepartureFieldIndex];
        if (existingDepartureField.mandatoryTypeId !== 2) {
          // Actualizar a obligatorio cuando Amadeus lo requiere
          existingDepartureField.mandatoryTypeId = 2;
        }
      }
    });
  }

  /**
   * Agrega campos requeridos por TK
   * Similar a addAmadeusFields pero para TK
   */
  private addTKFields(): void {
    if (!this.tkBookingRequirements || !this.traveler || !this.departureId) {
      return;
    }

    let temporaryFieldId = -2000; // IDs diferentes a los de Amadeus
    const isLeadTraveler = this.traveler.isLeadTraveler;

    // Array para almacenar los códigos de campos que necesitamos
    const requiredFieldCodes = new Set<string>();

    // Requisitos por viajero
    if (this.tkBookingRequirements.travelerRequirements) {
      const travelerReq = this.tkBookingRequirements.travelerRequirements.find(
        (req: any) => String(req.travelerId) === String(this.traveler!.travelerNumber)
      );

      if (travelerReq) {
        if (travelerReq.genderRequired) requiredFieldCodes.add('sex');
        if (travelerReq.documentRequired) {
          requiredFieldCodes.add('national_id');
        }
        if (travelerReq.dateOfBirthRequired) requiredFieldCodes.add('birthdate');
        if (travelerReq.documentIssuanceCityRequired) requiredFieldCodes.add('document_issuance_city');
        if (travelerReq.residenceRequired) requiredFieldCodes.add('country');
      }
    }

    // Requisitos generales (solo para lead traveler)
    if (isLeadTraveler) {
      if (this.tkBookingRequirements.emailAddressRequired) requiredFieldCodes.add('email');
      if (this.tkBookingRequirements.mobilePhoneNumberRequired || this.tkBookingRequirements.phoneNumberRequired) {
        requiredFieldCodes.add('phone');
      }
    }

    const travelerForFields = this.traveler;

    // Para cada campo requerido por TK, verificar si existe en BD y agregarlo dinámicamente
    requiredFieldCodes.forEach(fieldCode => {
      const existingField = this.reservationFields.find(f => f.code === fieldCode);
      
      if (!existingField) {
        return; // Saltar este campo - no existe en BD
      }

      // Verificar si ya existe en departureReservationFields (por código)
      const existingDepartureFieldIndex = this.departureReservationFields.findIndex(
        f => {
          const fieldDetails = this.getReservationFieldDetails(f.reservationFieldId);
          return fieldDetails?.code === fieldCode;
        }
      );

      // Si el campo no está en departureReservationFields, agregarlo
      if (existingDepartureFieldIndex === -1) {
        const departureField: IDepartureReservationFieldResponse = {
          id: temporaryFieldId--,
          departureId: this.departureId!,
          reservationFieldId: existingField.id,
          mandatoryTypeId: 2, // Obligatorio
          ageGroupId: travelerForFields.ageGroupId
        };

        this.departureReservationFields.push(departureField);
      } else {
        // Si el campo ya existe (puede haber sido agregado por Amadeus), 
        // actualizar su mandatoryTypeId a 2 (obligatorio) si es requerido por TK
        const existingDepartureField = this.departureReservationFields[existingDepartureFieldIndex];
        if (existingDepartureField.mandatoryTypeId !== 2) {
          existingDepartureField.mandatoryTypeId = 2;
        }
        // Si ya es obligatorio (por Amadeus), mantenerlo así (no hay conflicto)
      }
    });
  }

  /**
   * Agrega controles al formulario para campos dinámicos de Amadeus
   */
  private addAmadeusFieldsToForm(): void {
    if (!this.traveler || !this.travelerForm) {
      return;
    }

    // Guardar referencia a traveler para TypeScript
    const travelerForForm = this.traveler;

    // Iterar sobre los campos de Amadeus y agregar controles si no existen
    this.departureReservationFields.forEach(field => {
      const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
      
      if (fieldDetails) {
        const controlName = `${fieldDetails.code}_${travelerForForm.id}`;
        
        if (!this.travelerForm.get(controlName)) {
          // Obtener validadores para el campo
          const validators = this.getValidatorsForField(fieldDetails, field, travelerForForm.isLeadTraveler);
          
          // Obtener valor inicial (de datos existentes o del perfil del usuario)
          let initialValue: any = null;
          
          // Intentar obtener valor existente
          const existingField = this.existingTravelerFields.find(
            ef => ef.reservationTravelerId === travelerForForm.id &&
                  this.getReservationFieldDetails(ef.reservationFieldId)?.code === fieldDetails.code
          );
          
          if (existingField) {
            initialValue = existingField.value;
          } else if (travelerForForm.isLeadTraveler && this.currentPersonalInfo) {
            // Prellenar desde el perfil del usuario
            initialValue = this.getUserDataForField(fieldDetails);
          }

          // Crear control
          const control = this.fb.control(initialValue, validators);
          this.travelerForm.addControl(controlName, control);
        }
      }
    });
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
      
      // Si es un campo crítico de Amadeus, forzar guardado inmediato
      const isCriticalAmadeusField = this.hasFlightSelected && 
        this.amadeusBookingRequirements &&
        (fieldCode === 'dniexpiration' || fieldCode === 'passportcountry');
      
      if (isCriticalAmadeusField && control.valid && control.value) {
        setTimeout(() => {
          this.autoSave$.next();
        }, 500);
      }
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
      control.markAsDirty();
      control.updateValueAndValidity();
      
      this.validateFormInRealTime();
      
      // Si es un campo crítico de Amadeus, forzar guardado inmediato
      const isCriticalAmadeusField = this.hasFlightSelected && 
        this.amadeusBookingRequirements &&
        (fieldCode === 'dniexpiration' || fieldCode === 'passportcountry');
      
      if (isCriticalAmadeusField && control.valid && control.value) {
        setTimeout(() => {
          this.autoSave$.next();
        }, 500);
      }
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
      
      // Si es un campo crítico de Amadeus, forzar guardado inmediato
      const isCriticalAmadeusField = this.hasFlightSelected && 
        this.amadeusBookingRequirements &&
        (fieldCode === 'dniexpiration' || fieldCode === 'passportcountry' || fieldCode === 'national_id');
      
      if (isCriticalAmadeusField && control.valid && control.value) {
        setTimeout(() => {
          this.autoSave$.next();
        }, 500);
      }
    }
  }

  /**
   * Maneja el cambio en campos de teléfono
   * Solo permite dígitos, espacios y guiones (el prefijo va por separado)
   */
  onPhoneFieldChange(fieldCode: string, event: Event): void {
    if (!this.traveler) {
      return;
    }

    const input = event.target as HTMLInputElement;
    // Solo permitir números, espacios y guiones (no permitir + ya que el prefijo va por separado)
    let filtered = input.value.replace(/[^\d\s-]/g, '');
    
    // Limitar la longitud total (considerando espacios y guiones)
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
   * NOTA: Se eliminó la emisión de dataUpdated para evitar notificaciones innecesarias al padre
   */
  private validateFormInRealTime(): void {
    // Removed: this.dataUpdated.emit(); 
    // La validación ocurre internamente sin notificar al padre
  }

  /**
   * Inicializa el guardado automático del formulario
   */
  private initializeAutoSave(): void {

    // Subscribirse a cambios del formulario con debounce de 2 segundos
    this.travelerForm.valueChanges
      .pipe(
        debounceTime(2000),  // Esperar 2 segundos después del último cambio
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {

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
    // No auto-guardar si ya está guardando, cargando o inicializando
    if (this.savingData || this.loading || this.isInitializing || this.isAutoSavingInProgress) {

      return;
    }

    // Verificar si hay cambios pendientes
    if (!this.hasPendingChanges()) {

      return;
    }

    this.autoSaving = true;
    this.isAutoSavingInProgress = true;

    try {
      await this.saveData();

      // Toast sutil para no molestar al usuario
      this.messageService.add({
        severity: 'success',
        summary: 'Guardado automático',
        detail: 'Tus cambios han sido guardados',
        life: 2000,
      });
    } catch (error) {
      
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

    const formData: ReservationTravelerFieldCreate[] = [];
    const shouldForceSaveMandatoryAmadeusFields = !!(
      this.hasFlightSelected &&
      this.amadeusBookingRequirements &&
      this.departureReservationFields &&
      this.departureReservationFields.length > 0
    );

    Object.keys(this.travelerForm.controls).forEach((controlName) => {
      const control = this.travelerForm.get(controlName);

      if (control) {
        const { fieldCode } = this.parseFieldName(controlName);

        if (fieldCode) {
          // Buscar campo por código (puede ser virtual o real)
          const field = this.reservationFields.find((f) => f.code === fieldCode);
          if (field) {
            const fieldDetails = this.getReservationFieldDetails(field.id);
            
            // Obtener valor actual del control
            let currentValue = control.value?.toString() || '';

            // Normalizar valores para tipos especiales antes de comparar/guardar
            // - country: el control debe guardar el código (string), pero por seguridad soportar { code }.
            // - checkbox: guardar como "true"/"false"
            if (fieldDetails?.fieldType === 'country' && control.value) {
              if (typeof control.value === 'string') {
                currentValue = control.value;
              } else if (typeof control.value === 'object' && (control.value as any).code) {
                currentValue = String((control.value as any).code);
              }
            } else if (fieldDetails?.fieldType === 'checkbox') {
              currentValue = control.value ? 'true' : 'false';
            }

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

            // Obtener valor guardado en BD (buscar por ID del campo - ya filtramos virtuales arriba)
            const existingField = this.existingTravelerFields.find(
              (ef) => ef.reservationTravelerId === this.traveler!.id &&
                       ef.reservationFieldId === field.id
            );
            const existingValue = existingField ? existingField.value : '';

            // Guardar si:
            // 1. El control está dirty (modificado por el usuario)
            // 2. Tiene un valor Y es diferente al guardado en BD
            // 3. El control es VÁLIDO
            // 4. No estamos inicializando
            const hasValue = currentValue !== '' && currentValue !== null && currentValue !== undefined;
            const isDifferent = currentValue !== existingValue;
            const isValid = control.valid;
            const isUserModified = control.dirty || control.touched;

            // Si es un vuelo del consolidador, forzar guardado de campos obligatorios por Amadeus
            let isMandatoryForThisTraveler = false;
            if (shouldForceSaveMandatoryAmadeusFields && fieldDetails && this.traveler) {
              const depField = this.departureReservationFields.find(
                (df) => df.reservationFieldId === field.id
              );
              if (depField) {
                isMandatoryForThisTraveler = this.isFieldMandatory(depField, this.traveler.isLeadTraveler);
              }
            }

            // Forzar guardado si es obligatorio por Amadeus y tiene valor
            // (aunque no esté dirty/touched o sea igual al valor existente)
            const shouldForceSave =
              shouldForceSaveMandatoryAmadeusFields &&
              isMandatoryForThisTraveler &&
              hasValue &&
              isValid;

            // Para campos obligatorios de Amadeus, guardar siempre si tienen valor válido
            const isCriticalAmadeusField = isMandatoryForThisTraveler && 
              (fieldCode === 'dniexpiration' || fieldCode === 'passportcountry' || fieldCode === 'national_id');

            // Guardar si el usuario modificó el campo o si es un campo crítico de Amadeus con valor válido
            // Para campos críticos, guardar SIEMPRE si tienen valor válido, incluso si no están dirty/touched
            // Esto asegura que los campos críticos se guarden antes de avanzar al paso de pago
            // IMPORTANTE: Para campos críticos de Amadeus, guardar SIEMPRE si tienen valor válido,
            // independientemente de si están dirty o si el valor es igual al existente
            // Esto es crítico porque el backend de Amadeus requiere estos campos para hacer el booking
            const isCriticalAmadeusFieldWithValue = isCriticalAmadeusField && hasValue && isValid;
            
            // Para campos críticos, también verificar si no existe en BD o si el valor es diferente
            // Esto asegura que se guarden incluso si el usuario no modificó el campo manualmente
            const shouldSaveCriticalField = isCriticalAmadeusFieldWithValue && (
              !existingField || // No existe en BD, debe guardarse
              isDifferent || // Valor diferente al existente
              true // Siempre guardar campos críticos si tienen valor válido
            );
            
            const shouldSave = !this.isInitializing && hasValue && isValid && (
              (isUserModified && isDifferent) || 
              shouldSaveCriticalField // Guardar campos críticos de Amadeus siempre que tengan valor válido
            );

            if (shouldSave) {
              const fieldData: ReservationTravelerFieldCreate = {
                id: 0,
                reservationTravelerId: this.traveler!.id,
                reservationFieldId: field.id, // ID del campo real (ya filtramos los virtuales)
                value: currentValue,
              };

              formData.push(fieldData);
            } else if (!isValid && isUserModified && hasValue && isDifferent) {
              // Campo inválido - no guardar
            } else if (this.isInitializing) {
              // Ignorar durante inicialización
            }
          }
        }
      }
    });

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

    if (!this.hasPendingChanges()) {

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

    } catch (error) {
      
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
    // Prevenir llamadas concurrentes
    if (this.savingData) {
      return;
    }

    this.savingData = true;
    const formData = this.collectFormData();

    if (formData.length === 0) {
      this.savingData = false;
      return;
    }

    try {
      // Recargar campos existentes antes de guardar para evitar duplicados
      if (this.travelerId) {
        const currentFields = await this.reservationTravelerFieldService
          .getByReservationTraveler(this.travelerId)
          .pipe(takeUntil(this.destroy$))
          .toPromise();
        
        if (currentFields) {
          this.existingTravelerFields = currentFields;
        }
      }

      const savePromises = formData.map(async (fieldData) => {
        const fieldDetails = this.reservationFields.find(f => f.id === fieldData.reservationFieldId);
        const fieldCode = fieldDetails?.code || `FIELD_ID_${fieldData.reservationFieldId}`;
        
        const existingField = this.existingTravelerFields.find(
          (field) =>
            field.reservationTravelerId === fieldData.reservationTravelerId &&
            field.reservationFieldId === fieldData.reservationFieldId
        );

        if (existingField) {
          const updateData: ReservationTravelerFieldUpdate = {
            id: existingField.id,
            reservationTravelerId: fieldData.reservationTravelerId,
            reservationFieldId: fieldData.reservationFieldId,
            value: fieldData.value,
          };

          try {
            const result = await this.reservationTravelerFieldService
              .update(existingField.id, updateData)
              .toPromise();
            return result;
          } catch (error: any) {
            // Si falla la actualización, intentar crear (por si el registro fue eliminado)
            if (error?.status === 404 || error?.status === 400) {
              return await this.reservationTravelerFieldService
                .create(fieldData)
                .toPromise();
            }
            throw error;
          }
        } else {
          try {
            return await this.reservationTravelerFieldService
              .create(fieldData)
              .toPromise();
          } catch (error: any) {
            // Si falla la creación por duplicado, intentar actualizar
            if (error?.message?.includes('Duplicate entry') || error?.status === 409) {
              // Recargar campos y buscar el registro existente
              if (this.travelerId) {
                const updatedFields = await this.reservationTravelerFieldService
                  .getByReservationTraveler(this.travelerId)
                  .pipe(takeUntil(this.destroy$))
                  .toPromise();
                
                if (updatedFields) {
                  this.existingTravelerFields = updatedFields;
                  const foundField = updatedFields.find(
                    (f) =>
                      f.reservationTravelerId === fieldData.reservationTravelerId &&
                      f.reservationFieldId === fieldData.reservationFieldId
                  );
                  
                  if (foundField) {
                    const updateData: ReservationTravelerFieldUpdate = {
                      id: foundField.id,
                      reservationTravelerId: fieldData.reservationTravelerId,
                      reservationFieldId: fieldData.reservationFieldId,
                      value: fieldData.value,
                    };
                    return await this.reservationTravelerFieldService
                      .update(foundField.id, updateData)
                      .toPromise();
                  }
                }
              }
            }
            throw error;
          }
        }
      });

      await Promise.all(savePromises);

      // Recargar datos existentes después de guardar
      if (this.travelerId) {
        this.reservationTravelerFieldService
          .getByReservationTraveler(this.travelerId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (fields) => {
              this.existingTravelerFields = fields;

              // Actualizar valores de controles existentes con los valores de BD
              // Esto es especialmente importante para phonePrefix que se crea dinámicamente
              const phonePrefixField = this.reservationFields.find(f => f.code === 'phonePrefix');
              if (phonePrefixField && this.traveler) {
                const prefixControlName = `phonePrefix_${this.traveler.id}`;
                const prefixControl = this.travelerForm.get(prefixControlName);
                if (prefixControl) {
                  const existingPrefixValue = fields.find(
                    f => f.reservationTravelerId === this.traveler!.id && 
                         f.reservationFieldId === phonePrefixField.id
                  )?.value || null;
                  if (existingPrefixValue !== null && existingPrefixValue !== undefined) {
                    prefixControl.setValue(existingPrefixValue, { emitEvent: false });
                    prefixControl.markAsPristine();
                    prefixControl.markAsUntouched();

                  } else {
                    // Si no hay valor en BD, limpiar el control
                    prefixControl.setValue(null, { emitEvent: false });
                    prefixControl.markAsPristine();
                    prefixControl.markAsUntouched();
                  }
                }
              }
              
              // Marcar controles como pristine después de guardar
              Object.keys(this.travelerForm.controls).forEach((controlName) => {
                const control = this.travelerForm.get(controlName);
                if (control) {
                  control.markAsPristine();
                }
              });

            },
            error: (error) => {
            },
          });
      }
    } catch (error) {
      throw error;
    } finally {
      this.savingData = false;
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
              // Solo considerar si el campo es válido y ha sido modificado por el usuario
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

    }
    
    if (invalidFields.length > 0) {

    }

    return hasDifferences;
  }

  /**
   * Fuerza el guardado de todos los campos críticos de Amadeus
   * Este método se llama antes de avanzar al paso de pago para asegurar
   * que todos los campos requeridos por Amadeus estén guardados en BD
   */
  async forceSaveCriticalAmadeusFields(): Promise<void> {
    if (!this.traveler || !this.hasFlightSelected || !this.amadeusBookingRequirements) {
      return;
    }

    const criticalFields = ['dniexpiration', 'passportcountry', 'national_id'];
    let hasChanges = false;

    // Marcar todos los campos críticos como dirty si tienen valor válido
    criticalFields.forEach(fieldCode => {
      const controlName = `${fieldCode}_${this.traveler!.id}`;
      const control = this.travelerForm.get(controlName);
      
      if (control && control.valid && control.value) {
        const depField = this.departureReservationFields.find(
          df => {
            const fieldDetails = this.getReservationFieldDetails(df.reservationFieldId);
            return fieldDetails?.code === fieldCode;
          }
        );
        
        if (depField && this.isFieldMandatory(depField, this.traveler!.isLeadTraveler)) {
          const existingField = this.existingTravelerFields.find(
            ef => ef.reservationTravelerId === this.traveler!.id &&
                 ef.reservationFieldId === depField.reservationFieldId
          );
          
          let currentValue = control.value?.toString() || '';
          const fieldDetails = this.getReservationFieldDetails(depField.reservationFieldId);
          if (fieldDetails?.fieldType === 'date' && control.value) {
            if (control.value instanceof Date) {
              currentValue = this.formatDateToDDMMYYYY(control.value);
            } else if (typeof control.value === 'string' && control.value.includes('/')) {
              currentValue = control.value;
            }
          } else if (fieldDetails?.fieldType === 'country' && control.value) {
            if (typeof control.value === 'string') {
              currentValue = control.value;
            } else if (typeof control.value === 'object' && (control.value as any).code) {
              currentValue = String((control.value as any).code);
            }
          }
          const existingValue = existingField ? existingField.value : '';
          
          if (currentValue !== existingValue) {
            hasChanges = true;
            control.markAsDirty();
            control.markAsTouched();
          }
        }
      }
    });

    // Si hay cambios, guardar inmediatamente
    if (hasChanges) {
      await this.saveData();
      // Esperar a que se complete el guardado y recargar campos existentes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recargar campos existentes para verificar que se guardaron correctamente
      if (this.travelerId) {
        const updatedFields = await this.reservationTravelerFieldService
          .getByReservationTraveler(this.travelerId)
          .pipe(takeUntil(this.destroy$))
          .toPromise();
        
        if (updatedFields) {
          this.existingTravelerFields = updatedFields;
        }
      }
    }
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
   * 1. Todos los campos obligatorios deben estar completos y ser válidos
   * 2. No debe haber cambios pendientes (todo debe estar guardado en BD)
   */
  isReadyToContinue(): boolean {
    if (!this.traveler) {
      return false;
    }

    // Forzar guardado de campos críticos de Amadeus antes de validar
    if (this.hasFlightSelected && this.amadeusBookingRequirements) {
      const criticalFields = ['dniexpiration', 'passportcountry', 'national_id'];
      let hasCriticalChanges = false;
      
      criticalFields.forEach(fieldCode => {
        const controlName = `${fieldCode}_${this.traveler!.id}`;
        const control = this.travelerForm.get(controlName);
        
        if (control && control.valid && control.value) {
          // Verificar si el campo es obligatorio para este viajero
          const depField = this.departureReservationFields.find(
            df => {
              const fieldDetails = this.getReservationFieldDetails(df.reservationFieldId);
              return fieldDetails?.code === fieldCode;
            }
          );
          
          if (depField && this.isFieldMandatory(depField, this.traveler!.isLeadTraveler)) {
            // Verificar si está guardado en BD
            const existingField = this.existingTravelerFields.find(
              ef => ef.reservationTravelerId === this.traveler!.id &&
                   ef.reservationFieldId === depField.reservationFieldId
            );
            
            // Obtener valor formateado del control (similar a collectFormData)
            let currentValue = control.value?.toString() || '';
            const fieldDetails = this.getReservationFieldDetails(depField.reservationFieldId);
            if (fieldDetails?.fieldType === 'date' && control.value) {
              if (control.value instanceof Date) {
                currentValue = this.formatDateToDDMMYYYY(control.value);
              } else if (typeof control.value === 'string' && control.value.includes('/')) {
                currentValue = control.value;
              }
            } else if (fieldDetails?.fieldType === 'country' && control.value) {
              if (typeof control.value === 'string') {
                currentValue = control.value;
              } else if (typeof control.value === 'object' && (control.value as any).code) {
                currentValue = String((control.value as any).code);
              }
            }
            const existingValue = existingField ? existingField.value : '';
            
            if (currentValue !== existingValue) {
              hasCriticalChanges = true;
            }
          }
        }
      });
      
      // Si hay cambios en campos críticos, forzar guardado inmediato
      if (hasCriticalChanges) {
        // Marcar todos los campos críticos como dirty para que se guarden
        criticalFields.forEach(fieldCode => {
          const controlName = `${fieldCode}_${this.traveler!.id}`;
          const control = this.travelerForm.get(controlName);
          if (control && control.valid && control.value) {
            control.markAsDirty();
            control.markAsTouched();
          }
        });
        // Disparar guardado inmediato
        this.autoSave$.next();
        // Retornar false para dar tiempo al guardado
        return false;
      }
    }

    // 1. Verificar que no haya cambios pendientes (todo está guardado)
    if (this.hasPendingChanges()) {
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

          // NUEVO: Si el campo es phone y es obligatorio, también validar phonePrefix
          if (fieldDetails.code === 'phone') {
            const prefixControlName = `phonePrefix_${this.traveler!.id}`;
            const prefixControl = this.travelerForm.get(prefixControlName);
            
            if (prefixControl) {
              if (prefixControl.invalid) {
                mandatoryFieldsInvalid.push(`phonePrefix (${this.getControlErrorMessage(prefixControl, 'phonePrefix')})`);
              } else if (!prefixControl.value || prefixControl.value === '') {
                mandatoryFieldsMissing.push(`phonePrefix (vacío)`);
              }
            }
          }
        }
      }
    });


    // 3. Si hay algún campo obligatorio inválido o faltante, NO está listo
    if (mandatoryFieldsInvalid.length > 0 || mandatoryFieldsMissing.length > 0) {
      return false;
    }

    // Todo está OK: campos obligatorios completos, válidos y guardados

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

              }
            } else {
              // Para otros tipos de campos
              control.setValue(userValue);
              control.markAsDirty();
              control.markAsTouched();
              fieldsUpdated++;

            }
          }
        }
      }
    });

    // Actualizar validaciones
    this.travelerForm.updateValueAndValidity();
    this.validateFormInRealTime();
    
    // Log del estado final del formulario

    // Log individual de cada input
    Object.keys(this.travelerForm.controls).forEach((controlName) => {
      const control = this.travelerForm.get(controlName);
      const value = control?.value;
      const isValid = control?.valid;
      const isDirty = control?.dirty;

    });

    // Solo disparar autoguardado si no estamos inicializando y hay cambios
    if (fieldsUpdated > 0 && !this.isInitializing) {

      // Usar setTimeout para asegurar que el formulario se haya actualizado completamente
      setTimeout(() => {
        // Solo disparar si aún hay cambios pendientes y no estamos inicializando
        if (this.hasPendingChanges() && !this.isInitializing) {
          this.autoSave$.next();

        } else {

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

    let returnValue: string | null = null;
    
    switch (fieldCode) {
      case 'email':
        returnValue = userData.email || null;
        break;
      case 'phone':
        returnValue = userData.telefono || null;
        break;
      case 'name':
        returnValue = userData.nombre || null;
        break;
      case 'surname':
        returnValue = userData.apellido || null;
        break;
      case 'birthdate':
        returnValue = userData.fechaNacimiento || null;
        break;
      case 'national_id':
        returnValue = userData.dni || null;
        break;
      case 'dniexpiration':
        returnValue = userData.fechaExpiracionDni || null;
        break;
      case 'nationality':
        returnValue = userData.pais || null;
        break;
      case 'postal_code':
        returnValue = userData.codigoPostal || null;
        break;
      case 'sex':
        returnValue = this.normalizeSexValue(userData.sexo);
        break;
      case 'phonePrefix':
        returnValue = userData.phonePrefix || null;
        break;
      default:
        returnValue = null;
    }

    return returnValue;
  }
}

