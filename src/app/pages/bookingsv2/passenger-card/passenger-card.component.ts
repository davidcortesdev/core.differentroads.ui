import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';

import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { PassengerData } from '../passengerData';
import {
  BookingTraveler,
  TravelerData,
} from '../../../core/models/bookings/booking-traveler.model';
import { IReservationFieldResponse } from '../../../core/services/reservation/reservation-field.service';
import { IDepartureReservationFieldResponse } from '../../../core/services/departure/departure-reservation-field.service';
import { PhonePrefixService, IPhonePrefixResponse } from '../../../core/services/masterdata/phone-prefix.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-passenger-card-v2',
  standalone: false,
  templateUrl: './passenger-card.component.html',
  styleUrls: ['./passenger-card.component.scss'],
})
export class PassengerCardV2Component implements OnInit, OnChanges, OnDestroy {
  @Input() passenger!: any;
  @Input() bookingId!: string;
  @Input() travelerId!: string;
  @Input() reservationFields: {
    id: number;
    name: string;
    key: string;
    mandatory: boolean;
  }[] = [];

  @Input() availableFields: IReservationFieldResponse[] = [];
  @Input() departureReservationFields: IDepartureReservationFieldResponse[] = []; // NUEVO: Campos configurados para este departure
  @Input() mandatoryFields: IDepartureReservationFieldResponse[] = [];
  @Input() isLeadTraveler: boolean = false;
  @Input() isEditingBlocked: boolean = false;
  @Input() Days!: number;
  @Input() isATC: boolean = false;

  @Output() passengerUpdated = new EventEmitter<any>();

  passengerForm!: FormGroup;
  isEditing = false;
  today = new Date();

  // Opciones para el dropdown de prefijo telefónico
  phonePrefixOptions: IPhonePrefixResponse[] = [];
  selectedPhonePrefix: string | null = null;

  private destroy$ = new Subject<void>();

  // Mapeo de campos de reserva
  reservationFieldMappings: { [key: string]: string } = {
    name: 'name',
    surname: 'surname',
    email: 'email',
    phone: 'phone',
    gender: 'gender',
    birthDate: 'birthdate',
    documentType: 'document_type',
    passportID: 'passport',
    nationality: 'nationality',
    minorIdExpirationDate: 'minorIdExpirationDate',
  };

