import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// Interfaz para los datos del pasajero
export interface PassengerData {
  id: number;
  fullName: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  email: string;
  phone: string;
  type: string; // 'adult', 'child', etc.
  room?: string;
  gender?: string;
  documentExpeditionDate?: string;
  documentExpirationDate?: string;
  comfortPlan?: string;
  insurance?: string;
}

@Component({
  selector: 'app-booking-personal-data',
  templateUrl: './booking-personal-data.component.html',
  styleUrls: ['./booking-personal-data.component.scss'],
  standalone: false,
})
export class BookingPersonalDataComponent implements OnInit {
  @Input() passengers: PassengerData[] = [];

  // Número máximo de pasajeros por fila
  maxPassengersPerRow: number = 3;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {}

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
    const index = this.passengers.findIndex(p => p.id === updatedPassenger.id);
    if (index !== -1) {
      this.passengers[index] = updatedPassenger;
    }
  }
}