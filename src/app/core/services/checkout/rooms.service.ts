import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ReservationMode } from '../../models/tours/reservation-mode.model';

interface TravelersNumbers {
  adults: number;
  childs: number;
  babies: number;
}

@Injectable({
  providedIn: 'root',
})
export class RoomsService {
  private selectedRoomsSource = new BehaviorSubject<ReservationMode[]>([]);
  selectedRooms$ = this.selectedRoomsSource.asObservable();

  updateSelectedRooms(selectedRooms: ReservationMode[]) {
    this.selectedRoomsSource.next(selectedRooms.filter((room) => room.qty));
  }

  getSelectedRooms(): ReservationMode[] {
    return this.selectedRoomsSource.getValue();
  }
}