  genderOptions = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private phonePrefixService: PhonePrefixService
  ) {}

  ngOnInit(): void {
    // Cargar prefijos telefónicos
    this.phonePrefixService.getAllOrdered()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (prefixes) => {
          this.phonePrefixOptions = prefixes;
          // Si ya hay un prefijo en el pasajero, establecerlo después de cargar las opciones
          if (this.passenger?.prefijo) {
            this.selectedPhonePrefix = this.passenger.prefijo;
          }
        },
        error: (error) => {
          console.error('Error loading phone prefixes:', error);
        }
      });

    this.route.data.subscribe((data) => {
      if (data['passenger']) {
        this.passenger = data['passenger'];
      }
      // Normaliza el valor de documentType antes de inicializar el formulario
      if (this.passenger && this.passenger.documentType) {
        this.passenger.documentType = this.passenger.documentType.toLowerCase();
      }
      this.initForm();
    });

    if (!this.bookingId) {
      if (this.passenger && this.passenger.bookingID) {
        this.bookingId = this.passenger.bookingID;
      } else if (this.passenger && this.passenger.bookingSID) {
        this.bookingId = this.passenger.bookingSID;
      }
    }

    if (!this.travelerId) {
      if (this.passenger && this.passenger._id) {
        this.travelerId = this.passenger._id;
      } else if (this.passenger && this.passenger.id) {
        this.travelerId = this.passenger.id.toString();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    const formControls: { [key: string]: any } = {
      fullName: [this.passenger?.name || '', [Validators.required]],
      surname: [this.passenger?.surname || ''],
      email: [
        this.passenger?.email || '',
        [Validators.email, Validators.minLength(5)],
      ],
      phone: [this.passenger?.phone || ''],
      prefijo: [this.passenger?.prefijo || ''],
      gender: [this.passenger?.gender || ''],
      birthDate: [this.passenger?.birthDate || ''],
      documentType: [this.passenger?.documentType || 'dni'],
      passportID: [this.passenger?.passportID || ''],
      nationality: [this.passenger?.nationality || ''],
      room: [this.passenger?.room || ''],
      documentExpeditionDate: [this.passenger?.documentExpeditionDate],
      documentExpirationDate: [this.passenger?.documentExpirationDate],
      comfortPlan: [this.passenger?.comfortPlan || 'Básico'],
      insurance: [this.passenger?.insurance || false],
      ciudad: [this.passenger?.ciudad || ''],
      codigoPostal: [this.passenger?.codigoPostal || ''],
      dni: [this.passenger?.dni || ''],
      minorIdExpirationDate: [this.passenger?.minorIdExpirationDate],
      minorIdIssueDate: [this.passenger?.minorIdIssueDate],
    };

    // Inicializar controles dinámicamente basados en departureReservationFields
    if (this.departureReservationFields && this.departureReservationFields.length > 0) {
      this.departureReservationFields.forEach((drf) => {
        const fieldDetails = this.getReservationFieldDetails(drf.reservationFieldId);
        if (fieldDetails) {
          const formControlName = this.getFormControlName(fieldDetails.code);
          const passengerValue = this.getPassengerFieldValue(fieldDetails.code);
          
          // Solo agregar si no existe ya en formControls
          if (!formControls[formControlName]) {
            const validators = this.getFieldValidators(drf, fieldDetails);
            formControls[formControlName] = [passengerValue || '', validators];
          } else {
            // Actualizar validadores y valor si el campo ya existe
            const validators = this.getFieldValidators(drf, fieldDetails);
            // Usar el valor del passenger si está disponible, de lo contrario mantener el existente
            const finalValue = passengerValue !== undefined && passengerValue !== null ? passengerValue : formControls[formControlName][0];
            formControls[formControlName] = [finalValue, validators];
          }

          // Si es campo de teléfono, asegurar que existe el control de prefijo
          if (fieldDetails.code === 'phone' && !formControls['prefijo']) {
            formControls['prefijo'] = [this.passenger?.prefijo || ''];
          }
        }
      });
    }

    this.passengerForm = this.fb.group(formControls);

    // Establecer el prefijo seleccionado si existe
    if (this.passenger?.prefijo) {
      this.selectedPhonePrefix = this.passenger.prefijo;
    } else {
      this.selectedPhonePrefix = null;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['passenger'] && changes['passenger'].currentValue) {
      const passenger = changes['passenger'].currentValue;
      if (passenger.documentType) {
        passenger.documentType = passenger.documentType.toLowerCase();
      }
      this.initForm();
    }
    
    // Reinicializar formulario si cambian los campos de departure o los campos disponibles
    if ((changes['departureReservationFields'] || changes['availableFields']) && this.passenger) {
      this.initForm();
    }
  }

  validateBirthDate(control: AbstractControl) {
    const birthDate = control.value;
    if (birthDate) {
      const today = new Date();
      const birth = new Date(birthDate);
      const age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        // Si aún no ha cumplido años este año, restar uno
        return { invalidBirthDate: true };
      }

      if (age < 0) {
      return { invalidBirthDate: true };
      }
    }
    return null;
  }

  startEditing(): void {
    this.isEditing = true;
    
    // Inicializar valores básicos
    const patchValues: any = {
      fullName: this.passenger.name || '',
      surname: this.passenger.surname || '',
      email: this.passenger.email || '',
      phone: this.passenger.phone || '',
      gender: this.passenger.gender || '',
      prefijo: this.passenger.prefijo || '',
    };

    // Inicializar campos dinámicos desde departureReservationFields
    if (this.departureReservationFields && this.departureReservationFields.length > 0) {
      this.departureReservationFields.forEach((drf) => {
        const fieldDetails = this.getReservationFieldDetails(drf.reservationFieldId);
        if (fieldDetails) {
          const formControlName = this.getFormControlName(fieldDetails.code);
          const passengerValue = this.getPassengerFieldValue(fieldDetails.code);
          patchValues[formControlName] = passengerValue || '';
        }
      });
    }

    this.passengerForm.patchValue(patchValues);
    
    // Establecer el prefijo seleccionado
    if (this.passenger?.prefijo) {
      this.selectedPhonePrefix = this.passenger.prefijo;
    } else {
      this.selectedPhonePrefix = null;
    }
  }

  onPhonePrefixChange(event: any): void {
    this.selectedPhonePrefix = event.value;
    const control = this.passengerForm?.get('prefijo');
    if (control) {
      control.setValue(event.value || '', { emitEvent: true });
    }
  }

  // Normalizar teléfono a dígitos y limitar a 14
  onPhoneInput(event: Event): void {
    const inputEl = event.target as HTMLInputElement | null;
    if (!inputEl) return;
    const digitsOnly = inputEl.value.replace(/\D/g, '').slice(0, 14);
    inputEl.value = digitsOnly;
    // Reflejar en el formulario si existe el control
    const control = this.passengerForm?.get('phone');
    if (control) {
      control.setValue(digitsOnly, { emitEvent: false });
    }
  }

  onSave(): void {
    if (this.passengerForm.valid) {
      const formValue = this.passengerForm.getRawValue();

      if (!this.bookingId) {
        if (this.passenger && this.passenger.bookingID) {
          this.bookingId = this.passenger.bookingID;
        } else if (this.passenger && this.passenger.bookingSID) {
          this.bookingId = this.passenger.bookingSID;
        }
      }

      if (!this.travelerId) {
        if (this.passenger && this.passenger._id) {
          this.travelerId = this.passenger._id;
        } else if (this.passenger && this.passenger.id) {
          this.travelerId = this.passenger.id.toString();
        }
      }

      if (!this.bookingId) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'ID de reserva no válido. Por favor, inténtelo de nuevo.',
          life: 3000,
        });
        return;
      }

      if (!this.travelerId) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'ID de viajero no válido. Por favor, inténtelo de nuevo.',
          life: 3000,
        });
        return;
      }

      const travelerData: TravelerData = {
        surname: formValue.surname || '',
        passportID: formValue.passportID || '',
        documentType: formValue.documentType || 'dni',
        birthdate: formValue.birthDate || null,
        email: formValue.email || '',
        phone: formValue.phone || '',
        sex: formValue.gender || '',
        nationality: formValue.nationality || '',
        passportExpirationDate: formValue.passportExpirationDate || null,
        passportIssueDate: formValue.passportIssueDate || null,
        minorIdExpirationDate: formValue.minorIdExpirationDate || null,
        minorIdIssueDate: formValue.minorIdIssueDate || null,
        prefijo: formValue.prefijo || '',
      };

      let bookingSID = '';
      if (this.passenger && this.passenger.bookingSID) {
        bookingSID = this.passenger.bookingSID;
      } else {
        bookingSID = this.bookingId;
      }

      const updatedTraveler: BookingTraveler = {
        _id: this.travelerId,
        bookingID: this.bookingId,
        lead: this.passenger.lead || false,
        bookingSID: bookingSID,
        travelerData,
      };

      // Crear el objeto passenger actualizado para pasar al componente padre
      const updatedPassenger: PassengerData = {
        id: this.passenger.id,
        name: formValue.fullName || formValue.name || '',
        surname: formValue.surname || '',
        documentType: formValue.documentType || 'DNI',
        passportID: formValue.passportID || '',
        birthDate: formValue.birthDate || '',
        email: formValue.email || '',
        phone: formValue.phone || '',
        type: this.passenger.type || 'adult',
        gender: formValue.gender || '',
        nationality: formValue.nationality || '',
        prefijo: formValue.prefijo || '',
        dni: formValue.dni || '',  // ✅ Agregar campo DNI para que se guarde
        _id: this.travelerId
      };

      // Emitir el evento para que el componente padre maneje la actualización
      this.passengerUpdated.emit(updatedPassenger);

      // Actualizar el objeto passenger local con todos los campos del formulario
      const updatedPassengerData: any = {
        ...this.passenger,
        name: formValue.fullName || formValue.name || this.passenger.name,
        surname: formValue.surname || this.passenger.surname,
        fullName: formValue.fullName,
        documentType: formValue.documentType,
        passportID: formValue.passportID,
        birthDate: formValue.birthDate,
        email: formValue.email,
        phone: formValue.phone,
        gender: formValue.gender,
        room: formValue.room,
        documentExpeditionDate: formValue.documentExpeditionDate,
        documentExpirationDate: formValue.documentExpirationDate,
        comfortPlan: formValue.comfortPlan,
        insurance: formValue.insurance,
        ciudad: formValue.ciudad,
        codigoPostal: formValue.codigoPostal,
        nationality: formValue.nationality,
        dni: formValue.dni,
        minorIdExpirationDate: formValue.minorIdExpirationDate,
        minorIdIssueDate: formValue.minorIdIssueDate,
        prefijo: formValue.prefijo,
      };

      // Agregar campos dinámicos adicionales desde departureReservationFields
      if (this.departureReservationFields && this.departureReservationFields.length > 0) {
        this.departureReservationFields.forEach((drf) => {
          const fieldDetails = this.getReservationFieldDetails(drf.reservationFieldId);
          if (fieldDetails) {
            const formControlName = this.getFormControlName(fieldDetails.code);
            const fieldValue = formValue[formControlName];
            if (fieldValue !== undefined && fieldValue !== null) {
              // Mapear el valor al campo correspondiente en passenger
              const passengerKey = this.getPassengerFieldKey(fieldDetails.code);
              updatedPassengerData[passengerKey] = fieldValue;
            }
          }
        });
      }

      this.passenger = updatedPassengerData;

          this.messageService.add({
            severity: 'success',
            summary: 'Datos actualizados',
            detail: `La información de ${
              formValue.fullName || 'pasajero'
            } ha sido actualizada correctamente`,
            life: 3000,
          });

          this.isEditing = false;
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor corrige los errores en el formulario.',
        life: 3000,
      });
    }
  }

  cancelEditing(): void {
    this.passengerForm.reset(this.passenger);
    this.isEditing = false;
  }

  onEdit(): void {
    // Si es ATC, permitir edición siempre. Si no es ATC y está bloqueado, mostrar mensaje
    if (this.isEditingBlocked && !this.isATC) {
      this.messageService.add({
        key: 'center',
        severity: 'warn',
        summary: 'Edición bloqueada',
        detail: `No se pueden modificar los datos personales ${this.Days} días antes del viaje`,
        life: 5000,
      });
      return;
    }
    this.isEditing = true;
  }

  onCancel(): void {
    this.cancelEditing();
  }

  hasPendingFields(): boolean {
    if (!this.passenger) return false;
    
    // Verificar campos obligatorios que estén vacíos
    const requiredFields = ['name', 'surname', 'email', 'phone', 'gender', 'birthDate'];
    
    for (const field of requiredFields) {
      if (this.isFieldRequired(field) && !this.passenger[field]) {
      return true;
      }
    }

    return false;
  }

  getPassengerTypeLabel(type: string): string {
    // Si el tipo es 'lead', mostrar "Líder de reserva"
    if (type === 'lead' || type === 'líder') {
      return 'Líder de reserva';
    }
    
    // Si el tipo es 'passenger1', 'passenger2', etc., extraer el número
    const passengerMatch = type.match(/passenger(\d+)/);
    if (passengerMatch) {
      return `Pasajero ${passengerMatch[1]}`;
    }
    
    // Tipos tradicionales por si acaso
    const types: { [key: string]: string } = {
      adult: 'Adulto',
      child: 'Niño',
      infant: 'Bebé',
      senior: 'Senior',
    };

    return types[type.toLowerCase()] || type;
  }

  formatDate(dateStr: string | Date): string {
    if (!dateStr) return 'Pendiente';

    try {
      if (dateStr instanceof Date) {
        const day = dateStr.getDate().toString().padStart(2, '0');
        const month = (dateStr.getMonth() + 1).toString().padStart(2, '0');
        const year = dateStr.getFullYear();
        return `${day}/${month}/${year}`;
      }

      const dateString = String(dateStr);

      if (dateString.includes('/')) {
        return dateString;
      }

      if (dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length >= 3) {
          return `${parts[2].substring(0, 2)}/${parts[1]}/${parts[0]}`;
        }
      }

      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }

      return dateString;
    } catch (e) {
      console.error('Error formatting date:', e);
      return String(dateStr) || 'Pendiente';
    }
  }

  formatDateToString(date: Date): string {
    if (!date) return '';

    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error converting Date to string:', error);
      return '';
    }
  }

  getGenderLabel(value: string): string {
    const option = this.genderOptions.find((opt) => opt.value === value);
    return option ? option.label : value || 'Pendiente';
  }

  getComfortPlanValue(): string {
    return this.passenger.comfortPlan || 'Básico';
  }

  /**
   * Obtener detalles del campo de reservación (igual que checkout)
   */
  getReservationFieldDetails(reservationFieldId: number): IReservationFieldResponse | null {
    return this.availableFields.find((field) => field.id === reservationFieldId) || null;
  }

  /**
   * Helper para verificar si hay campos de departure configurados
   */
  hasDepartureFields(): boolean {
    return this.departureReservationFields && this.departureReservationFields.length > 0;
  }

  /**
   * Obtener valor del campo para un pasajero
   */
  getPassengerFieldValue(fieldCode: string): any {
    const mapping: { [key: string]: string } = {
      'name': 'name',
      'surname': 'surname',
      'email': 'email',
      'phone': 'phone',
      'sex': 'gender',
      'birthdate': 'birthDate',
      'dni': 'dni',
      'national_id': 'dni',  // ✅ Código en BD: national_id, propiedad en passenger: dni
      'passport': 'passportID',
      'nationality': 'nationality',
      'document_type': 'documentType',
      'room': 'room',
      'ciudad': 'ciudad',
      'codigoPostal': 'codigoPostal',
      'phonePrefix': 'prefijo'  // ✅ Código en BD: phonePrefix, propiedad en passenger: prefijo
    };
    
    const passengerKey = mapping[fieldCode] || fieldCode;
    return this.passenger[passengerKey];
  }

  /**
   * Obtener label del campo
   */
  getFieldLabel(fieldCode: string): string {
    const labels: { [key: string]: string } = {
      'name': 'Nombre',
      'surname': 'Apellidos',
      'email': 'Email',
      'phone': 'Teléfono',
      'sex': 'Sexo',
      'birthdate': 'Fecha de nacimiento',
      'dni': 'DNI',
      'national_id': 'DNI',  // ✅ Código en BD: national_id
      'passport': 'Pasaporte',
      'nationality': 'Nacionalidad',
      'document_type': 'Tipo de documento',
      'room': 'Habitación',
      'ciudad': 'Ciudad',
      'codigoPostal': 'Código postal'
    };
    
    return labels[fieldCode] || fieldCode;
  }

  shouldShowField(fieldKey: string): boolean {
    if (this.departureReservationFields && this.departureReservationFields.length > 0) {
      const fieldCode = this.getFieldCodeFromKey(fieldKey);
      
      const availableField = this.availableFields.find(field => 
        field.code.toLowerCase() === fieldCode.toLowerCase()
      );
      
      if (!availableField) {
        return false;
      }
      
      const isDepartureField = this.departureReservationFields.some(
        drf => drf.reservationFieldId === availableField.id
      );
      
      return isDepartureField;
    }

    // Fallback al método anterior si no hay departureReservationFields
    const originalKey = this.getOriginalKey(fieldKey);
    if (!originalKey) return false;

    const field = this.reservationFields.find((f) => f.key === originalKey);

    if (!field) return false;

    return field.mandatory;
  }

  private getFieldCodeFromKey(fieldKey: string): string {
    const mapping: { [key: string]: string } = {
      'name': 'name',
      'surname': 'surname',
      'email': 'email',
      'phone': 'phone',
      'gender': 'sex',  // ✅ El código del campo es 'sex' en BD
      'birthDate': 'birthdate',
      'documentType': 'document_type',
      'passportID': 'passport',
      'nationality': 'nationality',
      'dni': 'national_id',  // ✅ Código en BD: national_id, propiedad en passenger: dni
      'room': 'room',  // ✅ Agregado campo habitación
      'ciudad': 'ciudad',  // ✅ Agregado campo ciudad
      'codigoPostal': 'codigoPostal',  // ✅ Agregado campo código postal
      'minorIdIssueDate': 'minorIdIssueDate',  // ✅ Agregado fecha expedición DNI
      'minorIdExpirationDate': 'minorIdExpirationDate',  // ✅ Agregado fecha caducidad DNI
      'documentExpeditionDate': 'documentExpeditionDate',  // ✅ Agregado fecha expedición pasaporte
      'documentExpirationDate': 'documentExpirationDate',  // ✅ Agregado fecha caducidad pasaporte
      'comfortPlan': 'comfortPlan',  // ✅ Agregado plan de seguro
      'prefijo': 'phonePrefix'  // ✅ Agregado campo prefijo (código en BD: phonePrefix)
    };
    return mapping[fieldKey] || fieldKey;
  }

  private hasFieldData(fieldKey: string): boolean {
    if (!this.passenger) return false;
    
    switch (fieldKey) {
      case 'name':
        return !!this.passenger.name;
      case 'surname':
        return !!this.passenger.surname;
      case 'email':
        return !!this.passenger.email;
      case 'phone':
        return !!this.passenger.phone;
      case 'gender':
        return !!this.passenger.gender || !!this.passenger.sex; // ✅ CORREGIDO: verificar ambos campos
      case 'birthDate':
        return !!this.passenger.birthDate;
      case 'documentType':
        return !!this.passenger.documentType;
      case 'passportID':
        return !!this.passenger.passportID;
      case 'nationality':
        return !!this.passenger.nationality;
      default:
        return false;
    }
  }

  isFieldRequired(fieldKey: string): boolean {
    // Usar departureReservationFields para determinar si es obligatorio
    if (!this.departureReservationFields || this.departureReservationFields.length === 0) {
      return false;
    }

    const fieldCode = this.getFieldCodeFromKey(fieldKey);
    const availableField = this.availableFields.find(field => 
      field.code.toLowerCase() === fieldCode.toLowerCase()
    );

    if (!availableField) {
      return false;
    }

    const departureField = this.departureReservationFields.find(field => 
      field.reservationFieldId === availableField.id
    );

    if (!departureField) {
      return false;
    }

    switch (departureField.mandatoryTypeId) {
      case 1: // Opcional
        return false;
      case 2: // Siempre obligatorio
        return true;
      case 3: // Obligatorio solo para lead traveler
        return this.isLeadTraveler;
      default:
        return false;
    }
  }

  getFieldMandatoryType(fieldKey: string): number | null {
    // Usar departureReservationFields
    if (!this.departureReservationFields || this.departureReservationFields.length === 0) {
      return null;
    }

    const fieldCode = this.getFieldCodeFromKey(fieldKey);
    const availableField = this.availableFields.find(field => 
      field.code.toLowerCase() === fieldCode.toLowerCase()
    );

    if (!availableField) {
      return null;
    }

    const departureField = this.departureReservationFields.find(field => 
      field.reservationFieldId === availableField.id
    );

    return departureField ? departureField.mandatoryTypeId : null;
  }

  getMandatoryTypeDescription(fieldKey: string): string {
    const mandatoryType = this.getFieldMandatoryType(fieldKey);
    
    switch (mandatoryType) {
      case 1:
        return 'Opcional';
      case 2:
        return 'Obligatorio';
      case 3:
        return 'Obligatorio para pasajero principal';
      default:
        return 'Opcional';
    }
  }

  private getOriginalKey(mappedKey: string): string | null {
    for (const [key, value] of Object.entries(this.reservationFieldMappings)) {
      if (value === mappedKey) {
        return key;
      }
    }
    return null;
  }

  /**
   * TrackBy function para mejorar el rendimiento del *ngFor
   */
  trackByReservationFieldId(index: number, item: IDepartureReservationFieldResponse): number {
    return item.reservationFieldId;
  }

  /**
   * Obtiene el nombre del control del formulario basado en el código del campo
   */
  getFormControlName(fieldCode: string): string {
    const mapping: { [key: string]: string } = {
      'name': 'fullName',
      'surname': 'surname',
      'email': 'email',
      'phone': 'phone',
      'sex': 'gender',
      'birthdate': 'birthDate',
      'dni': 'dni',
      'national_id': 'dni',  // ✅ Código en BD: national_id, control del formulario: dni
      'passport': 'passportID',
      'nationality': 'nationality',
      'document_type': 'documentType',
      'room': 'room',
      'ciudad': 'ciudad',
      'codigoPostal': 'codigoPostal',
      'phonePrefix': 'prefijo',
      'minorIdIssueDate': 'minorIdIssueDate',
      'minorIdExpirationDate': 'minorIdExpirationDate',
      'documentExpeditionDate': 'documentExpeditionDate',
      'documentExpirationDate': 'documentExpirationDate',
      'comfortPlan': 'comfortPlan'
    };
    
    return mapping[fieldCode] || fieldCode;
  }

  /**
   * Obtiene los validadores para un campo basado en su configuración
   */
  getFieldValidators(drf: IDepartureReservationFieldResponse, fieldDetails: IReservationFieldResponse): any[] {
    const validators: any[] = [];
    
    // Agregar validador requerido si el campo es obligatorio
    const isMandatory = drf.mandatoryTypeId === 2 || (drf.mandatoryTypeId === 3 && this.isLeadTraveler);
    if (isMandatory) {
      validators.push(Validators.required);
    }

    // Validadores específicos por tipo de campo
    if (fieldDetails.fieldType === 'email') {
      validators.push(Validators.email);
      validators.push(Validators.minLength(5));
    }

    return validators;
  }

  /**
   * Obtiene la clave del campo en el objeto passenger basado en el código del campo
   */
  getPassengerFieldKey(fieldCode: string): string {
    const mapping: { [key: string]: string } = {
      'name': 'name',
      'surname': 'surname',
      'email': 'email',
      'phone': 'phone',
      'sex': 'gender',
      'birthdate': 'birthDate',
      'dni': 'dni',
      'national_id': 'dni',  // ✅ Código en BD: national_id, propiedad en passenger: dni
      'passport': 'passportID',
      'nationality': 'nationality',
      'document_type': 'documentType',
      'room': 'room',
      'ciudad': 'ciudad',
      'codigoPostal': 'codigoPostal',
      'phonePrefix': 'prefijo',
      'minorIdIssueDate': 'minorIdIssueDate',
      'minorIdExpirationDate': 'minorIdExpirationDate',
      'documentExpeditionDate': 'documentExpeditionDate',
      'documentExpirationDate': 'documentExpirationDate',
      'comfortPlan': 'comfortPlan'
    };
    
    return mapping[fieldCode] || fieldCode;
  }
}