import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PassengerData } from '../passengerData';
import { PeriodsService } from '../../../core/services/periods.service';
import { ReservationFieldMandatory } from '../../../core/models/tours/period.model';

@Component({
  selector: 'app-booking-personal-data',
  templateUrl: './booking-personal-data.component.html',
  styleUrls: ['./booking-personal-data.component.scss'],
  standalone: false,
})
export class BookingPersonalDataComponent implements OnInit {
  @Input() passengers: PassengerData[] = [];
  @Input() bookingId!: string;
  @Input() periodId!: string;

  // Número máximo de pasajeros por fila
  maxPassengersPerRow: number = 3;

  // Array para almacenar los campos de reserva
  reservationFields: {
    id: number;
    name: string;
    key: string;
    mandatory: ReservationFieldMandatory;
  }[] = [];

  constructor(
    private fb: FormBuilder,
    private periodsService: PeriodsService
  ) {}

  ngOnInit(): void {
    if (this.periodId) {
      this.getReservationFields();
    }
  }

  /**
   * Obtiene los campos de reserva del período
   */
  getReservationFields(): void {
    this.periodsService
      .getPeriodDetail(this.periodId, ['reservationFields'])
      .subscribe({
        next: (period) => {
          if (period && period.reservationFields) {
            this.reservationFields = period.reservationFields;
            console.log('Reservation fields loaded:', this.reservationFields);
          }
        },
        error: (error) => {
          console.error('Error loading reservation fields:', error);
        },
      });
  }

  /**
   * Devuelve pasajeros agrupados en filas de 3
   */
  get passengersInRows(): PassengerData[][] {
    const rows: PassengerData[][] = [];

    for (let i = 0; i < this.passengers.length; i += this.maxPassengersPerRow) {
      rows.push(this.passengers.slice(i, i + this.maxPassengersPerRow));
    }

    return rows;
  }

  /**
   * Formatea la fecha de nacimiento al formato dd/mm/yyyy
   */
  formatDate(date: string): string {
    if (!date) return '';

    // Si la fecha ya está en formato dd/mm/yyyy
    if (date.includes('/')) {
      return date;
    }

    // Si la fecha está en formato yyyy-mm-dd
    if (date.includes('-')) {
      const parts = date.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return date;
  }

  /**
   * Obtiene la etiqueta para el tipo de pasajero
   */
  getPassengerTypeLabel(type: string): string {
    const types: Record<string, string> = {
      adult: 'Adulto',
      child: 'Niño',
      infant: 'Bebé',
      senior: 'Senior',
    };

    return types[type.toLowerCase()] || type;
  }

  /**
   * Actualiza los datos del pasajero
   */
  updatePassenger(updatedPassenger: PassengerData): void {
    const index = this.passengers.findIndex(
      (p) => p._id === updatedPassenger._id
    );
    if (index !== -1) {
      this.passengers[index] = updatedPassenger;
    }
  }
}
