import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PassengerData } from '../../components/booking-personal-data/booking-personal-data.component';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-passenger-card',
  standalone: false,
  templateUrl: './passenger-card.component.html',
  styleUrls: ['./passenger-card.component.scss']
})
export class PassengerCardComponent implements OnInit, OnChanges {
  @Input() passenger!: PassengerData;
  @Output() passengerUpdated = new EventEmitter<PassengerData>();
  
  isEditing: boolean = false;
  passengerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.passengerForm = this.createPassengerForm({} as PassengerData);
  }

  ngOnInit(): void {
    // Check if passenger data is provided via route data
    this.route.data.subscribe(data => {
      if (data['passenger']) {
        this.passenger = data['passenger'];
      }
      this.initForm();
    });
    
    console.log('passenger', this.passenger);
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
      birthDate: [passenger.birthDate],
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

  onEdit(): void {
    console.log('edit');
    this.isEditing = true;
    // No es necesario reinicializar el formulario aquí, ya que no ha cambiado el pasajero
  }

  onSave(): void {
    console.log('save');
    if (this.passengerForm.valid) {
      // Crear una copia del pasajero con los valores actualizados
      const updatedPassenger: PassengerData = {
        ...this.passenger,
        ...this.passengerForm.value
      };
      
      // Emitir el pasajero actualizado al componente padre
      this.passengerUpdated.emit(updatedPassenger);
      
      // Mostrar un mensaje toast de éxito
      this.messageService.add({
        severity: 'success',
        summary: 'Datos actualizados',
        detail: `La información de ${updatedPassenger.fullName} ha sido actualizada correctamente`,
        life: 3000
      });
      
      // Salir del modo de edición
      this.isEditing = false;
    } else {
      // Mostrar un mensaje toast de error
      this.messageService.add({
        severity: 'error',
        summary: 'Error de validación',
        detail: 'Por favor, complete correctamente todos los campos requeridos',
        life: 3000
      });
      
      // Marcar todos los campos como tocados para mostrar errores de validación
      Object.keys(this.passengerForm.controls).forEach(key => {
        const control = this.passengerForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  onCancel(): void {
    console.log('cancel');
    // Restaurar el formulario a los valores originales antes de salir del modo edición
    this.passengerForm.reset(this.passenger);
    this.isEditing = false;
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

  formatDate(date: string): string {
    if (!date) return '';

    try {
      // Si la fecha ya está en formato dd/mm/yyyy
      if (date.includes('/')) {
        return date;
      }

      // Si la fecha está en formato yyyy-mm-dd
      if (date.includes('-')) {
        const parts = date.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }

    return date;
  }
}