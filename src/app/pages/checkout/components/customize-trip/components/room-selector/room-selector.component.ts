import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PeriodsService } from '../../../../../../core/services/periods.service';
import { TravelersService } from '../../../../../../core/services/checkout/travelers.service';
import { SummaryService } from '../../../../../../core/services/checkout/summary.service';
import { OrderTraveler } from '../../../../../../core/models/orders/order.model';
import { RoomsService } from '../../../../../../core/services/checkout/rooms.service';
import { ReservationMode } from '../../../../../../core/models/tours/reservation-mode.model';
import { PricesService } from '../../../../../../core/services/checkout/prices.service';

@Component({
  selector: 'app-room-selector',
  standalone: false,
  templateUrl: './room-selector.component.html',
  styleUrls: ['./room-selector.component.scss'],
})
export class RoomSelectorComponent implements OnChanges {
  @Input() periodID!: string;

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
    private roomsService: RoomsService,
    private pricesService: PricesService // Add PricesService to constructor
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
    if (this.periodID) {
      this.periodsService
        .getReservationModes(this.periodID)
        .subscribe((rooms: ReservationMode[]) => {
          this.allRoomsAvailability = rooms.map((room) => ({
            ...room,
            price: this.pricesService.getPriceById(room.externalID, 'Adultos'),
          }));
          // Initialize selectedRooms with 0 for each room
          this.selectedRooms = this.allRoomsAvailability.reduce((acc, room) => {
            acc[room.externalID] = 0;
            return acc;
          }, {} as { [externalID: string]: number });
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
    if (newValue === 0) {
      delete this.selectedRooms[changedRoom.externalID];
    } else {
      this.selectedRooms[changedRoom.externalID] = newValue;
    }
    console.log('Room spaces changed:', changedRoom, 'New value:', newValue);

    const updatedRooms = Object.keys(this.selectedRooms).map((externalID) => {
      const room = this.allRoomsAvailability.find(
        (r) => r.externalID === externalID
      );
      return {
        ...room,
        qty: this.selectedRooms[externalID],
      } as ReservationMode;
    });

    this.roomsService.updateSelectedRooms(updatedRooms);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['periodID']) {
      this.loadReservationModes();
    }
  }
}
