import { Component } from '@angular/core';

@Component({
  selector: 'app-traveler-selector',
  standalone: false,
  templateUrl: './traveler-selector.component.html',
  styleUrls: ['./traveler-selector.component.scss'],
})
export class TravelerSelectorComponent {
  // Estado local del componente
  travelersNumbers: { adults: number; childs: number; babies: number } = {
    adults: 1,
    childs: 0,
    babies: 0,
  }; // Número de pasajeros

  // Método para manejar el cambio en el número de pasajeros
  handlePassengers(value: number, type: 'adults' | 'childs' | 'babies'): void {
    this.travelersNumbers[type] = value;
    console.log('Número de pasajeros actualizado:', this.travelersNumbers);
  }
}
