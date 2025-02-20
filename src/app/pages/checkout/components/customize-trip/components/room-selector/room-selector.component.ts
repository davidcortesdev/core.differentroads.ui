import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PeriodsService } from '../../../../../../core/services/periods.service';

@Component({
  selector: 'app-room-selector',
  standalone: false,
  templateUrl: './room-selector.component.html',
  styleUrls: ['./room-selector.component.scss'],
})
export class RoomSelectorComponent implements OnChanges {
  @Input() travelersNumbers:
    | { adults: number; childs: number; babies: number }
    | undefined;
  @Input() periodId!: string;

  roomsAvailabilityForTravelersNumber: { name: string; spaces: number }[] = [];
  allRoomsAvailability: { name: string; spaces: number }[] = [];

  travelers = [
    { travelerData: { ageGroup: 'Adultos' } },
    { travelerData: { ageGroup: 'Niños' } },
    { travelerData: { ageGroup: 'Bebés' } },
  ]; // Ejemplo de viajeros

  errorMsg: string | null = null; // Mensaje de error

  constructor(private periodsService: PeriodsService) {
    this.loadReservationModes();
  }

  loadReservationModes(): void {
    if (this.periodId) {
      this.periodsService
        .getReservationModes(this.periodId)
        .subscribe((rooms) => {
          this.allRoomsAvailability = rooms.map((room) => ({
            name: room.name,
            spaces: room.places,
          }));
          const totalTravelers =
            (this.travelersNumbers?.adults || 0) +
            (this.travelersNumbers?.childs || 0) +
            (this.travelersNumbers?.babies || 0);
          this.filterRooms(totalTravelers);
        });
    }
  }

  // Método para verificar si hay bebés en la lista de viajeros
  hasBabies(): boolean {
    return this.travelers.some(
      (traveler) => traveler.travelerData?.ageGroup === 'Bebés'
    );
  }

  filterRooms(totalTravelers: number): void {
    this.roomsAvailabilityForTravelersNumber = this.allRoomsAvailability.filter(
      (room) => room.spaces <= totalTravelers
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['travelersNumbers']) {
      const totalTravelers =
        (this.travelersNumbers?.adults || 0) +
        (this.travelersNumbers?.childs || 0) +
        (this.travelersNumbers?.babies || 0);
      console.log('Total travelers:', totalTravelers);

      this.filterRooms(totalTravelers);
    }
    if (changes['periodId']) {
      this.loadReservationModes();
    }
  }
}
