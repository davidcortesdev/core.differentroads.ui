import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface TravelersNumbers {
  adults: number;
  childs: number;
  babies: number;
}

@Injectable({
  providedIn: 'root',
})
export class TravelersService {
  travelersNumbersSource = new BehaviorSubject<TravelersNumbers>({
    adults: 1,
    childs: 0,
    babies: 0,
  });

  travelersNumbers$ = this.travelersNumbersSource.asObservable();

  updateTravelersNumbers(travelersNumbers: TravelersNumbers) {
    this.travelersNumbersSource.next(travelersNumbers);
  }
}
