import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Importar FormsModule para usar ngModel

@Component({
  selector: 'app-room-selector',
  standalone: false,
  templateUrl: './room-selector.component.html',
  styleUrls: ['./room-selector.component.scss'],
})
export class RoomSelectorComponent {
  // Estado local
  roomsAvailabilityForTravelersNumber = [
    { name: 'Habitación Individual', spaces: 1, selectedSpaces: 0 },
    { name: 'Habitación Doble', spaces: 2, selectedSpaces: 0 },
    { name: 'Habitación Familiar', spaces: 4, selectedSpaces: 0 },
  ]; // Ejemplo de habitaciones disponibles

  travelers = [
    { travelerData: { ageGroup: 'Adultos' } },
    { travelerData: { ageGroup: 'Niños' } },
    { travelerData: { ageGroup: 'Bebés' } },
  ]; // Ejemplo de viajeros

  errorMsg: string | null = null; // Mensaje de error

  hasBabies(): boolean {
    return this.travelers.some(
      (traveler) => traveler.travelerData?.ageGroup === 'Bebés'
    );
  }
}
