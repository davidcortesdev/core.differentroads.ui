import { Component } from '@angular/core';

@Component({
  selector: 'app-room-selector',
  standalone: false,
  templateUrl: './room-selector.component.html',
  styleUrls: ['./room-selector.component.scss'],
})
export class RoomSelectorComponent {
  // Estado local
  roomsAvailabilityForTravelersNumber = [
    { name: 'Habitación Individual', spaces: 1 },
    { name: 'Habitación Doble', spaces: 2 },
    { name: 'Habitación Familiar', spaces: 4 },
  ]; // Ejemplo de habitaciones disponibles

  travelers = [
    { travelerData: { ageGroup: 'Adultos' } },
    { travelerData: { ageGroup: 'Niños' } },
    { travelerData: { ageGroup: 'Bebés' } },
  ]; // Ejemplo de viajeros

  errorMsg: string | null = null; // Mensaje de error

  // Método para verificar si hay bebés en la lista de viajeros
  hasBabies(): boolean {
    return this.travelers.some(
      (traveler) => traveler.travelerData?.ageGroup === 'Bebés'
    );
  }
}
