import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ReservationMode } from '../../models/tours/reservation-mode.model';
import { TextsService } from './texts.service';

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

  constructor(private textsService: TextsService) {}

  updateSelectedRooms(selectedRooms: ReservationMode[]) {
    const filteredRooms = selectedRooms.filter((room) => room.qty);
    this.selectedRoomsSource.next(filteredRooms);

    // Store complete room objects in TextsService
    const roomTexts: { [key: string]: any } = {};
    filteredRooms.forEach((room) => {
      if (room.externalID) {
        roomTexts[room.externalID] = room;
      }
    });
    this.textsService.updateTextsForCategory('rooms', roomTexts);
  }

  getSelectedRooms(): ReservationMode[] {
    return this.selectedRoomsSource.getValue();
  }
}
