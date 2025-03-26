import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// Interfaz para los datos del viaje
export interface TravelData {
  id: number;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travelType: string;
  passengers: number;
  hotelName?: string;
  roomType?: string;
  mealPlan?: string;
  transportation?: string;
  activities?: string[];
  specialRequests?: string;
}

@Component({
  selector: 'app-booking-update-travel',
  templateUrl: './booking-update-travel.component.html',
  styleUrls: ['./booking-update-travel.component.scss'],
  standalone: false,
})
export class BookingUpdateTravelComponent implements OnInit {
  @Input() travels: TravelData[] = [];

  // Estado para controlar la visualización de viajes
  displayAllTravels: boolean = false;

  // Número máximo de viajes por fila
  maxTravelsPerRow: number = 3;

  // Estado para la edición
  editingTravelId: number | null = null;
  travelForm: FormGroup;

  constructor(private fb: FormBuilder) {
    // Inicializar un formulario vacío
    this.travelForm = this.createTravelForm({} as TravelData);
  }

  ngOnInit(): void {}

  /**
   * Crea un formulario para editar datos del viaje
   */
  createTravelForm(travel: TravelData): FormGroup {
    return this.fb.group({
      id: [travel.id],
      origin: [travel.origin, Validators.required],
      destination: [travel.destination, Validators.required],
      departureDate: [travel.departureDate, Validators.required],
      returnDate: [travel.returnDate],
      travelType: [travel.travelType],
      passengers: [travel.passengers, Validators.required],
      hotelName: [travel.hotelName],
      roomType: [travel.roomType],
      mealPlan: [travel.mealPlan],
      transportation: [travel.transportation],
      activities: [travel.activities],
      specialRequests: [travel.specialRequests],
    });
  }

  /**
   * Comienza la edición de un viaje
   */
  editTravel(travel: TravelData): void {
    this.editingTravelId = travel.id;
    this.travelForm = this.createTravelForm(travel);
  }

  /**
   * Guarda el viaje editado
   */
  saveTravel(): void {
    if (this.travelForm.valid) {
      const updatedTravel = this.travelForm.value;
      const index = this.travels.findIndex((t) => t.id === updatedTravel.id);

      if (index !== -1) {
        this.travels[index] = updatedTravel;
        this.cancelEditing();
      }
    }
  }

  /**
   * Cancela el modo de edición
   */
  cancelEditing(): void {
    this.editingTravelId = null;
  }

  /**
   * Verifica si un viaje está siendo editado
   */
  isEditing(travelId: number): boolean {
    return this.editingTravelId === travelId;
  }

  /**
   * Devuelve los viajes que deben mostrarse según el estado actual
   */
  get visibleTravels(): TravelData[] {
    if (this.displayAllTravels) {
      return this.travels;
    }
    return this.travels.slice(0, 3);
  }

  /**
   * Devuelve true si hay viajes ocultos
   */
  get hasHiddenTravels(): boolean {
    return this.travels.length > 3;
  }

  /**
   * Alterna entre mostrar todos los viajes o solo los primeros 3
   */
  toggleTravelsDisplay(): void {
    this.displayAllTravels = !this.displayAllTravels;
  }

  /**
   * Devuelve viajes agrupados en filas de 3
   */
  get travelsInRows(): TravelData[][] {
    const travels = this.displayAllTravels ? this.travels : this.visibleTravels;
    const rows: TravelData[][] = [];

    for (let i = 0; i < travels.length; i += this.maxTravelsPerRow) {
      rows.push(travels.slice(i, i + this.maxTravelsPerRow));
    }

    return rows;
  }

  /**
   * Formatea la fecha al formato dd/mm/yyyy
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
   * Obtiene la etiqueta para el tipo de viaje
   */
  getTravelTypeLabel(type: string): string {
    const types: Record<string, string> = {
      roundtrip: 'Ida y vuelta',
      oneway: 'Solo ida',
      multicity: 'Multi-ciudad',
      cruise: 'Crucero',
      tour: 'Tour organizado',
    };

    return types[type.toLowerCase()] || type;
  }
}
