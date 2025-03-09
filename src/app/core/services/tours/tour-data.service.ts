import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Tour } from '../../models/tours/tour.model';

@Injectable({
  providedIn: 'root',
})
export class TourDataService {
  private tourSource = new BehaviorSubject<Tour | null>(null);
  tour$ = this.tourSource.asObservable();

  updateTour(tour: Tour) {
    this.tourSource.next(tour);
  }

  getTour(): Tour | null {
    return this.tourSource.getValue();
  }
}
