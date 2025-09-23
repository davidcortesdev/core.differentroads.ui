import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
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

@Component({
  selector: 'app-passenger-card-v2',
  standalone: false,
  templateUrl: './passenger-card.component.html',
  styleUrls: ['./passenger-card.component.scss'],
})
export class PassengerCardV2Component implements OnInit, OnChanges {
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
  @Input() mandatoryFields: IDepartureReservationFieldResponse[] = [];
  @Input() isLeadTraveler: boolean = false;

  @Output() passengerUpdated = new EventEmitter<any>();

  passengerForm!: FormGroup;
  isEditing = false;
  today = new Date();

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
    { label: 'Masculino', value: 'Male' },
    { label: 'Femenino', value: 'Female' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
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

  initForm(): void {
    this.passengerForm = this.fb.group({
      fullName: [this.passenger?.name || '', [Validators.required]],
      surname: [this.passenger?.surname || ''],
      email: [
        this.passenger?.email || '',
        [Validators.email, Validators.minLength(5)],
      ],
      phone: [this.passenger?.phone || ''],
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
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['passenger'] && changes['passenger'].currentValue) {
      const passenger = changes['passenger'].currentValue;
      if (passenger.documentType) {
        passenger.documentType = passenger.documentType.toLowerCase();
      }
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
    this.passengerForm.patchValue({
      fullName: this.passenger.name || '',
      surname: this.passenger.surname || '',
      email: this.passenger.email || '',
      phone: this.passenger.phone || '',
      gender: this.passenger.gender || '',
    });
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
        _id: this.travelerId
      };

      // Emitir el evento para que el componente padre maneje la actualización
      this.passengerUpdated.emit(updatedPassenger);

      // Actualizar el objeto passenger local
          this.passenger = {
            ...this.passenger,
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
          };

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
    this.startEditing();
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

  shouldShowField(fieldKey: string): boolean {
    if (this.availableFields && this.availableFields.length > 0) {
      const fieldCode = this.getFieldCodeFromKey(fieldKey);
      const availableField = this.availableFields.find(field => 
        field.code.toLowerCase() === fieldCode.toLowerCase()
      );
      
      // Si encontramos el campo en availableFields, mostrarlo siempre
      if (availableField) {
        return true;
      }
    }

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
      'gender': 'sex',  // ✅ CORREGIDO: gender -> sex
      'birthDate': 'birthdate',
      'documentType': 'document_type',
      'passportID': 'passport',
      'nationality': 'nationality'
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
    if (!this.mandatoryFields || this.mandatoryFields.length === 0) {
      return false;
    }

    const fieldCode = this.getFieldCodeFromKey(fieldKey);
    const availableField = this.availableFields.find(field => 
      field.code.toLowerCase() === fieldCode.toLowerCase()
    );

    if (!availableField) {
      return false;
    }

    const mandatoryField = this.mandatoryFields.find(field => 
      field.reservationFieldId === availableField.id
    );

    if (!mandatoryField) {
      return false;
    }

    switch (mandatoryField.mandatoryTypeId) {
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
    if (!this.mandatoryFields || this.mandatoryFields.length === 0) {
      return null;
    }

    const fieldCode = this.getFieldCodeFromKey(fieldKey);
    const availableField = this.availableFields.find(field => 
      field.code.toLowerCase() === fieldCode.toLowerCase()
    );

    if (!availableField) {
      return null;
    }

    const mandatoryField = this.mandatoryFields.find(field => 
      field.reservationFieldId === availableField.id
    );

    return mandatoryField ? mandatoryField.mandatoryTypeId : null;
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
}