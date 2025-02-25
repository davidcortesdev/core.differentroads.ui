import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OrderTraveler } from '../../models/orders/order.model';

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

  travelersSource = new BehaviorSubject<OrderTraveler[]>([]);
  travelers$ = this.travelersSource.asObservable();

  updateTravelersNumbers(travelersNumbers: TravelersNumbers) {
    this.travelersNumbersSource.next(travelersNumbers);

    const currentTravelers = this.travelersSource.getValue();
    const travelers: OrderTraveler[] = [];

    for (let i = 0; i < travelersNumbers.adults; i++) {
      travelers.push({
        ...currentTravelers[i],
        lead: i === 0,
        travelerData: {
          ageGroup: 'Adultos',
          ...currentTravelers[i]?.travelerData,
        },
      });
    }
    for (let i = 0; i < travelersNumbers.childs; i++) {
      travelers.push({
        ...currentTravelers[travelersNumbers.adults + i],
        travelerData: {
          ageGroup: 'Niños',
          ...currentTravelers[travelersNumbers.adults + i]?.travelerData,
        },
      });
    }
    for (let i = 0; i < travelersNumbers.babies; i++) {
      travelers.push({
        ...currentTravelers[
          travelersNumbers.adults + travelersNumbers.childs + i
        ],
        travelerData: {
          ageGroup: 'Bebés',
          ...currentTravelers[
            travelersNumbers.adults + travelersNumbers.childs + i
          ]?.travelerData,
        },
      });
    }
    this.travelersSource.next(travelers);
  }

  updateTravelers(travelers: OrderTraveler[]) {
    const currentTravelers = this.travelersSource.getValue();
    console.log('currentTravelers', currentTravelers);

    const updatedTravelers = travelers.map((traveler, index) => ({
      ...currentTravelers[index],
      ...traveler,
      travelerData: {
        ...traveler.travelerData,
      },
    }));
    this.travelersSource.next(updatedTravelers);
  }
}
