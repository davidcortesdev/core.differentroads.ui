import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DateInfo {
  date: string;
  tripType: string;
  departureCity?: string;
  basePrice?: number;
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
  });

  // Observable al que los componentes pueden suscribirse
  selectedDateInfo$: Observable<DateInfo> =
    this.selectedDateInfoSource.asObservable();

  constructor() {}

  // Método para actualizar la información
  updateSelectedDateInfo(
    date: string,
    tripType: string,
    departureCity?: string,
    basePrice?: number
  ): void {
    const currentInfo = this.selectedDateInfoSource.getValue();

    // Si no se proporcionan nuevos valores, mantener los actuales
    const city =
      departureCity !== undefined ? departureCity : currentInfo.departureCity;
    const price = basePrice !== undefined ? basePrice : currentInfo.basePrice;

    console.log('TourDataService: Updating info', {
      date,
      tripType,
      departureCity: city,
      basePrice: price,
    });
    this.selectedDateInfoSource.next({
      date,
      tripType,
      departureCity: city,
      basePrice: price,
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
}
