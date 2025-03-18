import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OrderTraveler } from '../../models/orders/order.model';
import { RoomsService } from './rooms.service';

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

  // Agregar propiedad para almacenar la instancia del componente
  private travelersComponent: any;

  constructor(private roomsService: RoomsService) {}

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

    const updatedTravelers = travelers.map((traveler, index) => ({
      ...currentTravelers[index],
      ...traveler,
      travelerData: {
        ...traveler.travelerData,
      },
    }));

    this.travelersSource.next(updatedTravelers);
  }

  updateTravelersWithRooms() {
    const travelers = this.travelersSource.getValue();
    const rooms = this.roomsService.getSelectedRooms();

    if (travelers.length === 0) {
      const travelersNumbers = this.travelersNumbersSource.getValue();
      for (let i = 0; i < travelersNumbers.adults; i++) {
        travelers.push({
          bookingID: '',
          flightID: '',
          periodReservationModeID: '',
          lead: i === 0,
          _id: this.generateHexID(),
          optionalActivitiesIDs: [],
          travelerData: {
            ageGroup: 'Adultos',
            category: 'Standart category',
          },
        });
      }

      for (let i = 0; i < travelersNumbers.childs; i++) {
        travelers.push({
          bookingID: '',
          flightID: '',
          periodReservationModeID: '',
          lead: i === 0,
          _id: this.generateHexID(),
          optionalActivitiesIDs: [],
          travelerData: {
            ageGroup: 'Niños',
            category: 'Standart category',
          },
        });
      }
      for (let i = 0; i < travelersNumbers.babies; i++) {
        travelers.push({
          bookingID: '',
          flightID: '',
          periodReservationModeID: '',
          lead: i === 0,
          _id: this.generateHexID(),
          optionalActivitiesIDs: [],
          travelerData: {
            ageGroup: 'Bebés',
            category: 'Standart category',
          },
        });
      }
    }

    let travelerIndex = 0;

    rooms.forEach((room) => {
      for (let i = 0; i < (room?.places || 0); i++) {
        if (travelerIndex < travelers.length) {
          travelers[travelerIndex].periodReservationModeID = room.externalID;
          travelerIndex++;
        }
      }
    });

    this.travelersSource.next(travelers);
  }

  getTravelers(): OrderTraveler[] {
    return this.travelersSource.getValue();
  }

  generateHexID() {
    // Obtener la marca de tiempo actual en milisegundos
    const timestamp = Math.floor(Date.now() / 1000).toString(16);

    // Generar 16 caracteres hexadecimales aleatorios
    const randomHex = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    // Concatenar el timestamp y los caracteres aleatorios para formar el ID
    return (timestamp + randomHex).slice(0, 24);
  }

  // Registrar la instancia del componente
  setTravelersComponent(component: any) {
    this.travelersComponent = component;
  }

  // Recuperar la instancia del componente
  getTravelersComponent() {
    return this.travelersComponent;
  }
}
