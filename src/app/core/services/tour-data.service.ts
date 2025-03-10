import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Tour } from '../models/tours/tour.model';

export interface DateInfo {
  date: string;
  tripType: string;
  departureCity?: string;
  basePrice?: number;
  periodID?: string;
  flightID?: string;
}

export interface Travelers {
  adults: number;
  children: number;
  babies: number;
}

@Injectable({
  providedIn: 'root',
})
export class TourDataService {
  // BehaviorSubject para almacenar y compartir la información
  private selectedDateInfoSource = new BehaviorSubject<DateInfo>({
    date: '',
    tripType: '',
    departureCity: '',
    basePrice: 0,
    periodID: '',
    flightID: '',
  });

  // Observable al que los componentes pueden suscribirse
  selectedDateInfo$: Observable<DateInfo> =
    this.selectedDateInfoSource.asObservable();

  // BehaviorSubject para almacenar y compartir el tour
  private tourSource = new BehaviorSubject<Tour | null>(null);
  tour$ = this.tourSource.asObservable();

  private selectedTravelersSource = new BehaviorSubject<Travelers>({
    adults: 1,
    children: 0,
    babies: 0,
  });

  selectedTravelers$: Observable<Travelers> =
    this.selectedTravelersSource.asObservable();

  constructor() {}

  // Método para actualizar la información
  updateSelectedDateInfo(
    date: string,
    tripType: string,
    departureCity?: string,
    basePrice?: number,
    periodID?: string,
    flightID?: string
  ): void {
    const currentInfo = this.selectedDateInfoSource.getValue();

    // Si no se proporcionan nuevos valores, mantener los actuales
    const city =
      departureCity !== undefined ? departureCity : currentInfo.departureCity;
    const price = basePrice !== undefined ? basePrice : currentInfo.basePrice;

    console.log(
      `Updating selected date info: ${date}, ${tripType}, ${city}, ${price}, ${periodID}, ${flightID}`
    );

    this.selectedDateInfoSource.next({
      date,
      tripType,
      departureCity: city,
      basePrice: price,
      periodID,
      flightID,
    });
  }

  // Actualizar solo la ciudad de salida
  updateDepartureCity(city: string): void {
    const currentInfo = this.selectedDateInfoSource.getValue();
    this.selectedDateInfoSource.next({
      ...currentInfo,
      departureCity: city,
    });
  }

  // Actualizar solo el precio base
  updateBasePrice(price: number): void {
    const currentInfo = this.selectedDateInfoSource.getValue();
    this.selectedDateInfoSource.next({
      ...currentInfo,
      basePrice: price,
    });
  }

  // Método para obtener el valor actual
  getCurrentDateInfo(): DateInfo {
    return this.selectedDateInfoSource.getValue();
  }

  // Método para verificar si hay información disponible
  hasDateInfo(): boolean {
    const currentInfo = this.selectedDateInfoSource.getValue();
    return !!(currentInfo.date && currentInfo.tripType);
  }

  // Métodos relacionados con el tour
  updateTour(tour: Tour) {
    this.tourSource.next(tour);
  }

  getTour(): Tour | null {
    return this.tourSource.getValue();
  }

  updateSelectedTravelers(travelers: Travelers): void {
    this.selectedTravelersSource.next(travelers);
  }
}
