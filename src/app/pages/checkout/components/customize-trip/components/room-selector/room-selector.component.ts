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

  travelers: {
    adults?: number;
    childs?: number;
    babies?: number;
  } = {};

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
    this.travelers = initialTravelers;

    const totalTravelers =
      initialTravelers.adults +
      initialTravelers.childs +
      initialTravelers.babies;
    this.filterRooms(totalTravelers);

    this.travelersService.travelersNumbers$.subscribe((data) => {
      const newTotalTravelers = data.adults + data.childs + data.babies;

      // Only check room capacities if the number of travelers has decreased
      console.log('_____________');

      // Find rooms to deselect: those with capacity larger than new total travelers
      Object.entries(this.selectedRooms).forEach(([externalID, qty]) => {
        const room = this.allRoomsAvailability.find(
          (r) => r.externalID === externalID
        );
        if (room && room.places > newTotalTravelers && qty > 0) {
          // Deselect this room as its capacity exceeds the new traveler count
          delete this.selectedRooms[externalID];
        }
      });

      this.filterRooms(newTotalTravelers);
      this.updateRooms();
    });

    this.roomsService.selectedRooms$.subscribe((rooms) => {
      this.selectedRooms = rooms.reduce((acc, room) => {
        acc[room.externalID] = room.qty || 0;
        return acc;
      }, {} as { [externalID: string]: number });
    });
  }

  loadReservationModes(): void {
    if (this.periodID) {
      this.periodsService
        .getReservationModes(this.periodID)
        .subscribe((rooms: ReservationMode[]) => {
          this.allRoomsAvailability = rooms
            .map((room) => ({
              ...room,
              price: this.pricesService.getPriceById(
                room.externalID,
                'Adultos'
              ),
            }))
            .sort((a, b) => (a.places || 0) - (b.places || 0));

          // Get existing traveler room assignments first
          const travelersRoomAssignments = this.initializeRoomsFromTravelers();

          // Initialize selectedRooms with existing assignments and 0 for unassigned rooms
          this.selectedRooms = this.allRoomsAvailability.reduce((acc, room) => {
            // Use existing assignment if available, or current selection, or 0
            acc[room.externalID] =
              travelersRoomAssignments[room.externalID] ||
              this.selectedRooms[room.externalID] ||
              0;
            return acc;
          }, {} as { [externalID: string]: number });

          // Ensure rooms are filtered after loading reservation modes
          const initialTravelers =
            this.travelersService.travelersNumbersSource.getValue();
          const totalTravelers =
            initialTravelers.adults +
            initialTravelers.childs +
            initialTravelers.babies;

          this.updateRooms();
          this.filterRooms(totalTravelers);
        });
    }
  }

  /**
   * Initialize room selections based on existing traveler assignments
   * @returns Object with room counts based on traveler assignments
   */
  initializeRoomsFromTravelers(): { [externalID: string]: number } {
    const roomCounts: { [externalID: string]: number } = {};
    const travelers = this.travelersService.getTravelers();

    // Count room assignments for each room type
    travelers.forEach((traveler) => {
      if (traveler.periodReservationModeID) {
        if (!roomCounts[traveler.periodReservationModeID]) {
          roomCounts[traveler.periodReservationModeID] = 1;
        } else {
          roomCounts[traveler.periodReservationModeID]++;
        }
      }
    });

    // Convert traveler counts to room quantities
    const result: { [externalID: string]: number } = {};
    Object.entries(roomCounts).forEach(([roomId, travelerCount]) => {
      const room = this.allRoomsAvailability.find(
        (r) => r.externalID === roomId
      );
      if (room && room.places) {
        // Calculate how many rooms of this type are needed
        result[roomId] = Math.ceil(travelerCount / room.places);
      }
    });

    return result;
  }

  // Método para verificar si hay bebés en la lista de viajeros
  hasBabies(): boolean {
    return this.travelers.babies ? this.travelers?.babies > 0 : false;
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

    this.updateRooms();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['periodID']) {
      this.loadReservationModes();
    }
  }

  updateRooms() {
    const updatedRooms = Object.keys(this.selectedRooms).map((externalID) => {
      const room = this.allRoomsAvailability.find(
        (r) => r.externalID === externalID
      );
      return {
        ...room,
        qty: this.selectedRooms[externalID],
      } as ReservationMode;
    });
    const travelerNumbers =
      this.travelersService.travelersNumbersSource.getValue();
    const totalTravelers =
      travelerNumbers.adults + travelerNumbers.childs + travelerNumbers.babies;
    const selectedPlaces = updatedRooms.reduce(
      (sum, room) => sum + (room.places || 0) * (room.qty || 0),
      0
    );

    if (selectedPlaces > totalTravelers) {
      this.errorMsg =
        'Las habitaciones seleccionadas no se corresponden con la cantidad de viajeros.';
    } else {
      this.errorMsg = null;
    }

    this.roomsService.updateSelectedRooms(updatedRooms);
  }

  get hasSharedRoomsOption(): boolean {
    return this.allRoomsAvailability.some(
      (room) => room.name?.toLowerCase().includes('doble') && room.places === 1
    );
  }

  get isSharedRoomSelected(): boolean {
    return Object.keys(this.selectedRooms).some((externalID) => {
      const room = this.allRoomsAvailability.find(
        (r) => r.externalID === externalID
      );
      return (
        room &&
        room.name?.toLowerCase().includes('doble') &&
        room.places === 1 &&
        this.selectedRooms[externalID] > 0
      );
    });
  }
}
