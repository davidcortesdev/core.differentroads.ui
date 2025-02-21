import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PeriodsService } from '../../../../../../core/services/periods.service';
import { TravelersService } from '../../../../../../core/services/checkout/travelers.service';

@Component({
  selector: 'app-room-selector',
  standalone: false,
  templateUrl: './room-selector.component.html',
  styleUrls: ['./room-selector.component.scss'],
})
export class RoomSelectorComponent implements OnChanges {
  @Input() periodId!: string;

  roomsAvailabilityForTravelersNumber: { name: string; spaces: number }[] = [];
  allRoomsAvailability: { name: string; spaces: number }[] = [];

  travelers = [
    { travelerData: { ageGroup: 'Adultos' } },
    { travelerData: { ageGroup: 'Niños' } },
    { travelerData: { ageGroup: 'Bebés' } },
  ]; // Ejemplo de viajeros

  errorMsg: string | null = null; // Mensaje de error

  constructor(
    private periodsService: PeriodsService,
    private travelersService: TravelersService
  ) {
    this.loadReservationModes();

    // Initialize with the current travelers numbers
    const initialTravelers =
      this.travelersService.travelersNumbersSource.getValue();
    const totalTravelers =
      initialTravelers.adults +
      initialTravelers.childs +
      initialTravelers.babies;
    this.filterRooms(totalTravelers);

    this.travelersService.travelersNumbers$.subscribe((data) => {
      const totalTravelers = data.adults + data.childs + data.babies;
      this.filterRooms(totalTravelers);
    });
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
          // Ensure rooms are filtered after loading reservation modes
          const initialTravelers =
            this.travelersService.travelersNumbersSource.getValue();
          const totalTravelers =
            initialTravelers.adults +
            initialTravelers.childs +
            initialTravelers.babies;
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
    if (changes['periodId']) {
      this.loadReservationModes();
    }
  }
}
