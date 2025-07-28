import { Component } from '@angular/core';

@Component({
  selector: 'app-info-travelers',
  standalone: false,
  templateUrl: './info-travelers.component.html',
  styleUrls: ['./info-travelers.component.scss'],
})
export class InfoTravelersComponent {
  // Variables para el acordeón
  travelerForms: any[] = [
    {
      /* formulario del primer viajero */
    },
    // Puedes agregar más formularios aquí
  ];

  travelers: any[] = [
    { ageGroup: 'Adultos' },
    // Puedes agregar más viajeros aquí
  ];

  // Variables para el formulario
  allFieldsMandatory = false;
  showMoreFields = false;

  constructor() {}

  // Método para obtener todos los índices de viajeros (para abrir el acordeón)
  getAllTravelersIndices(): number[] {
    return this.travelerForms.map((_, index) => index);
  }

  // Método para obtener el título del pasajero
  getTitlePasajero(index: string): string {
    return `Pasajero ${index}`;
  }

  // Método para alternar la visibilidad de campos adicionales
  toggleMoreFields(): void {
    this.showMoreFields = !this.showMoreFields;
  }
}
