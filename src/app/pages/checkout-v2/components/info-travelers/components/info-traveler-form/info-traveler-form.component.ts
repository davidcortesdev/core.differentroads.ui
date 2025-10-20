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
import { takeUntil, catchError } from 'rxjs/operators';
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

  // Información personal del usuario autenticado
  currentPersonalInfo: PersonalInfo | null = null;

  // Fechas calculadas para cada campo
  travelerFieldDates: {
    [fieldCode: string]: {
      minDate: Date;
      maxDate: Date;
    };
  } = {};

  sexOptions = [
    { label: 'Masculino', value: 'Masculino' },
    { label: 'Femenino', value: 'Femenino' },
    { label: 'Otro', value: 'Otro' }
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
      pattern: () => 'Debe seleccionar Masculino, Femenino u Otro.',
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
    if (!this.traveler) {
      return;
    }

    // Limpiar formulario existente
    this.travelerForm = this.fb.group({});

    // Agregar controles para todos los campos posibles
    this.departureReservationFields.forEach((field) => {
      const fieldDetails = this.getReservationFieldDetails(field.reservationFieldId);
      if (fieldDetails) {
        // Para el viajero líder, usar datos del usuario autenticado
        let controlValue: string | Date | null = null;
        
        if (this.traveler!.isLeadTraveler && this.currentPersonalInfo) {
          controlValue = this.getUserDataForField(fieldDetails);
        } else {
          controlValue = this.getExistingFieldValue(this.traveler!.id, fieldDetails.id);
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

        this.travelerForm.addControl(
          `${fieldDetails.code}_${this.traveler!.id}`,
          this.fb.control(controlValue, validators)
        );
      }
    });

    // Calcular fechas para los campos de fecha
    this.calculateTravelerFieldDates();

    this.loading = false;

    // Validación inicial
    setTimeout(() => {
      this.validateFormInRealTime();
    }, 50);
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
        validators.push(Validators.pattern(/^(\+\d{1,3})?\s?\d{6,14}$/));
        break;
      case 'text':
        if (fieldDetails.code === 'phone') {
          validators.push(Validators.pattern(/^(\+\d{1,3})?\s?\d{6,14}$/));
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
        validators.push(Validators.pattern(/^(Masculino|Femenino|Otro)$/));
        break;
      case 'country':
        validators.push(Validators.pattern(/^[A-Z]{2}$/));
        break;
    }

    return validators;
  }

  /**
   * Validador personalizado para fechas
   */
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
      return null;
    }

    const fieldCode = fieldDetails.code;
    
    switch (fieldCode) {
      case 'email':
        return userData.email || null;
      case 'phone':
      case 'telefono':
        return userData.telefono || null;
      case 'firstname':
      case 'first_name':
      case 'name':
      case 'nombre':
        return userData.nombre || null;
      case 'lastname':
      case 'last_name':
      case 'surname':
      case 'apellido':
        return userData.apellido || null;
      case 'birthdate':
      case 'fecha_nacimiento':
        return userData.fechaNacimiento || null;
      case 'dni':
      case 'national_id':
        return userData.dni || null;
      case 'country':
      case 'pais':
        return userData.pais || null;
      case 'city':
      case 'ciudad':
        return userData.ciudad || null;
      case 'postal_code':
      case 'codigo_postal':
        return userData.codigoPostal || null;
      case 'address':
      case 'direccion':
        return userData.direccion || null;
      case 'sexo':
        return userData.sexo || null;
      default:
        const codeLower = (fieldCode || '').toLowerCase();
        switch (codeLower) {
          case 'sex':
          case 'gender':
            return userData.sexo || null;
          default:
            return null;
        }
    }
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
    const filteredValue = input.value.replace(/[^\d+\s-]/g, '');
    input.value = filteredValue;

    const controlName = `${fieldCode}_${this.traveler.id}`;
    const control = this.travelerForm.get(controlName);

    if (control) {
      control.setValue(filteredValue);
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

    Object.keys(this.travelerForm.controls).forEach((controlName) => {
      const control = this.travelerForm.get(controlName);

      // Solo procesar controles modificados (dirty)
      if (control && control.dirty) {
        const { fieldCode } = this.parseFieldName(controlName);

        if (fieldCode) {
          const field = this.reservationFields.find((f) => f.code === fieldCode);
          if (field) {
            const fieldDetails = this.getReservationFieldDetails(field.id);
            
            let fieldValue = control.value?.toString() || '';
            if (fieldDetails?.fieldType === 'date' && control.value) {
              if (control.value instanceof Date) {
                fieldValue = this.formatDateToDDMMYYYY(control.value);
              } else if (typeof control.value === 'string') {
                if (control.value.includes('/')) {
                  fieldValue = control.value;
                } else {
                  const date = new Date(control.value);
                  if (!isNaN(date.getTime())) {
                    fieldValue = this.formatDateToDDMMYYYY(date);
                  }
                }
              }
            }

            const fieldData: ReservationTravelerFieldCreate = {
              id: 0,
              reservationTravelerId: this.traveler!.id,
              reservationFieldId: field.id,
              value: fieldValue,
            };

            formData.push(fieldData);
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
   * Guarda los datos del viajero
   */
  async saveData(): Promise<void> {
    const formData = this.collectFormData();

    if (formData.length === 0) {
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
          return this.reservationTravelerFieldService
            .create(fieldData)
            .toPromise();
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
              // Marcar controles como pristine después de guardar
              Object.keys(this.travelerForm.controls).forEach((controlName) => {
                const control = this.travelerForm.get(controlName);
                if (control) {
                  control.markAsPristine();
                }
              });
            },
            error: (error) => {
              console.error('Error al recargar campos del viajero:', error);
            },
          });
      }

      this.dataUpdated.emit();
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
}

