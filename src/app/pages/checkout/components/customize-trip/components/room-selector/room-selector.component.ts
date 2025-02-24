import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PeriodsService } from '../../../../../../core/services/periods.service';
import { TravelersService } from '../../../../../../core/services/checkout/travelers.service';
import { SummaryService } from '../../../../../../core/services/checkout/summary.service';
import { OrderTraveler } from '../../../../../../core/models/orders/order.model';
import { RoomsService } from '../../../../../../core/services/checkout/rooms.service';
import { ReservationMode } from '../../../../../../core/models/tours/reservation-mode.model';

@Component({
  selector: 'app-room-selector',
  standalone: false,
  templateUrl: './room-selector.component.html',
  styleUrls: ['./room-selector.component.scss'],
})
export class RoomSelectorComponent implements OnChanges {
  @Input() periodId!: string;

  roomsAvailabilityForTravelersNumber: ReservationMode[] = [];
  allRoomsAvailability: ReservationMode[] = [];

  travelers = [
    { travelerData: { ageGroup: 'Adultos' } },
    { travelerData: { ageGroup: 'Niños' } },
    { travelerData: { ageGroup: 'Bebés' } },
  ]; // Ejemplo de viajeros

  errorMsg: string | null = null; // Mensaje de error

  selectedRooms: { [externalID: string]: number } = {};

  constructor(
    private periodsService: PeriodsService,
    private travelersService: TravelersService,
    private summaryService: SummaryService,
    private roomsService: RoomsService
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
        .subscribe((rooms: ReservationMode[]) => {
          this.allRoomsAvailability = rooms;
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
      (room) => room.places <= totalTravelers
    );
  }

  onRoomSpacesChange(changedRoom: ReservationMode, newValue: number) {
    this.selectedRooms[changedRoom.externalID] = newValue;
    console.log('Room spaces changed:', changedRoom, 'New value:', newValue);

    const updatedRooms = Object.keys(this.selectedRooms).map((externalID) => {
      const room = this.allRoomsAvailability.find(
        (r) => r.externalID === externalID
      );
      return {
        ...room,
        qty: newValue,
      } as ReservationMode;
    });
    this.roomsService.updateSelectedRooms(updatedRooms);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['periodId']) {
      this.loadReservationModes();
    }
  }
}
