import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Tour } from '../../models/tours/tour.model';
import { PeriodPricesService } from './period-prices.service';

@Injectable({
  providedIn: 'root',
})
export class TourDataService {
  // BehaviorSubject para almacenar y compartir el tour
  private tourSource = new BehaviorSubject<Tour | null>(null);
  tour$ = this.tourSource.asObservable();

  constructor(private periodPricesService: PeriodPricesService) {}

  // Métodos relacionados con el tour
  updateTour(tour: Tour) {
    this.tourSource.next(tour);
  }

  getTour(): Tour | null {
    return this.tourSource.getValue();
  }

  getTourBasePrice(): number {
    return this.getTour()?.basePrice || 0;
  }

  getTourBasePriceP(periodID: string): number {
    let price = 0;
    this.periodPricesService
      .getPeriodPriceById(`${periodID}`, this.getTour()?.externalID || '')
      .subscribe((value) => (price = value || 0));
    return price;
  }

  getPeriodPrice(
    periodID: string | number,
    withTourPrice: boolean = false
  ): number {
    if (!periodID) {
      return 0;
    }

    console.log('Getting period price for:', periodID);

    if (withTourPrice) {
      let price = 0;
      this.periodPricesService
        .getPeriodPriceById(`${periodID}`, `${periodID}`, 'Adultos')
        .subscribe((value) => (price = value || 0));
      return this.getTourBasePriceP(`${periodID}`) + price;
    } else {
      let price = 0;
      this.periodPricesService
        .getPeriodPriceById(`${periodID}`, `${periodID}`, 'Adultos')
        .subscribe((value) => (price = value || 0));
      return price;
    }
  }

  getFlightPrice(
    periodID: string | number,
    flightID: string | number | undefined
  ): number {
    if (!flightID || !periodID) {
      return 0;
    }
    const periodsData = this.getTour()?.activePeriods;
    if (!periodsData) {
      return 0;
    }
    const selectedPeriod = periodsData?.find(
      (period) => `${period.externalID}` === `${periodID}`
    );
    const selectedFlight = selectedPeriod?.flights.find(
      (flight) => `${flight.activityID}` === `${flightID}`
    );
    return selectedFlight?.prices || 0;
  }

  getActivityPrice(
    periodID: string | number,
    activityID: string | number
  ): number {
    if (!periodID || !activityID) {
      return 0;
    }
    let price = 0;
    this.periodPricesService
      .getPeriodPriceById(`${periodID}`, `${activityID}`)
      .subscribe((value) => (price = value || 0));
    return price;
  }

  // Añadir un nuevo método para establecer y obtener el valor de unpublish
  // Asumiendo que el archivo ya existe con otros métodos
  
  // Añadir estas líneas al servicio existente:
  
  private unpublishSubject = new BehaviorSubject<boolean>(false);
  unpublish$ = this.unpublishSubject.asObservable();
  
  // Método para establecer el valor de unpublish
  setUnpublish(value: boolean): void {
    this.unpublishSubject.next(value);
  }
  
  // Método para obtener el valor actual de unpublish
  getUnpublish(): boolean {
    return this.unpublishSubject.value;
  }
}
