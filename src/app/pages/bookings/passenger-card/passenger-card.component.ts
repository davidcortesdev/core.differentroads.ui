import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';

import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { PassengerData } from '../passengerData';
import { BookingsService } from '../../../core/services/bookings.service';
import { BookingTraveler, TravelerData } from '../../../core/models/bookings/booking-traveler.model';

@Component({
  selector: 'app-passenger-card',
  standalone: false,
  templateUrl: './passenger-card.component.html',
  styleUrls: ['./passenger-card.component.scss']
})
export class PassengerCardComponent implements OnInit, OnChanges {
  @Input() passenger!: any;
  @Input() bookingId!: string;
  @Input() travelerId!: string;
  
  @Output() passengerUpdated = new EventEmitter<any>();

  isEditing: boolean = false;
  passengerForm: FormGroup;
  form!: FormGroup;
  today: Date = new Date();

  // Añadir propiedad para acceder al booking completo
  bookingComplete: any = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private bookingService: BookingsService
  ) {
    this.passengerForm = this.createPassengerForm({} as PassengerData);
    
    // Intentar obtener el booking completo si estamos en una ruta de booking
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.bookingId = params['id'];
        this.bookingService.getBookingById(this.bookingId).subscribe(booking => {
          this.bookingComplete = booking;
        });
      }
    });
  }

  ngOnInit(): void {
    // Check if passenger data is provided via route data
    this.route.data.subscribe(data => {
      if (data['passenger']) {
        this.passenger = data['passenger'];
      }
      this.initForm();
    });

    console.log('Initial bookingId:', this.bookingId);
    console.log('Initial travelerId:', this.travelerId);
    console.log('Passenger data:', this.passenger);

    // Intentar obtener bookingId de múltiples fuentes
    if (!this.bookingId) {
      if (this.passenger && this.passenger.bookingID) {
        this.bookingId = this.passenger.bookingID;
      } else if (this.passenger && this.passenger.bookingSID) {
        this.bookingId = this.passenger.bookingSID;
      }
      console.log('Extracted bookingId:', this.bookingId);
    }

    // Intentar obtener travelerId de múltiples fuentes
    if (!this.travelerId) {
      if (this.passenger && this.passenger._id) {
        this.travelerId = this.passenger._id;
      } else if (this.passenger && this.passenger.id) {
        this.travelerId = this.passenger.id.toString();
      }
      console.log('Extracted travelerId:', this.travelerId);
    }
    
    this.form = this.fb.group({
      fullName: [this.passenger.fullName || '', Validators.required],
      email: [this.passenger.email || ''],
      phone: [this.passenger.phone || ''],
      documentType: [this.passenger.documentType || ''],
      documentNumber: [this.passenger.documentNumber || ''],
      birthDate: [this.passenger.birthDate || '', [Validators.required, this.birthDateValidator.bind(this)]],
      gender: [this.passenger.gender || '']
      // Agregá los campos reales que estés usando
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Actualizar el formulario si cambia el pasajero desde el componente padre
    if (changes['passenger'] && !changes['passenger'].firstChange) {
      this.initForm();
    }
  }

  private initForm(): void {
    // Inicializar el formulario con los datos del pasajero
    this.passengerForm = this.createPassengerForm(this.passenger || {} as PassengerData);
  }

  createPassengerForm(passenger: PassengerData): FormGroup {
    return this.fb.group({
      id: [passenger.id],
      fullName: [passenger.fullName, [Validators.required, Validators.minLength(3)]],
      documentType: [passenger.documentType, Validators.required],
      documentNumber: [passenger.documentNumber, [Validators.required, Validators.minLength(3)]],
      birthDate: [passenger.birthDate, [Validators.required, this.birthDateValidator.bind(this)]],
      email: [passenger.email, Validators.email],
      phone: [passenger.phone],
      type: [passenger.type],
      room: [passenger.room],
      gender: [passenger.gender],
      documentExpeditionDate: [passenger.documentExpeditionDate],
      documentExpirationDate: [passenger.documentExpirationDate],
      comfortPlan: [passenger.comfortPlan],
      insurance: [passenger.insurance],
    });
  }

  // Custom validator to ensure birthDate is less than today
  birthDateValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const selectedDate = new Date(control.value);
    if (selectedDate >= this.today) {
      return { invalidBirthDate: true };
    }
    return null;
  }

  onEdit(): void {
    this.isEditing = true;
    this.passengerForm.patchValue({
      documentExpeditionDate: this.passenger.documentExpeditionDate ? new Date(this.passenger.documentExpeditionDate) : null,
      documentExpirationDate: this.passenger.documentExpirationDate? new Date(this.passenger.documentExpirationDate) : null,
      birthDate: this.passenger.birthDate? new Date(this.passenger.birthDate) : null,
    });
  }

  onSave(): void {
    if (this.passengerForm.valid) {
      const formValue = this.passengerForm.getRawValue();
      
      // Debug logs
      console.log('bookingId:', this.bookingId);
      console.log('travelerId:', this.travelerId);
      console.log('passenger:', this.passenger);
      console.log('Form values:', formValue);
      
      // Intentar obtener bookingId y travelerId si no están definidos
      if (!this.bookingId) {
        if (this.passenger && this.passenger.bookingID) {
          this.bookingId = this.passenger.bookingID;
        } else if (this.passenger && this.passenger.bookingSID) {
          this.bookingId = this.passenger.bookingSID;
        }
      }
      
      // Intentar obtener travelerId de múltiples fuentes si aún no está definido
      if (!this.travelerId) {
        if (this.passenger && this.passenger._id) {
          this.travelerId = this.passenger._id;
        } else if (this.passenger && this.passenger.id) {
          this.travelerId = this.passenger.id.toString();
        }
      }
      
      // Verificar si tenemos los IDs necesarios
      if (!this.bookingId) {
        console.error('bookingId is undefined or empty');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'ID de reserva no válido. Por favor, inténtelo de nuevo.',
          life: 3000
        });
        return;
      }
      
      if (!this.travelerId) {
        console.error('travelerId is undefined or empty');
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'ID de viajero no válido. Por favor, inténtelo de nuevo.',
          life: 3000
        });
        return;
      }
  
      const travelerData: TravelerData = {
        name: formValue.fullName,
        surname: '', 
        dni: formValue.documentNumber,
        documentType: formValue.documentType,
        birthdate: formValue.birthDate, // Asegurarse de que se use el campo correcto
        email: formValue.email,
        phone: formValue.phone,
        sex: formValue.gender,
        passportIssueDate: formValue.documentExpeditionDate,
        passportExpirationDate: formValue.documentExpirationDate,
      };
      
      // Obtener bookingSID
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
        travelerData
      };
      
      console.log('Sending updatedTraveler:', updatedTraveler);
  
      this.bookingService.updateTravelers(this.bookingId, updatedTraveler).subscribe({
        next: (response) => {
          console.log('Update successful:', response);
          
          // Actualizar el objeto passenger con los nuevos valores del formulario
          this.passenger = {
            ...this.passenger,
            fullName: formValue.fullName,
            documentType: formValue.documentType,
            documentNumber: formValue.documentNumber,
            birthDate: formValue.birthDate, // Asegurarse de que se actualice correctamente
            email: formValue.email,
            phone: formValue.phone,
            gender: formValue.gender,
            room: formValue.room,
            documentExpeditionDate: formValue.documentExpeditionDate,
            documentExpirationDate: formValue.documentExpirationDate,
            comfortPlan: formValue.comfortPlan,
            insurance: formValue.insurance
          };
          
          console.log('Updated passenger object:', this.passenger);
          
          this.messageService.add({
            severity: 'success',
            summary: 'Datos actualizados',
            detail: `La información de ${formValue.fullName} ha sido actualizada correctamente`,
            life: 3000
          });
  
          this.passengerUpdated.emit(this.passenger); // Emitimos el viajero actualizado al padre
          this.isEditing = false;
        },
        error: (error) => {
          console.error('Update failed:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `No se pudo actualizar la información del pasajero: ${error.message || error}`,
            life: 3000
          });
        }
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor completá los campos requeridos.',
        life: 3000
      });
    }
  }
  

  onCancel(): void {
    // Restaurar el formulario a los valores originales antes de salir del modo edición
    this.passengerForm.reset(this.passenger);
    this.isEditing = false;
  }
  
  // Method to check if there are any pending fields
  hasPendingFields(): boolean {
    if (!this.passenger) return true;
    
    // Check required fields first
    if (!this.passenger.fullName || !this.passenger.documentNumber || !this.passenger.documentType) {
      return true;
    }
    
    // Check other important fields
    if (!this.passenger.birthDate || !this.passenger.gender || !this.passenger.email || 
        !this.passenger.phone || !this.passenger.room) {
      return true;
    }
    
    // Check passport specific fields
    if (!this.passenger.documentExpeditionDate || !this.passenger.documentExpirationDate) {
      return true;
    }
    
    return false;
  }

  getPassengerTypeLabel(type: string): string {
    if (!type) return '';
    
    const types: Record<string, string> = {
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
      // Si es un objeto Date, convertirlo a string
      if (dateStr instanceof Date) {
        const day = dateStr.getDate().toString().padStart(2, '0');
        const month = (dateStr.getMonth() + 1).toString().padStart(2, '0');
        const year = dateStr.getFullYear();
        return `${day}/${month}/${year}`;
      }
      
      // A partir de aquí, tratamos dateStr como string
      const dateString = String(dateStr);
      
      // Si la fecha ya está en formato dd/mm/yyyy
      if (dateString.includes('/')) {
        return dateString;
      }
      
      // Si la fecha está en formato ISO (yyyy-mm-dd)
      if (dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length >= 3) {
          return `${parts[2].substring(0,2)}/${parts[1]}/${parts[0]}`;
        }
      }
      
      // Intentar crear un objeto Date y formatear
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

      // Convierte un objeto Date a string en formato yyyy-mm-dd
    formatDateToString(date: Date): string {
      if (!date) return '';
      
      try {
        const year = date.getFullYear();
        // Asegurarse de que el mes y día tengan dos dígitos
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('Error converting Date to string:', error);
        return '';
      }
    }
}